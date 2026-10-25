/**
 * print(doc) -> TypeScript source
 *
 * Turns a format-v0 document into builder code that transpiles back to a canonical-equal document.
 *
 * Layout rules (all decided here, none by the builder):
 *  - Nodes are emitted by walking from `start`: follow `next` as far as possible, then take the pending branch
 *    targets (cases, default, on_timeout) in the order they were found, then any node not reachable from `start`
 *    in document order. Consecutive calls therefore usually already mean "next", and only joins need `f.next(...)`.
 *  - `next` is omitted exactly when it names the node emitted right after (what default sequencing gives).
 *  - A node gets a `const` only when something refers to it as a handle (an output or outcome reference, or the
 *    first argument of f.cases / f.next). A reference whose producer was not emitted earlier, or that is not one of
 *    the four plain forms, stays a plain string literal, which the builder passes through untouched.
 *  - Strings outside value positions are never turned into templates, so they round-trip byte for byte.
 */
import { BY_KIND, snakeToCamel, type KindSpec } from "./kinds.ts";

export class PrintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrintError";
  }
}

export interface PrintOptions {
  /**
   * Fragment mode (used for documentation snippets): print only these nodes, in this order, without header or
   * wiring of `next`. References to nodes outside the fragment are written as handles named after the node.
   */
  fragment?: { ids: string[] };
  /** soft line width (default 100) */
  width?: number;
}

// ---- tiny expression tree --------------------------------------------------------------------------------------
type Js = { t: "raw"; s: string } | { t: "arr"; items: Js[] } | { t: "obj"; entries: Array<[string, Js]> };
const raw = (s: string): Js => ({ t: "raw", s });

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const RESERVED = new Set(
  "abstract any arguments as async await boolean break case catch class const constructor continue debugger declare default delete do else enum eval export extends false finally for from function get if implements import in instanceof interface is keyof let module namespace never new null number object of package private protected public readonly require return set static string super switch symbol this throw true try type typeof undefined unique unknown var void while with yield f flow String Object Array JSON Math Number Boolean Symbol Error undefined NaN Infinity globalThis".split(" "),
);
const REF_SEG = /^[A-Za-z_][A-Za-z0-9_]*$/;
const NODE_ID_REF = /^[A-Za-z_][A-Za-z0-9_]*$/;
const HANDLE_BLOCKED = new Set(["then", "toString", "toJSON", "valueOf"]);

const keyOf = (k: string): string => (k === "__proto__" ? `["__proto__"]` : IDENT.test(k) ? k : JSON.stringify(k));
const str = (s: string): string => JSON.stringify(s);

function flat(n: Js): string {
  if (n.t === "raw") return n.s;
  if (n.t === "arr") return n.items.length ? `[${n.items.map(flat).join(", ")}]` : "[]";
  return n.entries.length ? `{ ${n.entries.map(([k, v]) => `${k}: ${flat(v)}`).join(", ")} }` : "{}";
}

function render(n: Js, indent: number, used: number, width: number, tail = 0): string {
  const f = flat(n);
  if (!f.includes("\n") && indent + used + f.length + tail <= width) return f;
  if (n.t === "raw") return f;
  const pad = " ".repeat(indent + 2);
  if (n.t === "arr") {
    return `[\n${n.items.map((i) => `${pad}${render(i, indent + 2, 0, width, 1)},`).join("\n")}\n${" ".repeat(indent)}]`;
  }
  return `{\n${n.entries.map(([k, v]) => `${pad}${k}: ${render(v, indent + 2, k.length + 2, width, 1)},`).join("\n")}\n${" ".repeat(indent)}}`;
}

// ---- literals --------------------------------------------------------------------------------------------------
function lit(v: unknown, where: string): Js {
  if (v === null) return raw("null");
  switch (typeof v) {
    case "string":
      return raw(str(v));
    case "boolean":
      return raw(String(v));
    case "number":
      if (!Number.isFinite(v)) throw new PrintError(`${where}: non-finite number`);
      return raw(Object.is(v, -0) ? "0" : String(v));
    case "object":
      if (Array.isArray(v)) return { t: "arr", items: v.map((x, i) => lit(x, `${where}[${i}]`)) };
      return { t: "obj", entries: Object.entries(v as object).map(([k, x]) => [keyOf(k), lit(x, `${where}.${k}`)] as [string, Js]) };
    default:
      throw new PrintError(`${where}: ${typeof v} cannot be printed`);
  }
}

function escTemplate(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const c = s.charCodeAt(i);
    if (ch === "\\") out += "\\\\";
    else if (ch === "`") out += "\\`";
    else if (ch === "$" && s[i + 1] === "{") out += "\\$";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\t") out += "\\t";
    else if (c < 0x20 || c === 0x7f || c === 0x2028 || c === 0x2029) out += `\\u${c.toString(16).padStart(4, "0")}`;
    else out += ch;
  }
  return out;
}

/** A source string for a code node: readable when it safely can be. */
function sourceLit(s: string): Js {
  const multiline = s.includes("\n");
  const unsafeRaw = s.includes("`") || s.includes("${") || s.includes("\r") || /\\$/.test(s) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u2028\u2029]/.test(s);
  if (!multiline || unsafeRaw) return raw(str(s));
  if (!s.includes("\\")) return raw("`" + s + "`");
  return raw("String.raw`" + s + "`");
}

// ---- references ------------------------------------------------------------------------------------------------
type Seg = { t: "text"; s: string } | { t: "ref"; content: string };

function scanStr(s: string): Seg[] | null {
  const out: Seg[] = [];
  let i = 0;
  while (i < s.length) {
    const open = s.indexOf("${{", i);
    if (open < 0) {
      out.push({ t: "text", s: s.slice(i) });
      break;
    }
    if (open > i) out.push({ t: "text", s: s.slice(i, open) });
    const close = s.indexOf("}}", open + 3);
    if (close < 0) return null;
    const content = s.slice(open + 3, close).trim();
    if (content.includes("{") || content.includes("}")) return null;
    out.push({ t: "ref", content });
    i = close + 2;
  }
  return out;
}

interface Ctx {
  /** variable for node `id` if it was emitted before the node being printed */
  handle(id: string): string | undefined;
  note(id: string): void;
}

/** JS expression for one reference, or null if it must stay a string. */
function refExpr(content: string, ctx: Ctx): string | null {
  const parts = content.split(".");
  if (parts.some((p) => p === "")) return null;
  const pathOk = (p: string[]) => p.every((x) => REF_SEG.test(x) && !HANDLE_BLOCKED.has(x));
  const access = (p: string[]) => p.map((x) => `.${x}`).join("");
  if (parts[0] === "inputs") return parts.length >= 2 && pathOk(parts.slice(1)) ? `f.inputs${access(parts.slice(1))}` : null;
  if (parts[0] === "item") return pathOk(parts.slice(1)) ? `f.item${access(parts.slice(1))}` : null;
  if (parts[0] === "nodes" && parts.length >= 3 && NODE_ID_REF.test(parts[1])) {
    const h = ctx.handle(parts[1]);
    if (!h) return null;
    if (parts[2] === "outcome" && parts.length === 3) {
      ctx.note(parts[1]);
      return `${h}.outcome`;
    }
    if (parts[2] === "output" && parts.length >= 4 && pathOk(parts.slice(3))) {
      ctx.note(parts[1]);
      return `${h}.out${access(parts.slice(3))}`;
    }
  }
  return null;
}

function valueStr(s: string, ctx: Ctx): Js {
  if (!s.includes("${{")) return raw(str(s));
  const segs = scanStr(s);
  if (!segs) return raw(str(s));
  const exprs: Array<string | null> = segs.map((g) => (g.t === "ref" ? refExpr(g.content, ctx) : ""));
  if (exprs.some((e) => e === null)) return raw(str(s));
  if (segs.length === 1 && segs[0].t === "ref") return raw(exprs[0]!);
  let body = "";
  segs.forEach((g, i) => {
    body += g.t === "text" ? escTemplate(g.s) : "${" + exprs[i] + "}";
  });
  return raw("f.template`" + body + "`");
}

function value(v: unknown, ctx: Ctx, where: string): Js {
  if (typeof v === "string") return valueStr(v, ctx);
  if (Array.isArray(v)) return { t: "arr", items: v.map((x, i) => value(x, ctx, `${where}[${i}]`)) };
  if (v && typeof v === "object") return { t: "obj", entries: Object.entries(v).map(([k, x]) => [keyOf(k), value(x, ctx, `${where}.${k}`)] as [string, Js]) };
  return lit(v, where);
}

// ---- ordering --------------------------------------------------------------------------------------------------
const isStr = (x: unknown): x is string => typeof x === "string";
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

function successors(n: Record<string, unknown>): string[] {
  const out: string[] = [];
  if (isObj(n.cases)) for (const v of Object.values(n.cases)) if (isStr(v)) out.push(v);
  if (isStr(n.default)) out.push(n.default);
  if (isStr(n.on_timeout)) out.push(n.on_timeout);
  return out;
}

function order(nodes: Record<string, Record<string, unknown>>, start: unknown): string[] {
  const ids = Object.keys(nodes);
  const done = new Set<string>();
  const out: string[] = [];
  const pending: string[] = [];
  const walk = (first: string) => {
    let cur: string | undefined = first;
    while (cur !== undefined && Object.hasOwn(nodes, cur) && !done.has(cur)) {
      done.add(cur);
      out.push(cur);
      const n: Record<string, unknown> = nodes[cur];
      for (const s of successors(n)) pending.push(s);
      const nx: unknown = n.next;
      cur = isStr(nx) ? nx : undefined;
    }
  };
  const drain = () => {
    while (pending.length) {
      const p = pending.shift()!;
      if (Object.hasOwn(nodes, p) && !done.has(p)) walk(p);
    }
  };
  if (isStr(start) && Object.hasOwn(nodes, start)) {
    walk(start);
    drain();
  }
  for (const id of ids) {
    if (!done.has(id)) {
      walk(id);
      drain();
    }
  }
  return out;
}

function varNames(ids: string[]): Map<string, string> {
  const used = new Set<string>();
  const out = new Map<string, string>();
  for (const id of ids) {
    let base = snakeToCamel(id);
    if (!IDENT.test(base)) base = "node_" + base.replace(/[^A-Za-z0-9_$]/g, "_");
    let name = base;
    while (RESERVED.has(name) || used.has(name)) name += "_";
    used.add(name);
    out.set(id, name);
  }
  return out;
}

// ---- printing --------------------------------------------------------------------------------------------------
export function print(doc: unknown, opts: PrintOptions = {}): string {
  const width = opts.width ?? 100;
  if (!isObj(doc)) throw new PrintError("document is not an object");
  const nodesRaw = doc.nodes;
  if (!isObj(nodesRaw)) throw new PrintError("document has no `nodes` map");
  const nodes: Record<string, Record<string, unknown>> = {};
  for (const [id, n] of Object.entries(nodesRaw)) {
    if (!isObj(n) || !isStr(n.kind)) throw new PrintError(`node "${id}" has no string \`kind\``);
    if (!BY_KIND.has(n.kind)) throw new PrintError(`node "${id}" has unknown kind "${n.kind}"`);
    nodes[id] = n;
  }
  const fragment = opts.fragment;
  const ord = fragment ? fragment.ids.filter((i) => Object.hasOwn(nodes, i)) : order(nodes, doc.start);
  const pos = new Map(ord.map((id, i) => [id, i]));
  const vars = varNames(fragment ? [...new Set([...Object.keys(nodes), ...fragmentRefIds(nodes, ord)])] : ord);

  // pass 1 records which nodes are referenced as handles; pass 2 prints with that knowledge
  const needVar = new Set<string>();
  const stmts = (record: boolean): string[] => {
    const out: string[] = [];
    ord.forEach((id, i) => {
      const n = nodes[id];
      const spec = BY_KIND.get(n.kind as string)!;
      const ctx: Ctx = {
        handle: (pid) => {
          if (fragment) return pid !== id ? vars.get(pid) : undefined;
          const pp = pos.get(pid);
          return pp !== undefined && pp < i ? vars.get(pid) : undefined;
        },
        note: (pid) => {
          if (record) needVar.add(pid);
        },
      };
      out.push(...nodeStatements(id, n, spec, ctx, i, ord, vars, needVar, record, width, !!fragment));
    });
    return out;
  };
  stmts(true);
  const body = stmts(false);

  if (fragment) return body.join("\n");

  // ---- header and meta
  if (doc.ursitoare === undefined) throw new PrintError("document has no `ursitoare` (the builder always writes one)");
  const meta: Array<[string, Js]> = [];
  if (doc.ursitoare !== "0.1") meta.push(["ursitoare", lit(doc.ursitoare, "ursitoare")]);
  if (doc.flow !== undefined) meta.push(["id", lit(doc.flow, "flow")]);
  for (const k of ["version", "description", "inputs"]) if (doc[k] !== undefined) meta.push([k, lit(doc[k], k)]);
  const known = new Set(["ursitoare", "flow", "version", "description", "inputs", "start", "nodes"]);
  for (const [k, v] of Object.entries(doc)) {
    if (known.has(k)) continue;
    if (k === "id") throw new PrintError("top-level key `id` cannot be printed (it is the builder's name for `flow`)");
    meta.push([keyOf(k), lit(v, k)]);
  }
  if (doc.start === undefined) throw new PrintError("document has no `start` (the builder always writes one)");
  const lines: string[] = [];
  lines.push(`import { flow } from "@ursitoare/flow";`, "");
  lines.push(`flow(${render({ t: "obj", entries: meta }, 0, 5, width, 1)}, f => {`);
  const startIsFirst = ord.length > 0 && ord[0] === doc.start;
  if (!startIsFirst) body.unshift(`  f.start(${isStr(doc.start) ? str(doc.start) : flat(lit(doc.start, "start"))});`);
  lines.push(...body);
  lines.push("});", "");
  return lines.join("\n");
}

/** ids referenced by the fragment's nodes that are not in the fragment (they get assumed handle names) */
function fragmentRefIds(nodes: Record<string, Record<string, unknown>>, ids: string[]): string[] {
  const out: string[] = [];
  const visit = (v: unknown) => {
    if (typeof v === "string") {
      for (const m of v.matchAll(/\$\{\{\s*nodes\.([A-Za-z_][A-Za-z0-9_]*)\./g)) out.push(m[1]);
    } else if (Array.isArray(v)) v.forEach(visit);
    else if (isObj(v)) Object.values(v).forEach(visit);
  };
  for (const id of ids) visit(nodes[id]);
  return out;
}

function nodeStatements(
  id: string,
  n: Record<string, unknown>,
  spec: KindSpec,
  ctx: Ctx,
  i: number,
  ord: string[],
  vars: Map<string, string>,
  needVar: Set<string>,
  _record: boolean,
  width: number,
  fragment: boolean,
): string[] {
  const where = `node "${id}"`;
  const known = new Set<string>(["kind", ...spec.fields, "next", "cases"]);
  const extras = Object.keys(n).filter((k) => !known.has(k));
  const camelClash = new Set(spec.fields.map(snakeToCamel));
  for (const k of extras) if (camelClash.has(k)) throw new PrintError(`${where}: key "${k}" would be read as a known option`);

  const fieldJs = (f: string): Js => {
    const v = n[f];
    if (spec.valueFields.includes(f)) return value(v, ctx, `${where}.${f}`);
    if (spec.idFields.includes(f) || f === "next") return lit(v, `${where}.${f}`);
    if (spec.kind === "code" && f === "source" && isStr(v)) return sourceLit(v);
    return lit(v, `${where}.${f}`);
  };

  const hasCasesWire = spec.succ === "cases" && n.cases !== undefined;
  const nextVal = n.next;
  let wireNext: string | undefined;
  if (spec.succ === "next") {
    if (nextVal === undefined) {
      if (!fragment && i + 1 < ord.length) throw new PrintError(`${where}: has no \`next\` but is followed by another node; the builder would add one`);
    } else if (!(isStr(nextVal) && ord[i + 1] === nextVal) && !fragment) {
      wireNext = `f.next(${vars.get(id)}, ${flat(lit(nextVal, `${where}.next`))});`;
      needVar.add(id);
    }
  }
  if (hasCasesWire) needVar.add(id);
  if (spec.succ === "cases" && n.cases !== undefined && !isObj(n.cases)) throw new PrintError(`${where}: \`cases\` is not an object`);

  const call = `f.${spec.method}`;
  let args: string;
  const prefix = needVar.has(id) ? `  const ${vars.get(id)} = ` : "  ";
  const startCol = prefix.length + call.length + 1 + str(id).length + 2;
  if (spec.positional) {
    if (extras.length || (spec.succ === "next" ? false : n.next !== undefined) || (spec.succ !== "cases" && n.cases !== undefined))
      throw new PrintError(`${where}: unsupported extra fields for ${spec.method}: ${[...extras, ...(n.cases !== undefined ? ["cases"] : [])].join(", ")}`);
    const vals = spec.positional.map((f) => (n[f] === undefined ? undefined : fieldJs(f)));
    while (vals.length && vals[vals.length - 1] === undefined) vals.pop();
    const rendered = vals.map((v, k) => (v === undefined ? "undefined" : render(v, 2, k === vals.length - 1 ? startCol : 0, width, 2)));
    args = [str(id), ...rendered].join(", ");
  } else {
    const entries: Array<[string, Js]> = [];
    for (const f of spec.fields) if (n[f] !== undefined) entries.push([snakeToCamel(f), fieldJs(f)]);
    // pass-through keys the builder treats as options too
    if (spec.succ !== "next" && n.next !== undefined) entries.push(["next", lit(n.next, `${where}.next`)]);
    if (spec.succ !== "cases" && n.cases !== undefined) entries.push(["cases", lit(n.cases, `${where}.cases`)]);
    for (const k of extras) entries.push([keyOf(k), lit(n[k], `${where}.${k}`)]);
    args = entries.length ? `${str(id)}, ${render({ t: "obj", entries }, 2, startCol, width, 2)}` : str(id);
  }
  const out = [`${prefix}${call}(${args});`];
  if (hasCasesWire) {
    const cases = lit(n.cases, `${where}.cases`);
    out.push(`  f.cases(${vars.get(id)}, ${render(cases, 2, 10 + (vars.get(id) ?? "").length, width, 2)});`);
  }
  if (wireNext) out.push(`  ${wireNext}`);
  return out;
}

// ---- helpers for generating documentation (scripts/gen-guide.ts) -----------------------------------------------
/** Source text for one value string, with every node handle named after the node (camelCase). */
export function exprForValueString(s: string): string {
  const ctx: Ctx = { handle: (id) => snakeToCamel(id), note: () => {} };
  return flat(valueStr(s, ctx));
}

/** `nodes.x.output.y` / `nodes.x.outcome` / `inputs.a` / `item.b` as builder source, or null if it is not a plain reference. */
export function exprForRef(content: string): string | null {
  return refExpr(content, { handle: (id) => snakeToCamel(id), note: () => {} });
}
