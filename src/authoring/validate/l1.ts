/**
 * L1: the schema of the document plus static checks on its strings (design D3): reference syntax,
 * `W_SUSPICIOUS_INTERPOLATION`, embedded JSON Schemas, `L1_REF_NOT_ALLOWED` and the `code` source.
 */

import * as acorn from "acorn";
import type { AnySchema, ErrorObject, ValidateFunction } from "ajv";
import { Ajv2020 } from "ajv/dist/2020.js";

import { escapePointer, scanTemplate, suspiciousInterpolation, valueFields, walkStrings } from "../format/index.ts";
import { jsonSchemaProblem, isObj } from "./jsonschema.ts";
import { FLOW_SCHEMA } from "./schema.ts";
import type { Sink } from "./sink.ts";

const AJV_CODE: Readonly<Record<string, string>> = {
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

let compiled: ValidateFunction | undefined;

function flowValidator(): ValidateFunction {
  if (compiled === undefined) {
    const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, discriminator: true });
    compiled = ajv.compile(FLOW_SCHEMA as AnySchema);
  }
  return compiled;
}

function unescapePointer(segment: string): string {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

function nodeOfPath(path: string): string | null {
  const m = /^\/nodes\/([^/]+)/.exec(path);
  return m?.[1] === undefined ? null : unescapePointer(m[1]);
}

const nodePath = (id: string, rest = ""): string => `/nodes/${escapePointer(id)}${rest}`;

type AstNode = Record<string, unknown>;

function isAstNode(value: unknown): value is AstNode {
  return isObj(value) && typeof value.type === "string";
}

function children(node: AstNode): unknown[] {
  const out: unknown[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === "type" || key === "start" || key === "end" || key === "loc") continue;
    if (Array.isArray(value)) out.push(...value);
    else if (isObj(value)) out.push(value);
  }
  return out;
}

function walkAst(
  node: unknown,
  visit: (n: AstNode, parent: AstNode | null, key: string) => void,
  parent: AstNode | null = null,
  key = "",
): void {
  if (!isAstNode(node)) return;
  visit(node, parent, key);
  for (const [k, value] of Object.entries(node)) {
    if (k === "type" || k === "start" || k === "end" || k === "loc") continue;
    if (Array.isArray(value)) value.forEach((c) => walkAst(c, visit, node, k));
    else if (isObj(value)) walkAst(value, visit, node, k);
  }
}

const FUNCTION_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

function hasOwnReturn(body: unknown): boolean {
  let found = false;
  const visit = (n: unknown): void => {
    if (!isAstNode(n) || found) return;
    if (n.type === "ReturnStatement") {
      found = true;
      return;
    }
    if (FUNCTION_TYPES.has(n.type as string)) return;
    children(n).forEach(visit);
  };
  if (Array.isArray(body)) body.forEach(visit);
  return found;
}

function checkCodeSource(id: string, source: string, s: Sink): void {
  const path = nodePath(id, "/source");
  const wrapped = `(function (input) {\n${source}\n})`;
  let program: acorn.Program;
  try {
    program = acorn.parse(wrapped, { ecmaVersion: "latest", sourceType: "script" });
  } catch (error: unknown) {
    const loc = isObj(error) ? error.loc : undefined;
    const line = isObj(loc) && typeof loc.line === "number" ? loc.line - 1 : "?";
    const text = error instanceof Error ? error.message : String(error);
    s.err("L1", "L1_CODE_SYNTAX", id, path, `code source does not parse (line ${line}): ${text.replace(/ \(\d+:\d+\)$/, "")}`);
    return;
  }
  const first: unknown = program.body[0];
  const fn = isObj(first) ? first.expression : undefined;
  const fnBody = isObj(fn) && isObj(fn.body) ? fn.body.body : undefined;
  if (!hasOwnReturn(fnBody)) {
    s.err("L1", "L1_CODE_NO_RETURN", id, path, "code source never returns a value; it must `return` an object");
  }
  walkAst(fn, (n, parent, key) => {
    if (n.type === "Identifier" && typeof n.name === "string" && FORBIDDEN_IDENTS.has(n.name)) {
      if (parent?.type === "MemberExpression" && key === "property" && parent.computed !== true) return;
      if (parent?.type === "Property" && key === "key" && parent.computed !== true) return;
      s.warn("L1", "W_CODE_FORBIDDEN_API", id, path, `code uses "${n.name}", which is not available or not deterministic in the code sandbox`);
    }
    if (n.type === "MemberExpression" && n.computed !== true) {
      const object = n.object;
      const property = n.property;
      if (isObj(object) && object.name === "Math" && isObj(property) && property.name === "random") {
        s.warn("L1", "W_CODE_FORBIDDEN_API", id, path, `code uses "Math.random", which is not deterministic in the code sandbox`);
      }
    }
    if (n.type === "ImportExpression") {
      s.warn("L1", "W_CODE_FORBIDDEN_API", id, path, "code uses dynamic import, which is not available in the code sandbox");
    }
  });
}

function str(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function schemaErrors(errors: ErrorObject[], s: Sink): void {
  const seen = new Set<string>();
  for (const e of errors) {
    const params: Record<string, unknown> = e.params;
    if (e.keyword === "if" || e.keyword === "oneOf") continue;
    if (String(e.schemaPath).includes("/anyOf/")) continue;
    if (e.keyword === "discriminator" && params.error === "tag") continue;
    if (e.keyword !== "propertyNames" && e.propertyName !== undefined) continue;
    if (e.keyword === "propertyNames") {
      const name = str(params.propertyName);
      const p = `${e.instancePath}/${escapePointer(name)}`;
      const k = `L1_PATTERN|${p}`;
      if (!seen.has(k)) {
        seen.add(k);
        const what = e.instancePath === "/nodes" ? "node id" : "name";
        const rule = what === "node id" ? "ids are snake_case and match [a-z][a-z0-9_]*" : "name does not match the required pattern";
        s.err("L1", "L1_PATTERN", nodeOfPath(p), p, `${what} "${name}" is invalid: ${rule}`);
      }
      continue;
    }
    let path = e.instancePath;
    if (e.keyword === "required") path += `/${escapePointer(str(params.missingProperty))}`;
    if (e.keyword === "additionalProperties") path += `/${escapePointer(str(params.additionalProperty))}`;
    const code = Object.hasOwn(AJV_CODE, e.keyword) ? AJV_CODE[e.keyword] : undefined;
    if (code === undefined) throw new Error(`unmapped JSON Schema keyword "${e.keyword}" at ${e.instancePath}`);
    let message = e.message ?? "";
    if (e.keyword === "required") message = `missing required field "${str(params.missingProperty)}"`;
    else if (e.keyword === "additionalProperties") message = `unknown field "${str(params.additionalProperty)}"`;
    else if (e.keyword === "discriminator") {
      message = params.tagValue !== undefined ? `unknown node kind "${str(params.tagValue)}"` : `node needs a string "kind"`;
    } else if (e.keyword === "anyOf" || e.keyword === "not") {
      message = "foreach needs exactly one of (uses + with) or (subflow + with)";
    } else if (e.keyword === "const") message = `must be ${JSON.stringify(params.allowedValue)}`;
    else if (e.keyword === "enum") message = `must be one of ${JSON.stringify(params.allowedValues)}`;
    const key = `${code}|${path}|${message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    s.err("L1", code, nodeOfPath(path), path, message);
  }
}

function checkEmbeddedSchema(schema: unknown, path: string, id: string | null, s: Sink): void {
  if (!isObj(schema)) return;
  const problem = jsonSchemaProblem(schema);
  if (problem !== null) s.err("L1", "L1_INVALID_JSON_SCHEMA", id, path, `not a valid JSON Schema (2020-12): ${problem}`);
}

/** Run L1 on any document; never reads a catalogue. */
export function checkL1(doc: unknown, s: Sink): void {
  const validate = flowValidator();
  if (!validate(doc)) schemaErrors(validate.errors ?? [], s);
  if (!isObj(doc)) return;

  checkEmbeddedSchema(doc.inputs, "/inputs", null, s);

  const nodes = doc.nodes;
  if (!isObj(nodes)) return;
  for (const id of Object.keys(nodes).sort()) {
    const n = nodes[id];
    if (!isObj(n) || typeof n.kind !== "string") continue;
    if (n.output_schema !== undefined) checkEmbeddedSchema(n.output_schema, nodePath(id, "/output_schema"), id, s);
    if (n.form_schema !== undefined) checkEmbeddedSchema(n.form_schema, nodePath(id, "/form_schema"), id, s);

    for (const { field, value } of valueFields(n)) {
      walkStrings(value, nodePath(id, `/${field}`), (text, path) => {
        for (const seg of scanTemplate(text)) {
          if (seg.type === "ref" && seg.error !== undefined) {
            s.err("L1", "L1_REF_SYNTAX", id, path, `${seg.error} (in "${text}")`);
          }
          if (seg.type === "text") {
            const suspicious = suspiciousInterpolation(seg.text);
            if (suspicious !== null && !seg.text.includes("${{")) {
              s.warn("L1", "W_SUSPICIOUS_INTERPOLATION", id, path, suspicious);
            }
          }
        }
      });
    }
    for (const field of ["instructions", "goal"]) {
      const text = n[field];
      if (typeof text === "string" && text.includes("${{")) {
        s.err(
          "L1",
          "L1_REF_NOT_ALLOWED",
          id,
          nodePath(id, `/${field}`),
          `"${field}" is plain text; references (\${{ ... }}) are not interpolated here. Pass data through "input" instead`,
        );
      }
    }
    if (typeof n.source === "string") {
      if (/\$\{\{\s*(inputs|nodes|item)\b/.test(n.source)) {
        s.err(
          "L1",
          "L1_REF_NOT_ALLOWED",
          id,
          nodePath(id, "/source"),
          `code "source" is plain JavaScript; references are not interpolated. Pass data through "input" and read it as input.<name>`,
        );
      }
      if (n.kind === "code") checkCodeSource(id, n.source, s);
    }
  }
}
