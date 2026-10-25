// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { E2eStackPart } from "./part.ts";

export const PARTS_DIR: string = "";

export const PART_FILE_PATTERN: RegExp = /(?!)/;

export function discoverParts(_dir?: string): Promise<E2eStackPart[]> {
  throw new Error("not implemented");
}
