import { InterpreterError } from "../errors.ts";
import type { HookRunner } from "./types.ts";

const runners = new Map<"code" | "block", HookRunner>();

export function registerHookRunner(kind: "code" | "block", runner: HookRunner): void {
  if ((kind !== "code" && kind !== "block") || typeof runner?.run !== "function") {
    throw new InterpreterError(
      "HOOK_RUNNER_INVALID",
      `invalid hook runner for kind "${String(kind)}"`,
      null,
      { kind: String(kind) },
    );
  }
  if (runners.has(kind)) {
    throw new InterpreterError(
      "HOOK_RUNNER_DUPLICATE",
      `a runner for hook kind "${kind}" is already registered`,
      null,
      { kind },
    );
  }
  runners.set(kind, runner);
}

export function hookRunnerFor(kind: string): HookRunner | undefined {
  return kind === "code" || kind === "block" ? runners.get(kind) : undefined;
}
