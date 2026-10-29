// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyReply, FastifyRequest } from "fastify";
import type { QueryResultRow } from "pg";

import { withTenantTx } from "../tenancy/index.ts";
import type { Clock } from "../core/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../tenancy/index.ts";

import { createHash } from "node:crypto";

import { ApiError } from "./errors.ts";

export const IDEMPOTENCY_HEADER_SCHEMA: Readonly<Record<string, unknown>> = {
  type: "object",
  properties: {
    "idempotency-key": { type: "string", minLength: 1, maxLength: 128, pattern: "^[!-~]+$" },
  },
};

export interface IdempotentResponse {
  status: number;
  body: unknown;
}

const KEY_PATTERN = /^[!-~]{1,128}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const KEY_REUSED_MESSAGE = "Idempotency key was used with a different request";
const IN_PROGRESS_MESSAGE = "A request with this idempotency key is in progress";

function keyRefusal(): ApiError {
  return new ApiError(400, "VALIDATION_FAILED", "Request validation failed", {
    fields: [{ field: "headers/idempotency-key", message: "must be 1 to 128 visible ASCII characters" }],
  });
}

export function assertIdempotencyKey(key: string): void {
  if (typeof key !== "string" || !KEY_PATTERN.test(key)) {
    throw keyRefusal();
  }
}

export function idempotencyKeyOf(req: FastifyRequest): string | null {
  const value: unknown = req.headers["idempotency-key"];
  if (value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw keyRefusal();
  }
  assertIdempotencyKey(value);
  return value;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonical(item === undefined ? null : item));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const name of Object.keys(value).sort()) {
      const item = (value as Record<string, unknown>)[name];
      if (item !== undefined) {
        out[name] = canonical(item);
      }
    }
    return out;
  }
  return value === undefined ? null : value;
}

export function requestDigestOf(parts: {
  method: string;
  route: string;
  params?: unknown;
  query?: unknown;
  body?: unknown;
}): string {
  const text = JSON.stringify(
    canonical({
      method: parts.method.toUpperCase(),
      route: parts.route,
      params: parts.params ?? null,
      query: parts.query ?? null,
      body: parts.body ?? null,
    }),
  );
    return createHash("sha256").update(text).digest("hex");
}

interface KeyRow extends QueryResultRow {
  state: string;
  request_digest: string;
  response_status: number;
}

const CLAIM_ROUNDS = 3;
const MILLIS_PER_DAY = 86_400_000;

const CLAIM_SQL =
  "INSERT INTO ursitoare.idempotency_key (tenant_id, principal_id, key, request_digest, state, created_at) VALUES ($1, $2, $3, $4, 'in_progress', $5) ON CONFLICT (tenant_id, principal_id, key) DO UPDATE SET request_digest = EXCLUDED.request_digest, state = 'in_progress', response_status = NULL, response_body = NULL, created_at = EXCLUDED.created_at WHERE ursitoare.idempotency_key.created_at <= $6 RETURNING 1";

const READ_SQL =
  "SELECT request_digest, state, response_status, response_body FROM ursitoare.idempotency_key WHERE tenant_id = $1 AND principal_id = $2 AND key = $3";

const COMPLETE_SQL =
  "UPDATE ursitoare.idempotency_key SET state = 'done', response_status = $5, response_body = $6::jsonb WHERE tenant_id = $1 AND principal_id = $2 AND key = $3 AND state = 'in_progress' AND created_at = $4 AND request_digest = $7";

const RELEASE_SQL =
  "DELETE FROM ursitoare.idempotency_key WHERE tenant_id = $1 AND principal_id = $2 AND key = $3 AND state = 'in_progress' AND created_at = $4 AND request_digest = $5";

export async function withIdempotency(
  ctx: { pool: TenantPool; tenant: TenantContext; clock: Clock },
  principal: { userId: string },
  key: string,
  requestDigest: string,
  fn: (tx: TenantTx) => Promise<IdempotentResponse>,
): Promise<IdempotentResponse & { replayed: boolean }> {
  assertIdempotencyKey(key);
  if (typeof requestDigest !== "string" || !DIGEST_PATTERN.test(requestDigest)) {
    throw new RangeError("request digest must be 64 lowercase hex characters");
  }
  if (
    typeof principal?.userId !== "string" ||
    principal.userId.length < 1 ||
    principal.userId.length > 200
  ) {
    throw new RangeError("principal user id must be 1 to 200 characters");
  }

  const tenantId = ctx.tenant.tenantId;
  const userId = principal.userId;
  const now = ctx.clock.now();
  const cutoff = new Date(now.getTime() - MILLIS_PER_DAY);

  const claim = async (): Promise<boolean> => {
    const claimed = await withTenantTx(ctx.pool, ctx.tenant, async (tx) => {
      const result = await tx.query(CLAIM_SQL, [
        tenantId,
        userId,
        key,
        requestDigest,
        now,
        cutoff,
      ]);
      return result.rows.length > 0;
    });
    return claimed;
  };

  const readKey = async (): Promise<KeyRow | null> => {
    const row = await withTenantTx(ctx.pool, ctx.tenant, async (tx) => {
      const result = await tx.query<KeyRow>(READ_SQL, [tenantId, userId, key]);
      return result.rows[0] ?? null;
    });
    return row;
  };

  const release = async (): Promise<void> => {
    await withTenantTx(ctx.pool, ctx.tenant, async (tx) => {
      await tx.query(RELEASE_SQL, [tenantId, userId, key, now, requestDigest]);
    });
  };

  const complete = async (): Promise<IdempotentResponse & { replayed: boolean }> => {
    try {
      return await withTenantTx(ctx.pool, ctx.tenant, async (tx) => {
        const result = await fn(tx);
        const status = result.status;
        if (!Number.isInteger(status) || status < 100 || status > 599) {
          throw new RangeError("idempotent response status must be an integer from 100 to 599");
        }
        const bodyText = JSON.stringify(result.body);
        if (typeof bodyText !== "string") {
          throw new TypeError("idempotent response body must be storable JSON");
        }
        const stored = await tx.query(COMPLETE_SQL, [
          tenantId,
          userId,
          key,
          now,
          status,
          bodyText,
          requestDigest,
        ]);
        if (stored.rowCount !== 1) {
          throw new Error("idempotency claim lost");
        }
        return { status, body: JSON.parse(bodyText), replayed: false };
      });
    } catch (error) {
      await release().catch(() => undefined);
      throw error;
    }
  };

  for (let round = 0; round < CLAIM_ROUNDS; round += 1) {
    const claimed = await claim();
    if (claimed) {
      return complete();
    }
    const row = await readKey();
    if (row === null) {
      continue;
    }
    if (row.request_digest !== requestDigest) {
      throw new ApiError(422, "IDEMPOTENCY_KEY_REUSED", KEY_REUSED_MESSAGE);
    }
    if (row.state === "in_progress") {
      throw new ApiError(409, "IDEMPOTENCY_IN_PROGRESS", IN_PROGRESS_MESSAGE);
    }
    return {
      status: row.response_status,
      body: JSON.parse(JSON.stringify(row.response_body)),
      replayed: true,
    };
  }
  throw new ApiError(409, "IDEMPOTENCY_IN_PROGRESS", IN_PROGRESS_MESSAGE);
}

export async function respondIdempotent(
  deps: { pool: TenantPool; clock: Clock },
  req: FastifyRequest,
  reply: FastifyReply,
  fn: (tx: TenantTx) => Promise<IdempotentResponse>,
): Promise<FastifyReply> {
  const principal = req.principal;
  const tenant = req.tenant;
  if (principal === undefined || tenant === undefined) {
    throw new Error("respondIdempotent requires an authenticated principal and tenant");
  }

  const key = idempotencyKeyOf(req);
  if (key === null) {
    const result = await withTenantTx(deps.pool, tenant, fn);
    reply.code(result.status).send(result.body);
    return reply;
  }

  const digest = requestDigestOf({
    method: req.method,
    route: req.routeOptions.url ?? req.url,
    params: req.params,
    query: req.query,
    body: req.body,
  });
  const result = await withIdempotency(
    { pool: deps.pool, tenant, clock: deps.clock },
    { userId: principal.userId },
    key,
    digest,
    fn,
  );
  if (result.replayed) {
    reply.header("Idempotent-Replayed", "true");
  }
  reply.code(result.status).send(result.body);
  return reply;
}
