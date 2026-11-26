// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export class StackLoginError extends Error {
  readonly code: "STACK_LOGIN_TWO_STEP" | "STACK_LOGIN_FAILED";

  constructor(code: StackLoginError["code"], _message: string) {
    super("");
    this.code = code;
  }
}

export interface StackSession {
  cookie: string;
  csrfToken: string;
  capabilities: readonly string[];
  request(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<{ status: number; body: unknown }>;
}

export async function signInThroughKeycloak(_opts: {
  engineOrigin: string;
  username: string;
  password: string;
  fetch?: typeof fetch;
}): Promise<StackSession> {
  throw new Error("not implemented");
}
