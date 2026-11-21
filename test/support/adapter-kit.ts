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
import type { SurfaceTool } from "../../src/tools/index.ts";

function inputV(): SurfaceTool["input"] {  return {
    type: "object",
    properties: { vendor_name: { type: "string" } },
    required: ["vendor_name"],
  };
}

function outputV(): SurfaceTool["output"] {
  return {
    type: "object",
    properties: { vendor_id: { type: "string" } },
    required: ["vendor_id"],
  };
}

function mcpText(): SurfaceTool["output"] {
  return {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
    additionalProperties: false,
  };
}

function httpTool(): SurfaceTool {
  return {
    name: "find_vendor",
    description: "Find a vendor by name.",
    effect: "read",
    input: inputV(),
    output: outputV(),
    untrusted_result: false,
    call: {
      kind: "http",
      method: "POST",
      path: "/vendors/find",
      params: [],
      body: true,
    },
  };
}

function mcpTool(): SurfaceTool {
  return {
    name: "search_notes",
    description: "Search the notes.",
    effect: "write",
    input: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    output: mcpText(),
    untrusted_result: true,
    unsafe_to_retry: true,
    call: {
      kind: "mcp",
      endpoint: "/mcp",
      name: "search.notes",
      protocolVersion: "2026-07-28",
      output: "text",
    },
  };
}

function codeTool(): SurfaceTool {
  return {
    name: "word_count",
    description: "Count the words.",
    effect: "read",
    input: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
    output: {
      type: "object",
      properties: { words: { type: "integer" } },
      required: ["words"],
    },
    untrusted_result: false,
    call: { kind: "code", source: "return { words: 3 };" },
  };
}

export function kitSurface(kind: ToolCallSpec["kind"], variant?: "b" | "c"): ToolSurface {
  let tool: SurfaceTool;
  if (kind === "http") tool = httpTool();
  else if (kind === "mcp") tool = mcpTool();
  else if (kind === "code") tool = codeTool();
  else throw new RangeError(`kitSurface: unknown kind ${String(kind)}`);

  if (variant === "b") tool.description = "Find a vendor.";
  else if (variant === "c") tool.description = "Find vendors by name.";
  else if (variant !== undefined) {
    throw new RangeError(`kitSurface: unknown variant ${String(variant)}`);
  }

  return { tools: [tool] };
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
