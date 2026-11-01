// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ParseError } from "./errors.ts";

export type FlowFormat = "yaml" | "json";

export interface ParseLimits {
  maxBytes: number;
  maxDepth: number;
  maxAliasCount: number;
}

export const DEFAULT_PARSE_LIMITS: ParseLimits = {
  maxBytes: 0,
  maxDepth: 0,
  maxAliasCount: 0,
};

export type ParseResult = { ok: true; doc: unknown } | { ok: false; error: ParseError };

export function parseFlowText(
  _text: string,
  _format: FlowFormat,
  _limits?: Partial<ParseLimits>,
): ParseResult {
  throw new Error("not implemented");
}

export function formatOf(_fileName: string): FlowFormat {
  throw new Error("not implemented");
}
