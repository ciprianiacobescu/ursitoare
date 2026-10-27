// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export const SESSION_COOKIE: string = "";

export function parseCookies(_header: string | undefined): Record<string, string> {
  throw new Error("not implemented");
}

export function serializeCookie(
  _name: string,
  _value: string,
  _opts: { path: string; secure: boolean; maxAgeS?: number },
): string {
  throw new Error("not implemented");
}
