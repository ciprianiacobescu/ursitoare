// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { DBOSConfig, DLogger } from "@dbos-inc/dbos-sdk";
import type pg from "pg";
import type { EndpointLike } from "../db/index.ts";
import type { Logger } from "../observability/index.ts";

export type DurableJson =
  | null
  | boolean
  | number
  | string
  | DurableJson[]
  | { [key: string]: DurableJson };

export const APPLICATION_VERSION: string = "";

export const RUNS_QUEUE: string = "";

export type StepPhase = "before" | "after";

export type StepObserver = (phase: StepPhase, step: string, workflowId: string) => void;

export type WorkflowState =
  | "ENQUEUED"
  | "PENDING"
  | "SUCCESS"
  | "ERROR"
  | "CANCELLED"
  | "MAX_RECOVERY_ATTEMPTS_EXCEEDED"
  | "DELAYED";

export interface WorkflowInfo {
  workflowId: string;
  workflow: string;
  state: WorkflowState;
}

export interface DurableRuntime {
  readonly applicationVersion: string;
  enqueue(workflow: string, workflowId: string, input: DurableJson): Promise<void>;
  status(workflowId: string): Promise<WorkflowInfo | null>;
  cancel(workflowId: string): Promise<void>;
  shutdown(): Promise<void>;
}

export interface LaunchOptions {
  endpoint: EndpointLike;
  logger: Logger;
  pollingIntervalMs?: number;
  concurrency?: number;
  stepObserver?: StepObserver;
  closePool?: (pool: pg.Pool) => Promise<void>;
}

export async function launchDurable(_opts: LaunchOptions): Promise<DurableRuntime> {
  throw new Error("not implemented");
}

export async function suspendDurable(): Promise<DurableRuntime | null> {
  throw new Error("not implemented");
}

export async function resumeDurable(): Promise<DurableRuntime | null> {
  throw new Error("not implemented");
}

export function dbosConfig(_opts: LaunchOptions, _pool: pg.Pool): DBOSConfig {
  throw new Error("not implemented");
}

export function dbosLogger(_logger: Logger): DLogger {
  throw new Error("not implemented");
}
