// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { DurableRuntime } from "../../../src/durable/index.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

export const DURABLE_READY_WORKFLOW: string = "";

export interface ReadyOptions {
  timeoutMs?: number;
  pollMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  workflowId?: string;
}

export async function checkDurableReady(
  _runtime: DurableRuntime,
  _opts?: ReadyOptions,
): Promise<void> {
  throw new Error("not implemented");
}

export const durablePart: E2eStackPart = {
  name: "",
  async start(_ctx: PartContext): Promise<PartHandle> {
    throw new Error("not implemented");
  },
};
