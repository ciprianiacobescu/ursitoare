/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import type { StringMap } from "../kit/contrast.ts";
import { findInlineStyleUse, findRawColours, parseTokens } from "../kit/contrast.ts";
import { findBannedImports, findCssImports, findPaletteUtilities } from "../ui/rules.ts";

assert.equal(typeof findRawColours, "function");
assert.equal(typeof findInlineStyleUse, "function");
assert.equal(typeof parseTokens, "function");
assert.equal(typeof findBannedImports, "function");
assert.equal(typeof findCssImports, "function");
assert.equal(typeof findPaletteUtilities, "function");

const RUNS_CSS_URL = new URL("./runs.css", import.meta.url);
const TOKENS_CSS_URL = new URL("../kit/tokens.css", import.meta.url);
const RUN_PAGE_URL = new URL("./RunPage.tsx", import.meta.url);
const RUN_VIEW_URL = new URL("./run-view.ts", import.meta.url);

const RUN_PAGE_MUST_CONTAIN = [
  "aria-expanded",
  "aria-controls",
  'aria-label="Policy decisions"',
  "Try again",
  '<p role="status" aria-label="Run state" data-tone={header.tone}',
  "<PageHeader",
  '<Section title="Timeline"',
  '<Section title="Step details"',
  '<Section title="Policy decisions"',
  '<Section title="Input"',
  '<Section title="Output"',
  '<Section title="Hooks"',
  "createPreviewQueue(",
  "previewRefs(",
  "useDisplayNames(",
  "runHeaderView(",
  "stepRowViews(",
  "detailCell(",
  '<p className="runs-preview">',
  "<Tooltip content={header.started}>",
  "dateTime={header.startedIso}",
  "<time dateTime={cell.iso} title={cell.iso}>",
] as const;

const RUN_PAGE_MUST_NOT_CONTAIN = [
  'role="alert"',
  '.css"',
  "dangerouslySetInnerHTML",
  "style=",
  "disabled",
] as const;

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

interface Rule {
  readonly selector: string;
  readonly body: string;
}

const TONE_RULES = [
  { tone: "quiet", selector: ".runs-state" },
  { tone: "info", selector: '.runs-state[data-tone="info"]' },
  { tone: "success", selector: '.runs-state[data-tone="success"]' },
  { tone: "warning", selector: '.runs-state[data-tone="warning"]' },
  { tone: "danger", selector: '.runs-state[data-tone="danger"]' },
] as const;

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function readSource(url: URL): string {
  assert.ok(existsSync(url), `${url.pathname} must exist`);
  return readFileSync(url, "utf8");
}

function rules(css: string): Rule[] {
  const found: Rule[] = [];
  for (const match of stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = (match[1] ?? "").trim().replace(/\s+/g, " ");
    const body = match[2] ?? "";
    if (selector.length > 0) found.push({ selector, body });
  }
  return found;
}

function declarations(body: string): Map<string, string> {
  const declared = new Map<string, string>();
  for (const piece of body.split(";")) {
    const colon = piece.indexOf(":");
    if (colon === -1) continue;
    declared.set(
      piece.slice(0, colon).trim().toLowerCase(),
      piece.slice(colon + 1).trim().replace(/\s+/g, " "),
    );
  }
  return declared;
}

function ruleFor(css: string, selector: string): Rule {
  const found = rules(css).filter((rule) => rule.selector === selector);
  assert.equal(found.length, 1, `one rule for ${selector}`);
  const rule = found[0];
  assert.ok(rule !== undefined, `the rule for ${selector} was found`);
  return rule;
}

function mediaBlock(css: string, query: string): string | null {
  const text = stripComments(css);
  const start = text.indexOf(query);
  if (start < 0) return null;
  const open = text.indexOf("{", start);
  if (open < 0) return null;
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    const character = text[index];
    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, index);
    }
  }
  return null;
}

function tokenNames(css: string): Set<string> {
  const names = new Set<string>();
  for (const match of stripComments(css).matchAll(/var\((--[A-Za-z0-9-]+)\)/g)) {
    const name = match[1];
    if (name !== undefined) names.add(name);
  }
  return names;
}

function runsCssProblems(css: string, tokens: StringMap): string[] {
  const problems: string[] = [];
  if (findRawColours(css).length > 0) problems.push("a raw colour");
  if (findInlineStyleUse(css).length > 0) problems.push("an inline style");
  if (stripComments(css).includes(".runs-section")) problems.push(".runs-section is gone");

  const parsed = rules(css);
  const selectors = parsed
    .map((rule) => rule.selector)
    .filter((selector) => selector.startsWith(".runs-state"))
    .sort();
  const expected = TONE_RULES.map((rule) => rule.selector).sort();
  if (selectors.join("|") !== expected.join("|")) problems.push("the five state rules");

  for (const { tone, selector } of TONE_RULES) {
    const candidates = parsed.filter((rule) => rule.selector === selector);
    if (candidates.length !== 1) {
      problems.push(`${selector} is one rule`);
      continue;
    }
    const declared = declarations(candidates[0]?.body ?? "");
    if (declared.get("background") !== `var(--ui-color-${tone}-surface)`) {
      problems.push(`${selector} sits on its surface`);
    }
    if (declared.get("color") !== `var(--ui-color-${tone}-text)`) {
      problems.push(`${selector} uses its text colour`);
    }
  }

  const media = mediaBlock(css, "@media (min-width: 80rem)");
  if (
    media === null ||
    !media
      .replace(/\s+/g, " ")
      .includes("grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);")
  ) {
    problems.push("two equal columns from 80rem");
  }

  for (const name of tokenNames(css)) {
    if (!Object.hasOwn(tokens, name)) problems.push(`unknown token ${name}`);
  }
  return problems;
}

test("C-f21e5186 runs css paints the five state tones and takes the two-column layout", () => {
  const css = readSource(RUNS_CSS_URL);

  for (const { tone, selector } of TONE_RULES) {
    const declared = declarations(ruleFor(css, selector).body);
    assert.equal(
      declared.get("background"),
      `var(--ui-color-${tone}-surface)`,
      `${selector} sits on its surface`,
    );
    assert.equal(
      declared.get("color"),
      `var(--ui-color-${tone}-text)`,
      `${selector} uses its text colour`,
    );
  }

  const media = mediaBlock(css, "@media (min-width: 80rem)");
  assert.ok(media !== null, "the 80rem media query exists");
  assert.ok(
    (media ?? "")
      .replace(/\s+/g, " ")
      .includes("grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);"),
    "the 80rem media query makes two equal columns",
  );

  assert.equal(stripComments(css).includes(".runs-section"), false, ".runs-section is gone");
});

test("C-f21e5186 runs css uses only kit tokens and the three mutated copies fail", () => {
  const css = readSource(RUNS_CSS_URL);
  const tokens = parseTokens(readSource(TOKENS_CSS_URL));

  assert.deepEqual(findRawColours(css), [], "runs.css holds no raw colour");
  assert.deepEqual(findInlineStyleUse(css), [], "runs.css uses no inline style");

  const names = tokenNames(css);
  assert.equal(names.size, 25, "runs.css uses twenty-five distinct kit tokens");
  for (const name of names) {
    assert.ok(Object.hasOwn(tokens, name), `${name} is defined by tokens.css`);
  }
  for (const name of [
    "--ui-color-quiet-surface",
    "--ui-color-quiet-text",
    "--ui-color-warning-surface",
    "--ui-color-warning-text",
  ]) {
    assert.ok(names.has(name), `${name} is used`);
  }

  assert.deepEqual(runsCssProblems(css, tokens), [], "the real stylesheet passes the check");

  const rawColour = `${css}\n.runs-mutated {\n  color: #fff;\n}\n`;
  assert.notDeepEqual(runsCssProblems(rawColour, tokens), [], "a raw colour fails the check");

  const missingToken = `${css}\n.runs-mutated {\n  color: var(--ui-color-missing);\n}\n`;
  assert.notDeepEqual(
    runsCssProblems(missingToken, tokens),
    [],
    "an unknown token fails the check",
  );

  const swapped = css.replace(
    /\.runs-state\[data-tone="success"\]\s*\{[^}]*\}/,
    (block) => block.replace("var(--ui-color-success-surface)", "var(--ui-color-info-surface)"),
  );
  assert.notDeepEqual(
    runsCssProblems(swapped, tokens),
    [],
    "the success rule with the info surface fails the check",
  );
});

test("C-f21e5186 run page keeps its pins and holds the new parts", () => {
  const source = readSource(RUN_PAGE_URL);

  for (const text of RUN_PAGE_MUST_CONTAIN) {
    assert.ok(source.includes(text), `RunPage.tsx contains ${text}`);
  }

  for (const text of RUN_PAGE_MUST_NOT_CONTAIN) {
    assert.equal(source.includes(text), false, `RunPage.tsx does not contain ${text}`);
  }
});

test("C-f21e5186 run page steps hold one named button and the scanners stay clean", () => {
  const source = readSource(RUN_PAGE_URL);

  const open = source.indexOf('<ol className="runs-steps"');
  assert.ok(open >= 0, "RunPage.tsx holds the Steps list");
  const close = source.indexOf("</ol>", open);
  assert.ok(close > open, "the Steps list is closed");
  const steps = source.slice(open, close);
  assert.equal(count(steps, "<button"), 1, "the Steps list holds one button");
  assert.match(steps, /\{row\.nodeId\}\s*<\/button>/, "the node button is named by row nodeId");
  assert.equal(count(source, "<button"), 3, "the run page holds three buttons");

  const runView = readSource(RUN_VIEW_URL);
  for (const [name, sourceText] of [
    ["RunPage.tsx", source],
    ["run-view.ts", runView],
  ] as const) {
    assert.deepEqual(findInlineStyleUse(sourceText), [], `${name} uses no inline style`);
    assert.deepEqual(findPaletteUtilities(sourceText), [], `${name} uses no palette utility`);
    assert.deepEqual(findCssImports(sourceText), [], `${name} imports no stylesheet`);
    assert.deepEqual(findBannedImports(sourceText), [], `${name} imports no banned package`);
  }
});
