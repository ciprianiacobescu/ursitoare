import { DBOS, Error as DBOSErrors } from "@dbos-inc/dbos-sdk";

import { DurableError } from "./errors.ts";
import { isDurableJson } from "./json.ts";
import type { DurableJson, StepObserver } from "./launch.ts";

export interface StepOptions {
  retries?: number;
  retryable?: (error: unknown) => boolean;
}

let stepObserver: StepObserver | undefined;

function isStepName(name: string): boolean {
  if (name.length < 1 || name.length > 200) {
    return false;
  }
  for (let index = 0; index < name.length; index += 1) {
    const code = name.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return false;
    }
  }
  return true;
}

// Module-internal: exported for launch.ts, which hands the running launch's observer to this module.
export function setStepObserver(observer: StepObserver | undefined): void {
  stepObserver = observer;
}

function outsideWorkflow(): DurableError {
  return new DurableError(
    "DURABLE_NOT_LAUNCHED",
    "the durable helper ran outside a workflow",
    { reason: "outside_workflow" },
  );
}

function badStepName(): DurableError {
  return new DurableError("DURABLE_INVALID", "invalid step name", { reason: "bad_step_name" });
}

function badOption(): DurableError {
  return new DurableError("DURABLE_INVALID", "invalid durable option", { reason: "bad_option" });
}

function dbosFailed(): DurableError {
  return new DurableError("DURABLE_UNAVAILABLE", "the durable call failed", {
    reason: "dbos_failed",
  });
}

function readRetries(opts: StepOptions | undefined): number {
  const retries = opts?.retries;
  if (retries === undefined) {
    return 0;
  }
  if (!Number.isInteger(retries) || retries < 0 || retries > 10) {
    throw badOption();
  }
  return retries;
}

export function isDurableCancellation(error: unknown): boolean {
  return error instanceof DBOSErrors.DBOSWorkflowCancelledError;
}

function requireWorkflowId(): string {
  const workflowId = DBOS.workflowID;
  if (!DBOS.isWithinWorkflow() || workflowId === undefined || workflowId === "") {
    throw outsideWorkflow();
  }
  return workflowId;
}

export async function runStep<T extends DurableJson>(
  name: string,
  fn: () => Promise<T>,
  opts?: StepOptions,
): Promise<T> {
  if (!isStepName(name)) {
    throw badStepName();
  }
  const retries = readRetries(opts);
  const retryable = opts?.retryable;
  const workflowId = requireWorkflowId();

  let callbackFailed = false;
  let callbackError: unknown;

  const callback = async (): Promise<T> => {
    try {
      if (stepObserver !== undefined) {
        stepObserver("before", name, workflowId);
      }
      let attempt = 0;
      for (;;) {
        try {
          const result = await fn();
          if (!isDurableJson(result)) {
            throw new DurableError("DURABLE_INVALID", "invalid step result", {
              reason: "bad_step_result",
            });
          }
          if (stepObserver !== undefined) {
            stepObserver("after", name, workflowId);
          }
          return result;
        } catch (error) {
          if (attempt >= retries || (retryable !== undefined && !retryable(error))) {
            throw error;
          }
          attempt += 1;
        }
      }
    } catch (error) {
      callbackFailed = true;
      callbackError = error;
      throw error;
    }
  };

  try {
    return await DBOS.runStep(callback, { name });
  } catch (error) {
    if (isDurableCancellation(error) || error instanceof DurableError) {
      throw error;
    }
    if (callbackFailed && error === callbackError) {
      throw error;
    }
    throw dbosFailed();
  }
}

export async function durableSleep(ms: number): Promise<void> {
  if (!Number.isInteger(ms) || ms < 0 || ms > 86_400_000) {
    throw badOption();
  }
  requireWorkflowId();
  try {
    await DBOS.sleep(ms);
  } catch (error) {
    if (isDurableCancellation(error)) {
      throw error;
    }
    throw dbosFailed();
  }
}

export function currentWorkflowId(): string {
  return requireWorkflowId();
}
