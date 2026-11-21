// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ToolSurface } from "../types.ts";
import type { OpenApiOverlay, OpenApiPreview } from "./types.ts";

export function readOpenApi(_document: unknown, _origin: string): OpenApiPreview {
  throw new Error("not implemented");
}

export function importOpenApi(
  _document: unknown,
  _origin: string,
  _overlay: OpenApiOverlay,
): ToolSurface {
  throw new Error("not implemented");
}
