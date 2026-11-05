import type { FastifyInstance, FastifyRequest } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import type { DurableRuntime } from "../durable/index.ts";
import { workflowIdOf } from "../interpreter/index.ts";
import {
  RUN_LIST_FILTER_FIRST,
  appendEvent,
  envelopeStore,
  runRepository,
  stepRepository,
} from "../runs/index.ts";
import type { RunState, TenantPool } from "../runs/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { deriveCursorKey, encodeCursor } from "./cursor.ts";
import type { CursorKey } from "./cursor.ts";
import { ApiError } from "./errors.ts";
import {
  FLOW_ID_PATTERN,
  PAGE_QUERY,
  cursorInvalid,
  engineKeyRequired,
  notFound,
  pageSchema,
  unavailable,
} from "./flow-common.ts";
import { listPredicate } from "./list-filter.ts";
import { readPage, startAfter } from "./pagination.ts";
import { defineRoute } from "./route.ts";
import type { ResourceRef } from "./route.ts";
import {
  RUN_VIEW_SCHEMA,
  STEP_VIEW_SCHEMA,
  runResource,
  toRunView,
  toStepView,
} from "./run-views.ts";

export interface RunApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  ids: IdSource;
  engineKey: KeyMaterial | null;
  durable: Pick<DurableRuntime, "cancel"> | null;
}

const RUNS_SCOPE = "runs";
const RUN_STEPS_SCOPE = "run_steps";
const RUN_STATES = ["queued", "running", "completed", "failed", "cancelled"] as const;
const RUN_ID_PATTERN = "^[A-Za-z0-9_-]{1,128}$";
const SHA256_PATTERN = "^[0-9a-f]{64}$";

const LIST_QUERY = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...(PAGE_QUERY["properties"] as Record<string, unknown>),
    flowId: { type: "string", pattern: FLOW_ID_PATTERN, maxLength: 64 },
    state: { type: "string", enum: [...RUN_STATES] },
  },
};

const RUN_PARAMS = {
  type: "object",
  additionalProperties: false,
  required: ["runId"],
  properties: { runId: { type: "string", pattern: RUN_ID_PATTERN } },
};

const PAYLOAD_PARAMS = {
  type: "object",
  additionalProperties: false,
  required: ["runId", "sha256"],
  properties: {
    runId: { type: "string", pattern: RUN_ID_PATTERN },
    sha256: { type: "string", pattern: SHA256_PATTERN },
  },
};

const PAYLOAD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sha256", "mediaType", "size", "data"],
  properties: {
    sha256: { type: "string" },
    mediaType: { type: "string" },
    size: { type: "integer" },
    data: {},
  },
};

function runsUnavailable(): ApiError {
  return new ApiError(503, "RUNS_UNAVAILABLE", "Runs are unavailable");
}

function runNotActive(): ApiError {
  return new ApiError(422, "OPERATION_REFUSED", "Operation is refused", {
    reason: "run_not_active",
  });
}

export function registerRunRoutes(server: FastifyInstance, deps: RunApiDeps): void {
  const key: CursorKey | null = deps.engineKey === null ? null : deriveCursorKey(deps.engineKey);

  const context = (
    request: FastifyRequest,
  ): { pool: TenantPool; tenant: TenantContext } => {
    const tenant = request.tenant;
    const principal = request.principal;
    if (deps.pool === null) throw runsUnavailable();
    if (tenant === undefined || principal === undefined) throw unavailable();
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
    url: "/api/v1/runs",
    auth: { kind: "session" },
    action: "read_run",
    listFilter: {
      kind: "sql",
      predicate: (principal, first) => ({
        sql: `owner_team = ANY($${first}) OR principal_user_id = $${first + 1}`,
        values: [principal.teams, principal.userId],
      }),
    },
    schema: { querystring: LIST_QUERY, response: { 200: pageSchema(RUN_VIEW_SCHEMA) } },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "RUNS_UNAVAILABLE", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant } = context(request);
      const page = readPage(request.query);
      if (key === null && page.cursor !== null) throw engineKeyRequired();
      let after: { createdAt: string; runId: string } | undefined;
      if (key !== null) {
        const position = startAfter(
          { key, tenantId: tenant.tenantId, scope: RUNS_SCOPE },
          page.cursor,
        );
        if (position !== null) {
          const createdAt = position[0];
          const runId = position[1];
          if (
            position.length !== 2 ||
            typeof createdAt !== "string" ||
            typeof runId !== "string"
          ) {
            throw cursorInvalid();
          }
          after = { createdAt, runId };
        }
      }
      const query = request.query as { flowId?: string; state?: RunState };
      const filter = listPredicate(request, RUN_LIST_FILTER_FIRST);
      const result = await withTenantTx(pool, tenant, (tx) =>
        runRepository.list(tx, tenant, {
          limit: page.limit,
          ...(after === undefined ? {} : { after }),
          ...(query.flowId === undefined ? {} : { flowId: query.flowId }),
          ...(query.state === undefined ? {} : { state: query.state }),
          filter,
        }),
      );
      const items = result.runs.map(toRunView);
      if (result.next === null) return { items, next_cursor: null };
      if (key === null) throw engineKeyRequired();
      return {
        items,
        next_cursor: encodeCursor(key, {
          tenantId: tenant.tenantId,
          scope: RUNS_SCOPE,
          position: [result.next.createdAt, result.next.runId],
        }),
      };
    },
  });

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/runs/:runId",
    auth: { kind: "session" },
    action: "read_run",
    resource: loadRun,
    schema: { params: RUN_PARAMS, response: { 200: RUN_VIEW_SCHEMA } },
    errors: ["RUNS_UNAVAILABLE", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant } = context(request);
      const run = await withTenantTx(pool, tenant, (tx) =>
        runRepository.get(tx, tenant, runIdOf(request)),
      );
      if (run === null) throw notFound();
      return toRunView(run);
    },
  });

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/runs/:runId/steps",
    auth: { kind: "session" },
    action: "read_run",
    resource: loadRun,
    schema: {
      params: RUN_PARAMS,
      querystring: PAGE_QUERY,
      response: { 200: pageSchema(STEP_VIEW_SCHEMA) },
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
      if (key === null && page.cursor !== null) throw engineKeyRequired();
      let afterSeq: number | undefined;
      if (key !== null) {
        const position = startAfter(
          { key, tenantId: tenant.tenantId, scope: RUN_STEPS_SCOPE },
          page.cursor,
        );
        if (position !== null) {
          const [cursorRunId, seq] = position;
          if (
            position.length !== 2 ||
            cursorRunId !== runId ||
            typeof seq !== "number" ||
            !Number.isInteger(seq) ||
            seq < 0
          ) {
            throw cursorInvalid();
          }
          afterSeq = seq;
        }
      }
      const result = await withTenantTx(pool, tenant, (tx) =>
        stepRepository.list(tx, tenant, runId, {
          limit: page.limit,
          ...(afterSeq === undefined ? {} : { afterSeq }),
        }),
      );
      const items = result.steps.map(toStepView);
      if (result.next === null) return { items, next_cursor: null };
      if (key === null) throw engineKeyRequired();
      return {
        items,
        next_cursor: encodeCursor(key, {
          tenantId: tenant.tenantId,
          scope: RUN_STEPS_SCOPE,
          position: [runId, result.next],
        }),
      };
    },
  });

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/runs/:runId/payloads/:sha256",
    auth: { kind: "session" },
    action: "read_run",
    resource: loadRun,
    schema: { params: PAYLOAD_PARAMS, response: { 200: PAYLOAD_SCHEMA } },
    errors: ["RUNS_UNAVAILABLE", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant } = context(request);
      const { runId, sha256 } = request.params as { runId: string; sha256: string };
      const payload = await withTenantTx(pool, tenant, async (tx) => {
        const referenced = await envelopeStore.referencedBy(tx, tenant, runId, sha256);
        return referenced ? envelopeStore.get(tx, tenant, sha256) : null;
      });
      if (payload === null) throw notFound();
      return {
        sha256: payload.sha256,
        mediaType: payload.mediaType,
        size: payload.size,
        data: payload.data,
      };
    },
  });

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/runs/:runId/cancel",
    auth: { kind: "session" },
    action: "debug_run",
    resource: loadRun,
    schema: { params: RUN_PARAMS, response: { 202: RUN_VIEW_SCHEMA } },
    errors: ["OPERATION_REFUSED", "RUNS_UNAVAILABLE", "VALIDATION_FAILED"],
    handler: async (request, reply) => {
      const { pool, tenant } = context(request);
      if (deps.durable === null) throw runsUnavailable();
      const principal = request.principal;
      if (principal === undefined) throw unavailable();
      const runId = runIdOf(request);
      const current = await withTenantTx(pool, tenant, (tx) =>
        runRepository.get(tx, tenant, runId),
      );
      if (current === null) throw notFound();
      if (current.state !== "queued" && current.state !== "running") {
        throw runNotActive();
      }
      try {
        await deps.durable.cancel(workflowIdOf(tenant.tenantId, runId));
      } catch {
        throw runsUnavailable();
      }
      const at = deps.clock.now();
      const transitioned = await withTenantTx(pool, tenant, async (tx) => {
        const updated = await runRepository.transition(tx, tenant, runId, {
          state: "cancelled",
          from: ["queued", "running"],
          at,
        });
        if (updated === null) return null;
        await appendEvent(tx, tenant, {
          eventId: deps.ids.next("evt"),
          runId,
          correlationId: null,
          type: "run.cancelled",
          data: { by: principal.userId, from: current.state },
          time: at,
        });
        return updated;
      });
      if (transitioned === null) throw runNotActive();
      reply.code(202);
      return toRunView(transitioned);
    },
  });
}
