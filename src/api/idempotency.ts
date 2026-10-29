// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyReply, FastifyRequest } from "fastify";

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

export async function withIdempotency(
  _ctx: { pool: TenantPool; tenant: TenantContext; clock: Clock },
  _principal: { userId: string },
  _key: string,
  _requestDigest: string,
  _fn: (tx: TenantTx) => Promise<IdempotentResponse>,
): Promise<IdempotentResponse & { replayed: boolean }> {
  throw new Error("not implemented");
}

export async function respondIdempotent(
  _deps: { pool: TenantPool; clock: Clock },
  _req: FastifyRequest,
  _reply: FastifyReply,
  _fn: (tx: TenantTx) => Promise<IdempotentResponse>,
): Promise<FastifyReply> {
  throw new Error("not implemented");
}
