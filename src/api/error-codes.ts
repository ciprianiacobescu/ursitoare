// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export const ERROR_CODES: Readonly<Record<string, { readonly status: number; readonly message: string }>> =
  {};

export function isRegisteredCode(_code: string): boolean {
  throw new Error("not implemented");
}

export function unregisteredRouteErrors(
  _routes: readonly { method: string; url: string; errors: readonly string[] }[],
): string[] {
  throw new Error("not implemented");
}
