import type { BlockDef, Catalogue } from "../format/index.ts";

/** Look up a block tool by its versioned ref; a non-string ref is unknown. */
export function describeTool(catalogue: Catalogue, ref: unknown): BlockDef | undefined {
  if (typeof ref !== "string") return undefined;
  return catalogue.block(ref);
}
