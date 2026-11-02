// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export function appendEffect(
  _file: string,
  _entry: { tool: string; idemKey: string | null; nodeId: string },
): void {
  throw new Error("not implemented");
}

export function countEffects(_file: string): {
  calls: number;
  effects: number;
  duplicates: number;
  byTool: Readonly<Record<string, { calls: number; effects: number; duplicates: number }>>;
} {
  throw new Error("not implemented");
}
