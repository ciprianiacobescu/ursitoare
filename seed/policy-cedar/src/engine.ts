// The policy enforcement point (PEP): builds the Cedar request from engine-level facts, calls the
// embedded Cedar evaluator, and fails closed. This is the `policy.check(...)` hook of design section 6.
import type { CedarValueJson } from "@cedar-policy/cedar-wasm/nodejs";
import { cedar, loadPolicyMap, loadSchemaText } from "./cedar.ts";
import { cedarTypeOf, type Catalogue } from "./catalogue.ts";
import { Directory, ent, type EntityJson } from "./directory.ts";

export interface Approval { approver: string; role: string }
export interface FlowCapabilities { reads_untrusted: boolean; reads_private: boolean; has_send_or_pay: boolean }

export type CheckRequest =
  | { action: "invoke_tool"; principal: string; flow: string; flow_version?: string; node: string; kind?: string; tool: string;
      args: Record<string, unknown>; taint: string[]; run_initiator?: string; approvals?: Approval[] }
  | { action: "invoke_llm"; principal: string; flow: string; flow_version?: string; node: string; kind?: string;
      args: { model_profile?: string; tools?: string[] }; taint: string[]; run_initiator?: string }
  | { action: "approve_task"; principal: string; flow: string; flow_version?: string; node: string; kind?: string;
      run_initiator: string; taint?: string[] }
  | { action: "activate_flow"; principal: string; flow: string; flow_capabilities: FlowCapabilities }
  | { action: "start_run"; principal: string; flow: string }
  | { action: "edit_flow"; principal: string; flow: string };

export interface Decision {
  decision: "allow" | "deny";
  reason: string;          // permit:<ids> | forbid:<ids> | default_deny | policy_error:... | request_error:...
  determining: string[];   // policy ids reported by Cedar
  errors: string[];        // Cedar evaluation errors (a non-empty list always yields deny: fail closed)
  unconstrained_args?: string[]; // args the schema cannot express (free-form objects): invisible to policy
}

export interface CedarCall {
  principal: { type: string; id: string };
  action: { type: string; id: string };
  resource: { type: string; id: string };
  context: cedar.Context;
  entities: EntityJson[];
}

export interface EngineOptions {
  stateful: boolean;        // preparsed policy set (true) vs policies re-parsed per call (false)
  useSchema: boolean;       // pass preparsed schema (schema-based parsing of context/entities)
  validateRequest: boolean; // request validation against the schema (needs useSchema)
  slice: boolean;           // per-request entity slice (true) vs full directory (false)
}
export const RECOMMENDED: EngineOptions = { stateful: true, useSchema: true, validateRequest: true, slice: true };

let instanceCounter = 0; // preparsed sets live in wasm thread-local storage keyed by name: one name per engine

/** Format a JS number as a Cedar decimal (max 4 fractional digits); throws instead of rounding. */
export function toDecimal(n: number): { __extn: { fn: string; arg: string } } {
  if (!Number.isFinite(n)) throw new Error(`not_finite:${n}`);
  const s = n.toFixed(4);
  if (Number(s) !== n) throw new Error(`decimal_precision:${n} needs more than 4 fractional digits`);
  return { __extn: { fn: "decimal", arg: s } };
}

/** Host of a URL as the WHATWG parser sees it (the same parser fetch() uses); throws on garbage = deny. */
export function hostOf(url: string): string {
  return new URL(url).hostname.toLowerCase();
}

export class PolicyEngine {
  readonly policies: Record<string, string>;
  readonly schemaText: string;
  private fullStore: EntityJson[] | null = null;
  private readonly pset = `ursitoare-pset-${instanceCounter}`;
  private readonly schemaName = `ursitoare-schema-${instanceCounter++}`;

  constructor(readonly dir: Directory, readonly opts: EngineOptions = RECOMMENDED, policies = loadPolicyMap()) {
    this.policies = policies;
    this.schemaText = loadSchemaText();
    if (opts.stateful) {
      const p = cedar.preparsePolicySet(this.pset, { staticPolicies: this.policies });
      if (p.type !== "success") throw new Error("preparsePolicySet: " + JSON.stringify(p.errors));
    }
    if (opts.useSchema) {
      const s = cedar.preparseSchema(this.schemaName, this.schemaText);
      if (s.type !== "success") throw new Error("preparseSchema: " + JSON.stringify(s.errors));
    }
  }

  // ---------------------------------------------------------------- request construction
  /** Convert JS tool args to Cedar JSON, guided by the catalogue input schema. Fails closed on unknown keys. */
  toolArgs(tool: string, args: Record<string, unknown>): { cedar: Record<string, CedarValueJson>; unconstrained: string[] } {
    const out: Record<string, CedarValueJson> = {};
    const unconstrained: string[] = [];
    const block = this.dir.cat.blocks[tool];
    if (!block) {
      // delegate target (no catalogue input schema): nothing is typed -> nothing is constrainable
      return { cedar: out, unconstrained: Object.keys(args) };
    }
    for (const [k, v] of Object.entries(args)) {
      if (k === "url_host") throw new Error("reserved_arg:url_host is derived by the PEP");
      const def = block.input.properties[k];
      if (!def) throw new Error(`unknown_arg:${tool}.${k}`);
      const t = cedarTypeOf(def);
      if (t === null) { unconstrained.push(k); continue; }
      if (t === "decimal") out[k] = toDecimal(v as number);
      else if (t === "Set<String>") out[k] = v as string[];
      else out[k] = v as CedarValueJson;
      if (k === "url") out.url_host = hostOf(v as string); // derived: policies compare the parsed host, never a `like` over the raw URL
    }
    return { cedar: out, unconstrained };
  }

  private approvalContext(approvals: Approval[]) {
    const byRole: Record<string, CedarValueJson[]> = {};
    const seen = new Set<string>();
    for (const a of approvals) {
      const key = `${a.role}\u0000${a.approver}`;
      if (seen.has(key)) continue;
      seen.add(key);
      (byRole[a.role] ??= []).push(ent("User", a.approver));
    }
    return {
      approvals: approvals.map((a) => ({ approver: ent("User", a.approver), role: ent("Role", a.role) })),
      approvers_by_role: byRole,
    };
  }

  private entities(parts: EntityJson[]): EntityJson[] {
    if (!this.opts.slice) return (this.fullStore ??= this.dir.allEntities());
    return parts;
  }

  build(req: CheckRequest): { call: CedarCall; unconstrained?: string[] } {
    const d = this.dir;
    const principal = d.user(req.principal);
    const base = { principal: { type: "User", id: principal.id } };
    const A = (id: string) => ({ type: "Action", id });

    if (req.action === "activate_flow" || req.action === "start_run" || req.action === "edit_flow") {
      const f = d.flow(req.flow);
      return {
        call: {
          ...base, action: A(req.action), resource: { type: "Flow", id: f.id },
          context: req.action === "activate_flow" ? { flow_capabilities: { ...req.flow_capabilities } } : {},
          entities: this.entities([d.userEntity(principal), d.flowEntity(f)]),
        },
      };
    }

    const node = d.node(req.flow, req.node);
    const flow = d.flow(req.flow);
    if (req.kind !== undefined && req.kind !== node.kind) throw new Error(`kind_mismatch:${req.kind}!=${node.kind}`);
    if (req.flow_version !== undefined && req.flow_version !== flow.version) throw new Error(`version_mismatch:${req.flow_version}!=${flow.version}`);
    const runInit = d.user(("run_initiator" in req && req.run_initiator) || req.principal);
    const common = [d.userEntity(principal), d.nodeEntity(node), d.flowEntity(flow)];
    if (runInit.id !== principal.id) common.push(d.userEntity(runInit));
    const resource = { type: "Node", id: `${node.flow}/${node.id}` };

    if (req.action === "approve_task") {
      return { call: { ...base, action: A("approve_task"), resource, entities: this.entities(common),
        context: { run_initiator: ent("User", runInit.id), taint: req.taint ?? [] } } };
    }
    if (req.action === "invoke_llm") {
      return { call: { ...base, action: A("invoke_llm"), resource, entities: this.entities(common),
        context: { args: { ...(req.args.model_profile !== undefined ? { model_profile: req.args.model_profile } : {}),
                           ...(req.args.tools !== undefined ? { tools: req.args.tools } : {}) },
                   taint: req.taint, run_initiator: ent("User", runInit.id) } } };
    }
    // invoke_tool
    const tool = d.tool(req.tool);
    const { cedar: args, unconstrained } = this.toolArgs(req.tool, req.args);
    return {
      call: { ...base, action: A("invoke_tool"), resource, entities: this.entities([...common, d.toolEntity(tool)]),
        context: { tool: ent("Tool", tool.id), args, taint: req.taint, run_initiator: ent("User", runInit.id), ...this.approvalContext(req.approvals ?? []) } },
      unconstrained,
    };
  }

  // ---------------------------------------------------------------- evaluation
  /** Raw evaluator call for an already-built request (used by the benchmark to separate build cost). */
  evaluate(call: CedarCall): cedar.AuthorizationAnswer {
    const o = this.opts;
    if (o.stateful) {
      return cedar.statefulIsAuthorized({
        ...call, preparsedPolicySetId: this.pset,
        ...(o.useSchema ? { preparsedSchemaName: this.schemaName, validateRequest: o.validateRequest } : {}),
      });
    }
    return cedar.isAuthorized({
      ...call, policies: { staticPolicies: this.policies },
      ...(o.useSchema ? { schema: this.schemaText, validateRequest: o.validateRequest } : {}),
    });
  }

  interpret(ans: cedar.AuthorizationAnswer, unconstrained?: string[]): Decision {
    const u = unconstrained?.length ? { unconstrained_args: unconstrained } : {};
    if (ans.type === "failure") {
      return { decision: "deny", reason: "request_error:" + ans.errors.map((e) => e.message).join("; "), determining: [], errors: ans.errors.map((e) => e.message), ...u };
    }
    const r = ans.response;
    const errors = r.diagnostics.errors.map((e) => `${e.policyId}: ${e.error.message}`);
    const ids = [...r.diagnostics.reason].sort(); // Cedar returns these in hash-set order: not stable across calls
    // A policy that errors is SKIPPED by Cedar. A skipped forbid would turn into an allow, so any error => deny.
    if (errors.length) return { decision: "deny", reason: "policy_error:" + errors.join("; "), determining: ids, errors, ...u };
    if (r.decision === "allow") return { decision: "allow", reason: "permit:" + ids.join(","), determining: ids, errors, ...u };
    return { decision: "deny", reason: ids.length ? "forbid:" + ids.join(",") : "default_deny", determining: ids, errors, ...u };
  }

  /** policy.check(): never throws; any exception or unknown entity is a deny. */
  check(req: CheckRequest): Decision {
    try {
      const { call, unconstrained } = this.build(req);
      return this.interpret(this.evaluate(call), unconstrained);
    } catch (e) {
      return { decision: "deny", reason: "request_error:" + (e as Error).message, determining: [], errors: [] };
    }
  }
}

export type { Catalogue };
