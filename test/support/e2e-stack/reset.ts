// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { FaultTable } from "./faults.ts";
import type { E2eStackPart, PartContext } from "./part.ts";

export function createResetRunner(_deps: {
  parts: readonly E2eStackPart[];
  context(part: E2eStackPart): PartContext;
  faults: FaultTable;
  engineHealthy(): Promise<boolean>;
}): { seedAll(): Promise<void>; reset(): Promise<void> } {
  throw new Error("not implemented");
}
