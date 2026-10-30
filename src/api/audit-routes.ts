// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { KeyMaterial, verifyChain } from "../audit/index.ts";
import type { Clock } from "../core/index.ts";
import type { TenantPool } from "../tenancy/index.ts";

export interface AuditVerification {
  ok: boolean;
  checked: number;
  firstBadSeq: string | null;
  reason: "hash" | "gap" | "anchor" | null;
  fromSeq: string;
  anchorsChecked: boolean;
  anchorsVerified: number;
  checkedAt: string;
}

export interface WalkQueue {
  run<T>(tenantId: string, fromSeq: bigint, start: () => Promise<T>): Promise<T>;
}

export function createWalkQueue(_maxConcurrent: number): WalkQueue {
  throw new Error("not implemented");
}

export interface AuditApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  engineKey: KeyMaterial | null;
  verify?: typeof verifyChain;
  walks?: WalkQueue;
}

export function registerAuditRoutes(_server: FastifyInstance, _deps: AuditApiDeps): void {
  throw new Error("not implemented");
}
