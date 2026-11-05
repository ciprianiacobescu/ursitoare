import type { FastifyInstance, FastifyRequest } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import type { DurableRuntime } from "../durable/index.ts";
import { RUN_LIST_FILTER_FIRST, runRepository } from "../runs/index.ts";
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
  pageSchema,
  unavailable,
} from "./flow-common.ts";
import { listPredicate } from "./list-filter.ts";
import { readPage, startAfter } from "./pagination.ts";
import { defineRoute } from "./route.ts";
import { RUN_VIEW_SCHEMA, toRunView } from "./run-views.ts";

export interface RunApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  ids: IdSource;
  engineKey: KeyMaterial | null;
  durable: Pick<DurableRuntime, "cancel"> | null;
}

const RUNS_SCOPE = "runs";
const RUN_STATES = ["queued", "running", "completed", "failed", "cancelled"] as const;

const LIST_QUERY = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...(PAGE_QUERY["properties"] as Record<string, unknown>),
    flowId: { type: "string", pattern: FLOW_ID_PATTERN, maxLength: 64 },
    state: { type: "string", enum: [...RUN_STATES] },
  },
};

function runsUnavailable(): ApiError {
  return new ApiError(503, "RUNS_UNAVAILABLE", "Runs are unavailable");
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
}
