import { DBOS } from "@dbos-inc/dbos-sdk";

import { DurableError } from "./errors.ts";
import { launchBusy } from "./launch.ts";
import type { DurableJson } from "./launch.ts";

const NAME = /^[a-z][a-z0-9_.-]{0,63}$/;

const registered = new Map<string, unknown>();

export function isRegistered(name: string): boolean {
  return registered.has(name);
}

export function registerWorkflow<I extends DurableJson, O extends DurableJson>(
  name: string,
  fn: (input: I) => Promise<O>,
): void {
  if (launchBusy()) {
    throw new DurableError("DURABLE_ALREADY_LAUNCHED", "a durable runtime is already running", {
      reason: "running",
    });
  }
  if (!NAME.test(name)) {
    throw new DurableError("DURABLE_INVALID", "invalid workflow name", { reason: "bad_name" });
  }
  if (registered.has(name)) {
    if (registered.get(name) === fn) {
      return;
    }
    throw new DurableError("DURABLE_INVALID", "workflow name already registered", {
      reason: "name_taken",
    });
  }
  DBOS.registerWorkflow(fn, { name });
  registered.set(name, fn);
}
