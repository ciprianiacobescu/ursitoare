// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ToolJson } from "../calls.ts";

export function translateSchema(
  _schema: unknown,
  _version: "3.0" | "3.1",
  _document: Readonly<Record<string, unknown>>,
):
  | { ok: true; schema: { [key: string]: ToolJson } }
  | { ok: false; reason: "ref_remote" | "ref_cycle" | "schema_invalid" } {
  throw new Error("not implemented");
}
