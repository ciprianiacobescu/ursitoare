/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

import {
  CONTRAST_PAIRS,
  checkTokenContrast,
  contrastRatio,
  findInlineStyleUse,
  findRawColours,
  parseHexColour,
  parseTokens,
} from "./contrast.ts";
import { KitError } from "./errors.ts";

assert.equal(typeof contrastRatio, "function");

const KIT_DIR = new URL("./", import.meta.url);
const WEB_SRC_DIR = new URL("../", KIT_DIR);
const WEB_INDEX_HTML = new URL("../../index.html", KIT_DIR);

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value;
}

function readKitFile(name: string): string {
  const url = new URL(name, KIT_DIR);
  assert.ok(existsSync(url), `${name} must exist`);
  return readFileSync(url, "utf8");
}

function tsxFilesUnder(dir: URL): URL[] {
  const found: URL[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dir);
    if (entry.isDirectory()) {
      found.push(...tsxFilesUnder(child));
    } else if (entry.name.endsWith(".tsx")) {
      found.push(child);
    }
  }
  return found;
}

function closeTo(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) <= 0.01, `${actual} is within 0.01 of ${expected}`);
}

test("C-cb608bfb contrast maths and colour parsing", () => {
  assert.equal(typeof parseHexColour, "function");

  closeTo(call(() => contrastRatio("#000000", "#ffffff")), 21);
  closeTo(call(() => contrastRatio("#767676", "#ffffff")), 4.54);
  closeTo(call(() => contrastRatio("#777777", "#ffffff")), 4.48);
  closeTo(call(() => contrastRatio("#ffffff", "#000000")), 21);

  assert.deepEqual(call(() => parseHexColour("#1B1F27")), [27, 31, 39]);
  assert.equal(call(() => parseHexColour("#fff")), null);
  assert.equal(call(() => parseHexColour("red")), null);
  assert.equal(call(() => parseHexColour("#12345")), null);

  assert.throws(
    () => contrastRatio("red", "#ffffff"),
    (error: unknown) => error instanceof KitError && error.code === "KIT_TOKEN_INVALID",
  );
});

test("C-16a71639 the real tokens meet WCAG AA", () => {
  const tokens = call(() => parseTokens(readKitFile("tokens.css")));

  const expected = [
    ["--ui-color-text", "--ui-color-bg", 4.5],
    ["--ui-color-text", "--ui-color-surface", 4.5],
    ["--ui-color-text-muted", "--ui-color-bg", 4.5],
    ["--ui-color-text-muted", "--ui-color-surface", 4.5],
    ["--ui-color-on-accent", "--ui-color-accent", 4.5],
    ["--ui-color-on-danger", "--ui-color-danger", 4.5],
    ["--ui-color-danger", "--ui-color-bg", 4.5],
    ["--ui-color-danger-text", "--ui-color-danger-surface", 4.5],
    ["--ui-color-success-text", "--ui-color-success-surface", 4.5],
    ["--ui-color-info-text", "--ui-color-info-surface", 4.5],
    ["--ui-color-toast-text", "--ui-color-toast-bg", 4.5],
    ["--ui-color-accent", "--ui-color-bg", 4.5],
    ["--ui-color-border", "--ui-color-bg", 3],
    ["--ui-color-border", "--ui-color-surface", 3],
    ["--ui-color-focus", "--ui-color-bg", 3],
    ["--ui-color-focus", "--ui-color-surface", 3],
  ];

  assert.equal(CONTRAST_PAIRS.length, 16, "there are sixteen contrast pairs");
  assert.deepEqual(
    CONTRAST_PAIRS.map((pair) => [pair.fg, pair.bg, pair.min]),
    expected,
    "the pairs are the design decision order",
  );
  for (const pair of CONTRAST_PAIRS) {
    const foreground = pair.fg.replace("--ui-color-", "");
    const background = pair.bg.replace("--ui-color-", "");
    assert.equal(pair.id, `${foreground}-on-${background}`);
  }
  assert.equal(CONTRAST_PAIRS[0]?.id, "text-on-bg");
  assert.equal(CONTRAST_PAIRS.at(-1)?.id, "focus-on-surface");

  assert.deepEqual(call(() => checkTokenContrast(tokens)), [], "every real pair passes");

  for (const [name, value] of Object.entries(tokens)) {
    if (name.startsWith("--ui-color-")) {
      assert.match(value, /^#[0-9a-fA-F]{6}$/, `${name} is a six-digit hex colour`);
    }
  }
});

test("C-4f003820 a weak, missing or malformed token is reported", () => {
  const tokens = call(() => parseTokens(readKitFile("tokens.css")));

  const weak = call(() => checkTokenContrast({ ...tokens, "--ui-color-text": "#777777" }));
  assert.deepEqual(
    weak.map((failure) => failure.id),
    ["text-on-bg", "text-on-surface"],
  );
  for (const failure of weak) {
    assert.equal(failure.min, 4.5);
    assert.ok(failure.ratio < 4.5, "the ratio is below the minimum");
  }

  const { "--ui-color-focus": _removed, ...withoutFocus } = tokens;
  const missing = call(() => checkTokenContrast(withoutFocus));
  assert.deepEqual(
    missing.map((failure) => failure.id),
    ["focus-on-bg", "focus-on-surface"],
  );
  for (const failure of missing) {
    assert.equal(failure.min, 3);
    assert.equal(failure.ratio, 0);
  }

  const malformed = call(() => checkTokenContrast({ ...tokens, "--ui-color-border": "red" }));
  assert.deepEqual(
    malformed.map((failure) => failure.id),
    ["border-on-bg", "border-on-surface"],
  );
  for (const failure of malformed) {
    assert.equal(failure.min, 3);
    assert.equal(failure.ratio, 0);
  }
});

test("C-92d9ac35 the theme uses only tokens", () => {
  const theme = readKitFile("theme.css");

  assert.deepEqual(call(() => findRawColours(theme)), [], "the theme holds no raw colour");
  for (const needle of [
    ":focus-visible",
    "prefers-reduced-motion",
    ".ui-empty",
    ".ui-loading",
    ".ui-error",
    ".ui-dialog",
    ".ui-toasts",
    ".ui-toast",
  ]) {
    assert.ok(theme.includes(needle), `theme.css holds ${needle}`);
  }

  const sample = [
    "a { color: #fff; }",
    "b { background: rgb(0 0 0); }",
    "/* #123 */",
    "  --x: #000;",
    "  color: var(--ui-color-text);",
  ].join("\n");

  assert.deepEqual(call(() => findRawColours(sample)), [
    { line: 1, text: "a { color: #fff; }" },
    { line: 2, text: "b { background: rgb(0 0 0); }" },
  ]);
});

test("C-d365d748 the web sources have no inline styles", () => {
  const sample = [
    "<p style={{ color: 'red' }}>x</p>",
    "<style>a{}</style>",
    "el.setAttribute('style', 'a')",
    '<p className="a">x</p>',
  ].join("\n");

  assert.deepEqual(
    call(() => findInlineStyleUse(sample)).map((hit) => hit.line),
    [1, 2, 3],
  );

  const files = [...tsxFilesUnder(WEB_SRC_DIR), WEB_INDEX_HTML];
  assert.ok(files.length > 0, "the web sources were found");
  for (const file of files) {
    assert.ok(existsSync(file), `${file.pathname} must exist`);
    const hits = call(() => findInlineStyleUse(readFileSync(file, "utf8")));
    assert.deepEqual(hits, [], `${file.pathname} has no inline style`);
  }
});
