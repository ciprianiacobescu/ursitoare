import { DBOS, Error as DBOSErrors } from "@dbos-inc/dbos-sdk";

import { DurableError } from "./errors.ts";
import type { DurableErrorCode } from "./errors.ts";
import { isDurableJson } from "./json.ts";
import type { DurableJson, StepObserver } from "./launch.ts";

// Written to the errors a step's fn throws so that, after DBOS serializes and revives them on
// replay, runStep can still recognize them as the step's own outcome rather than a DBOS failure.
// serialize-error copies enumerable own properties, so this marker survives the round trip.
const STEP_ERROR_MARK = "__durableStepError";

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

function markStepError(error: unknown): void {
  if (typeof error !== "object" || error === null) {
    return;
  }
  try {
    Object.defineProperty(error, STEP_ERROR_MARK, {
      value: true,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  } catch {
    // A non-extensible error cannot carry the marker; DBOS will revive it without one.
  }
}

function isMarkedStepError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as Record<string, unknown>)[STEP_ERROR_MARK] === true
  );
}

function revivedDetails(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const details: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      details[key] = entry;
    }
  }
  return details;
}

// DBOS revives a recorded step error as a plain Error. Turn a marked one back into the error fn
// threw, so a replay rejects with the same name, message, code and details as the first run.
function reviveStepError(error: unknown): unknown {
  if (!isMarkedStepError(error)) {
    return undefined;
  }
  const record = error as { name?: unknown; message?: unknown; code?: unknown; details?: unknown };
  if (record.name === "DurableError" && typeof record.code === "string") {
    return new DurableError(
      record.code as DurableErrorCode,
      typeof record.message === "string" ? record.message : "",
      revivedDetails(record.details),
    );
  }
  return error;
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
      let result: T;
      for (;;) {
        try {
          result = await fn();
          break;
        } catch (error) {
          if (attempt >= retries || (retryable !== undefined && !retryable(error))) {
            throw error;
          }
          attempt += 1;
        }
      }
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
      callbackFailed = true;
      callbackError = error;
      markStepError(error);
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
    const revived = reviveStepError(error);
    if (revived !== undefined) {
      throw revived;
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
