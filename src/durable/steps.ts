// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { DurableJson } from "./launch.ts";

export interface StepOptions {
  retries?: number;
  retryable?: (error: unknown) => boolean;
}

export async function runStep<T extends DurableJson>(
  _name: string,
  _fn: () => Promise<T>,
  _opts?: StepOptions,
): Promise<T> {
  throw new Error("not implemented");
}

export async function durableSleep(_ms: number): Promise<void> {
  throw new Error("not implemented");
}

export function currentWorkflowId(): string {
  throw new Error("not implemented");
}

export function isDurableCancellation(_error: unknown): boolean {
  throw new Error("not implemented");
}
