// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { JsonValue } from "../../src/authoring/index.ts";
import type { CodeRunner } from "../../src/runtimes/index.ts";
import type {
  CallAdapter,
  CallAnswer,
  CallBuild,
  HttpCallSpec,
  McpCallSpec,
  ToolBinding,
  ToolCallSpec,
  ToolHttpResponse,
  ToolJson,
  ToolSurface,
} from "../../src/tools/index.ts";
import type { SurfaceTool } from "../../src/tools/index.ts";
import { CODE_BLOCK_ORIGIN } from "../../src/tools/index.ts";

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

export function kitBinding(kind: ToolCallSpec["kind"], over?: Partial<ToolBinding>): ToolBinding {
  const tool = kitSurface(kind).tools[0];
  if (tool === undefined || tool.call === undefined) {
    throw new RangeError(`kitBinding: ${String(kind)} tool has no call`);
  }
  const base: ToolBinding = {
    serverId: "acme",
    origin: kind === "code" ? CODE_BLOCK_ORIGIN : "https://tools.fake.test",
    local: false,
    state: "approved",
    ref: "acme.lookup_vendor@1",
    tool: tool.name,
    effect: tool.effect,
    call: tool.call,
    untrustedResult: tool.untrusted_result ?? false,
    unsafeToRetry: tool.unsafe_to_retry ?? false,
  };
  return { ...base, ...over };
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function sorted(value: ToolJson): ToolJson {
  if (Array.isArray(value)) return value.map((item) => sorted(item));
  if (value === null || typeof value !== "object") return value;
  const out: { [key: string]: ToolJson } = {};
  for (const key of Object.keys(value).sort()) out[key] = sorted(value[key] as ToolJson);
  return out;
}

// The stub adapters steer on `args.mode`: "refuse" and "text" refuse the build, "throw" throws.
function kitBuild(path: string, args: ToolJson, idemKey: string | null): CallBuild {
  const mode =
    args !== null && typeof args === "object" && !Array.isArray(args) ? args["mode"] : undefined;
  if (mode === "refuse") return { ok: false, reason: "refused_args" };
  if (mode === "text") return { ok: false, reason: "Bad Reason secret_text" };
  if (mode === "throw") throw new Error("secret_text");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (idemKey !== null) headers["idempotency-key"] = idemKey;
  return {
    ok: true,
    request: {
      method: "POST",
      path,
      headers,
      body: encoder.encode(JSON.stringify(sorted(args))),
    },
  };
}

function kitAnswer(response: ToolHttpResponse): CallAnswer {
  if (response.status < 200 || response.status > 299) {
    return { ok: false, stage: "upstream", reason: "status", status: response.status };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoder.decode(response.body));
  } catch {
    return { ok: false, stage: "response", reason: "not_json", status: null };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, stage: "response", reason: "not_json", status: null };
  }
  return { ok: true, output: parsed as { [key: string]: ToolJson } };
}

export const kitHttpAdapter: CallAdapter<HttpCallSpec> = {
  build: (call, args, idemKey) => kitBuild(call.path, args, idemKey),
  answer: (_call, response) => kitAnswer(response),
};

export const kitMcpAdapter: CallAdapter<McpCallSpec> = {
  build: (call, args, idemKey) => kitBuild(call.endpoint, args, idemKey),
  answer: (_call, response) => kitAnswer(response),
};

export function kitCodeRunner(): {
  run: CodeRunner;
  calls: { source: string; args: JsonValue; nodeId: string }[];
} {
  const calls: { source: string; args: JsonValue; nodeId: string }[] = [];
  const run: CodeRunner = async (call, args, ctx) => {
    calls.push({ source: call.source, args, nodeId: ctx.nodeId });
    return { output: { words: 3 } };
  };
  return { run, calls };
}
