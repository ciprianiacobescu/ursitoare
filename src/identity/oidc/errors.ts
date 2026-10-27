// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export class OidcError extends Error {
  code: string;
  details: Record<string, string | number>;
  constructor(_code: string, message: string, _details?: Record<string, string | number>) {
    super(message);
    throw new Error("not implemented");
  }
}
