// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export const CSRF_HEADER: string = "";

export function isStateChanging(_method: string | undefined): boolean {
  throw new Error("not implemented");
}

export function withCsrfHeader(
  _inner: typeof fetch,
  _csrfToken: () => Promise<string | null>,
): typeof fetch {
  throw new Error("not implemented");
}

export function withSessionEnd(_inner: typeof fetch, _onEnded: () => void): typeof fetch {
  throw new Error("not implemented");
}
