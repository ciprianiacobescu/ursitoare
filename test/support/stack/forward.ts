// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export interface ForwardRule {
  listenHost: "127.0.0.1" | "::1";
  listenPort: number;
  targetHost: string;
  targetPort: number;
}

export function stackForwards(): readonly ForwardRule[] {
  throw new Error("not implemented");
}

export async function startForwarders(
  _rules: readonly ForwardRule[],
): Promise<{ ports: readonly number[]; close(): Promise<void> }> {
  throw new Error("not implemented");
}
