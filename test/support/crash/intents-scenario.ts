import { join } from "node:path";

import { loadConfig } from "../../../src/config/index.ts";
import { systemClock, systemIds } from "../../../src/core/index.ts";
import { createPool } from "../../../src/db/index.ts";
import { launchDurable } from "../../../src/durable/index.ts";
import {
  bindInterpreter,
  registerRunWorkflow,
  startRun,
} from "../../../src/interpreter/index.ts";
import type { InterpreterDeps } from "../../../src/interpreter/index.ts";
import { createRunStore } from "../../../src/runs/index.ts";
import { createEffectIntents } from "../../../src/runs/intents/gate.ts";
import type { TenantContext } from "../../../src/tenancy/index.ts";
import type { ScenarioStart } from "./engine.ts";
import {
  PAY_ONCE_HASH,
  PAY_ONCE_INPUT,
  effectLogInvoker,
  payOnceCatalogue,
  payOnceVersion,
} from "./pay-once.ts";

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

export const start: ScenarioStart = async (ctx) => {
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
  const deps: InterpreterDeps = {
    store: createRunStore(pool),
    durable: null,
    loadVersion: async (_ctx, flowId, hash) =>
      flowId === "pay-once" && hash === PAY_ONCE_HASH ? payOnceVersion() : null,
    catalogueFor: async () => payOnceCatalogue({ unsafePay: ctx.args["unsafePay"] === "true" }),
    invokerFor: async () => effectLogInvoker(join(ctx.dataDir, effects)),
    effects: createEffectIntents(pool),
    clock: systemClock,
    ids: systemIds,
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
    flowId: "pay-once",
    hash: PAY_ONCE_HASH,
    mode: "live",
    input: PAY_ONCE_INPUT,
    mocks: null,
    principal: { userId: "u_alice", kind: "human" },
    actorChain: ["u_alice"],
    runId,
  });
};
