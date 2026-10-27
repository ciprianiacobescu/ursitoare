// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type ToolArgType = "String" | "Long" | "Bool" | "decimal" | "Set<String>";

export function buildSchema(_opts?: { toolArgs?: Readonly<Record<string, ToolArgType>> }): string {
  throw new Error("not implemented");
}
