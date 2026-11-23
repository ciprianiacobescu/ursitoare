import type { CallAdapter, CallAnswer, CallBuild, McpCallSpec, ToolHttpResponse, ToolJson } from "../calls.ts";
import { mcpBody, mcpHeaders, readMcpReply } from "./wire.ts";

function isPlain(value: unknown): value is { [key: string]: ToolJson } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function build(call: McpCallSpec, args: ToolJson, idemKey: string | null): CallBuild {
  if (!isPlain(args)) return { ok: false, reason: "args_not_object" };
  return {
    ok: true,
    request: {
      method: "POST",
      path: call.endpoint,
      headers: mcpHeaders("tools/call", call.name, call.protocolVersion, idemKey),
      body: mcpBody(1, "tools/call", { name: call.name, arguments: args }, call.protocolVersion),
    },
  };
}

function answer(call: McpCallSpec, response: ToolHttpResponse): CallAnswer {
  if (response.status < 200 || response.status > 299) {
    return { ok: false, stage: "upstream", reason: "status", status: response.status };
  }
  const reply = readMcpReply(response, 1);
  if (!reply.ok) {
    const stage = reply.reason === "rpc_error" ? "upstream" : "response";
    return { ok: false, stage, reason: reply.reason, status: null };
  }
  const result = reply.result;
  if (Object.hasOwn(result, "resultType")) {
    const resultType = result["resultType"];
    if (resultType === "input_required") {
      return { ok: false, stage: "response", reason: "input_required", status: null };
    }
    if (resultType !== "complete") {
      return { ok: false, stage: "response", reason: "result_type", status: null };
    }
  }
  if (result["isError"] === true) {
    return { ok: false, stage: "upstream", reason: "tool_error", status: null };
  }
  if (call.output === "structured") {
    const structured = result["structuredContent"];
    if (!isPlain(structured)) return { ok: false, stage: "response", reason: "not_object", status: null };
    return { ok: true, output: structured };
  }
  const texts: string[] = [];
  const content = result["content"];
  if (Array.isArray(content)) {
    for (const item of content) {
      if (isPlain(item) && item["type"] === "text" && typeof item["text"] === "string") {
        texts.push(item["text"]);
      }
    }
  }
  return { ok: true, output: { text: texts.join("\n") } };
}

export const mcpCallAdapter: CallAdapter<McpCallSpec> = { build, answer };
