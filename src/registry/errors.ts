// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type RegistryErrorCode =
  | "REGISTRY_INVALID"
  | "REGISTRY_SCHEMA_INVALID"
  | "REGISTRY_CONFLICT"
  | "REGISTRY_TENANT_MISMATCH";

export class RegistryError extends Error {
  readonly code: RegistryErrorCode;
  readonly details: Readonly<Record<string, string | number>>;

  constructor(
    _code: RegistryErrorCode,
    message: string,
    _details?: Record<string, string | number>,
  ) {
    super(message);
    throw new Error("not implemented");
  }
}
