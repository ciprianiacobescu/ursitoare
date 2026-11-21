// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type ToolJson = null | boolean | number | string | ToolJson[] | { [key: string]: ToolJson };

export interface HttpCallSpec {
  kind: "http";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  params: readonly { name: string; in: "path" | "query" }[];
  body: boolean;
}

export interface McpCallSpec {
  kind: "mcp";
  endpoint: string;
  name: string;
  protocolVersion: "2026-07-28" | "2025-11-25" | "2025-06-18" | "2025-03-26";
  output: "structured" | "text";
  hints?: { readOnly?: boolean; destructive?: boolean; idempotent?: boolean };
}

export interface CodeCallSpec {
  kind: "code";
  source: string;
}

export type ToolCallSpec = HttpCallSpec | McpCallSpec | CodeCallSpec;

export interface ToolHttpRequest {
  method: string;
  path: string;
  headers: Readonly<Record<string, string>>;
  body: Uint8Array | null;
}

export type CallBuild = { ok: true; request: ToolHttpRequest } | { ok: false; reason: string };

export interface ToolHttpResponse {
  status: number;
  headers: Readonly<Record<string, string>>;
  body: Uint8Array;
}

export type CallAnswer =
  | { ok: true; output: { [key: string]: ToolJson } }
  | { ok: false; stage: "upstream" | "response"; reason: string; status: number | null };

export interface CallAdapter<S extends HttpCallSpec | McpCallSpec> {
  build(call: S, args: ToolJson, idemKey: string | null): CallBuild;
  answer(call: S, response: ToolHttpResponse): CallAnswer;
}

export const MCP_TEXT_OUTPUT_SCHEMA: Readonly<{ [key: string]: ToolJson }> = {};
