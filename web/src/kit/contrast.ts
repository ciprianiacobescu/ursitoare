import { KitError } from "./errors.ts";

export type StringMap = Readonly<Record<string, string>>;

export interface ContrastPair {
  id: string;
  fg: string;
  bg: string;
  min: number;
}

export interface ContrastFailure {
  id: string;
  ratio: number;
  min: number;
}

export interface SourceHit {
  line: number;
  text: string;
}

function pair(fg: string, bg: string, min: number): ContrastPair {
  return {
    id: `${fg.replace("--ui-color-", "")}-on-${bg.replace("--ui-color-", "")}`,
    fg,
    bg,
    min,
  };
}

export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  pair("--ui-color-text", "--ui-color-bg", 4.5),
  pair("--ui-color-text", "--ui-color-surface", 4.5),
  pair("--ui-color-text-muted", "--ui-color-bg", 4.5),
  pair("--ui-color-text-muted", "--ui-color-surface", 4.5),
  pair("--ui-color-on-accent", "--ui-color-accent", 4.5),
  pair("--ui-color-on-danger", "--ui-color-danger", 4.5),
  pair("--ui-color-danger", "--ui-color-bg", 4.5),
  pair("--ui-color-danger-text", "--ui-color-danger-surface", 4.5),
  pair("--ui-color-success-text", "--ui-color-success-surface", 4.5),
  pair("--ui-color-info-text", "--ui-color-info-surface", 4.5),
  pair("--ui-color-toast-text", "--ui-color-toast-bg", 4.5),
  pair("--ui-color-accent", "--ui-color-bg", 4.5),
  pair("--ui-color-border", "--ui-color-bg", 3),
  pair("--ui-color-border", "--ui-color-surface", 3),
  pair("--ui-color-focus", "--ui-color-bg", 3),
  pair("--ui-color-focus", "--ui-color-surface", 3),
];

export function parseHexColour(text: string): [number, number, number] | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(text);
  if (!match) return null;
  const hex = match[1];
  if (hex === undefined) return null;
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function channelLuminance(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(colour: [number, number, number]): number {
  const [red, green, blue] = colour;
  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  );
}

export function contrastRatio(foreground: string, background: string): number {
  const fg = parseHexColour(foreground);
  const bg = parseHexColour(background);
  if (!fg) {
    throw new KitError("KIT_TOKEN_INVALID", `Not a six-digit hex colour: ${foreground}`);
  }
  if (!bg) {
    throw new KitError("KIT_TOKEN_INVALID", `Not a six-digit hex colour: ${background}`);
  }
  const fgLuminance = luminance(fg);
  const bgLuminance = luminance(bg);
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ""));
}

export function parseTokens(css: string): StringMap {
  const tokens: Record<string, string> = {};
  for (const match of stripComments(css).matchAll(/--([A-Za-z0-9_-]+)\s*:\s*([^;]+);/g)) {
    const name = match[1];
    const value = match[2];
    if (name === undefined || value === undefined) continue;
    tokens[`--${name}`] = value.trim();
  }
  return tokens;
}

export function checkTokenContrast(
  tokens: StringMap,
  pairs: readonly ContrastPair[] = CONTRAST_PAIRS,
): ContrastFailure[] {
  const failures: ContrastFailure[] = [];
  for (const item of pairs) {
    const foreground = tokens[item.fg];
    const background = tokens[item.bg];
    let ratio = 0;
    if (
      foreground !== undefined &&
      background !== undefined &&
      parseHexColour(foreground) !== null &&
      parseHexColour(background) !== null
    ) {
      ratio = contrastRatio(foreground, background);
    }
    if (ratio < item.min) {
      failures.push({ id: item.id, ratio, min: item.min });
    }
  }
  return failures;
}

const RAW_COLOUR_FUNCTION =
  /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\s*\(/i;
const RAW_HEX = /#[0-9a-fA-F]{3,8}\b/;
const RAW_NAME =
  /\b(?:white|black|red|green|blue|yellow|orange|purple|gray|grey)\b/i;

function isCustomPropertyLine(line: string): boolean {
  return /^--[A-Za-z0-9_-]+\s*:/.test(line);
}

function withoutPropertyNames(line: string): string {
  return line.replace(/(^|[{;])\s*[A-Za-z-]+\s*:/g, "$1");
}

export function findRawColours(css: string): SourceHit[] {
  const hits: SourceHit[] = [];
  const lines = stripComments(css).split("\n");
  for (const [index, line] of lines.entries()) {
    const text = line.trim();
    if (text === "") continue;
    if (isCustomPropertyLine(text)) continue;
    if (
      RAW_HEX.test(text) ||
      RAW_COLOUR_FUNCTION.test(text) ||
      RAW_NAME.test(withoutPropertyNames(text))
    ) {
      hits.push({ line: index + 1, text });
    }
  }
  return hits;
}

const INLINE_STYLE = /style=|<style|setAttribute\(["']style["']/;

export function findInlineStyleUse(source: string): SourceHit[] {
  const hits: SourceHit[] = [];
  for (const [index, line] of source.split("\n").entries()) {
    if (INLINE_STYLE.test(line)) {
      hits.push({ line: index + 1, text: line.trim() });
    }
  }
  return hits;
}
