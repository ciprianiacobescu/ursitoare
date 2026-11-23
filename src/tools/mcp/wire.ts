import type { McpCallSpec, ToolHttpResponse, ToolJson } from "../calls.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8");

export const MCP_MODERN_VERSION = "2026-07-28";

export const MCP_LEGACY_VERSIONS: readonly ("2025-11-25" | "2025-06-18" | "2025-03-26")[] = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
];

export const MCP_CLIENT_INFO: Readonly<{ name: string; version: string }> = {
  name: "ursitoare",
  version: "0.1",
};

const META: Readonly<{ [key: string]: ToolJson }> = {
  "io.modelcontextprotocol/protocolVersion": MCP_MODERN_VERSION,
  "io.modelcontextprotocol/clientInfo": MCP_CLIENT_INFO,
  "io.modelcontextprotocol/clientCapabilities": {},
};

function isPlain(value: unknown): value is { [key: string]: ToolJson } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sortedJson(value: ToolJson): string {
  if (Array.isArray(value)) return `[${value.map((item) => sortedJson(item)).join(",")}]`;
  if (isPlain(value)) {
    const parts: string[] = [];
    for (const key of Object.keys(value).sort()) {
      const item = value[key];
      if (item === undefined) continue;
      parts.push(`${JSON.stringify(key)}:${sortedJson(item)}`);
    }
    return `{${parts.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function mcpBody(
  id: number | null,
  method: string,
  params: { [key: string]: ToolJson },
  version: McpCallSpec["protocolVersion"],
): Uint8Array {
  const members: string[] = [`"jsonrpc":"2.0"`];
  if (id !== null) members.push(`"id":${JSON.stringify(id)}`);
  members.push(`"method":${JSON.stringify(method)}`);
  const paramParts: string[] = [];
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value === undefined) continue;
    if (key === "_meta" && version === MCP_MODERN_VERSION) continue;
    if (key === "arguments") {
      paramParts.push(`${JSON.stringify(key)}:${sortedJson(value)}`);
    } else {
      paramParts.push(`${JSON.stringify(key)}:${JSON.stringify(value)}`);
    }
  }
  if (version === MCP_MODERN_VERSION) {
    paramParts.push(`"_meta":${JSON.stringify(META)}`);
  }
  members.push(`"params":{${paramParts.join(",")}}`);
  return encoder.encode(`{${members.join(",")}}`);
}

export function mcpNameHeader(name: string): string {
  let plain = true;
  for (const char of name) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x21 || code > 0x7e) {
      plain = false;
      break;
    }
  }
  const wrapped = name.startsWith("=?base64?") && name.endsWith("?=");
  if (plain && !wrapped) return name;
  return `=?base64?${Buffer.from(name, "utf8").toString("base64")}?=`;
}

export function mcpHeaders(
  method: string,
  name: string | null,
  version: McpCallSpec["protocolVersion"],
  idemKey: string | null,
): Readonly<Record<string, string>> {
  const headers: Record<string, string> = {
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
    "mcp-protocol-version": version,
  };
  if (version === MCP_MODERN_VERSION) {
    headers["mcp-method"] = method;
    if (name !== null) headers["mcp-name"] = mcpNameHeader(name);
  }
  if (idemKey !== null) headers["idempotency-key"] = idemKey;
  return headers;
}

export type McpReply =
  | { ok: true; result: { [key: string]: ToolJson } }
  | { ok: false; reason: "rpc_error" | "not_json" | "no_reply"; code: number | null };

function contentIsSse(response: ToolHttpResponse): boolean {
  for (const [key, value] of Object.entries(response.headers)) {
    if (key.toLowerCase() === "content-type") return value.toLowerCase().includes("text/event-stream");
  }
  return false;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function match(message: unknown, id: number): McpReply | null {
  if (!isPlain(message)) return null;
  const messageId = Object.hasOwn(message, "id") ? message["id"] : undefined;
  if (Object.hasOwn(message, "error")) {
    if (messageId !== id && messageId !== null) return null;
    const error = message["error"];
    if (!isPlain(error)) return null;
    const code = error["code"];
    return { ok: false, reason: "rpc_error", code: typeof code === "number" ? code : null };
  }
  if (Object.hasOwn(message, "result")) {
    if (messageId !== id) return null;
    const result = message["result"];
    if (!isPlain(result)) return null;
    return { ok: true, result };
  }
  return null;
}

function sseMessages(text: string): unknown[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const messages: unknown[] = [];
  for (const block of normalized.split("\n\n")) {
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    if (data.length === 0) continue;
    const parsed = parseJson(data.join("\n"));
    if (parsed !== undefined) messages.push(parsed);
  }
  return messages;
}

export function readMcpReply(response: ToolHttpResponse, id: number): McpReply {
  const text = decoder.decode(response.body);
  if (contentIsSse(response)) {
    for (const message of sseMessages(text)) {
      const reply = match(message, id);
      if (reply !== null) return reply;
    }
    return { ok: false, reason: "no_reply", code: null };
  }
  const parsed = parseJson(text);
  if (!isPlain(parsed)) return { ok: false, reason: "not_json", code: null };
  return match(parsed, id) ?? { ok: false, reason: "no_reply", code: null };
}
