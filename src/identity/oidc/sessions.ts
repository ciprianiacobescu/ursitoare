// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Clock } from "../../core/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../../tenancy/index.ts";

export interface OidcOptions {
  clock?: Clock;
  randomBytes?: (size: number) => Uint8Array;
}

export interface SessionContext {
  tenant: TenantContext;
  userId: string;
  sessionRef: string;
  endSessionHint: string | null;
}

export async function createSession(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { userId: string; endSessionHint?: string },
  _opts?: OidcOptions,
): Promise<{ sessionId: string }> {
  throw new Error("not implemented");
}

export async function resolveSession(
  _pool: TenantPool,
  _cookieValue: string | undefined,
  _opts?: OidcOptions,
): Promise<SessionContext | null> {
  throw new Error("not implemented");
}

export async function revokeSession(
  _pool: TenantPool,
  _session: SessionContext,
  _opts?: OidcOptions,
): Promise<boolean> {
  throw new Error("not implemented");
}

export async function issueCsrfToken(
  _pool: TenantPool,
  _session: SessionContext,
  _opts?: OidcOptions,
): Promise<string> {
  throw new Error("not implemented");
}

export async function verifyCsrfToken(
  _pool: TenantPool,
  _session: SessionContext,
  _token: string | undefined,
): Promise<boolean> {
  throw new Error("not implemented");
}
