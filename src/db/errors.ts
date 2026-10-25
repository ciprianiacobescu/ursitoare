// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export class DbError extends Error {
  code: string;
  details: Record<string, string | number | string[]>;
  constructor(_code: string, _message: string, _details?: Record<string, string | number | string[]>) {
    super();
    throw new Error("not implemented");
  }
}
