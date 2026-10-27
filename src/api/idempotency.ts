// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyReply, FastifyRequest } from "fastify";

import type { Clock } from "../core/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../tenancy/index.ts";

export const IDEMPOTENCY_HEADER_SCHEMA: Readonly<Record<string, unknown>> = {};

export interface IdempotentResponse {
  status: number;
  body: unknown;
}

export function idempotencyKeyOf(_req: FastifyRequest): string | null {
  throw new Error("not implemented");
}

export function requestDigestOf(_parts: {
  method: string;
  route: string;
  params?: unknown;
  query?: unknown;
  body?: unknown;
}): string {
  throw new Error("not implemented");
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
