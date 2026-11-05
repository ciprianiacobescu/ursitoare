import type { JsonValue } from "../authoring/index.ts";
import { currentWorkflowId, durableSleep, registerWorkflow, runStep } from "../durable/index.ts";
import { InterpreterError } from "./errors.ts";
import { executeRun } from "./execute.ts";
import type { InterpreterDeps, WorkflowOps } from "./types.ts";

export const RUN_WORKFLOW = "ursitoare.run";

const TENANT_ID = /^[A-Za-z0-9_-]{1,64}$/;
const RUN_ID = /^[A-Za-z0-9_-]{1,128}$/;

let bound: InterpreterDeps | null = null;
let registered = false;

interface RunWorkflowInput {
  tenantId: string;
  runId: string;
  reviewProfile: "solo" | "team";
  [key: string]: string;
}

function invalidInput(): InterpreterError {
  return new InterpreterError(
    "INTERPRETER_INPUT_INVALID",
    "the workflow input is malformed",
    null,
    { reason: "workflow_input" },
  );
}

function checkInput(input: unknown): RunWorkflowInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalidInput();
  }
  const { tenantId, runId, reviewProfile } = input as Record<string, unknown>;
  if (
    typeof tenantId !== "string" ||
    !TENANT_ID.test(tenantId) ||
    typeof runId !== "string" ||
    !RUN_ID.test(runId) ||
    (reviewProfile !== "solo" && reviewProfile !== "team")
  ) {
    throw invalidInput();
  }
  return { tenantId, runId, reviewProfile };
}

export function registerRunWorkflow(): void {
  if (registered) {
    return;
  }
  registerWorkflow(RUN_WORKFLOW, async (raw: RunWorkflowInput) => {
    const input = checkInput(raw);
    if (bound === null) {
      throw new InterpreterError("INTERPRETER_UNBOUND", "the interpreter is not bound");
    }
    const run = await executeRun(
      dbosWorkflowOps(),
      bound,
      { tenantId: input.tenantId, reviewProfile: input.reviewProfile },
      input.runId,
    );
    return { runId: input.runId, state: run.state };
  });
  registered = true;
}

export function bindInterpreter(deps: InterpreterDeps): void {
  bound = deps;
}

export function dbosWorkflowOps(): WorkflowOps {
  return {
    get workflowId(): string {
      return currentWorkflowId();
    },
    runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T> {
      return runStep(name, fn);
    },
    sleep(ms: number): Promise<void> {
      return durableSleep(ms);
    },
  };
}
