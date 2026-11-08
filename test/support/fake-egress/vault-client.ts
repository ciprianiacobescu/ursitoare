// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { VaultPutInput } from "./wire.ts";

export async function callVault(
  _vaultUrl: string,
  _who: { identity: string; token: string } | null,
  _body: Uint8Array,
  _rpc?: { path?: string; method?: string },
): Promise<{ grpcStatus: number; grpcMessage: string; body: Buffer }> {
  throw new Error("not implemented");
}

export async function putCredential(
  _vaultUrl: string,
  _who: { identity: string; token: string } | null,
  _input: VaultPutInput,
): Promise<{ grpcStatus: number; grpcMessage: string; keyVersion: number | null }> {
  throw new Error("not implemented");
}
