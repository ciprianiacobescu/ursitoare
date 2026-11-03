import { DBOS, Error as DBOSErrors } from "@dbos-inc/dbos-sdk";

import type { DurableJson } from "./launch.ts";

export interface StepOptions {
  retries?: number;
  retryable?: (error: unknown) => boolean;
}

export function isDurableCancellation(error: unknown): boolean {
  return error instanceof DBOSErrors.DBOSWorkflowCancelledError;
}

// Plain step: DBOS must see its own cancellation error, so nothing is translated here (3.1 adds the rest).
export async function runStep<T extends DurableJson>(
  name: string,
  fn: () => Promise<T>,
  _opts?: StepOptions,
): Promise<T> {
  return DBOS.runStep(fn, { name });
}

export async function durableSleep(_ms: number): Promise<void> {
  throw new Error("not implemented");
}

export function currentWorkflowId(): string {
  throw new Error("not implemented");
}
