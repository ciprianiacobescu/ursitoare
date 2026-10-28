export class OidcError extends Error {
  readonly code: string;
  readonly details: Record<string, string | number>;

  constructor(code: string, message: string, details?: Record<string, string | number>) {
    super(message);
    this.name = "OidcError";
    this.code = code;
    this.details = details ?? {};
  }
}
