import { createHash } from "node:crypto";

import { canonicalize } from "../audit/index.ts";

import { normalizeBlockImport } from "../registry/index.ts";
import type { BlockImport } from "../registry/index.ts";

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

export function toolBlock(serverId: string, tool: SurfaceTool): BlockImport {
  return {
    effect: tool.effect,
    ...(tool.description === undefined ? {} : { description: tool.description }),
    input: tool.input,
    output: tool.output,
    untrusted_fields: tool.untrusted_fields ?? [],
    ...(tool.data_class === undefined ? {} : { data_class: tool.data_class }),
    untrusted_result: tool.untrusted_result ?? true,
    unsafe_to_retry: tool.unsafe_to_retry ?? false,
    binding: { server: serverId, tool: tool.name },
  };
}

export function toolHash(serverId: string, tool: SurfaceTool): string {
  return normalizeBlockImport(`${serverId}.${tool.name}@1`, toolBlock(serverId, tool)).contentHash;
}

export function surfaceRefs(
  serverId: string,
  surface: ToolSurface,
  taken: ReadonlyMap<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const tool of surface.tools) {
    const hash = toolHash(serverId, tool);
    let major = 1;
    for (;;) {
      const ref = `${serverId}.${tool.name}@${major}`;
      const held = taken.get(ref);
      if (held === undefined || held === hash) {
        result[tool.name] = ref;
        break;
      }
      major += 1;
    }
  }
  return result;
}
