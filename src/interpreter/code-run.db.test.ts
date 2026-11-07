import assert from "node:assert/strict";
import { test } from "node:test";

import type { Flow, JsonValue } from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { launchDurable } from "../durable/index.ts";
import type { DurableRuntime, StepObserver, StepPhase } from "../durable/index.ts";
import { createLogger } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createRunStore } from "../runs/index.ts";
import type { RunRecord, TenantContext } from "../runs/index.ts";
import { createWorkerSandbox } from "../sandbox/index.ts";
import type {
  SandboxJson,
  SandboxLimits,
  SandboxOptions,
  SandboxResult,
  WorkerSandbox,
} from "../sandbox/index.ts";
import {
  bindInterpreter,
  NO_EFFECT_GATE,
  registerRunWorkflow,
  startRun,
  workflowIdOf,
} from "./index.ts";
import type { InterpreterDeps } from "./index.ts";
import { CODE_LIMITS } from "./runtimes/code.ts";
import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { waitForRun } from "../../test/support/run-wait.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";

const silent: LogDestination = {
  write(): void {
    // discarded
  },
};

const ALICE = { userId: "u_alice", kind: "human" } as const;
const HASH = `sha256:${"a".repeat(64)}`;
const NOW_ISO = "2026-11-02T10:00:00.000Z";

const SOLO_OK_SRC = "return { n: input.n + 1 };";
const SOLO_BOMB_SRC =
  "const a = []; for (;;) a.push(new Array(100000).fill(1)); return { n: a.length };";
const SOLO_DEEP_SRC = "function f() { return f() + 1; } return { n: f() };";

function soloFlow(id: string, source: string): Flow {
  return {
    ursitoare: "0.1",
    flow: id,
    version: "1.0.0",
    inputs: {
      type: "object",
      properties: { n: { type: "number" } },
      required: ["n"],
    },
    start: "work",
    nodes: {
      work: {
        kind: "code",
        language: "js",
        source,
        input: { n: "${{ inputs.n }}" },
        output_schema: {
          type: "object",
          properties: { n: { type: "number" } },
          required: ["n"],
        },
        next: "done",
      },
      done: {
        kind: "end",
        status: "completed",
        output: { n: "${{ nodes.work.output.n }}" },
      },
    },
  };
}

const VERSIONS = new Map<string, Flow>([
  ["solo-ok", soloFlow("solo-ok", SOLO_OK_SRC)],
  ["solo-bomb", soloFlow("solo-bomb", SOLO_BOMB_SRC)],
  ["solo-deep", soloFlow("solo-deep", SOLO_DEEP_SRC)],
]);

interface SandboxCall {
  code: string;
  input: SandboxJson;
  limits: SandboxLimits;
  options: SandboxOptions;
}

interface CountingSandbox extends WorkerSandbox {
  readonly calls: SandboxCall[];
}

function counting(pool: WorkerSandbox): CountingSandbox {
  const calls: SandboxCall[] = [];
  return {
    get size(): number {
      return pool.size;
    },
    get respawns(): number {
      return pool.respawns;
    },
    calls,
    async run(
      code: string,
      input: SandboxJson,
      limits: SandboxLimits,
      options: SandboxOptions,
    ): Promise<SandboxResult> {
      calls.push({ code, input, limits, options });
      return pool.run(code, input, limits, options);
    },
    async close(): Promise<void> {
      return pool.close();
    },
  };
}

async function outputOf(store: ReturnType<typeof createRunStore>, ctx: TenantContext, run: RunRecord) {
  if (run.outputRef === null) {
    return null;
  }
  const payload = await store.getPayload(ctx, run.outputRef);
  return payload === null ? null : (payload.data as JsonValue);
}

test("C-81b55afa a sandbox fault ends its run once and the pool serves the next flow", async () => {
  const db = await withTestDatabase();
  const logger = createLogger({ level: "silent", destination: silent });
  const observed: [StepPhase, string, string][] = [];
  const observer: StepObserver = (phase, step, workflowId) => {
    observed.push([phase, step, workflowId]);
  };
  const pool = counting(createWorkerSandbox({ size: 1 }));
  let runtime: DurableRuntime | undefined;
  try {
    const { a } = await seedTwoTenants(db);
    const tenant: TenantContext = { tenantId: a.tenantId, reviewProfile: "solo" };
    const store = createRunStore(db.appPool);
    const deps: InterpreterDeps = {
      store,
      durable: null,
      loadVersion: async (_ctx, flowId) => {
        const flow = VERSIONS.get(flowId);
        return flow === undefined
          ? null
          : { flowId, hash: HASH, state: "validated", ownerTeam: "finance", flow };
      },
      catalogueFor: async () => loadTestCatalogue(),
      invokerFor: async () => {
        throw new Error("the solo flows call no tool");
      },
      effects: NO_EFFECT_GATE,
      clock: fixedClock("2026-11-02T10:00:00Z"),
      ids: sequentialIds(0),
      sandbox: pool,
    };

    assert.doesNotThrow(() => {
      registerRunWorkflow();
      bindInterpreter(deps);
    });

    const rt = await launchDurable({
      endpoint: db.appEndpoint,
      logger,
      pollingIntervalMs: 20,
      stepObserver: observer,
    });
    runtime = rt;

    const start = (runId: string, flowId: string, n: number): Promise<void> =>
      assert.doesNotReject(async () => {
        await startRun({ ...deps, durable: rt }, tenant, {
          flowId,
          hash: HASH,
          mode: "mock",
          input: { n },
          mocks: null,
          principal: ALICE,
          actorChain: [ALICE.userId],
          runId,
        });
      });

    await start("r_ok1", "solo-ok", 1);
    const ok1 = await waitForRun(store, tenant, "r_ok1", ["completed", "failed"]);
    assert.equal(ok1.state, "completed");
    assert.equal(ok1.terminalNode, "done");
    assert.deepEqual(await outputOf(store, tenant, ok1), { n: 2 });
    const rssAfterOk1 = process.memoryUsage().rss;

    await start("r_bomb", "solo-bomb", 0);
    const bomb = await waitForRun(store, tenant, "r_bomb", ["completed", "failed"]);
    assert.equal(bomb.state, "failed");
    assert.equal(bomb.terminalNode, "work");
    assert.deepEqual(bomb.error, {
      code: "INTERPRETER_CODE_FAILED",
      message: 'code node "work" failed (memory_limit)',
      node: "work",
      details: { fault: "memory_limit" },
    });

    await start("r_deep", "solo-deep", 0);
    const deep = await waitForRun(store, tenant, "r_deep", ["completed", "failed"]);
    assert.equal(deep.state, "failed");
    assert.equal(deep.terminalNode, "work");
    assert.deepEqual(deep.error, {
      code: "INTERPRETER_CODE_FAILED",
      message: 'code node "work" failed (stack_overflow)',
      node: "work",
      details: { fault: "stack_overflow" },
    });

    await start("r_ok2", "solo-ok", 41);
    const ok2 = await waitForRun(store, tenant, "r_ok2", ["completed", "failed"]);
    assert.equal(ok2.state, "completed");
    assert.equal(ok2.terminalNode, "done");
    assert.deepEqual(await outputOf(store, tenant, ok2), { n: 42 });
    const rssAfterOk2 = process.memoryUsage().rss;

    for (const [runId, expected] of [
      ["r_bomb", bomb.error],
      ["r_deep", deep.error],
    ] as const) {
      const steps = (await store.listSteps(tenant, runId, { limit: 50 })).steps;
      assert.equal(steps.length, 1, `${runId} has one row`);
      assert.equal(steps[0]?.nodeId, "work");
      assert.equal(steps[0]?.kind, "code");
      assert.equal(steps[0]?.state, "failed");
      assert.deepEqual(steps[0]?.error, expected);
    }

    assert.deepEqual(pool.calls.map((call) => call.options.seed), [
      "r_ok1:work:1",
      "r_bomb:work:1",
      "r_deep:work:1",
      "r_ok2:work:1",
    ]);
    for (const call of pool.calls) {
      assert.deepEqual(call.limits, CODE_LIMITS);
      assert.deepEqual(call.options, {
        seed: call.options.seed,
        nowIso: NOW_ISO,
        binding: "input",
        result: "object",
      });
    }
    assert.equal(pool.respawns, 0);

    const bombWorkflow = workflowIdOf("tenant_a", "r_bomb");
    assert.deepEqual(
      observed
        .filter(([phase, , workflowId]) => phase === "before" && workflowId === bombWorkflow)
        .map(([, step]) => step),
      ["run:load", "run:start", "work", "run:finish"],
    );

    assert.ok(rssAfterOk2 - rssAfterOk1 <= 268435456, "the pool's RSS stays bounded");
  } finally {
    await runtime?.shutdown().catch(() => undefined);
    await pool.close().catch(() => undefined);
    await db.close();
  }
});
