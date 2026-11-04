import { writeSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { NO_FAULT_POINTS, createFaultPoints } from "../../../src/config/faults.ts";
import { createLogger } from "../../../src/observability/index.ts";
import { faultMarkerDir, type ScenarioContext, type ScenarioStart } from "./engine.ts";
import { faultObserver } from "./observer.ts";

interface Payload {
  scenario: string;
  faultPoints: string[];
  args: Record<string, string>;
  dataDir: string;
}

function fail(line: string): never {
  writeSync(2, `${line}\n`);
  process.exit(1);
}

function parsePayload(raw: string | undefined): Payload {
  if (raw === undefined) {
    throw new Error("missing payload");
  }
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("payload is not an object");
  }
  const candidate = parsed as Record<string, unknown>;
  const faultPoints = candidate["faultPoints"];
  const args = candidate["args"];
  if (
    typeof candidate["scenario"] !== "string" ||
    typeof candidate["dataDir"] !== "string" ||
    !Array.isArray(faultPoints) ||
    !faultPoints.every((point) => typeof point === "string") ||
    typeof args !== "object" ||
    args === null ||
    Array.isArray(args) ||
    !Object.values(args).every((value) => typeof value === "string")
  ) {
    throw new Error("invalid payload");
  }
  return {
    scenario: candidate["scenario"],
    faultPoints: faultPoints as string[],
    args: args as Record<string, string>,
    dataDir: candidate["dataDir"],
  };
}

function environment(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
  return env;
}

async function main(): Promise<void> {
  let payload: Payload;
  try {
    payload = parsePayload(process.argv[2]);
  } catch {
    fail("crash-child: bad_payload");
  }

  const faultPoints =
    payload.faultPoints.length === 0
      ? NO_FAULT_POINTS
      : createFaultPoints({
          armed: payload.faultPoints,
          markerDir: faultMarkerDir(payload.dataDir),
          kill: () => {
            process.kill(process.pid, "SIGKILL");
          },
        });

  let readyCalled = false;
  const context: ScenarioContext = {
    env: environment(),
    args: payload.args,
    dataDir: payload.dataDir,
    faultPoints,
    stepObserver: faultObserver(faultPoints),
    logger: createLogger({
      level: "info",
      destination: {
        write(line: string): void {
          process.stdout.write(line);
        },
      },
    }),
    ready(): void {
      if (readyCalled) {
        return;
      }
      readyCalled = true;
      process.stdout.write("CRASH_READY\n");
    },
  };

  let start: ScenarioStart;
  try {
    const module = (await import(pathToFileURL(payload.scenario).href)) as { start?: unknown };
    if (typeof module.start !== "function") {
      fail("crash-child: scenario_invalid");
    }
    start = module.start as ScenarioStart;
  } catch {
    fail("crash-child: scenario_unloadable");
  }

  try {
    await start(context);
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    fail(`crash-child: scenario_failed ${typeof code === "string" ? code : "unknown"}`);
  }

  if (!readyCalled) {
    fail("crash-child: scenario_not_ready");
  }

  await new Promise<never>(() => undefined);
}

await main();
