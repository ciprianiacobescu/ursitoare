// The dry-run harness: a server over U50's invoke harness, reached through `dryHarness`.

import type { FastifyInstance } from "fastify";

import type { Flow } from "../../../src/authoring/index.ts";
import { fixedClock, sequentialIds } from "../../../src/core/index.ts";
import type { Clock } from "../../../src/core/index.ts";
import {
  executeRun,
  memoryWorkflowOps,
  testRunInvokers,
  workflowIdOf,
} from "../../../src/interpreter/index.ts";
import type { InterpreterDeps } from "../../../src/interpreter/index.ts";
import { createLogger, noopTracer } from "../../../src/observability/index.ts";
import type { LogDestination } from "../../../src/observability/index.ts";
import { listPolicyDecisions } from "../../../src/pdp/index.ts";
import type { PolicyDecisionRecord } from "../../../src/pdp/index.ts";
import { createFlow, saveFlowVersion, validateVersion } from "../../../src/registry/index.ts";
import type { FlowActor } from "../../../src/registry/index.ts";
import { createEffectIntents } from "../../../src/runs/index.ts";
import type { StepRecord } from "../../../src/runs/index.ts";
import { dryRunInvokers } from "../../../src/runtimes/index.ts";
import { withTenantTx } from "../../../src/tenancy/index.ts";
import { buildServer } from "../../../src/api/server.ts";
import { installPep } from "../../../src/api/pep.ts";
import { registerDryRunRoutes } from "../../../src/api/dry-run-routes.ts";
import { registerRunDecisionRoutes } from "../../../src/api/run-decisions.ts";
import { createTestSession } from "../api-session.ts";
import type { InvokeHarness } from "./harness.ts";

const T0 = "2026-11-06T10:00:00.000Z";
const BASE_URL = "http://127.0.0.1:8080";


const silentDestination: LogDestination = { write(): void {} };

export interface DryAnswer {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface DryHarness {
  post(body: unknown, flow?: string): Promise<DryAnswer>;
  get(path: string): Promise<DryAnswer>;
  execute(runId: string): Promise<void>;
  decisions(runId: string): Promise<PolicyDecisionRecord[]>;
  steps(runId: string): Promise<StepRecord[]>;
  save(name: string, flow: Flow): Promise<string>;
  close(): Promise<void>;
}

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

function answerOf(reply: {
  statusCode: number;
  headers: Record<string, unknown>;
  json(): unknown;
}): DryAnswer {
  return {
    status: reply.statusCode,
    headers: reply.headers as Record<string, string>,
    body: reply.json(),
  };
}

export async function dryHarness(h: InvokeHarness): Promise<DryHarness> {
  const clock: Clock = fixedClock(T0);
  const ids = sequentialIds(0);
  const deps: InterpreterDeps = {
    store: h.store,
    durable: {
      async enqueue(): Promise<void> {
        return;
      },
    },
    loadVersion: h.loadVersion,
    catalogueFor: h.catalogueFor,
    invokerFor: dryRunInvokers(h.path, h.store, testRunInvokers(h.store)),
    effects: createEffectIntents(h.pool),
    clock,
    ids,
  };

  const session: Session = await createTestSession(h.db, h.ctx, "alice", clock);
  const actor: FlowActor = { kind: "user", userId: session.userId };

  const server: FastifyInstance = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  installPep(server, {
    pool: h.pool,
    engine: h.runtime.engine,
    clock,
    publicBaseUrl: BASE_URL,
  });
  registerDryRunRoutes(server, {
    pool: h.pool,
    clock,
    ids,
    interpreter: deps,
    enabled: true,
  });
  registerRunDecisionRoutes(server, {
    pool: h.pool,
    engineKey: { reveal: () => "k".repeat(40) },
  });

  const hashes = new Map<string, string>([
    ["read-then-pay", h.hashes.H1],
    ["hooked-pay", h.hashes.HP],
  ]);

  const headers = (): Record<string, string> => ({
    cookie: session.cookie,
    "x-csrf-token": session.csrfToken,
  });

  let closed = false;
  return {
    async post(body, flow = "read-then-pay") {
      const hash = hashes.get(flow);
      if (hash === undefined) {
        throw new Error(`no dry-run flow is saved under ${flow}`);
      }
      const reply = await server.inject({
        method: "POST",
        url: `/api/v1/flows/${flow}/versions/${hash}/dry-run`,
        headers: headers(),
        payload: body as object,
      });
      return answerOf(reply);
    },
    async get(path) {
      const reply = await server.inject({
        method: "GET",
        url: path,
        headers: headers(),
      });
      return answerOf(reply);
    },
    async execute(runId) {
      const ops = memoryWorkflowOps(workflowIdOf("tenant_a", runId));
      await executeRun(ops, deps, h.ctx, runId);
    },
    decisions(runId) {
      return listPolicyDecisions(h.pool, h.ctx, { filter: { runId }, order: "asc", limit: 50 });
    },
    async steps(runId) {
      return (await h.store.listSteps(h.ctx, runId, { limit: 50 })).steps;
    },
    async save(name, flow) {
      const text = JSON.stringify({ ...flow, flow: name });
      const saved = await withTenantTx(h.pool, h.ctx, async (tx) => {
        try {
          await createFlow(tx, h.ctx, { name, ownerTeam: "finance" }, actor, { clock });
        } catch (error) {
          if (
            typeof error !== "object" ||
            error === null ||
            (error as { code?: unknown }).code !== "FLOW_EXISTS"
          ) {
            throw error;
          }
        }
        return saveFlowVersion(
          tx,
          h.ctx,
          { flowId: name, format: "json", text },
          actor,
          { clock },
        );
      });
      const hash = saved.version.hash;
      const catalogue = await h.catalogueFor(h.ctx);
      await withTenantTx(h.pool, h.ctx, (tx) =>
        validateVersion(tx, h.ctx, { flowId: name, hash, catalogue }, actor, { clock }),
      );
      hashes.set(name, hash);
      return hash;
    },
    async close() {
      if (closed) return;
      closed = true;
      await server.close();
    },
  };
}
