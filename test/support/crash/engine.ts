// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FaultPoints } from "../../../src/config/faults.ts";
import type { StepObserver } from "../../../src/durable/index.ts";
import type { Logger } from "../../../src/observability/index.ts";
import type { CrashCluster } from "./cluster.ts";

export interface SpawnOptions {
  cluster: CrashCluster;
  scenario: string;
  faultPoints?: readonly string[];
  args?: Readonly<Record<string, string>>;
}

export interface ScenarioContext {
  env: Readonly<Record<string, string>>;
  args: Readonly<Record<string, string>>;
  dataDir: string;
  faultPoints: FaultPoints;
  stepObserver: StepObserver;
  logger: Logger;
  ready(): void;
}

export type ScenarioStart = (ctx: ScenarioContext) => Promise<void>;

export interface EngineProcess {
  readonly pid: number;
  readonly deaths: number;
  kill(): Promise<void>;
  restart(): Promise<void>;
  stop(): Promise<void>;
}

export const READY_TIMEOUT_MS: number = 0;

export async function spawnEngine(_opts: SpawnOptions): Promise<EngineProcess> {
  throw new Error("not implemented");
}

export async function spawnEngineTuned(
  _opts: SpawnOptions,
  _tuning: { readyTimeoutMs: number },
): Promise<EngineProcess> {
  throw new Error("not implemented");
}

export function faultMarkerDir(_dataDir: string): string {
  throw new Error("not implemented");
}
