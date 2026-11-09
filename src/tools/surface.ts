import { createHash } from "node:crypto";

import { canonicalize } from "../audit/index.ts";

import type { SurfaceTool, ToolSurface } from "./types.ts";

function normalizeTool(tool: SurfaceTool): unknown {
  return {
    name: tool.name,
    description: tool.description ?? null,
    effect: tool.effect,
    input: tool.input,
    output: tool.output,
    untrusted_fields: [...(tool.untrusted_fields ?? [])].sort(),
    untrusted_result: tool.untrusted_result ?? true,
    unsafe_to_retry: tool.unsafe_to_retry ?? false,
    data_class: tool.data_class ?? null,
    http: { method: tool.http.method, path: tool.http.path },
  };
}

export function surfaceDigest(surface: ToolSurface): string {
  const tools = [...surface.tools].sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  );
  const canonical = canonicalize(tools.map(normalizeTool));
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

export function surfaceRefs(
  _serverId: string,
  _surface: ToolSurface,
  _taken: ReadonlyMap<string, string>,
): Record<string, string> {
  throw new Error("not implemented");
}
