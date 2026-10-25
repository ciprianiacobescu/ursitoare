// Static extractor: format-v0 flow (YAML) -> activation context + per-node expected policy requests.
import { readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { ROOT, loadCatalogue, type Catalogue } from "./catalogue.ts";
import type { FlowCapabilities } from "./engine.ts";

export interface ExtractorConfig {
  read_private_patterns: string[];
  delegate: { assumed_effect: "send" | "pay" | "write" | "read"; output_untrusted: boolean };
}
export function loadConfig(): ExtractorConfig {
  return JSON.parse(readFileSync(path.join(ROOT, "config/private-blocks.json"), "utf8"));
}

type Json = unknown;
interface FlowNode { kind: string; uses?: string; with?: Record<string, Json>; input?: Record<string, Json>; tools?: string[];
  items?: string; model_profile?: string; assignee_role?: string; target?: string; workflow?: string; subflow?: string; [k: string]: Json }
export interface FlowDoc { flow: string; version: string; start: string; nodes: Record<string, FlowNode> }

export interface ExpectedRequest {
  node: string;
  kind: string;
  action: "invoke_tool" | "invoke_llm" | "approve_task";
  tool?: string;
  effect?: string;
  effect_assumed?: boolean;
  model_profile?: string;
  tools?: string[];                 // agent allowlist (invoke_llm of an agent carries these)
  assignee_role?: string;
  static_taint: string[];           // labels that can reach this call's arguments
  args: Record<string, Json>;       // literal values as written; "${{ ref }}" strings kept symbolic
  arg_refs: string[];               // references used by the arguments
  dynamic_args?: boolean;           // agent-chosen arguments: not statically known
}

export interface Analysis {
  flow: string;
  version: string;
  capabilities: FlowCapabilities;
  capability_evidence: { reads_untrusted: string[]; reads_private: string[]; has_send_or_pay: string[] };
  requests: ExpectedRequest[];
  assumptions: string[];
}

const REF = /\$\{\{\s*([^}]+?)\s*\}\}/g;
function refsIn(v: Json, out: string[] = []): string[] {
  if (typeof v === "string") { for (const m of v.matchAll(REF)) out.push(m[1].trim()); }
  else if (Array.isArray(v)) v.forEach((x) => refsIn(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => refsIn(x, out));
  return out;
}
const globMatch = (pat: string, s: string) => new RegExp("^" + pat.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$").test(s);

export function analyze(doc: FlowDoc, cat: Catalogue = loadCatalogue(), cfg: ExtractorConfig = loadConfig()): Analysis {
  const nodes = doc.nodes;
  const memo = new Map<string, Set<string>>();

  // taint labels carried by `nodes.<id>.output.<path>`
  const outputTaint = (id: string, firstSeg: string | undefined): Set<string> => {
    const n = nodes[id];
    if (!n) return new Set();
    switch (n.kind) {
      case "block": {
        const b = cat.blocks[n.uses!];
        return b?.untrusted_fields?.includes(firstSeg ?? "") ? new Set(["untrusted"]) : new Set();
      }
      case "foreach": {
        const b = n.uses ? cat.blocks[n.uses] : undefined;
        return b?.untrusted_fields?.length ? new Set(["untrusted"]) : new Set();
      }
      case "delegate":
        return cfg.delegate.output_untrusted ? new Set(["untrusted"]) : new Set();
      case "llm.extract":
      case "code": { // format v0 section 4.4: passing through extract/code clears 'untrusted' and labels 'extracted'
        const t = inputTaint(id);
        return t.size ? new Set(["extracted"]) : new Set();
      }
      case "llm.generate":
      case "llm.decide":
      case "agent":
      case "subflow":
        return inputTaint(id); // conservative: no clearing (assumption, not in format v0)
      default:
        return new Set(); // human.*: assignee-authored, trusted
    }
  };
  const taintOfRef = (ref: string, forNode: string): Set<string> => {
    const parts = ref.split(".");
    if (parts[0] === "nodes") return outputTaint(parts[1], parts[3]);
    if (parts[0] === "item") { // foreach item: taint of the items source
      const items = nodes[forNode]?.items;
      return items ? taintOfRef(refsIn(items)[0] ?? "", forNode) : new Set();
    }
    return new Set(); // inputs.*: assumed trusted (see assumptions)
  };
  const argValues = (n: FlowNode): Json[] => [n.with ?? {}, n.input ?? {}, n.goal ?? null, n.items ?? null];
  const inputTaint = (id: string): Set<string> => {
    if (memo.has(id)) return memo.get(id)!;
    memo.set(id, new Set()); // cycles are not allowed in v0; guard anyway
    const t = new Set<string>();
    for (const r of refsIn(argValues(nodes[id]))) for (const x of taintOfRef(r, id)) t.add(x);
    memo.set(id, t);
    return t;
  };

  const requests: ExpectedRequest[] = [];
  const ev = { reads_untrusted: [] as string[], reads_private: [] as string[], has_send_or_pay: [] as string[] };
  const noteTool = (nodeId: string, tool: string) => {
    const b = cat.blocks[tool];
    if (!b) return;
    if (b.untrusted_fields?.length) ev.reads_untrusted.push(`${nodeId}:${tool}`);
    if (b.effect === "read" && cfg.read_private_patterns.some((p) => globMatch(p, tool))) ev.reads_private.push(`${nodeId}:${tool}`);
    if (b.effect === "send" || b.effect === "pay") ev.has_send_or_pay.push(`${nodeId}:${tool}`);
  };
  const toolReq = (nodeId: string, n: FlowNode, tool: string, extra: Partial<ExpectedRequest> = {}): ExpectedRequest => ({
    node: nodeId, kind: n.kind, action: "invoke_tool", tool, effect: cat.blocks[tool]?.effect,
    static_taint: [...inputTaint(nodeId)].sort(), args: (n.with ?? {}) as Record<string, Json>, arg_refs: refsIn(n.with ?? {}), ...extra,
  });

  for (const [id, n] of Object.entries(nodes)) {
    switch (n.kind) {
      case "block":
        noteTool(id, n.uses!); requests.push(toolReq(id, n, n.uses!)); break;
      case "foreach":
        if (n.uses) { noteTool(id, n.uses); requests.push(toolReq(id, n, n.uses)); }
        break; // subflow: authorised per node when the subflow itself runs
      case "agent":
        requests.push({ node: id, kind: n.kind, action: "invoke_llm", model_profile: n.model_profile ?? "default", tools: n.tools,
          static_taint: [...inputTaint(id)].sort(), args: {}, arg_refs: refsIn(argValues(n)) });
        for (const t of n.tools ?? []) { noteTool(id, t); requests.push(toolReq(id, n, t, { args: {}, dynamic_args: true })); }
        break;
      case "llm.extract": case "llm.generate": case "llm.decide":
        requests.push({ node: id, kind: n.kind, action: "invoke_llm", model_profile: n.model_profile ?? "default",
          static_taint: [...inputTaint(id)].sort(), args: {}, arg_refs: refsIn(argValues(n)) });
        break;
      case "human.approval":
        requests.push({ node: id, kind: n.kind, action: "approve_task", assignee_role: n.assignee_role, static_taint: [], args: {}, arg_refs: [] });
        break;
      case "delegate": {
        const tool = `${n.target}:${n.workflow}`;
        requests.push(toolReq(id, n, tool, { effect: cfg.delegate.assumed_effect, effect_assumed: true }));
        if (cfg.delegate.assumed_effect === "send" || cfg.delegate.assumed_effect === "pay") ev.has_send_or_pay.push(`${id}:${tool}`);
        if (cfg.delegate.output_untrusted) ev.reads_untrusted.push(`${id}:${tool}`);
        break;
      }
      default: break; // code, switch, wait, subflow, human.form, end: no policy request in the spike
    }
  }
  const capabilities: FlowCapabilities = {
    reads_untrusted: ev.reads_untrusted.length > 0, reads_private: ev.reads_private.length > 0, has_send_or_pay: ev.has_send_or_pay.length > 0,
  };
  return {
    flow: doc.flow, version: doc.version, capabilities, capability_evidence: ev, requests,
    assumptions: [
      "reads_private comes from config/private-blocks.json (the catalogue has no data-classification marker)",
      `delegate nodes: effect assumed '${cfg.delegate.assumed_effect}', result assumed ${cfg.delegate.output_untrusted ? "untrusted" : "trusted"}`,
      "inputs.* are assumed trusted; llm.generate/decide/agent/subflow outputs inherit their inputs' taint (no clearing)",
      "capabilities are flow-level (any node), as in design section 4.4; they do not prove the data actually flows to the effect",
    ],
  };
}

export function loadFlow(file: string): FlowDoc {
  return YAML.parse(readFileSync(file, "utf8")) as FlowDoc;
}

/** Resolve "${{ ref }}" values against a sample environment (used only to dry-run the expected requests). */
export function resolveValue(v: Json, env: { inputs: Record<string, Json>; nodes: Record<string, { output: Record<string, Json> }> }): Json {
  const get = (ref: string): Json => ref.split(".").reduce<Json>((acc, k) => (acc as Record<string, Json>)?.[k], env as unknown as Json);
  if (typeof v === "string") {
    const whole = /^\$\{\{\s*([^}]+?)\s*\}\}$/.exec(v);
    if (whole) return get(whole[1].trim());
    return v.replace(REF, (_m, r: string) => String(get(r.trim())));
  }
  if (Array.isArray(v)) return v.map((x) => resolveValue(x, env));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolveValue(x, env)]));
  return v;
}
