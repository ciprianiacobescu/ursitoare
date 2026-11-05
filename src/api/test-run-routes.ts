import type { FastifyInstance, FastifyRequest } from "fastify";

import type { Flow, JsonValue } from "../authoring/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import { entityRef, scopedId } from "../pdp/index.ts";
import type { InterpreterDeps, VersionLoader } from "../interpreter/index.ts";
import { checkMocks, InterpreterError, startRun } from "../interpreter/index.ts";
import { flowOwnerTeam, getVersion } from "../registry/index.ts";
import { RunDataError } from "../runs/index.ts";
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

function stringDetail(details: Readonly<Record<string, string | string[]>>, key: string): string | null {
  const value = details[key];
  return typeof value === "string" ? value : null;
}

function mapStartRunError(error: unknown): never {
  if (error instanceof InterpreterError) {
    switch (error.code) {
      case "INTERPRETER_VERSION_NOT_FOUND":
        throw notFound();
      case "INTERPRETER_VERSION_NOT_RUNNABLE": {
        const details: Record<string, unknown> = {
          reason: "version_not_runnable",
          cause: stringDetail(error.details, "reason") ?? "not_runnable",
        };
        const blocks = error.details["blocks"];
        if (Array.isArray(blocks)) {
          details["blocks"] = blocks;
        }
        throw new ApiError(422, "OPERATION_REFUSED", "Operation is refused", details);
      }
      case "INTERPRETER_KIND_UNSUPPORTED":
        throw new ApiError(422, "OPERATION_REFUSED", "Operation is refused", {
          reason: "kind_unsupported",
          kinds: error.details["kinds"],
        });
      case "INTERPRETER_INPUT_INVALID": {
        const path = stringDetail(error.details, "path") ?? "/";
        const keyword = stringDetail(error.details, "keyword") ?? "schema";
        throw new ApiError(400, "VALIDATION_FAILED", "Request validation failed", {
          fields: [
            {
              field: "body/input",
              message: `must satisfy the flow inputs (${path} ${keyword})`,
            },
          ],
        });
      }
      case "INTERPRETER_UNBOUND":
        throw runsUnavailable();
      default:
        throw error;
    }
  }
  if (error instanceof RunDataError) {
    throw new ApiError(400, "VALIDATION_FAILED", "Request validation failed", {
      fields: [{ field: "body", message: "must be plain JSON of at most 1 MiB" }],
    });
  }
  throw error;
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

      const catalogue = await interpreter.catalogueFor(tenant);
      const checked = checkMocks(version.flow, catalogue, body.mocks);
      if (checked.problems.length > 0) {
        if (checked.problems.every((problem) => problem.reason === "missing")) {
          throw new ApiError(422, "TEST_MOCK_MISSING", "A block node has no mock", {
            nodes: checked.problems.map((problem) => problem.nodeId),
          });
        }
        throw new ApiError(422, "TEST_MOCK_INVALID", "A mock does not fit its node", {
          problems: checked.problems,
        });
      }

      const create = async (runId: string): Promise<RunRecord> => {
        try {
          return await startRun(interpreter, tenant, {
            flowId,
            hash,
            mode: "mock",
            input: body.input,
            mocks: body.mocks,
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
