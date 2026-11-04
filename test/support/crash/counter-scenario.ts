import { appendFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../../../src/config/index.ts";
import type { DurableJson } from "../../../src/durable/index.ts";
import { launchDurable, registerWorkflow, runStep } from "../../../src/durable/index.ts";
import type { ScenarioStart } from "./engine.ts";

const WORKFLOW = "crash.counter";
const DEFAULT_WORKFLOW_ID = "crash-counter";
const DEFAULT_LOG = "steps.log";
const STEP_NAMES = ["one", "two", "three"] as const;

type CounterInput = { log: string };

function appendLine(file: string, line: string): string {
  appendFileSync(file, `${line}\n`);
  return line;
}

async function counterWorkflow(input: CounterInput): Promise<DurableJson> {
  for (const name of STEP_NAMES) {
    await runStep(name, async () => appendLine(input.log, name));
  }
  appendFileSync(input.log, "done\n");
  return "done";
}

registerWorkflow(WORKFLOW, counterWorkflow);

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

  const runtime = await launchDurable({
    endpoint,
    logger: ctx.logger,
    stepObserver: ctx.stepObserver,
    pollingIntervalMs: 20,
  });

  ctx.ready();

  const workflowId = ctx.args["workflowId"] ?? DEFAULT_WORKFLOW_ID;
  const log = join(ctx.dataDir, ctx.args["log"] ?? DEFAULT_LOG);
  await runtime.enqueue(WORKFLOW, workflowId, { log });
};
