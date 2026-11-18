/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findRawColours, parseTokens } from "../kit/contrast.ts";
import { findCssImports } from "../ui/rules.ts";

function read(url: URL, label: string): string {
  assert.ok(existsSync(url), `${label} must exist`);
  return readFileSync(url, "utf8");
}

const APP_CSS_URL = new URL("./app.css", import.meta.url);
const TOKENS_URL = new URL("../kit/tokens.css", import.meta.url);
const MAIN_URL = new URL("../main.tsx", import.meta.url);
const VITE_CONFIG_URL = new URL("../../vite.config.ts", import.meta.url);

const IMPORTS = [
  '@import "tailwindcss" source("../");',
  '@import "../kit/tokens.css";',
  '@import "../kit/theme.css" layer(components);',
  '@import "../kit/data/data.css" layer(components);',
  '@import "../app/shell.css" layer(components);',
  '@import "../auth/auth.css" layer(components);',
  '@import "../admin/admin.css" layer(components);',
  '@import "../tools/tools.css" layer(components);',
  '@import "../flows/flows.css" layer(components);',
  '@import "../flow-graph/flow-graph.css" layer(components);',
  '@import "../flow-graph/hook-overlay.css" layer(components);',
  '@import "../runs/runs.css" layer(components);',
  '@import "../runs/hooks.css" layer(components);',
];

const BASE_RULES = [
  ":root { color-scheme: light; }",
  "body { background: var(--ui-color-bg); color: var(--ui-color-text); font-family: var(--ui-font-sans); }",
  "h1 { font-size: 1.5rem; font-weight: 600; }",
  "h2 { font-size: 1.25rem; font-weight: 600; }",
  "h3 { font-size: 1.0625rem; font-weight: 600; }",
  "a:not([class]) { color: var(--ui-color-accent); text-decoration: underline; }",
  "button:not([class]) { min-height: var(--ui-target-min); padding: var(--ui-space-2) var(--ui-space-3); border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius); background: var(--ui-color-surface); color: var(--ui-color-text); cursor: pointer; }",
  "dialog { margin: auto; }",
  "ul:not([class]) { list-style: disc; padding-left: 1.5rem; }",
  "ol:not([class]) { list-style: decimal; padding-left: 1.5rem; }",
];

test("C-c476cd94 app css keeps the thirteen imports in order", () => {
  const source = read(APP_CSS_URL, "app.css");
  const imports = source
    .split("\n")
    .filter((line) => line.trim().startsWith("@import"))
    .map((line) => line.trim());
  assert.deepEqual(imports, IMPORTS);
  const allowed = /^(?:@import\b|@theme inline \{$|@layer base \{$|\}$)/;
  for (const line of source.split("\n")) {
    if (line.trim() === "") continue;
    if (/^\s/.test(line)) continue;
    assert.match(line.trimEnd(), allowed, `top-level line: ${line}`);
  }
});

test("C-c476cd94 app css bridges every token and restores the base layer", () => {
  const source = read(APP_CSS_URL, "app.css");
  const tokensSource = read(TOKENS_URL, "tokens.css");
  const lines = source.split("\n").map((line) => line.trim());
  const count = (needle: string): number => lines.filter((line) => line === needle).length;

  assert.equal(count("--color-*: initial;"), 1);
  const colourTokens = Object.keys(parseTokens(tokensSource)).filter((name) =>
    name.startsWith("--ui-color-"),
  );
  assert.equal(colourTokens.length, 25);
  for (const name of colourTokens) {
    const short = name.slice("--ui-color-".length);
    assert.equal(count(`--color-${short}: var(${name});`), 1, name);
  }
  assert.equal(count("--font-sans: var(--ui-font-sans);"), 1);
  assert.equal(count("--font-mono: var(--ui-font-mono);"), 1);

  const baseIndex = source.indexOf("@layer base {");
  assert.ok(baseIndex >= 0, "app.css holds a base layer");
  const base = source.slice(baseIndex).replace(/\s+/g, " ");
  for (const rule of BASE_RULES) {
    assert.ok(base.includes(rule), `base layer holds ${rule}`);
  }
  assert.deepEqual(findRawColours(source), []);
});

test("C-c476cd94 main and vite config use one stylesheet and the tailwind plugin", () => {
  const main = read(MAIN_URL, "main.tsx");
  const hits = findCssImports(main);
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.text, 'import "./styles/app.css";');
  assert.equal(main.includes("kit/tokens.css"), false);

  const config = read(VITE_CONFIG_URL, "vite.config.ts");
  assert.ok(
    config.startsWith("// Build configuration for the web app (owner-maintained)."),
    "vite.config.ts keeps its first comment line",
  );
  assert.ok(config.includes('import tailwindcss from "@tailwindcss/vite";'));
  assert.ok(config.includes("plugins: [react(), tailwindcss()]"));
});
