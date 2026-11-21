// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ToolCallSpec } from "./calls.ts";
import type { ToolAdapter, ToolSurface } from "./types.ts";

export const CODE_BLOCK_ORIGIN: string = "";

export const ADAPTER_CALL_KINDS: Readonly<
  Record<"http_openapi" | "mcp" | "code_block", ToolCallSpec["kind"]>
> = {} as unknown as Readonly<Record<"http_openapi" | "mcp" | "code_block", ToolCallSpec["kind"]>>;

export const MAX_SURFACE_CHARS: number = 0;

export const MAX_CODE_SOURCE_CHARS: number = 0;

export function checkAdapterSurface(_adapter: ToolAdapter, _surface: unknown): ToolSurface {
  throw new Error("not implemented");
}
