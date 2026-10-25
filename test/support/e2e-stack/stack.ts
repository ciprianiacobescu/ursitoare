// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { E2eStackPart, PartHandle } from "./part.ts";

export { PARTS_DIR, PART_FILE_PATTERN, discoverParts } from "./discover.ts";

export const DEFAULT_PORT: number = 0;

export const DEFAULT_CONTROL_PORT: number = 0;

export type E2eStack = Readonly<{
  url: string;
  controlUrl: string;
  handles: ReadonlyMap<string, PartHandle>;
  close(): Promise<void>;
}>;

export function startE2eStack(_opts?: {
  port?: number;
  controlPort?: number;
  dataDir?: string;
  parts?: readonly E2eStackPart[];
  log?: boolean;
}): Promise<E2eStack> {
  throw new Error("not implemented");
}
