export type RegistryErrorCode =
  | "REGISTRY_INVALID"
  | "REGISTRY_SCHEMA_INVALID"
  | "REGISTRY_CONFLICT"
  | "REGISTRY_TENANT_MISMATCH";

export class RegistryError extends Error {
  readonly code: RegistryErrorCode;
  readonly details: Readonly<Record<string, string | number>>;

  constructor(
    code: RegistryErrorCode,
    message: string,
    details?: Record<string, string | number>,
  ) {
    super(message);
    this.name = "RegistryError";
    this.code = code;
    this.details = details ?? {};
  }
}
