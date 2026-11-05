import type { JsonValue } from "../authoring/index.ts";
import type { WorkflowOps } from "./types.ts";

export interface MemoryWorkflowOps extends WorkflowOps {
  readonly executed: readonly string[];
  readonly slept: readonly number[];
}

function copy(value: JsonValue): JsonValue {
  return structuredClone(value);
}

export function memoryWorkflowOps(
  workflowId: string,
  recorded: readonly JsonValue[] = [],
): MemoryWorkflowOps {
  const executed: string[] = [];
  const slept: number[] = [];
  let position = 0;

  return {
    workflowId,
    async runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T> {
      const index = position;
      position += 1;
      if (index < recorded.length) {
        return copy(recorded[index] as JsonValue) as T;
      }
      executed.push(name);
      return copy(await fn()) as T;
    },
    async sleep(ms: number): Promise<void> {
      slept.push(ms);
    },
    get executed(): readonly string[] {
      return executed;
    },
    get slept(): readonly number[] {
      return slept;
    },
  };
}
