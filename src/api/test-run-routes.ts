import type { FastifyInstance, FastifyRequest } from "fastify";

import type { Flow, JsonValue } from "../authoring/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import { entityRef, scopedId } from "../pdp/index.ts";
import type { InterpreterDeps, VersionLoader } from "../interpreter/index.ts";
import { startRun } from "../interpreter/index.ts";
import { flowOwnerTeam, getVersion } from "../registry/index.ts";
import type { RunRecord, TenantPool } from "../runs/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { ApiError } from "./errors.ts";
import { FLOW_ID_PATTERN, notFound } from "./flow-common.ts";
import {
  IDEMPOTENCY_HEADER_SCHEMA,
  idempotencyKeyOf,
  requestDigestOf,
  withIdempotency,
} from "./idempotency.ts";
import { defineRoute } from "./route.ts";
import type { ResourceRef } from "./route.ts";
import { RUN_VIEW_SCHEMA, toRunView } from "./run-views.ts";

const HASH_PATTERN = "^sha256:[0-9a-f]{64}$";

const TEST_PARAMS = {
  type: "object",
  additionalProperties: false,
  required: ["flowId", "hash"],
  properties: {
    flowId: { type: "string", pattern: FLOW_ID_PATTERN, maxLength: 64 },
    hash: { type: "string", pattern: HASH_PATTERN },
  },
};

const TEST_BODY = {
  type: "object",
  additionalProperties: false,
  required: ["input", "mocks"],
  properties: { input: { type: "object" }, mocks: { type: "object" } },
};

const TEST_RESPONSE = {
  type: "object",
  additionalProperties: false,
  required: ["run"],
  properties: { run: RUN_VIEW_SCHEMA },
};

function runsUnavailable(): ApiError {
  return new ApiError(503, "RUNS_UNAVAILABLE", "Runs are unavailable");
}

function authorizationUnavailable(): ApiError {
  return new ApiError(503, "AUTHZ_UNAVAILABLE", "Authorization is unavailable");
}

export function registryVersionLoader(pool: TenantPool): VersionLoader {
  return async (ctx: TenantContext, flowId: string, hash: string) =>
    withTenantTx(pool, ctx, async (tx) => {
      const version = await getVersion(tx, ctx, flowId, hash);
      if (version === null) {
        return null;
      }
      const ownerTeam = await flowOwnerTeam(tx, ctx, flowId);
      if (ownerTeam === null) {
        return null;
      }
      return {
        flowId,
        hash,
        state: version.state,
        ownerTeam,
        flow: version.canonical as Flow,
      };
    });
}

export interface TestRunApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  ids: IdSource;
  interpreter: InterpreterDeps | null;
}

export function registerTestRunRoutes(server: FastifyInstance, deps: TestRunApiDeps): void {
  const context = (request: FastifyRequest) => {
    const tenant = request.tenant;
    const principal = request.principal;
    if (deps.pool === null || deps.interpreter === null || deps.interpreter.durable === null) {
      throw runsUnavailable();
    }
    if (tenant === undefined || principal === undefined) {
      throw authorizationUnavailable();
    }
    return { pool: deps.pool, tenant, principal, interpreter: deps.interpreter };
  };

  const loadFlowResource = async (request: FastifyRequest): Promise<ResourceRef | null> => {
    const { pool, tenant } = context(request);
    const flowId = (request.params as { flowId: string }).flowId;
    const ownerTeam = await withTenantTx(pool, tenant, (tx) =>
      flowOwnerTeam(tx, tenant, flowId),
    );
    if (ownerTeam === null) {
      return null;
    }
    return {
      type: "Flow",
      id: flowId,
      tenantId: tenant.tenantId,
      attrs: {
        owner_team: entityRef("Team", scopedId(tenant.tenantId, ownerTeam)),
        reviewed: false,
      },
    };
  };

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/flows/:flowId/versions/:hash/test",
    auth: { kind: "session" },
    action: "test_flow",
    resource: loadFlowResource,
    schema: {
      params: TEST_PARAMS,
      headers: IDEMPOTENCY_HEADER_SCHEMA,
      body: TEST_BODY,
      response: { 202: TEST_RESPONSE },
    },
    errors: [
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "OPERATION_REFUSED",
      "RUNS_UNAVAILABLE",
      "TEST_MOCK_INVALID",
      "TEST_MOCK_MISSING",
      "VALIDATION_FAILED",
    ],
    handler: async (request, reply) => {
      const { pool, tenant, principal, interpreter } = context(request);
      const { flowId, hash } = request.params as { flowId: string; hash: string };
      const body = request.body as { input: JsonValue; mocks: JsonValue };

      const version = await interpreter.loadVersion(tenant, flowId, hash);
      if (version === null) {
        throw notFound();
      }

      const create = (runId: string): Promise<RunRecord> =>
        startRun(interpreter, tenant, {
          flowId,
          hash,
          mode: "mock",
          input: body.input,
          mocks: body.mocks,
          principal: { userId: principal.userId, kind: principal.kind },
          actorChain: [principal.userId],
          runId,
        });

      const key = idempotencyKeyOf(request);
      let run: RunRecord;
      if (key === null) {
        run = await create(deps.ids.next("run"));
      } else {
        const result = await withIdempotency(
          { pool, tenant, clock: deps.clock },
          { userId: principal.userId },
          key,
          requestDigestOf({
            method: request.method,
            route: request.routeOptions.url ?? request.url,
            params: request.params,
            query: request.query,
            body: request.body,
          }),
          async () => ({ status: 202, body: { runId: deps.ids.next("run") } }),
        );
        if (result.replayed) {
          reply.header("Idempotent-Replayed", "true");
        }
        run = await create((result.body as { runId: string }).runId);
      }

      reply.code(202);
      return { run: toRunView(run) };
    },
  });
}
