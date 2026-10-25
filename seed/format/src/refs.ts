/**
 * Reference and template parsing for format v0 (design section 4.3).
 *
 *   value      = JSON literal | "${{ ref }}" (single reference) | template string
 *   references = inputs.<path> | nodes.<id>.output.<path> | nodes.<id>.outcome | item[.<path>]
 *
 * A string is a single reference iff it is exactly one `${{ ... }}` and nothing else.
 * Any other string containing at least one reference is a template (always a string).
 */

export type Ref =
  | { root: "inputs"; path: string[] }
  | { root: "node"; id: string; field: "output" | "outcome"; path: string[] }
  | { root: "item"; path: string[] };

export interface TextSeg {
  type: "text";
  text: string;
}
export interface RefSeg {
  type: "ref";
  raw: string; // the whole `${{ ... }}`
  ref?: Ref;
  error?: string;
}
export type Seg = TextSeg | RefSeg;

const SEG = /^[A-Za-z0-9_]+$/;
const NODE_ID = /^[a-z][a-z0-9_]*$/;

export function parseRef(content: string): { ref?: Ref; error?: string } {
  const parts = content.split(".");
  if (parts.some((p) => p === "")) return { error: `malformed reference "${content}"` };
  const root = parts[0];
  if (root === "inputs") {
    const path = parts.slice(1);
    if (path.length === 0) return { error: `"inputs" needs a path, e.g. inputs.<name>` };
    if (!path.every((p) => SEG.test(p))) return { error: `invalid path segment in "${content}"` };
    return { ref: { root: "inputs", path } };
  }
  if (root === "nodes") {
    if (parts.length < 3) return { error: `"${content}" must be nodes.<id>.output.<path> or nodes.<id>.outcome` };
    const id = parts[1];
    if (!NODE_ID.test(id)) return { error: `invalid node id "${id}" in reference` };
    const field = parts[2];
    if (field === "outcome") {
      if (parts.length !== 3) return { error: `nodes.<id>.outcome takes no further path` };
      return { ref: { root: "node", id, field: "outcome", path: [] } };
    }
    if (field === "output") {
      const path = parts.slice(3);
      if (path.length === 0) return { error: `nodes.${id}.output needs a path, e.g. nodes.${id}.output.<field>` };
      if (!path.every((p) => SEG.test(p))) return { error: `invalid path segment in "${content}"` };
      return { ref: { root: "node", id, field: "output", path } };
    }
    return { error: `"nodes.${id}.${field}" is not a reference; use nodes.${id}.output.<path> or nodes.${id}.outcome` };
  }
  if (root === "item") {
    const path = parts.slice(1);
    if (!path.every((p) => SEG.test(p))) return { error: `invalid path segment in "${content}"` };
    return { ref: { root: "item", path } };
  }
  return { error: `unknown reference root "${root}" (expected inputs, nodes or item)` };
}

/** Split a string into text and reference segments. Never throws. */
export function scan(s: string): Seg[] {
  const out: Seg[] = [];
  let i = 0;
  while (i < s.length) {
    const open = s.indexOf("${{", i);
    if (open < 0) {
      out.push({ type: "text", text: s.slice(i) });
      break;
    }
    if (open > i) out.push({ type: "text", text: s.slice(i, open) });
    const close = s.indexOf("}}", open + 3);
    if (close < 0) {
      out.push({ type: "ref", raw: s.slice(open), error: "unterminated ${{ (missing }})" });
      break;
    }
    const raw = s.slice(open, close + 2);
    const content = s.slice(open + 3, close).trim();
    if (content.includes("{") || content.includes("}")) {
      out.push({ type: "ref", raw, error: `unexpected brace inside reference "${content}"` });
    } else {
      const r = parseRef(content);
      out.push({ type: "ref", raw, ...(r.ref ? { ref: r.ref } : { error: r.error }) });
    }
    i = close + 2;
  }
  return out;
}

export function isSingleRef(segs: Seg[]): boolean {
  return segs.length === 1 && segs[0].type === "ref";
}

export function refToString(r: Ref): string {
  switch (r.root) {
    case "inputs":
      return ["inputs", ...r.path].join(".");
    case "item":
      return ["item", ...r.path].join(".");
    case "node":
      return r.field === "outcome" ? `nodes.${r.id}.outcome` : ["nodes", r.id, "output", ...r.path].join(".");
  }
}

/** Suspicious-but-legal literal text that looks like a botched reference. */
export function suspiciousInterpolation(text: string): string | null {
  if (/^(inputs|nodes|item)\.[A-Za-z0-9_.]+$/.test(text.trim()) && /^(inputs\.|nodes\.[a-z][a-z0-9_]*\.(output|outcome)|item\.)/.test(text.trim()))
    return `"${text}" looks like a reference but is not wrapped in \${{ }}; it will be treated as literal text`;
  if (/\{\{[^{}]*\}\}/.test(text)) return `"{{ ... }}" is not reference syntax; references are written \${{ ... }}`;
  if (/\$\{(?!\{)/.test(text)) return `"\${ ... }" is not reference syntax; references are written \${{ ... }}`;
  return null;
}

/** Visit every string leaf in a JSON value with its JSON Pointer. */
export function walkStrings(v: unknown, path: string, cb: (s: string, path: string) => void): void {
  if (typeof v === "string") cb(v, path);
  else if (Array.isArray(v)) v.forEach((x, i) => walkStrings(x, `${path}/${i}`, cb));
  else if (v && typeof v === "object")
    for (const [k, x] of Object.entries(v)) walkStrings(x, `${path}/${escPtr(k)}`, cb);
}

export function escPtr(s: string): string {
  return s.replace(/~/g, "~0").replace(/\//g, "~1");
}

/** Fields of each kind that hold values (references allowed). */
export function valueFields(node: any): Array<{ field: string; value: unknown }> {
  const out: Array<{ field: string; value: unknown }> = [];
  const add = (f: string) => {
    if (node[f] !== undefined) out.push({ field: f, value: node[f] });
  };
  switch (node.kind) {
    case "block":
    case "subflow":
    case "delegate":
      add("with");
      break;
    case "code":
    case "llm.extract":
    case "llm.generate":
    case "llm.decide":
    case "agent":
      add("input");
      break;
    case "foreach":
      add("items");
      add("with");
      break;
    case "human.approval":
      add("summary");
      break;
    case "switch":
      add("on");
      break;
    case "end":
      add("output");
      break;
  }
  return out;
}

