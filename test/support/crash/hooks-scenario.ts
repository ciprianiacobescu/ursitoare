import { join } from "node:path";

import type { JsonValue } from "../../../src/authoring/index.ts";
import { loadConfig } from "../../../src/config/index.ts";
import { systemClock, systemIds } from "../../../src/core/index.ts";
import { createPool } from "../../../src/db/index.ts";
import { launchDurable } from "../../../src/durable/index.ts";
import {
  bindInterpreter,
  registerRunWorkflow,
  startRun,
} from "../../../src/interpreter/index.ts";
import type {
  InterpreterDeps,
  LoadedVersion,
  ToolCall,
  ToolInvoker,
  ToolResult,
} from "../../../src/interpreter/index.ts";
import { createRunStore } from "../../../src/runs/index.ts";
import { createEffectIntents } from "../../../src/runs/intents/gate.ts";
import { createWorkerSandbox } from "../../../src/sandbox/index.ts";
import type { TenantContext } from "../../../src/tenancy/index.ts";
import { loadTestCatalogue } from "../catalogue/loader.ts";
import { loadHookFlow } from "../hook-flows/index.ts";
import { hookRunVersion } from "../hook-runs/index.ts";
import { notifyPayVersion } from "../hook-runs/notify-pay.ts";
import { appendEffect } from "./effects.ts";
import type { ScenarioStart } from "./engine.ts";
import { PAY_ONCE_INPUT } from "./pay-once.ts";

const F_EFF_HASH: string = "sha256:" + "f".repeat(64);

const ONION_INPUT: JsonValue = { vendor: "  Acme ", amount: 120, currency: "eur" };

const NOTIFY_PAY_INPUT: JsonValue = PAY_ONCE_INPUT;

const F_EFF_INPUT: JsonValue = {};

interface Chosen {
  version: LoadedVersion;
  input: JsonValue;
}

function fEffVersion(): LoadedVersion {
  return {
    flowId: "f-eff",
    hash: F_EFF_HASH,
    state: "validated",
    ownerTeam: "finance",
    flow: loadHookFlow("f-eff"),
  };
}

function chosenFlow(flow: string): Chosen {
  switch (flow) {
    case "onion":
      return { version: hookRunVersion("onion"), input: ONION_INPUT };
    case "notify-pay":
      return { version: notifyPayVersion("strict"), input: NOTIFY_PAY_INPUT };
    case "f-eff":
      return { version: fEffVersion(), input: F_EFF_INPUT };
    default:
      throw new Error(`unknown hooks scenario flow: ${flow}`);
  }
}

function databaseEnv(source: Readonly<Record<string, string>>): Record<string, string> {
  const env: Record<string, string> = {};
  const url = source["URSITOARE_DATABASE_URL"];
  if (url !== undefined) {
    env["URSITOARE_DATABASE_URL"] = url;
  }
  const passwordFile = source["URSITOARE_DATABASE_PASSWORD_FILE"];
  if (passwordFile !== undefined) {
    env["URSITOARE_DATABASE_PASSWORD_FILE"] = passwordFile;
  }
  return env;
}

function effectOutput(tool: string): JsonValue {
  switch (tool) {
    case "erp.lookup_vendor@1":
      return { vendor_id: "v1", status: "active" };
    case "erp.create_payment@1":
      return { payment_id: "pay-1", status: "paid" };
    case "slack.post_message@1":
      return { ts: "1.0" };
    case "mail.send@1":
      return { message_id: "m-1" };
    default:
      throw new Error(`no output for tool ${tool}`);
  }
}

function effectLogInvoker(file: string): ToolInvoker {
  return {
    async invoke(call: ToolCall, ctx): Promise<ToolResult> {
      appendEffect(file, { tool: call.tool, idemKey: ctx.idemKey, nodeId: call.nodeId });
      return { output: effectOutput(call.tool) };
    },
  };
}

export const start: ScenarioStart = async (ctx) => {
  const flowName = ctx.args["flow"];
  if (flowName === undefined) {
    throw new Error("the scenario needs a flow");
  }
  const chosen = chosenFlow(flowName);

  const endpoint = loadConfig(databaseEnv(ctx.env)).database.app;
  if (endpoint === null) {
    throw new Error("the cluster provides no app database endpoint");
  }

  const runId = ctx.args["runId"];
  const effects = ctx.args["effects"];
  if (runId === undefined || effects === undefined) {
    throw new Error("the scenario needs a runId and an effects file");
  }

  const tenant: TenantContext = {
    tenantId: ctx.args["tenantId"] ?? "",
    reviewProfile: (ctx.args["reviewProfile"] ?? "") as TenantContext["reviewProfile"],
  };

  const pool = createPool(endpoint, { max: 4 });
  const sandbox = createWorkerSandbox({ size: 1 });
  const deps: InterpreterDeps = {
    store: createRunStore(pool),
    durable: null,
    loadVersion: async (_ctx, flowId, hash) =>
      flowId === chosen.version.flowId && hash === chosen.version.hash ? chosen.version : null,
    catalogueFor: async () => loadTestCatalogue(),
    invokerFor: async () => effectLogInvoker(join(ctx.dataDir, effects)),
    effects: createEffectIntents(pool),
    clock: systemClock,
    ids: systemIds,
    sandbox,
  };

  registerRunWorkflow();
  bindInterpreter(deps);
  ctx.ready();

  const runtime = await launchDurable({
    endpoint,
    logger: ctx.logger,
    stepObserver: ctx.stepObserver,
    pollingIntervalMs: 20,
  });

  await startRun({ ...deps, durable: runtime }, tenant, {
    flowId: chosen.version.flowId,
    hash: chosen.version.hash,
    mode: "live",
    input: chosen.input,
    mocks: null,
    principal: { userId: "u_alice", kind: "human" },
    actorChain: ["u_alice"],
    runId,
  });
};
