// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export interface VaultPutInput {
  tenantId: string;
  serviceId: string;
  authScheme: number;
  value: Uint8Array;
  headerName: string;
  callerActorId: string;
  targetUrl: string;
}

export class WireError extends Error {
  constructor(message?: string) {
    super(message);
    throw new Error("not implemented");
  }
}

export function encodePutRequest(_m: VaultPutInput): Buffer {
  throw new Error("not implemented");
}

export function decodePutRequest(
  _message: Buffer,
): Omit<VaultPutInput, "value"> & { value: Buffer } {
  throw new Error("not implemented");
}

export function encodePutResponse(_keyVersion: number): Buffer {
  throw new Error("not implemented");
}

export function decodePutResponse(_message: Buffer): number {
  throw new Error("not implemented");
}

export function frame(_message: Uint8Array): Buffer {
  throw new Error("not implemented");
}

export function unframe(_body: Buffer): Buffer {
  throw new Error("not implemented");
}
