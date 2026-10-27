import type { FaultTable } from "./faults.ts";
import type { E2eStackPart, PartContext } from "./part.ts";
import { E2eStackError } from "./part.ts";

const HEALTH_PROBES = 5;

export function createResetRunner(deps: {
  parts: readonly E2eStackPart[];
  context(part: E2eStackPart): PartContext;
  faults: FaultTable;
  engineHealthy(): Promise<boolean>;
}): { seedAll(): Promise<void>; reset(): Promise<void> } {
  let tail: Promise<void> = Promise.resolve();

  function enqueue(task: () => Promise<void>): Promise<void> {
    const result = tail.then(task);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function seedParts(code: string): Promise<void> {
    for (const part of deps.parts) {
      if (typeof part.seed !== "function") {
        continue;
      }
      try {
        await part.seed(deps.context(part));
      } catch (error) {
        throw new E2eStackError(
          code,
          `Seed failed for part: ${part.name}`,
          { part: part.name },
          { cause: error },
        );
      }
    }
  }

  async function probeEngine(): Promise<void> {
    for (let attempt = 0; attempt < HEALTH_PROBES; attempt += 1) {
      if (await deps.engineHealthy()) {
        return;
      }
    }
    throw new E2eStackError("STACK_RESET_FAILED", "Engine is not healthy after reset", { part: "engine" });
  }

  return {
    seedAll(): Promise<void> {
      return enqueue(async () => {
        await seedParts("STACK_PART_FAILED");
      });
    },
    reset(): Promise<void> {
      return enqueue(async () => {
        deps.faults.clear();
        await seedParts("STACK_RESET_FAILED");
        await probeEngine();
      });
    },
  };
}
