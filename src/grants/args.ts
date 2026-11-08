// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { BlockDef, JsonValue } from "../authoring/index.ts";
import type { ToolArgType, ToolArgs } from "../pdp/index.ts";

export function toolArgTypes(_blocks: readonly BlockDef[]): Readonly<Record<string, ToolArgType>> {
  throw new Error("not implemented");
}

export type CedarArgs =
  | { ok: true; args: ToolArgs; unconstrained: string[] }
  | { ok: false; arg: string; reason: "type" | "precision" | "reserved" };

export function toCedarArgs(
  _args: JsonValue,
  _types: Readonly<Record<string, ToolArgType>>,
): CedarArgs {
  throw new Error("not implemented");
}
