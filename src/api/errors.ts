// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  constructor(_status: number, _code: string, _message: string, _details?: unknown) {
    super();
    throw new Error("not implemented");
  }
}

export interface ErrorEnvelope {
  error: { code: string; message: string; details?: unknown };
}

export function toErrorResponse(_error: unknown): { status: number; body: ErrorEnvelope } {
  throw new Error("not implemented");
}
