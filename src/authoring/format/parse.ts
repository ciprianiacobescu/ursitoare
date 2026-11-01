/**
 * Safe parsing of flow text (design Decisions 1 to 3).
 *
 * `parseFlowText` never throws for a string: it returns either a plain JSON
 * document or one `ParseError` with a `FORMAT_*` code (and a position for YAML).
 */

import YAML from "yaml";

import type { ParseError } from "./errors.ts";
import { findJsonProblem } from "./json-value.ts";

export type FlowFormat = "yaml" | "json";

export interface ParseLimits {
  maxBytes: number;
  maxDepth: number;
  maxAliasCount: number;
}

export const DEFAULT_PARSE_LIMITS: ParseLimits = Object.freeze({
  maxBytes: 1048576,
  maxDepth: 64,
  maxAliasCount: 20,
});

export type ParseResult = { ok: true; doc: unknown } | { ok: false; error: ParseError };

const YAML_OPTIONS = {
  version: "1.2" as const,
  schema: "core" as const,
  customTags: [],
  uniqueKeys: true,
  merge: false,
  strict: true,
  prettyErrors: true,
};

function firstLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const line = message.split("\n")[0]?.trim() ?? "";
  return line.length > 0 ? line : "parse failed";
}

function resolveLimits(limits?: Partial<ParseLimits>): ParseLimits {
  const pick = (value: unknown, fallback: number): number =>
    typeof value === "number" && Number.isInteger(value) && value >= 0
      ? Math.min(value, fallback)
      : fallback;
  return {
    maxBytes: pick(limits?.maxBytes, DEFAULT_PARSE_LIMITS.maxBytes),
    maxDepth: pick(limits?.maxDepth, DEFAULT_PARSE_LIMITS.maxDepth),
    maxAliasCount: pick(limits?.maxAliasCount, DEFAULT_PARSE_LIMITS.maxAliasCount),
  };
}

function failure(code: ParseError["code"], message: string, position?: { line: number; column: number }, path?: string): ParseResult {
  const error: ParseError = { code, message };
  if (position !== undefined) {
    error.line = position.line;
    error.column = position.column;
  }
  if (path !== undefined) error.path = path;
  return { ok: false, error };
}

function finish(doc: unknown, limits: ParseLimits): ParseResult {
  const problem = findJsonProblem(doc, limits.maxDepth);
  if (problem !== null) return failure(problem.code, problem.message, undefined, problem.path);
  return { ok: true, doc };
}

function yamlCode(code: string | undefined): ParseError["code"] {
  switch (code) {
    case "DUPLICATE_KEY":
      return "FORMAT_DUPLICATE_KEY";
    case "TAG_RESOLVE_FAILED":
      return "FORMAT_UNSUPPORTED_TAG";
    case "RESOURCE_EXHAUSTION":
      return "FORMAT_TOO_DEEP";
    default:
      return "FORMAT_YAML_SYNTAX";
  }
}

function parseJson(text: string, limits: ParseLimits): ParseResult {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch (error) {
    return failure("FORMAT_JSON_SYNTAX", firstLine(error));
  }
  return finish(doc, limits);
}

function parseYaml(text: string, limits: ParseLimits): ParseResult {
  let document: YAML.Document.Parsed;
  try {
    document = YAML.parseDocument(text, YAML_OPTIONS);
  } catch (error) {
    return failure("FORMAT_YAML_SYNTAX", firstLine(error));
  }

  const problem = document.errors[0] ?? document.warnings[0];
  if (problem !== undefined) {
    const pos = problem.linePos?.[0];
    return failure(
      yamlCode(problem.code),
      firstLine(problem),
      pos === undefined ? undefined : { line: pos.line, column: pos.col },
    );
  }

  let doc: unknown;
  try {
    doc = document.toJS({ maxAliasCount: limits.maxAliasCount });
  } catch (error) {
    if (error instanceof ReferenceError) return failure("FORMAT_ALIAS_LIMIT", firstLine(error));
    if (error instanceof RangeError) return failure("FORMAT_TOO_DEEP", firstLine(error));
    return failure("FORMAT_YAML_SYNTAX", firstLine(error));
  }
  return finish(doc, limits);
}

export function parseFlowText(
  text: string,
  format: FlowFormat,
  limits?: Partial<ParseLimits>,
): ParseResult {
  const resolved = resolveLimits(limits);
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (Buffer.byteLength(body, "utf8") > resolved.maxBytes) {
    return failure("FORMAT_TOO_LARGE", `text is larger than ${resolved.maxBytes} bytes`);
  }
  return format === "json" ? parseJson(body, resolved) : parseYaml(body, resolved);
}

export function formatOf(fileName: string): FlowFormat {
  return /\.json$/i.test(fileName) ? "json" : "yaml";
}
