// Pure source scanners and package lists for the design-system rule tests (design.md decision 6).
// This file is scanned by its own rules, so its patterns are built from strings.

import type { SourceHit } from "../kit/contrast.ts";

export const BANNED_PACKAGES: readonly string[] = [
  "@radix-ui/react-dialog",
  "@radix-ui/react-alert-dialog",
  "@radix-ui/react-select",
  "@radix-ui/react-context-menu",
  "@radix-ui/react-navigation-menu",
  "@radix-ui/react-toast",
  "@radix-ui/react-scroll-area",
  "radix-ui",
  "react-remove-scroll",
  "@radix-ui/themes",
  "@emotion/react",
  "@emotion/styled",
  "styled-components",
  "@mantine/core",
];

export const M6B_PACKAGES: Readonly<{
  dependencies: Readonly<Record<string, string>>;
  devDependencies: Readonly<Record<string, string>>;
}> = {
  dependencies: {
    "@radix-ui/react-slot": "1.5.0",
    "@radix-ui/react-collapsible": "1.2.1",
    "@radix-ui/react-tooltip": "1.4.1",
    "class-variance-authority": "0.7.1",
    clsx: "2.1.1",
    "tailwind-merge": "3.7.0",
    "lucide-react": "1.72.0",
  },
  devDependencies: { tailwindcss: "4.3.5", "@tailwindcss/vite": "4.3.5" },
};

const PREFIXES = [
  "(?:bg|text|border)(?:-[trblxyse])?",
  "ring(?:-offset)?",
  "(?:outline|fill|stroke|from|via|to|divide|decoration|accent|caret|placeholder|shadow)",
].join("|");

const PALETTE = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "white",
  "black",
].join("|");

const PALETTE_UTILITY = new RegExp(
  `(?<![\\w-])(?:${PREFIXES})-(?:${PALETTE})(?![A-Za-z])|-\\[(?:#|rgb\\(|hsl\\(|oklch\\(|color:)`,
);

const CSS_IMPORT = new RegExp(`\\b(?:from|import)\\s*\\(?\\s*(["'])[^"']*\\.css(?:\\?[^"']*)?\\1`);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
}

const BANNED_IMPORT = new RegExp(
  `\\b(?:from|import)\\s*\\(?\\s*(["'])(?:${BANNED_PACKAGES.map(escapeRegExp).join("|")})(?:/[^"']*)?\\1`,
);

function scan(source: string, pattern: RegExp): SourceHit[] {
  const hits: SourceHit[] = [];
  source.split("\n").forEach((text, index) => {
    if (pattern.test(text)) hits.push({ line: index + 1, text: text.trim() });
  });
  return hits;
}

export function findPaletteUtilities(source: string): SourceHit[] {
  return scan(source, PALETTE_UTILITY);
}

export function findCssImports(source: string): SourceHit[] {
  return scan(source, CSS_IMPORT);
}

export function findBannedImports(source: string): SourceHit[] {
  return scan(source, BANNED_IMPORT);
}
