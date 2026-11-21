// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { JsonValue } from "../../src/authoring/index.ts";
import type { CodeRunner } from "../../src/runtimes/index.ts";
import type {
  CallAdapter,
  HttpCallSpec,
  McpCallSpec,
  ToolBinding,
  ToolCallSpec,
  ToolSurface,
} from "../../src/tools/index.ts";

export function kitSurface(_kind: ToolCallSpec["kind"], _variant?: "b" | "c"): ToolSurface {
  throw new Error("not implemented");
}

export function kitBinding(_kind: ToolCallSpec["kind"], _over?: Partial<ToolBinding>): ToolBinding {
  throw new Error("not implemented");
}

export const kitHttpAdapter: CallAdapter<HttpCallSpec> = {
  build() {
    throw new Error("not implemented");
  },
  answer() {
    throw new Error("not implemented");
  },
};

export const kitMcpAdapter: CallAdapter<McpCallSpec> = {
  build() {
    throw new Error("not implemented");
  },
  answer() {
    throw new Error("not implemented");
  },
};

export function kitCodeRunner(): {
  run: CodeRunner;
  calls: { source: string; args: JsonValue; nodeId: string }[];
} {
  throw new Error("not implemented");
}
