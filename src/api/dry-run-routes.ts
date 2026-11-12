import type { FastifyInstance, FastifyRequest } from "fastify";

import type { JsonValue } from "../authoring/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import { entityRef, scopedId } from "../pdp/index.ts";
import type { InterpreterDeps } from "../interpreter/index.ts";
import { checkFakes, startRun } from "../interpreter/index.ts";
import { flowOwnerTeam } from "../registry/index.ts";
import type { RunRecord } from "../runs/index.ts";
import type { TenantPool } from "../tenancy/index.ts";
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
import { mapStartRunError } from "./test-run-routes.ts";

const HASH_PATTERN = "^sha256:[0-9a-f]{64}$";

const DRY_RUN_PARAMS = {
  type: "object",
  additionalProperties: false,
  required: ["flowId", "hash"],
  properties: {
    flowId: { type: "string", pattern: FLOW_ID_PATTERN, maxLength: 64 },
    hash: { type: "string", pattern: HASH_PATTERN },
  },
};

const DRY_RUN_BODY = {
  type: "object",
  additionalProperties: false,
  required: ["input", "fakes"],
  properties: { input: { type: "object" }, fakes: { type: "object" } },
};

const DRY_RUN_RESPONSE = {
  type: "object",
  additionalProperties: false,
  required: ["run"],
  properties: { run: RUN_VIEW_SCHEMA },
};

export interface DryRunApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  ids: IdSource;
  interpreter: InterpreterDeps | null;
  enabled: boolean;
}

function runsUnavailable(): ApiError {
  return new ApiError(503, "RUNS_UNAVAILABLE", "Runs are unavailable");
}

function fieldOf(key: string, index: number | null): string {
  if (key === "") {
    return "body/fakes";
  }
  return index === null ? `body/fakes/${key}` : `body/fakes/${key}/${index}`;
}

export function registerDryRunRoutes(server: FastifyInstance, deps: DryRunApiDeps): void {
  const context = (request: FastifyRequest) => {
    if (
      !deps.enabled ||
      deps.pool === null ||
      deps.interpreter === null ||
      deps.interpreter.durable === null
    ) {
      throw runsUnavailable();
    }
    const tenant = request.tenant;
    const principal = request.principal;
    if (tenant === undefined || principal === undefined) {
      throw new ApiError(503, "AUTHZ_UNAVAILABLE", "Authorization is unavailable");
    }
    return { pool: deps.pool, tenant, principal, interpreter: deps.interpreter };
  };

  const loadFlowResource = async (request: FastifyRequest): Promise<ResourceRef | null> => {
    const { pool, tenant } = context(request);
    const flowId = (request.params as { flowId: string }).flowId;
    const ownerTeam = await withTenantTx(pool, tenant, (tx) => flowOwnerTeam(tx, tenant, flowId));
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
    url: "/api/v1/flows/:flowId/versions/:hash/dry-run",
    auth: { kind: "session" },
    action: "dry_run_flow",
    resource: loadFlowResource,
    schema: {
      params: DRY_RUN_PARAMS,
      headers: IDEMPOTENCY_HEADER_SCHEMA,
      body: DRY_RUN_BODY,
      response: { 202: DRY_RUN_RESPONSE },
    },
    errors: [
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "OPERATION_REFUSED",
      "RUNS_UNAVAILABLE",
      "VALIDATION_FAILED",
    ],
    handler: async (request, reply) => {
      const { pool, tenant, principal, interpreter } = context(request);
      const { flowId, hash } = request.params as { flowId: string; hash: string };
      const body = request.body as { input: JsonValue; fakes: JsonValue };

      const version = await interpreter.loadVersion(tenant, flowId, hash);
      if (version === null) {
        throw notFound();
      }

      const catalogue = await interpreter.catalogueFor(tenant);
      const checked = checkFakes(version.flow, catalogue, body.fakes);
      if (checked.problems.length > 0 || checked.fakes === null) {
        throw new ApiError(400, "VALIDATION_FAILED", "Request validation failed", {
          fields: checked.problems.map((problem) => ({
            field: fieldOf(problem.key, problem.index),
            message: `${problem.reason}: ${problem.detail}`,
          })),
        });
      }
      const fakes = checked.fakes;

      const create = async (runId: string): Promise<RunRecord> => {
        try {
          return await startRun(interpreter, tenant, {
            flowId,
            hash,
            mode: "stub",
            input: body.input,
            mocks: fakes,
            principal: { userId: principal.userId, kind: principal.kind },
            actorChain: [principal.userId],
            runId,
          });
        } catch (error) {
          mapStartRunError(error);
        }
      };

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
