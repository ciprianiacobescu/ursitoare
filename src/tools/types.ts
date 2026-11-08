// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { BlockImport } from "../registry/index.ts";

type Effect = BlockImport["effect"];
type JsonSchema = BlockImport["input"];

export type ToolAdapter = "fixture" | "mcp" | "http_openapi" | "code_block";

export type ToolServerState = "pending" | "approved" | "drifted";

export interface SurfaceTool {
  name: string;
  description?: string;
  effect: Effect;
  input: JsonSchema;
  output: JsonSchema;
  untrusted_fields?: string[];
  untrusted_result?: boolean;
  unsafe_to_retry?: boolean;
  data_class?: "public" | "private";
  http: { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; path: string };
}

export interface ToolSurface {
  tools: SurfaceTool[];
}

export interface ToolServerRecord {
  id: string;
  adapter: ToolAdapter;
  origin: string;
  local: boolean;
  state: ToolServerState;
  registeredBy: string;
  registeredAt: string;
  approvedDigest: string | null;
  pendingDigest: string | null;
  pendingSubmittedBy: string | null;
  tools: { name: string; effect: Effect; ref: string | null }[];
}

export interface ToolBinding {
  serverId: string;
  origin: string;
  local: boolean;
  state: ToolServerState;
  ref: string;
  tool: string;
  effect: Effect;
  http: { method: string; path: string };
  untrustedResult: boolean;
  unsafeToRetry: boolean;
}

export type OriginCheck =
  | { ok: true; origin: string }
  | {
      ok: false;
      reason:
        | "not_url"
        | "scheme"
        | "credentials"
        | "path"
        | "loopback"
        | "link_local"
        | "metadata"
        | "private"
        | "service_name"
        | "ipv6";
    };

export type ToolsErrorCode =
  | "TOOLS_INVALID"
  | "TOOLS_NOT_FOUND"
  | "TOOLS_EXISTS"
  | "TOOLS_REFUSED"
  | "TOOLS_TENANT_MISMATCH";

export class ToolsError extends Error {
  readonly code: ToolsErrorCode;
  readonly details: Readonly<Record<string, string>>;

  constructor(_code: ToolsErrorCode, message: string, _details?: Record<string, string>) {
    super(message);
    throw new Error("not implemented");
  }
}
