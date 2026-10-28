import { randomBytes as cryptoRandomBytes } from "node:crypto";

import { systemClock, type Clock } from "../../core/index.ts";
import {
  hashRouteKey,
  registerTenantRoute,
  resolveTenantBy,
  withTenantTx,
  type TenantContext,
  type TenantPool,
  type TenantTx,
} from "../../tenancy/index.ts";
import { OidcError } from "./errors.ts";

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

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SESSION_TTL_S = 43_200;
const IDLE_TIMEOUT_S = 1_800;
const SLIDE_MS = 60_000;
const REAP_LIMIT = 20;
const ROUTE_KIND = "session";

interface SessionRow {
  session_id_hash: Buffer;
  user_id: string;
  last_seen_at: Date;
  expires_at: Date;
  idle_timeout_s: number;
  end_session_hint: string | null;
  revoked_at: Date | null;
  state: string;
}

interface ReapedRow {
  session_id_hash: Buffer;
}

interface TenantRow {
  tenant_id: string | null;
}

function clockOf(opts: OidcOptions | undefined): Clock {
  return opts?.clock ?? systemClock;
}

function randomValue(opts: OidcOptions | undefined, size: number): Buffer {
  const source = opts?.randomBytes ?? cryptoRandomBytes;
  return Buffer.from(source(size));
}

async function assertTenantMatches(tx: TenantTx, ctx: TenantContext): Promise<void> {
  const result = await tx.query<TenantRow>(
    "SELECT current_setting('app.tenant_id', true) AS tenant_id",
  );
  if (result.rows[0]?.tenant_id !== ctx.tenantId) {
    throw new OidcError("SESSION_TENANT_MISMATCH", "the transaction belongs to another tenant");
  }
}

async function removeRoute(tx: TenantTx, hash: Buffer): Promise<void> {
  await tx.query("SELECT ursitoare.unregister_tenant_route($1, $2) AS removed", [
    ROUTE_KIND,
    hash,
  ]);
}

async function reapExpired(tx: TenantTx, ctx: TenantContext, now: Date): Promise<void> {
  const reaped = await tx.query<ReapedRow>(
    `UPDATE ursitoare.session
        SET revoked_at = $2
      WHERE tenant_id = $1
        AND revoked_at IS NULL
        AND (tenant_id, session_id_hash) IN (
          SELECT tenant_id, session_id_hash
            FROM ursitoare.session
           WHERE tenant_id = $1
             AND revoked_at IS NULL
             AND (expires_at <= $2
                  OR last_seen_at + idle_timeout_s * interval '1 second' <= $2)
           ORDER BY expires_at, session_id_hash
           LIMIT ${REAP_LIMIT})
      RETURNING session_id_hash`,
    [ctx.tenantId, now],
  );
  for (const row of reaped.rows) {
    await removeRoute(tx, row.session_id_hash);
  }
}

export async function createSession(
  tx: TenantTx,
  ctx: TenantContext,
  input: { userId: string; endSessionHint?: string },
  opts?: OidcOptions,
): Promise<{ sessionId: string }> {
  const now = clockOf(opts).now();
  await assertTenantMatches(tx, ctx);
  await reapExpired(tx, ctx, now);

  const sessionId = randomValue(opts, 32).toString("base64url");
  const sessionHash = hashRouteKey(sessionId);
  const csrfHash = randomValue(opts, 32);
  const expiresAt = new Date(now.getTime() + SESSION_TTL_S * 1000);

  await tx.query(
    `INSERT INTO ursitoare.session
       (tenant_id, session_id_hash, user_id, created_at, last_seen_at, expires_at,
        idle_timeout_s, csrf_token_hash, end_session_hint, revoked_at)
     VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, NULL)`,
    [
      ctx.tenantId,
      sessionHash,
      input.userId,
      now,
      expiresAt,
      IDLE_TIMEOUT_S,
      csrfHash,
      input.endSessionHint ?? null,
    ],
  );
  await registerTenantRoute(tx, ROUTE_KIND, sessionId);
  return { sessionId };
}

export async function resolveSession(
  pool: TenantPool,
  cookieValue: string | undefined,
  opts?: OidcOptions,
): Promise<SessionContext | null> {
  if (typeof cookieValue !== "string" || !SESSION_ID_PATTERN.test(cookieValue)) {
    return null;
  }
  const ctx = await resolveTenantBy(pool, ROUTE_KIND, cookieValue);
  if (ctx === null) {
    return null;
  }
  const now = clockOf(opts).now();
  const sessionHash = hashRouteKey(cookieValue);

  return withTenantTx(pool, ctx, async (tx) => {
    const result = await tx.query<SessionRow>(
      `SELECT s.session_id_hash, s.user_id, s.last_seen_at, s.expires_at,
              s.idle_timeout_s, s.end_session_hint, s.revoked_at, u.state
         FROM ursitoare.session s
         JOIN ursitoare."user" u
           ON u.tenant_id = s.tenant_id AND u.user_id = s.user_id
        WHERE s.tenant_id = $1 AND s.session_id_hash = $2`,
      [ctx.tenantId, sessionHash],
    );
    const row = result.rows[0];
    if (row === undefined || row.revoked_at !== null) {
      return null;
    }

    const idleAt = new Date(row.last_seen_at.getTime() + row.idle_timeout_s * 1000);
    const expired =
      now.getTime() >= row.expires_at.getTime() || now.getTime() >= idleAt.getTime();
    if (expired) {
      await tx.query(
        `UPDATE ursitoare.session SET revoked_at = $3
          WHERE tenant_id = $1 AND session_id_hash = $2 AND revoked_at IS NULL`,
        [ctx.tenantId, sessionHash, now],
      );
      await removeRoute(tx, sessionHash);
      return null;
    }
    if (row.state !== "active") {
      return null;
    }

    if (now.getTime() - row.last_seen_at.getTime() >= SLIDE_MS) {
      await tx.query(
        `UPDATE ursitoare.session SET last_seen_at = $3
          WHERE tenant_id = $1 AND session_id_hash = $2`,
        [ctx.tenantId, sessionHash, now],
      );
    }

    return {
      tenant: ctx,
      userId: row.user_id,
      sessionRef: row.session_id_hash.toString("hex"),
      endSessionHint: row.end_session_hint,
    };
  });
}

export async function revokeSession(
  pool: TenantPool,
  session: SessionContext,
  opts?: OidcOptions,
): Promise<boolean> {
  const now = clockOf(opts).now();
  const sessionHash = Buffer.from(session.sessionRef, "hex");
  if (sessionHash.length !== 32) {
    throw new OidcError("SESSION_INVALID", "the session reference is malformed");
  }

  return withTenantTx(pool, session.tenant, async (tx) => {
    const result = await tx.query(
      `UPDATE ursitoare.session SET revoked_at = $3
        WHERE tenant_id = $1 AND session_id_hash = $2 AND revoked_at IS NULL`,
      [session.tenant.tenantId, sessionHash, now],
    );
    await removeRoute(tx, sessionHash);
    return (result.rowCount ?? 0) > 0;
  });
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
