// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { EgressContractTarget } from "../fake-egress/contract.ts";

export async function proxySmoke(_target: EgressContractTarget): Promise<{ ok: boolean; detail: string }> {
  throw new Error("not implemented");
}

export function smokeTarget(_dir: string): EgressContractTarget {
  throw new Error("not implemented");
}
