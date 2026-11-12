import type { FastifyInstance, FastifyRequest } from "fastify";

import { isUtcTime } from "../audit/index.ts";
import type { KeyMaterial } from "../audit/index.ts";
import { listPolicyDecisions } from "../pdp/index.ts";
import type { PolicyDecisionRecord } from "../pdp/index.ts";
import { runRepository } from "../runs/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { deriveCursorKey } from "./cursor.ts";
import type { CursorKey, CursorPosition } from "./cursor.ts";
import { ApiError } from "./errors.ts";
import { cursorInvalid, engineKeyRequired, pageSchema, unavailable } from "./flow-common.ts";
import { paginate, readPage, startAfter } from "./pagination.ts";
import { defineRoute } from "./route.ts";
import type { ResourceRef } from "./route.ts";
import { runResource } from "./run-views.ts";

export interface DecisionView {
  decisionId: string;
  decidedAt: string;
  nodeId: string | null;
  resource: string;
  decision: "allow" | "deny";
  reasons: string[];
  policySetVersion: string;
  permit: {
    method: string;
    host: string;
    path: string;
    bodyDigest: string;
    serviceId: string;
    ttlSeconds: number;
  } | null;
}

const RUN_DECISIONS_SCOPE = "run_decisions";
const RUN_ID_PATTERN = "^[A-Za-z0-9_-]{1,128}$";
const DECIDED_AT_SIX_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{6}Z$/;

function permitOf(raw: Record<string, unknown> | null): DecisionView["permit"] {
  if (raw === null || typeof raw !== "object") return null;
  const { method, host, path, bodyDigest, serviceId, ttlSeconds } = raw;
  if (
    typeof method !== "string" ||
    typeof host !== "string" ||
    typeof path !== "string" ||
    typeof bodyDigest !== "string" ||
    typeof serviceId !== "string" ||
    typeof ttlSeconds !== "number"
  ) {
    return null;
  }
  return { method, host, path, bodyDigest, serviceId, ttlSeconds };
}

export function toDecisionView(record: PolicyDecisionRecord): DecisionView {
  return {
    decisionId: record.decisionId,
    decidedAt: record.decidedAt,
    nodeId: record.nodeId,
    resource: record.resource,
    decision: record.decision,
    reasons: [...record.reasons],
    policySetVersion: record.policySetVersion,
    permit: permitOf(record.permit),
  };
}

const DECISION_VIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "decisionId",
    "decidedAt",
    "nodeId",
    "resource",
    "decision",
    "reasons",
    "policySetVersion",
    "permit",
  ],
  properties: {
    decisionId: { type: "string" },
    decidedAt: { type: "string" },
    nodeId: { type: ["string", "null"] },
    resource: { type: "string" },
    decision: { type: "string", enum: ["allow", "deny"] },
    reasons: { type: "array", items: { type: "string" } },
    policySetVersion: { type: "string" },
    permit: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["method", "host", "path", "bodyDigest", "serviceId", "ttlSeconds"],
          properties: {
            method: { type: "string" },
            host: { type: "string" },
            path: { type: "string" },
            bodyDigest: { type: "string" },
            serviceId: { type: "string" },
            ttlSeconds: { type: "number" },
          },
        },
      ],
    },
  },
};

const RUN_PARAMS = {
  type: "object",
  additionalProperties: false,
  required: ["runId"],
  properties: { runId: { type: "string", pattern: RUN_ID_PATTERN } },
};

const DECISIONS_QUERY = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 100, default: 50 },
    cursor: { type: "string", minLength: 1, maxLength: 1024 },
  },
};

export interface RunDecisionApiDeps {
  pool: TenantPool | null;
  engineKey: KeyMaterial | null;
}

function afterOf(
  position: CursorPosition,
  runId: string,
): { decidedAt: string; decisionId: string } {
  const [cursorRunId, at, id] = position;
  if (
    position.length !== 3 ||
    cursorRunId !== runId ||
    typeof at !== "string" ||
    !DECIDED_AT_SIX_PATTERN.test(at) ||
    !isUtcTime(at) ||
    typeof id !== "string" ||
    id.length < 1 ||
    id.length > 128
  ) {
    throw cursorInvalid();
  }
  return { decidedAt: at, decisionId: id };
}

export function registerRunDecisionRoutes(
  server: FastifyInstance,
  deps: RunDecisionApiDeps,
): void {
  const key: CursorKey | null = deps.engineKey === null ? null : deriveCursorKey(deps.engineKey);

  const context = (request: FastifyRequest): { pool: TenantPool; tenant: TenantContext } => {
    const tenant = request.tenant;
    if (deps.pool === null) {
      throw new ApiError(503, "RUNS_UNAVAILABLE", "Runs are unavailable");
    }
    if (tenant === undefined || request.principal === undefined) throw unavailable();
    return { pool: deps.pool, tenant };
  };

  const runIdOf = (request: FastifyRequest): string =>
    (request.params as { runId: string }).runId;

  const loadRun = async (request: FastifyRequest): Promise<ResourceRef | null> => {
    const { pool, tenant } = context(request);
    const run = await withTenantTx(pool, tenant, (tx) =>
      runRepository.get(tx, tenant, runIdOf(request)),
    );
    return run === null ? null : runResource(tenant.tenantId, run);
  };

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/runs/:runId/decisions",
    auth: { kind: "session" },
    action: "read_run",
    resource: loadRun,
    schema: {
      params: RUN_PARAMS,
      querystring: DECISIONS_QUERY,
      response: { 200: pageSchema(DECISION_VIEW_SCHEMA) },
    },
    errors: [
      "CURSOR_INVALID",
      "ENGINE_KEY_REQUIRED",
      "NOT_FOUND",
      "RUNS_UNAVAILABLE",
      "VALIDATION_FAILED",
    ],
    handler: async (request) => {
      const { pool, tenant } = context(request);
      const runId = runIdOf(request);
      const page = readPage(request.query);
      const base = { filter: { runId }, order: "asc" as const, limit: page.limit + 1 };
      if (key === null) {
        if (page.cursor !== null) throw engineKeyRequired();
        const rows = await listPolicyDecisions(pool, tenant, base);
        if (rows.length > page.limit) throw engineKeyRequired();
        return { items: rows.map(toDecisionView), next_cursor: null };
      }
      const binding = { key, tenantId: tenant.tenantId, scope: RUN_DECISIONS_SCOPE };
      const position = startAfter(binding, page.cursor);
      const rows = await listPolicyDecisions(
        pool,
        tenant,
        position === null ? base : { ...base, continueAfter: afterOf(position, runId) },
      );
      const result = paginate(rows, {
        limit: page.limit,
        keyOf: (row) => [runId, row.decidedAt, row.decisionId],
        cursor: binding,
      });
      return { items: result.items.map(toDecisionView), next_cursor: result.next_cursor };
    },
  });
}
