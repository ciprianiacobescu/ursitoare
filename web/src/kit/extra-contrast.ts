import type { ContrastPair } from "./contrast.ts";

function pair(fg: string, bg: string, min: number): ContrastPair {
  return {
    id: `${fg.replace("--ui-color-", "")}-on-${bg.replace("--ui-color-", "")}`,
    fg,
    bg,
    min,
  };
}

export const EXTRA_CONTRAST_PAIRS: readonly ContrastPair[] = [
  pair("--ui-color-warning-text", "--ui-color-warning-surface", 4.5),
  pair("--ui-color-quiet-text", "--ui-color-quiet-surface", 4.5),
  pair("--ui-color-accent", "--ui-color-accent-surface", 4.5),
  pair("--ui-color-text", "--ui-color-sidebar", 4.5),
  pair("--ui-color-text-muted", "--ui-color-sidebar", 4.5),
  pair("--ui-color-accent", "--ui-color-sidebar", 4.5),
  pair("--ui-color-border", "--ui-color-sidebar", 3),
  pair("--ui-color-focus", "--ui-color-sidebar", 3),
  pair("--ui-color-focus", "--ui-color-accent-surface", 3),
];
