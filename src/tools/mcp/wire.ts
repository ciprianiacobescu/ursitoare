// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { McpCallSpec, ToolHttpResponse, ToolJson } from "../calls.ts";

export const MCP_MODERN_VERSION: "2026-07-28" = "" as unknown as "2026-07-28";

export const MCP_LEGACY_VERSIONS: readonly ("2025-11-25" | "2025-06-18" | "2025-03-26")[] = [];

export const MCP_CLIENT_INFO: Readonly<{ name: string; version: string }> = { name: "", version: "" };

export function mcpBody(
  _id: number | null,
  _method: string,
  _params: { [key: string]: ToolJson },
  _version: McpCallSpec["protocolVersion"],
): Uint8Array {
  throw new Error("not implemented");
}

export function mcpHeaders(
  _method: string,
  _name: string | null,
  _version: McpCallSpec["protocolVersion"],
  _idemKey: string | null,
): Readonly<Record<string, string>> {
  throw new Error("not implemented");
}

export function mcpNameHeader(_name: string): string {
  throw new Error("not implemented");
}

export type McpReply =
  | { ok: true; result: { [key: string]: ToolJson } }
  | { ok: false; reason: "rpc_error" | "not_json" | "no_reply"; code: number | null };

export function readMcpReply(_response: ToolHttpResponse, _id: number): McpReply {
  throw new Error("not implemented");
}
