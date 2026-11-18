/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { CONTRAST_PAIRS, checkTokenContrast, contrastRatio, parseTokens } from "./contrast.ts";
import { EXTRA_CONTRAST_PAIRS } from "./extra-contrast.ts";

assert.equal(typeof checkTokenContrast, "function");

const TOKENS_URL = new URL("./tokens.css", import.meta.url);

function realTokens(): Record<string, string> {
  assert.ok(existsSync(TOKENS_URL), "tokens.css must exist");
  return { ...parseTokens(readFileSync(TOKENS_URL, "utf8")) };
}

const IDS = [
  "warning-text-on-warning-surface",
  "quiet-text-on-quiet-surface",
  "accent-on-accent-surface",
  "text-on-sidebar",
  "text-muted-on-sidebar",
  "accent-on-sidebar",
  "border-on-sidebar",
  "focus-on-sidebar",
  "focus-on-accent-surface",
];
const MINS = [4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 3, 3, 3];
const RATIOS = [7.21, 9.49, 6.08, 14.46, 6.86, 5.87, 3.3, 5.87, 6.08];

test("C-52eda073 the nine extra pairs keep their ids, order and minimums", () => {
  assert.deepEqual(
    EXTRA_CONTRAST_PAIRS.map((p) => p.id),
    IDS,
  );
  assert.deepEqual(
    EXTRA_CONTRAST_PAIRS.map((p) => p.min),
    MINS,
  );
});

test("C-52eda073 the real tokens pass the nine pairs with the listed ratios", () => {
  const tokens = realTokens();
  assert.deepEqual(checkTokenContrast(tokens, EXTRA_CONTRAST_PAIRS), []);
  assert.deepEqual(checkTokenContrast(tokens, CONTRAST_PAIRS), []);
  assert.equal(EXTRA_CONTRAST_PAIRS.length, 9);
  EXTRA_CONTRAST_PAIRS.forEach((p, i) => {
    const fg = tokens[p.fg];
    const bg = tokens[p.bg];
    assert.ok(fg !== undefined && bg !== undefined, `${p.id} tokens exist`);
    const expected = RATIOS[i] ?? 0;
    assert.ok(Math.abs(contrastRatio(fg, bg) - expected) <= 0.01, p.id);
  });
});

test("C-52eda073 the new token values are present and all colours are hex", () => {
  const tokens = realTokens();
  const expected: Record<string, string> = {
    "--ui-color-warning-surface": "#fffaeb",
    "--ui-color-warning-text": "#93370d",
    "--ui-color-quiet-surface": "#f2f4f7",
    "--ui-color-quiet-text": "#344054",
    "--ui-color-accent-surface": "#eff4ff",
    "--ui-color-sidebar": "#eef0f3",
    "--ui-color-divider": "#d0d5dd",
    "--ui-font-mono": "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    "--ui-radius-lg": "0.5rem",
    "--ui-shadow-sm": "0 1px 2px #1b1f2714",
    "--ui-sidebar-width": "15rem",
    "--ui-banner-height": "3.5rem",
    "--ui-font-sans": 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    "--ui-color-toast-bg": "#1b1f27",
  };
  for (const [name, value] of Object.entries(expected)) {
    assert.equal(tokens[name], value, name);
  }
  const colours = Object.entries(tokens).filter(([name]) => name.startsWith("--ui-color-"));
  assert.equal(colours.length, 25);
  for (const [name, value] of colours) {
    assert.match(value, /^#[0-9a-f]{6}$/, name);
  }
});

test("C-52eda073 a weak quiet-text fails only its own pair", () => {
  const tokens = { ...realTokens(), "--ui-color-quiet-text": "#999999" };
  const failures = checkTokenContrast(tokens, EXTRA_CONTRAST_PAIRS);
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.id, "quiet-text-on-quiet-surface");
  assert.equal(failures[0]?.min, 4.5);
  assert.ok((failures[0]?.ratio ?? 99) < 4.5);
});

test("C-52eda073 a missing sidebar gives five zero-ratio failures", () => {
  const tokens = { ...realTokens() };
  delete tokens["--ui-color-sidebar"];
  const failures = checkTokenContrast(tokens, EXTRA_CONTRAST_PAIRS);
  assert.deepEqual(
    failures.map((f) => f.id),
    [
      "text-on-sidebar",
      "text-muted-on-sidebar",
      "accent-on-sidebar",
      "border-on-sidebar",
      "focus-on-sidebar",
    ],
  );
  assert.ok(failures.every((f) => f.ratio === 0));
});

test("C-52eda073 a named accent-surface fails its two pairs with ratio 0", () => {
  const tokens = { ...realTokens(), "--ui-color-accent-surface": "blue" };
  const failures = checkTokenContrast(tokens, EXTRA_CONTRAST_PAIRS);
  assert.deepEqual(
    failures.map((f) => f.id),
    ["accent-on-accent-surface", "focus-on-accent-surface"],
  );
  assert.ok(failures.every((f) => f.ratio === 0));
});
