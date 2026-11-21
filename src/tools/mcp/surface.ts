// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { McpCallSpec } from "../calls.ts";
import type { Effect, ToolSurface } from "../types.ts";

export interface McpOverlayEntry {
  skip?: true;
  name?: string;
  effect?: Effect;
  untrusted_result?: boolean;
  unsafe_to_retry?: boolean;
  data_class?: "public" | "private";
}

export interface McpOverlay {
  tools: Readonly<Record<string, McpOverlayEntry>>;
}

export type McpExclusion =
  | "x_mcp_header"
  | "schema_invalid"
  | "output_not_object"
  | "name_invalid"
  | "not_listed"
  | "skipped"
  | "description";

export function mcpSurface(
  _tools: readonly unknown[],
  _at: { endpoint: string; protocolVersion: McpCallSpec["protocolVersion"] },
  _overlay: McpOverlay,
): { surface: ToolSurface; excluded: { name: string; reason: McpExclusion }[] } {
  throw new Error("not implemented");
}
