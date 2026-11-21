// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ContractCheck } from "../fake-oidc/index.ts";

export function fakeMcpContract(
  _baseUrl: string,
  _opts: { host: string; path: string; key: { name: string; value: string } | null },
): ContractCheck[] {
  throw new Error("not implemented");
}
