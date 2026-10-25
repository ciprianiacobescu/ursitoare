/**
 * Format v0 validator.
 *
 *   L1 schema   : JSON Schema 2020-12 (schema/flow.v0.schema.json) + static checks on strings
 *                 (reference syntax, code source syntax, embedded JSON Schemas)
 *   L2 registry : catalogue/registry lookups, successors, reachability, cycles
 *   L3 data flow: reference resolution, dominance, types, switch keys, item scoping, taint
 *
 * Layers are gated: L2 runs only if L1 is clean, L3 only if L2 is clean (`layers_run` reports this).
 * The result is deterministic: issues are sorted by (layer, path, code, message).
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";
import type { BlockDef, Catalogue, Issue, Layer, ValidationResult } from "./types.ts";
import {
  escPtr,
  isSingleRef,
  refToString,
  scan,
  suspiciousInterpolation,
  valueFields,
  walkStrings,
  type Ref,
} from "./refs.ts";
import {
  admits,
  compat,
  deref,
  enumValues,
  fmtTypes,
  isObj,
  jsType,
  own,
  resolvePath,
  typeSet,
  type S,
} from "./jsonschema.ts";
import {
  availability,
  buildEdges,
  findCycles,
  reachableFrom,
  requiredSuccessorFields,
  successorFields,
  topoOrder,
  type Edge,
} from "./graph.ts";

const require = createRequire(import.meta.url);
const Ajv2020 = (() => {
  const m = require("ajv/dist/2020.js");
  return m.default ?? m;
})();

export const SCHEMA_PATH = fileURLToPath(new URL("../schema/flow.v0.schema.json", import.meta.url));
export const DEFAULT_CATALOGUE_PATH = fileURLToPath(new URL("../../shared/catalogue/blocks.v0.json", import.meta.url));

let _ajv: any;
let _validateFlow: any;
function ajvInstance() {
  if (!_ajv) {
    _ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, discriminator: true });
    _validateFlow = _ajv.compile(JSON.parse(readFileSync(SCHEMA_PATH, "utf8")));
  }
  return { ajv: _ajv, validateFlow: _validateFlow };
}

export function loadCatalogue(path: string = DEFAULT_CATALOGUE_PATH): Catalogue {
  return JSON.parse(readFileSync(path, "utf8")) as Catalogue;
}

/* ------------------------------------------------------------------ helpers */

class Sink {
  errors: Issue[] = [];
  warnings: Issue[] = [];
  private seenW = new Set<string>();
  err(layer: Layer, code: string, node: string | null, path: string, message: string) {
    this.errors.push({ layer, code, node, path, message });
  }
  warn(layer: Layer, code: string, node: string | null, path: string, message: string) {
    const k = `${code}|${path}|${message}`;
    if (this.seenW.has(k)) return;
    this.seenW.add(k);
    this.warnings.push({ layer, code, node, path, message });
  }
}

const unesc = (s: string) => s.replace(/~1/g, "/").replace(/~0/g, "~");
function nodeOfPath(path: string): string | null {
  const m = /^\/nodes\/([^/]+)/.exec(path);
  return m ? unesc(m[1]) : null;
}
const np = (id: string, rest = "") => `/nodes/${escPtr(id)}${rest}`;

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0); // code-unit order: locale independent

function sortIssues(a: Issue[]): Issue[] {
  return [...a].sort((x, y) => cmp(x.layer, y.layer) || cmp(x.path, y.path) || cmp(x.code, y.code) || cmp(x.message, y.message));
}

/* ------------------------------------------------------------------- L1 */

const AJV_CODE: Record<string, string> = {
  required: "L1_REQUIRED",
  additionalProperties: "L1_ADDITIONAL_PROPERTY",
  type: "L1_TYPE",
  const: "L1_CONST",
  enum: "L1_ENUM",
  discriminator: "L1_UNKNOWN_KIND",
  pattern: "L1_PATTERN",
  minItems: "L1_MIN_ITEMS",
  uniqueItems: "L1_UNIQUE_ITEMS",
  minimum: "L1_RANGE",
  maximum: "L1_RANGE",
  minLength: "L1_MIN_LENGTH",
  minProperties: "L1_MIN_PROPERTIES",
  anyOf: "L1_FOREACH_BODY",
  not: "L1_FOREACH_BODY",
};

const FORBIDDEN_IDENTS = new Set([
  "fetch",
  "require",
  "process",
  "XMLHttpRequest",
  "WebSocket",
  "setTimeout",
  "setInterval",
  "eval",
  "Function",
  "Date",
  "crypto",
  "Atomics",
  "globalThis",
]);

function walkAst(node: any, fn: (n: any, parent: any, key: string) => void, parent: any = null, key = "") {
  if (!node || typeof node.type !== "string") return;
  fn(node, parent, key);
  for (const [k, v] of Object.entries(node)) {
    if (k === "type" || k === "start" || k === "end" || k === "loc") continue;
    if (Array.isArray(v)) v.forEach((c) => walkAst(c, fn, node, k));
    else if (v && typeof v === "object") walkAst(v, fn, node, k);
  }
}

function hasOwnReturn(fnNode: any): boolean {
  let found = false;
  const visit = (n: any) => {
    if (!n || typeof n.type !== "string" || found) return;
    if (n.type === "ReturnStatement") {
      found = true;
      return;
    }
    if (n.type === "FunctionDeclaration" || n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression") return;
    for (const [k, v] of Object.entries(n)) {
      if (k === "type" || k === "start" || k === "end") continue;
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === "object") visit(v);
    }
  };
  (fnNode.body.body as any[]).forEach(visit);
  return found;
}

function checkCodeSource(id: string, source: string, s: Sink) {
  const wrapped = `(function (input) {\n${source}\n})`;
  let ast: any;
  try {
    ast = acorn.parse(wrapped, { ecmaVersion: "latest", sourceType: "script" });
  } catch (e: any) {
    const line = e.loc ? e.loc.line - 1 : "?";
    s.err("L1", "L1_CODE_SYNTAX", id, np(id, "/source"), `code source does not parse (line ${line}): ${String(e.message).replace(/ \(\d+:\d+\)$/, "")}`);
    return;
  }
  const fnExpr = ast.body[0].expression;
  if (!hasOwnReturn(fnExpr)) {
    s.err("L1", "L1_CODE_NO_RETURN", id, np(id, "/source"), "code source never returns a value; it must `return` an object");
  }
  walkAst(fnExpr, (n, parent, key) => {
    if (n.type === "Identifier" && FORBIDDEN_IDENTS.has(n.name)) {
      if (parent?.type === "MemberExpression" && key === "property" && !parent.computed) return;
      if (parent?.type === "Property" && key === "key" && !parent.computed) return;
      s.warn("L1", "W_CODE_FORBIDDEN_API", id, np(id, "/source"), `code uses "${n.name}", which is not available or not deterministic in the code sandbox`);
    }
    if (n.type === "MemberExpression" && !n.computed && n.object?.name === "Math" && n.property?.name === "random") {
      s.warn("L1", "W_CODE_FORBIDDEN_API", id, np(id, "/source"), `code uses "Math.random", which is not deterministic in the code sandbox`);
    }
    if (n.type === "ImportExpression") {
      s.warn("L1", "W_CODE_FORBIDDEN_API", id, np(id, "/source"), `code uses dynamic import, which is not available in the code sandbox`);
    }
  });
}

function l1(doc: unknown, s: Sink) {
  const { ajv, validateFlow } = ajvInstance();
  const ok = validateFlow(doc);
  if (!ok) {
    const seen = new Set<string>();
    for (const e of validateFlow.errors as any[]) {
      if (e.keyword === "if" || e.keyword === "oneOf") continue;
      if (String(e.schemaPath).includes("/anyOf/")) continue;
      if (e.keyword === "discriminator" && e.params?.error === "tag") continue; // "kind" missing/not a string is reported by required/type
      if (e.keyword !== "propertyNames" && e.propertyName !== undefined) continue; // folded into the propertyNames issue
      if (e.keyword === "propertyNames") {
        const name = e.params.propertyName as string;
        const p = `${e.instancePath}/${escPtr(name)}`;
        const k = `L1_PATTERN|${p}`;
        if (!seen.has(k)) {
          seen.add(k);
          const what = e.instancePath === "/nodes" ? "node id" : "name";
          s.err("L1", "L1_PATTERN", nodeOfPath(p), p, `${what} "${name}" is invalid: ${what === "node id" ? "ids are snake_case and match [a-z][a-z0-9_]*" : "name does not match the required pattern"}`);
        }
        continue;
      }
      let path: string = e.instancePath;
      if (e.keyword === "required") path += `/${escPtr(e.params.missingProperty)}`;
      if (e.keyword === "additionalProperties") path += `/${escPtr(e.params.additionalProperty)}`;
      if (e.params?.propertyName !== undefined) path += `/${escPtr(e.params.propertyName)}`;
      const code = AJV_CODE[e.keyword];
      if (!code) throw new Error(`unmapped JSON Schema keyword "${e.keyword}" at ${e.instancePath}`);
      let message = e.message as string;
      if (e.keyword === "required") message = `missing required field "${e.params.missingProperty}"`;
      else if (e.keyword === "additionalProperties") message = `unknown field "${e.params.additionalProperty}"`;
      else if (e.keyword === "discriminator") message = e.params?.tagValue !== undefined ? `unknown node kind "${e.params.tagValue}"` : `node needs a string "kind"`;
      else if (e.keyword === "anyOf" || e.keyword === "not") message = `foreach needs exactly one of (uses + with) or (subflow + with)`;
      else if (e.keyword === "const") message = `must be ${JSON.stringify(e.params.allowedValue)}`;
      else if (e.keyword === "enum") message = `must be one of ${JSON.stringify(e.params.allowedValues)}`;
      else if (e.keyword === "pattern") message = `${message}`;
      const key = `${code}|${path}|${message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      s.err("L1", code, nodeOfPath(path), path || "", message);
    }
  }
  if (!isObj(doc)) return;

  // embedded JSON Schemas must themselves be valid 2020-12 schemas
  const checkSchema = (sch: unknown, path: string, id: string | null) => {
    if (!isObj(sch)) return;
    let valid = false;
    let why = "";
    try {
      valid = ajv.validateSchema(sch) as boolean;
      if (!valid) why = ajv.errorsText(ajv.errors, { dataVar: "schema" });
    } catch (e: any) {
      why = String(e.message);
    }
    if (!valid) s.err("L1", "L1_INVALID_JSON_SCHEMA", id, path, `not a valid JSON Schema (2020-12): ${why}`);
  };
  checkSchema(doc.inputs, "/inputs", null);

  const nodes = doc.nodes;
  if (!isObj(nodes)) return;
  for (const id of Object.keys(nodes).sort()) {
    const n = nodes[id];
    if (!isObj(n) || typeof n.kind !== "string") continue;
    if (n.output_schema !== undefined) checkSchema(n.output_schema, np(id, "/output_schema"), id);
    if (n.form_schema !== undefined) checkSchema(n.form_schema, np(id, "/form_schema"), id);

    // references are only interpreted in value positions
    for (const { field, value } of valueFields(n)) {
      walkStrings(value, np(id, `/${field}`), (str, path) => {
        for (const seg of scan(str)) {
          if (seg.type === "ref" && seg.error) s.err("L1", "L1_REF_SYNTAX", id, path, `${seg.error} (in "${str}")`);
          if (seg.type === "text") {
            const sus = suspiciousInterpolation(seg.text);
            if (sus && !seg.text.includes("${{")) s.warn("L1", "W_SUSPICIOUS_INTERPOLATION", id, path, sus);
          }
        }
      });
    }
    for (const f of ["instructions", "goal"]) {
      if (typeof n[f] === "string" && n[f].includes("${{"))
        s.err("L1", "L1_REF_NOT_ALLOWED", id, np(id, `/${f}`), `"${f}" is plain text; references (\${{ ... }}) are not interpolated here. Pass data through "input" instead`);
    }
    if (typeof n.source === "string") {
      if (/\$\{\{\s*(inputs|nodes|item)\b/.test(n.source))
        s.err("L1", "L1_REF_NOT_ALLOWED", id, np(id, "/source"), `code "source" is plain JavaScript; references are not interpolated. Pass data through "input" and read it as input.<name>`);
      if (n.kind === "code") checkCodeSource(id, n.source, s);
    }
  }
}

/* ------------------------------------------------------------------- L2 */

function l2(doc: any, cat: Catalogue, s: Sink) {
  const nodes: Record<string, any> = doc.nodes;
  const ids = Object.keys(nodes).sort();

  if (!Object.prototype.hasOwnProperty.call(nodes, doc.start))
    s.err("L2", "L2_START_UNKNOWN", null, "/start", `start node "${doc.start}" does not exist`);

  const checkWith = (id: string, withPath: string, w: unknown, inputSchema: S, what: string) => {
    if (!isObj(w) || !isObj(inputSchema)) return;
    const props = isObj(inputSchema.properties) ? Object.keys(inputSchema.properties) : [];
    for (const k of Object.keys(w).sort())
      if (!props.includes(k))
        s.err("L2", "L2_WITH_UNKNOWN_PARAM", id, `${withPath}/${escPtr(k)}`, `"${k}" is not an input of ${what} (inputs: ${props.join(", ") || "none"})`);
    const req: string[] = Array.isArray(inputSchema.required) ? inputSchema.required : [];
    for (const k of req)
      if (!Object.prototype.hasOwnProperty.call(w, k))
        s.err("L2", "L2_WITH_MISSING_REQUIRED", id, withPath, `${what} requires input "${k}"`);
  };
  const block = (id: string, path: string, uses: string): BlockDef | null => {
    const b = cat.blocks[uses];
    if (!b) {
      const name = uses.split("@")[0];
      const majors = Object.keys(cat.blocks).filter((k) => k.split("@")[0] === name);
      s.err("L2", "L2_UNKNOWN_BLOCK", id, path, majors.length ? `block "${uses}" has no such major version (available: ${majors.join(", ")})` : `block "${uses}" is not in the catalogue`);
      return null;
    }
    return b;
  };
  const flowReg = (id: string, path: string, ref: string) => {
    const f = cat.flows_registry?.[ref];
    if (!f) s.err("L2", "L2_UNKNOWN_FLOW", id, path, `flow "${ref}" is not in the flows registry (available: ${Object.keys(cat.flows_registry ?? {}).join(", ") || "none"})`);
    return f ?? null;
  };
  const profile = (id: string, n: any) => {
    if (n.model_profile !== undefined && !cat.model_profiles.includes(n.model_profile))
      s.err("L2", "L2_UNKNOWN_MODEL_PROFILE", id, np(id, "/model_profile"), `model profile "${n.model_profile}" does not exist (available: ${cat.model_profiles.join(", ")})`);
  };
  const role = (id: string, n: any) => {
    if (!cat.roles.includes(n.assignee_role))
      s.err("L2", "L2_UNKNOWN_ROLE", id, np(id, "/assignee_role"), `role "${n.assignee_role}" does not exist (available: ${cat.roles.join(", ")})`);
  };

  for (const id of ids) {
    const n = nodes[id];
    switch (n.kind) {
      case "block": {
        const b = block(id, np(id, "/uses"), n.uses);
        if (b) checkWith(id, np(id, "/with"), n.with, b.input, `block ${n.uses}`);
        break;
      }
      case "llm.extract":
      case "llm.generate":
        profile(id, n);
        break;
      case "llm.decide": {
        profile(id, n);
        const cases = Object.keys(n.cases);
        for (const o of n.outcomes)
          if (!cases.includes(o)) s.err("L2", "L2_DECIDE_CASE_MISSING", id, np(id, "/cases"), `outcome "${o}" has no entry in cases`);
        for (const c of [...cases].sort())
          if (!n.outcomes.includes(c)) s.err("L2", "L2_DECIDE_CASE_EXTRA", id, np(id, `/cases/${escPtr(c)}`), `case "${c}" is not one of the outcomes (${n.outcomes.join(", ")})`);
        break;
      }
      case "agent":
        profile(id, n);
        n.tools.forEach((t: string, i: number) => block(id, np(id, `/tools/${i}`), t));
        break;
      case "human.approval":
      case "human.form":
        role(id, n);
        break;
      case "foreach": {
        if (n.uses !== undefined) {
          const b = block(id, np(id, "/uses"), n.uses);
          if (b) checkWith(id, np(id, "/with"), n.with, b.input, `block ${n.uses}`);
        } else if (n.subflow !== undefined) {
          const f = flowReg(id, np(id, "/subflow"), n.subflow);
          if (f) checkWith(id, np(id, "/with"), n.with, f.inputs, `flow ${n.subflow}`);
        }
        break;
      }
      case "subflow": {
        const f = flowReg(id, np(id, "/flow"), n.flow);
        if (f) checkWith(id, np(id, "/with"), n.with, f.inputs, `flow ${n.flow}`);
        break;
      }
      case "delegate": {
        const wf = own(cat.delegate_targets, n.target);
        if (!wf) s.err("L2", "L2_UNKNOWN_DELEGATE_TARGET", id, np(id, "/target"), `delegate target "${n.target}" does not exist (available: ${Object.keys(cat.delegate_targets ?? {}).join(", ")})`);
        else if (!wf.includes(n.workflow))
          s.err("L2", "L2_UNKNOWN_DELEGATE_WORKFLOW", id, np(id, "/workflow"), `workflow "${n.workflow}" is not available on ${n.target} (available: ${wf.join(", ")})`);
        break;
      }
    }
  }

  // successors
  for (const id of ids) {
    const n = nodes[id];
    for (const f of requiredSuccessorFields(n.kind))
      if (n[f] === undefined) s.err("L2", "L2_MISSING_SUCCESSOR", id, np(id, `/${f}`), `${n.kind} node "${id}" has no "${f}" successor`);
    for (const f of successorFields(n))
      if (typeof f.id === "string" && !Object.prototype.hasOwnProperty.call(nodes, f.id))
        s.err("L2", "L2_UNKNOWN_SUCCESSOR", id, np(id, f.path), `successor "${f.id}" does not exist`);
  }

  const edges = buildEdges(nodes);
  if (Object.prototype.hasOwnProperty.call(nodes, doc.start)) {
    const reach = reachableFrom(doc.start, edges);
    for (const id of ids)
      if (!reach.has(id)) s.err("L2", "L2_UNREACHABLE_NODE", id, np(id), `node "${id}" cannot be reached from "${doc.start}"`);
  }
  for (const cyc of findCycles(ids, edges))
    s.err("L2", "L2_CYCLE", cyc[0], np(cyc[0]), `cycle ${[...cyc, cyc[0]].join(" -> ")}; v0 flows must be acyclic`);
  // Termination: with a finite acyclic graph where every non-end node has all its successors,
  // every path ends at an `end` node. The only residual failure mode is having no end at all.
  if (!ids.some((i) => nodes[i].kind === "end"))
    s.err("L2", "L2_NO_END", null, "/nodes", `flow has no "end" node, so no path can terminate`);
}

/* ------------------------------------------------------------------- L3 */

type Label = "trusted" | "extracted" | "untrusted";
const RANK: Record<Label, number> = { trusted: 0, extracted: 1, untrusted: 2 };
const join = (a: Label[]): Label => a.reduce<Label>((m, x) => (RANK[x] > RANK[m] ? x : m), "trusted");

interface Resolved {
  schema: S;
  root: S;
  optional: boolean;
  label: Label;
  ref: Ref;
  producer: string | null;
}
interface OutInfo {
  schema: S;
  root: S;
}
interface NodeLabels {
  def: Label;
  fields: Record<string, Label>;
}
interface ForeachCtx {
  itemSchema: S;
  itemRoot: S;
  itemLabel: Label;
  /** items could not be resolved to an array; item.* errors would only be noise */
  unknown?: boolean;
}
type SinkKind = "consequential" | "agent" | "opaque" | null;

const isConsequential = (b: BlockDef | undefined) => !!b && b.effect !== "read";

function isPrivateRead(b: BlockDef): boolean {
  if (b.effect !== "read") return false;
  if (typeof b.private === "boolean") return b.private;
  const props = isObj(b.input?.properties) ? Object.keys(b.input.properties) : [];
  return !props.includes("url"); // reads that take a url are public-web fetches
}

function l3(doc: any, cat: Catalogue, s: Sink) {
  const nodes: Record<string, any> = doc.nodes;
  const ids = Object.keys(nodes).sort();
  const edges = buildEdges(nodes);
  const order = topoOrder(ids, edges);
  const avail = availability(doc.start, order, edges);
  const inputsSchema = doc.inputs;

  /* ---- output schema of every node ---- */
  const out = new Map<string, OutInfo | null>();
  const perItem = (n: any): OutInfo | null => {
    if (n.uses !== undefined && cat.blocks[n.uses]) return { schema: cat.blocks[n.uses].output, root: cat.blocks[n.uses].output };
    if (n.subflow !== undefined && cat.flows_registry[n.subflow]) return { schema: cat.flows_registry[n.subflow].outputs, root: cat.flows_registry[n.subflow].outputs };
    return null;
  };
  for (const id of ids) {
    const n = nodes[id];
    let o: OutInfo | null = null;
    switch (n.kind) {
      case "block": {
        const b = cat.blocks[n.uses];
        if (b) o = { schema: b.output, root: b.output };
        break;
      }
      case "code":
      case "llm.extract":
      case "llm.generate":
      case "agent":
        o = { schema: n.output_schema, root: n.output_schema };
        break;
      case "human.form":
        o = { schema: n.form_schema, root: n.form_schema };
        break;
      case "llm.decide": {
        const sc = {
          type: "object",
          properties: { outcome: { type: "string", enum: n.outcomes }, rationale: { type: "string" } },
          required: ["outcome", "rationale"],
        };
        o = { schema: sc, root: sc };
        break;
      }
      case "human.approval": {
        const sc = {
          type: "object",
          properties: { decision: { type: "string", enum: ["approved", "rejected"] }, approver: { type: "string" }, comment: { type: "string" } },
          required: ["decision", "approver", "comment"],
        };
        o = { schema: sc, root: sc };
        break;
      }
      case "foreach": {
        const pi = perItem(n);
        const sc: any = {
          type: "object",
          properties: { results: { type: "array", ...(pi ? { items: pi.schema } : {}) } },
          required: ["results"],
        };
        if (pi && isObj(pi.root) && pi.root.$defs) sc.$defs = pi.root.$defs;
        o = { schema: sc, root: sc };
        break;
      }
      case "subflow": {
        const f = cat.flows_registry[n.flow];
        if (f) o = { schema: f.outputs, root: f.outputs };
        break;
      }
      case "delegate": {
        const sc = {
          type: "object",
          properties: { correlation_id: { type: "string" }, result: { type: "object" } },
          required: ["correlation_id", "result"],
        };
        o = { schema: sc, root: sc };
        break;
      }
      default:
        o = null; // switch, wait, end
    }
    out.set(id, o);
  }

  const labels = new Map<string, NodeLabels>();
  const untrustedTop = (b: BlockDef): Record<string, Label> => {
    const f: Record<string, Label> = {};
    for (const u of b.untrusted_fields ?? []) f[u.split(".")[0]] = "untrusted";
    return f;
  };
  const blockHasUntrusted = (b: BlockDef | undefined) => !!b && (b.untrusted_fields ?? []).length > 0;

  /* ---- witness path for dominance failures ---- */
  const adj = new Map<string, Edge[]>();
  for (const e of edges) (adj.get(e.from) ?? adj.set(e.from, []).get(e.from)!).push(e);
  const witness = (producer: string, consumer: string): string[] | null => {
    const prev = new Map<string, string | null>([[doc.start, null]]);
    const q = [doc.start];
    if (doc.start === producer && !(doc.start === consumer)) {
      /* producer is start: its output exists on non-timeout edges only */
    }
    while (q.length) {
      const cur = q.shift()!;
      if (cur === consumer) {
        const p: string[] = [];
        for (let x: string | null = cur; x !== null; x = prev.get(x)!) p.unshift(x);
        return p;
      }
      for (const e of adj.get(cur) ?? []) {
        if (e.from === producer && e.producesOutput) continue;
        if (!prev.has(e.to)) {
          prev.set(e.to, cur);
          q.push(e.to);
        }
      }
    }
    return null;
  };

  /* ---- per-node processing ---- */
  for (const id of order) {
    const n = nodes[id];
    const A = avail.get(id) ?? new Set<string>();
    const consumed: Label[] = [];
    let foreachCtx: ForeachCtx | null = null;

    const resolve = (ref: Ref, path: string): Resolved | null => {
      const refStr = refToString(ref);
      switch (ref.root) {
        case "inputs": {
          const r = resolvePath(inputsSchema, inputsSchema, ref.path);
          if (!r.ok) {
            s.err("L3", "L3_REF_UNKNOWN_PATH", id, path, `reference "${refStr}" does not resolve: ${r.reason.replace("the root", "the flow inputs")}`);
            return null;
          }
          return { schema: r.schema, root: inputsSchema, optional: r.optional, label: "trusted", ref, producer: null };
        }
        case "item": {
          if (!foreachCtx) {
            s.err("L3", "L3_ITEM_OUTSIDE_FOREACH", id, path, `"${refStr}" can only be used in the "with" of a foreach node`);
            return null;
          }
          if (foreachCtx.unknown) return null;
          if (ref.path.length === 0)
            return { schema: foreachCtx.itemSchema, root: foreachCtx.itemRoot, optional: false, label: foreachCtx.itemLabel, ref, producer: null };
          if (foreachCtx.itemSchema === undefined) {
            s.err("L3", "L3_REF_UNKNOWN_PATH", id, path, `reference "${refStr}" does not resolve: the element type of the array is not declared`);
            return null;
          }
          const r = resolvePath(foreachCtx.itemSchema, foreachCtx.itemRoot, ref.path);
          if (!r.ok) {
            s.err("L3", "L3_REF_UNKNOWN_PATH", id, path, `reference "${refStr}" does not resolve: ${r.reason.replace("the root", "each item")}`);
            return null;
          }
          return { schema: r.schema, root: foreachCtx.itemRoot, optional: r.optional, label: foreachCtx.itemLabel, ref, producer: null };
        }
        case "node": {
          const target = own(nodes, ref.id);
          if (!target) {
            s.err("L3", "L3_REF_UNKNOWN_NODE", id, path, `reference "${refStr}" names node "${ref.id}", which does not exist`);
            return null;
          }
          if (ref.field === "outcome" && target.kind !== "llm.decide") {
            s.err("L3", "L3_REF_OUTCOME_NOT_DECIDE", id, path, `"${refStr}": .outcome exists only on llm.decide nodes, but "${ref.id}" is ${target.kind}`);
            return null;
          }
          const oi = out.get(ref.id);
          if (!oi) {
            s.err("L3", "L3_REF_NO_OUTPUT", id, path, `"${refStr}": ${target.kind} node "${ref.id}" produces no output`);
            return null;
          }
          if (!A.has(ref.id)) {
            const w = witness(ref.id, id);
            const why = ref.id === id ? "a node cannot read its own output" : w ? `on the path ${w.join(" -> ")}, "${ref.id}" has not produced output (it is not on that path, or the path leaves it through a timeout branch, which carries no output)` : `"${ref.id}" is not guaranteed to run before "${id}"`;
            s.err("L3", "L3_REF_NOT_DOMINATING", id, path, `"${refStr}": ${why}. A producer must run on every path from start to its consumer`);
            return null;
          }
          const segs = ref.field === "outcome" ? ["outcome"] : ref.path;
          const r = resolvePath(oi.schema, oi.root, segs);
          if (!r.ok) {
            s.err("L3", "L3_REF_UNKNOWN_PATH", id, path, `reference "${refStr}" does not resolve: ${r.reason.replace("the root", `the output of "${ref.id}"`)}`);
            return null;
          }
          const nl = labels.get(ref.id);
          const label: Label = nl ? (own(nl.fields, segs[0]) ?? nl.def) : "trusted";
          return { schema: r.schema, root: oi.root, optional: r.optional, label, ref, producer: ref.id };
        }
      }
    };

    const taintSink = (res: Resolved, path: string, sink: SinkKind, why: string) => {
      if (res.label !== "untrusted" || !sink) return;
      const src = res.producer ? `output of "${res.producer}"` : "foreach items";
      if (sink === "consequential")
        s.err("L3", "L3_TAINT_TO_CONSEQUENTIAL", id, path, `untrusted content (${refToString(res.ref)}, ${src}) flows directly into ${why}. Pass it through an llm.extract (or code) node first and use that node's output`);
      else if (sink === "agent")
        s.err("L3", "L3_TAINT_TO_AGENT_WITH_EFFECTS", id, path, `untrusted content (${refToString(res.ref)}, ${src}) flows into an agent whose tools include ${why}. Pass it through an llm.extract (or code) node first`);
      else
        s.warn("L3", "W_TAINT_TO_OPAQUE_CALL", id, path, `untrusted content (${refToString(res.ref)}, ${src}) is passed to a ${why} whose effects are unknown. Consider passing it through llm.extract first`);
    };

    const literalCheck = (v: unknown, cs: S, cr: S, path: string) => {
      const t = jsType(v);
      const ts = typeSet(cs, cr);
      if (!admits(ts, t)) {
        s.err("L3", "L3_TYPE_MISMATCH", id, path, `literal ${JSON.stringify(v)} is ${t} but ${fmtTypes(ts)} is expected`);
        return;
      }
      const ev = enumValues(cs, cr);
      if (ev && !ev.some((w) => JSON.stringify(w) === JSON.stringify(v)))
        s.err("L3", "L3_ENUM_VIOLATION", id, path, `literal ${JSON.stringify(v)} is not one of ${ev.map((x) => JSON.stringify(x)).join(", ")}`);
    };

    const checkValue = (v: unknown, cs: S, cr: S, path: string, sink: SinkKind, sinkWhy: string) => {
      const consumerKnown = cs !== undefined;
      if (typeof v === "string") {
        const segs = scan(v);
        const refs = segs.filter((x) => x.type === "ref") as Array<Extract<(typeof segs)[number], { type: "ref" }>>;
        if (refs.length === 0) {
          if (consumerKnown) literalCheck(v, cs, cr, path);
          return;
        }
        const results: Array<Resolved | null> = refs.map((r) => (r.ref ? resolve(r.ref, path) : null));
        for (const res of results) {
          if (!res) continue;
          consumed.push(res.label);
          taintSink(res, path, sink, sinkWhy);
          if (res.optional)
            s.warn("L3", "W_OPTIONAL_REFERENCE", id, path, `"${refToString(res.ref)}" is an optional field and may be absent at run time`);
        }
        if (isSingleRef(segs)) {
          const res = results[0];
          if (res && consumerKnown) {
            const c = compat(res.schema, res.root, cs, cr);
            if (!c.ok) s.err("L3", c.code, id, path, `"${refToString(res.ref)}": ${c.reason}`);
          }
        } else if (consumerKnown) {
          const ts = typeSet(cs, cr);
          if (!admits(ts, "string"))
            s.err("L3", "L3_TYPE_MISMATCH", id, path, `a template string is always text but ${fmtTypes(ts)} is expected`);
        }
        return;
      }
      if (Array.isArray(v)) {
        if (consumerKnown) {
          const ts = typeSet(cs, cr);
          if (!admits(ts, "array")) {
            s.err("L3", "L3_TYPE_MISMATCH", id, path, `array literal where ${fmtTypes(ts)} is expected`);
            // keep walking for reference errors with unknown consumer
            v.forEach((x, i) => checkValue(x, undefined, undefined, `${path}/${i}`, sink, sinkWhy));
            return;
          }
        }
        const d = consumerKnown ? deref(cs, cr) : undefined;
        v.forEach((x, i) => checkValue(x, isObj(d) ? d.items : undefined, cr, `${path}/${i}`, sink, sinkWhy));
        return;
      }
      if (isObj(v)) {
        let d: S = undefined;
        if (consumerKnown) {
          const ts = typeSet(cs, cr);
          if (!admits(ts, "object")) {
            s.err("L3", "L3_TYPE_MISMATCH", id, path, `object literal where ${fmtTypes(ts)} is expected`);
          } else d = deref(cs, cr);
        }
        if (isObj(d)) {
          for (const k of Array.isArray(d.required) ? d.required : [])
            if (!Object.prototype.hasOwnProperty.call(v, k)) s.err("L3", "L3_TYPE_MISMATCH", id, path, `object literal is missing required field "${k}"`);
        }
        for (const [k, x] of Object.entries(v)) {
          let child: S = undefined;
          if (isObj(d)) {
            if (isObj(d.properties) && Object.prototype.hasOwnProperty.call(d.properties, k)) child = d.properties[k];
            else if (isObj(d.additionalProperties)) child = d.additionalProperties;
            else if (isObj(d.properties) && d.additionalProperties === false)
              s.err("L3", "L3_TYPE_MISMATCH", id, `${path}/${escPtr(k)}`, `unexpected field "${k}" in object literal`);
          }
          checkValue(x, child, cr, `${path}/${escPtr(k)}`, sink, sinkWhy);
        }
        return;
      }
      // number | boolean | null
      if (consumerKnown) literalCheck(v, cs, cr, path);
    };

    const checkMap = (map: unknown, fieldPath: string, schemaOf: (k: string) => S, root: S, sink: SinkKind, sinkWhy: string) => {
      if (!isObj(map)) return;
      for (const k of Object.keys(map)) checkValue(map[k], schemaOf(k), root, `${fieldPath}/${escPtr(k)}`, sink, sinkWhy);
    };
    const noSchema = () => undefined;
    const props = (sch: S) => (k: string) => (isObj(sch?.properties) ? own(sch.properties, k) : undefined);

    let nl: NodeLabels = { def: "trusted", fields: {} };

    switch (n.kind) {
      case "block": {
        const b = cat.blocks[n.uses];
        checkMap(n.with, np(id, "/with"), props(b.input), b.input, isConsequential(b) ? "consequential" : null, `block parameter of ${n.uses} (effect: ${b.effect})`);
        nl = { def: "trusted", fields: untrustedTop(b) };
        break;
      }
      case "code":
        checkMap(n.input, np(id, "/input"), noSchema, undefined, null, "");
        nl = { def: "extracted", fields: {} };
        break;
      case "llm.extract":
        checkMap(n.input, np(id, "/input"), noSchema, undefined, null, "");
        nl = { def: "extracted", fields: {} };
        break;
      case "llm.generate": {
        checkMap(n.input, np(id, "/input"), noSchema, undefined, null, "");
        nl = { def: join(consumed), fields: {} };
        break;
      }
      case "llm.decide": {
        checkMap(n.input, np(id, "/input"), noSchema, undefined, null, "");
        nl = { def: join(consumed), fields: { outcome: "trusted" } };
        break;
      }
      case "agent": {
        const tb = (n.tools as string[]).map((t) => cat.blocks[t]).filter(Boolean);
        const eff = (n.tools as string[]).filter((t) => isConsequential(cat.blocks[t]));
        checkMap(n.input, np(id, "/input"), noSchema, undefined, eff.length ? "agent" : null, `effectful tools (${eff.join(", ")})`);
        const l = join(consumed);
        nl = { def: tb.some(blockHasUntrusted) || l === "untrusted" ? "untrusted" : l, fields: {} };
        break;
      }
      case "switch": {
        const segs = scan(n.on);
        const r = segs[0].type === "ref" && segs[0].ref ? resolve(segs[0].ref, np(id, "/on")) : null;
        if (r) {
          const ts = typeSet(r.schema, r.root);
          if (ts && (ts.has("object") || ts.has("array"))) {
            s.err("L3", "L3_SWITCH_ON_TYPE", id, np(id, "/on"), `switch cannot branch on a value of type ${fmtTypes(ts)}; use string, number, integer or boolean`);
          } else {
            const ev = enumValues(r.schema, r.root);
            for (const key of Object.keys(n.cases).sort()) {
              const kp = np(id, `/cases/${escPtr(key)}`);
              if (ev) {
                if (!ev.map((x) => String(x)).includes(key))
                  s.err("L3", "L3_SWITCH_KEY_INCOMPATIBLE", id, kp, `case key "${key}" is not one of the possible values of ${refToString(r.ref)} (${ev.map((x) => JSON.stringify(x)).join(", ")})`);
                continue;
              }
              if (!ts) continue;
              const okKey = [...ts].some((t) => {
                if (t === "string") return true;
                if (t === "boolean") return key === "true" || key === "false";
                if (t === "integer") return /^-?(0|[1-9][0-9]*)$/.test(key);
                if (t === "number") return /^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(key);
                return false;
              });
              if (!okKey)
                s.err("L3", "L3_SWITCH_KEY_INCOMPATIBLE", id, kp, `case key "${key}" cannot match a value of type ${fmtTypes(ts)}${ts.has("boolean") ? ' (boolean cases are written "true" and "false")' : ""}`);
            }
          }
          if (r.optional) s.warn("L3", "W_OPTIONAL_REFERENCE", id, np(id, "/on"), `"${refToString(r.ref)}" is an optional field and may be absent at run time`);
        }
        break;
      }
      case "human.approval":
        checkValue(n.summary, undefined, undefined, np(id, "/summary"), null, "");
        break;
      case "human.form":
        break;
      case "foreach": {
        const segs = scan(n.items);
        const r = segs[0].type === "ref" && segs[0].ref ? resolve(segs[0].ref, np(id, "/items")) : null;
        let ctx: ForeachCtx | null = null;
        if (r) {
          const ts = typeSet(r.schema, r.root);
          if (!ts || ts.size !== 1 || !ts.has("array")) {
            s.err("L3", "L3_TYPE_MISMATCH", id, np(id, "/items"), `foreach items must be an array but "${refToString(r.ref)}" is ${fmtTypes(ts)}`);
          } else {
            const d = deref(r.schema, r.root);
            ctx = { itemSchema: isObj(d) ? d.items : undefined, itemRoot: r.root, itemLabel: r.label };
          }
          if (r.optional) s.warn("L3", "W_OPTIONAL_REFERENCE", id, np(id, "/items"), `"${refToString(r.ref)}" is an optional field and may be absent at run time`);
        }
        foreachCtx = ctx ?? { itemSchema: undefined, itemRoot: undefined, itemLabel: "trusted", unknown: true };
        if (n.uses !== undefined) {
          const b = cat.blocks[n.uses];
          checkMap(n.with, np(id, "/with"), props(b.input), b.input, isConsequential(b) ? "consequential" : null, `block parameter of ${n.uses} (effect: ${b.effect})`);
          nl = { def: blockHasUntrusted(b) ? "untrusted" : "trusted", fields: {} };
        } else {
          const f = cat.flows_registry[n.subflow];
          checkMap(n.with, np(id, "/with"), props(f.inputs), f.inputs, "opaque", `subflow ${n.subflow}`);
        }
        break;
      }
      case "subflow": {
        const f = cat.flows_registry[n.flow];
        checkMap(n.with, np(id, "/with"), props(f.inputs), f.inputs, "opaque", `subflow ${n.flow}`);
        break;
      }
      case "delegate":
        checkMap(n.with, np(id, "/with"), noSchema, undefined, "opaque", `delegate to ${n.target}/${n.workflow}`);
        break;
      case "end":
        checkMap(n.output, np(id, "/output"), noSchema, undefined, null, "");
        break;
      default:
        break; // wait
    }
    labels.set(id, nl);
  }

  /* ---- lethal trifecta ---- */
  const used = new Set<string>();
  for (const id of ids) {
    const n = nodes[id];
    if (n.kind === "block") used.add(n.uses);
    if (n.kind === "foreach" && n.uses) used.add(n.uses);
    if (n.kind === "agent") (n.tools as string[]).forEach((t) => used.add(t));
  }
  const defs = [...used].sort().map((u) => [u, cat.blocks[u]] as const);
  const untrusted = defs.filter(([, b]) => blockHasUntrusted(b)).map(([u]) => u);
  const priv = defs.filter(([, b]) => isPrivateRead(b)).map(([u]) => u);
  const exfil = defs.filter(([, b]) => b.effect === "send" || b.effect === "pay").map(([u]) => u);
  if (untrusted.length && priv.length && exfil.length)
    s.warn(
      "L3",
      "W_LETHAL_TRIFECTA",
      null,
      "/nodes",
      `flow reads untrusted content (${untrusted.join(", ")}), reads private data (${priv.join(", ")}) and can send or pay (${exfil.join(", ")})`,
    );
}

/* ------------------------------------------------------------------ API */

export function validate(doc: unknown, catalogue: Catalogue): ValidationResult {
  const s = new Sink();
  const layers_run: Layer[] = ["L1"];
  const guard = (layer: Layer, f: () => void) => {
    try {
      f();
    } catch (e: any) {
      // Never throw out of the validator: a crash must not look like a pass. Treated as a failure of that layer.
      s.err(layer, "INTERNAL_ERROR", null, "", `validator crashed: ${String(e?.message ?? e)}`);
    }
  };
  guard("L1", () => l1(doc, s));
  if (s.errors.length === 0) {
    layers_run.push("L2");
    guard("L2", () => l2(doc as any, catalogue, s));
    if (s.errors.length === 0) {
      layers_run.push("L3");
      guard("L3", () => l3(doc as any, catalogue, s));
    }
  }
  const errors = sortIssues(s.errors);
  return { ok: errors.length === 0, errors, warnings: sortIssues(s.warnings), layers_run };
}
