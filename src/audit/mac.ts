// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export interface KeyMaterial {
  reveal(): string;
}

export function anchorMac(
  _engineKey: KeyMaterial,
  _tenantId: string,
  _seq: bigint,
  _hashHex: string,
): string {
  throw new Error("not implemented");
}
