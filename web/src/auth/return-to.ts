// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export const SIGN_IN_PATH: string = "";
export const LOGIN_PATH: string = "";
export const LOGOUT_PATH: string = "";

export interface LocationLike {
  pathname: string;
  search: string;
  assign(url: string): void;
}

export function safeReturnTo(_raw: unknown): string {
  throw new Error("not implemented");
}

export function loginUrl(_returnTo: unknown): string {
  throw new Error("not implemented");
}

export function signInUrl(_opts?: { error?: string; returnTo?: unknown }): string {
  throw new Error("not implemented");
}

export function parseSignInSearch(_search: string): { error: string | null; returnTo: string } {
  throw new Error("not implemented");
}

export function redirectToSignIn(_location: LocationLike): boolean {
  throw new Error("not implemented");
}
