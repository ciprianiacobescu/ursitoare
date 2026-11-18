// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { SourceHit } from "../kit/contrast.ts";

export const BANNED_PACKAGES: readonly string[] = [];

export const M6B_PACKAGES: Readonly<{
  dependencies: Readonly<Record<string, string>>;
  devDependencies: Readonly<Record<string, string>>;
}> = { dependencies: {}, devDependencies: {} };

export function findPaletteUtilities(_source: string): SourceHit[] {
  return [];
}

export function findCssImports(_source: string): SourceHit[] {
  return [];
}

export function findBannedImports(_source: string): SourceHit[] {
  return [];
}
