/**
 * Minimal JSON-Schema helpers: what reference resolution and type compatibility
 * at JSON-type granularity need. Not a general validator (design D5, D7).
 */

import { Ajv2020 } from "ajv/dist/2020.js";

export type S = unknown;

const MAX_DEPTH = 16;

/** Own-property lookup (keys such as "constructor" or "__proto__" never resolve to inherited members). */
export function own(o: unknown, k: string): unknown {
  return o !== null && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k)
    ? (o as Record<string, unknown>)[k]
    : undefined;
}

export function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Follow local `$ref: "#/..."` chains inside `root`. Unresolvable refs yield undefined (= unknown). */
export function deref(s: S, root: S): S {
  let cur = s;
  for (let i = 0; i < MAX_DEPTH; i++) {
    if (!isObj(cur) || typeof cur.$ref !== "string") return cur;
    const ref: string = cur.$ref;
    if (ref === "#") {
      cur = root;
      continue;
    }
    if (!ref.startsWith("#/")) return undefined;
    let t: unknown = root;
    for (const seg of ref.slice(2).split("/")) {
      const k = seg.replace(/~1/g, "/").replace(/~0/g, "~");
      if (t === null || typeof t !== "object" || !Object.prototype.hasOwnProperty.call(t, k)) {
        return undefined;
      }
      t = (t as Record<string, unknown>)[k];
    }
    cur = t;
  }
  return undefined;
}

export function jsType(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v; // string | boolean | object
}

/** Set of JSON types a schema admits, or null when unconstrained/unknown. */
export function typeSet(s: S, root: S, depth = 0): Set<string> | null {
  if (depth > MAX_DEPTH) return null;
  const c = deref(s, root);
  if (c === undefined || c === true || !isObj(c)) return null;
  if (typeof c.type === "string") return new Set([c.type]);
  if (Array.isArray(c.type)) return new Set(c.type.filter((x): x is string => typeof x === "string"));
  if (c.const !== undefined) return new Set([jsType(c.const)]);
  if (Array.isArray(c.enum)) return new Set(c.enum.map(jsType));
  for (const k of ["anyOf", "oneOf"] as const) {
    if (Array.isArray(c[k])) {
      const out = new Set<string>();
      for (const b of c[k]) {
        const t = typeSet(b, root, depth + 1);
        if (t === null) return null;
        t.forEach((x) => out.add(x));
      }
      return out;
    }
  }
  if (isObj(c.properties)) return new Set(["object"]);
  if (c.items !== undefined) return new Set(["array"]);
  return null;
}

export function enumValues(s: S, root: S): unknown[] | null {
  const c = deref(s, root);
  if (!isObj(c)) return null;
  if (Array.isArray(c.enum)) return c.enum;
  if (c.const !== undefined) return [c.const];
  return null;
}

/** true if a value of JSON type `t` is accepted by schema type set (integer fits number). */
export function admits(set: Set<string> | null, t: string): boolean {
  if (set === null) return true;
  if (set.has(t)) return true;
  if (t === "integer" && set.has("number")) return true;
  return false;
}

export interface PathOk {
  ok: true;
  schema: S;
  optional: boolean;
}

export interface PathErr {
  ok: false;
  reason: string;
}

/** Resolve a dotted property path against a schema. Never descends through arrays. */
export function resolvePath(schema: S, root: S, segs: string[]): PathOk | PathErr {
  let cur = schema;
  let optional = false;
  const walked: string[] = [];
  for (const seg of segs) {
    const c = deref(cur, root);
    const here = walked.length ? walked.join(".") : "the root";
    if (!isObj(c)) {
      return { ok: false, reason: `no schema is declared at ${here}, so "${seg}" cannot be resolved` };
    }
    const ts = typeSet(c, root);
    if (ts && ts.size > 0 && !ts.has("object")) {
      if (ts.has("array")) {
        return {
          ok: false,
          reason: `${here} is an array; paths cannot index into arrays (reference the array itself, or use a code node)`,
        };
      }
      return { ok: false, reason: `${here} is of type ${[...ts].join("|")} and has no sub-fields ("${seg}")` };
    }
    if (isObj(c.properties) && Object.prototype.hasOwnProperty.call(c.properties, seg)) {
      const req = Array.isArray(c.required) && c.required.includes(seg);
      if (!req) optional = true;
      cur = c.properties[seg];
    } else if (isObj(c.properties)) {
      return {
        ok: false,
        reason: `${here} has no property "${seg}" (declared: ${Object.keys(c.properties).join(", ") || "none"})`,
      };
    } else if (isObj(c.additionalProperties)) {
      optional = true;
      cur = c.additionalProperties;
    } else {
      return { ok: false, reason: `${here} is an object with no declared properties, so "${seg}" cannot be resolved` };
    }
    walked.push(seg);
  }
  return { ok: true, schema: cur, optional };
}

export interface CompatOk {
  ok: true;
}

export interface CompatErr {
  ok: false;
  code: "L3_TYPE_MISMATCH" | "L3_ENUM_VIOLATION";
  reason: string;
}

const fmt = (set: Set<string> | null): string => (set === null ? "any" : [...set].sort().join("|"));

/**
 * Is a value described by producer schema P acceptable where consumer schema C is declared?
 * JSON-type granularity; integer is accepted where number is declared, not vice versa.
 * Unconstrained (untyped) producers are accepted. Enumerations are compared when both sides have one.
 */
export function compat(P: S, pRoot: S, C: S, cRoot: S, depth = 0): CompatOk | CompatErr {
  if (depth > MAX_DEPTH) return { ok: true };
  const tp = typeSet(P, pRoot);
  const tc = typeSet(C, cRoot);
  if (tc !== null && tp !== null) {
    for (const t of tp) {
      if (!admits(tc, t)) {
        return { ok: false, code: "L3_TYPE_MISMATCH", reason: `value is ${fmt(tp)} but ${fmt(tc)} is expected` };
      }
    }
  }
  const ep = enumValues(P, pRoot);
  const ec = enumValues(C, cRoot);
  if (ep && ec) {
    const bad = ep.filter((v) => !ec.some((w) => JSON.stringify(w) === JSON.stringify(v)));
    if (bad.length) {
      return {
        ok: false,
        code: "L3_ENUM_VIOLATION",
        reason: `value may be ${bad.map((b) => JSON.stringify(b)).join(", ")}, which is not one of ${ec.map((b) => JSON.stringify(b)).join(", ")}`,
      };
    }
  }
  const p = deref(P, pRoot);
  const c = deref(C, cRoot);
  if (isObj(p) && isObj(c) && p.items !== undefined && c.items !== undefined && tp?.has("array") && tc?.has("array")) {
    const r = compat(p.items, pRoot, c.items, cRoot, depth + 1);
    if (!r.ok) return { ...r, reason: `array items: ${r.reason}` };
  }
  return { ok: true };
}

export { fmt as fmtTypes };

let ajv: Ajv2020 | undefined;

function ajvInstance(): Ajv2020 {
  if (!ajv) {
    ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, discriminator: true });
  }
  return ajv;
}

function oneLine(text: string): string {
  return text.split("\n")[0] ?? "";
}

/** Return null for a JSON Schema 2020-12 object, else a one-line reason (design D7). */
export function jsonSchemaProblem(schema: unknown): string | null {
  if (!isObj(schema)) return "schema must be a JSON object";
  const instance = ajvInstance();
  let valid = false;
  let why = "";
  try {
    valid = instance.validateSchema(schema) as boolean;
    if (!valid) why = instance.errorsText(instance.errors, { dataVar: "schema" });
  } catch (error: unknown) {
    why = oneLine(error instanceof Error ? error.message : String(error));
  }
  if (valid) return null;
  return oneLine(why) || "schema is not a valid JSON Schema";
}
