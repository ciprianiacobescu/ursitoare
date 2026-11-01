/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse } from "../kit/contrast.ts";
import { FLOW_PAGES, flowFeatureLiterals } from "./pages.ts";

assert.equal(typeof flowFeatureLiterals, "function");
assert.equal(typeof findInlineStyleUse, "function");

const FEATURE_URL = new URL("../features/71-flow-editor.tsx", import.meta.url);
const FLOWS_DIR = new URL("./", import.meta.url);
const FEATURE_70_URL = new URL("../features/70-flows.tsx", import.meta.url);
const MOUNT_URL = new URL("./editor-mount.ts", import.meta.url);
const PAGE_URL = new URL("./FlowEditorPage.tsx", import.meta.url);
const EDITOR_URL = new URL("./CodeEditor.tsx", import.meta.url);

test("C-1f5393c5: the editor feature file declares the second page", () => {
  assert.equal(existsSync(FEATURE_URL), true);
  const literals = flowFeatureLiterals(existsSync(FEATURE_URL) ? readFileSync(FEATURE_URL, "utf8") : "");
  assert.deepEqual(literals, {
    id: FLOW_PAGES[1]?.id,
    path: FLOW_PAGES[1]?.path,
    navLabel: FLOW_PAGES[1]?.navLabel,
    capability: FLOW_PAGES[1]?.capability,
  });
});

test("C-84837cec: the editor sources use no inline style, nonce, eval or raw html", () => {
  assert.equal(existsSync(FEATURE_URL), true);
  const urls = [
    MOUNT_URL,
    FEATURE_70_URL,
    FEATURE_URL,
    ...readdirSync(FLOWS_DIR)
      .filter((name) => name.endsWith(".tsx"))
      .map((name) => new URL(name, FLOWS_DIR)),
  ];
  for (const url of urls) {
    if (!existsSync(url)) continue;
    const source = readFileSync(url, "utf8");
    assert.deepEqual(findInlineStyleUse(source), [], `${url.pathname} has no inline style`);
    for (const banned of ["cspNonce", "unsafe-inline", "eval(", "dangerouslySetInnerHTML"]) {
      assert.equal(source.includes(banned), false, `${url.pathname} lacks ${banned}`);
    }
    assert.equal(source.includes("not implemented"), false, `${url.pathname} is implemented`);
  }
});

test("C-84837cec: the editor page opens links safely and the editor mounts in the shadow root", () => {
  const page = readFileSync(PAGE_URL, "utf8");
  assert.equal(page.includes('rel="noopener noreferrer"'), true);
  const editor = readFileSync(EDITOR_URL, "utf8");
  assert.equal(editor.includes("mountEditor("), true);
  const mount = readFileSync(MOUNT_URL, "utf8");
  assert.equal(mount.includes('attachShadow({ mode: "open" })'), true);
});

test("C-159129bd: the editor page reads the panels only while rendering", () => {
  const source = readFileSync(PAGE_URL, "utf8");
  const start = source.indexOf("function FlowEditorPage(");
  assert.notEqual(start, -1);
  const calls = [...source.matchAll(/listEditorPanels\(/g)].map((m) => m.index ?? -1);
  assert.equal(calls.length >= 1, true);
  for (const at of calls) {
    assert.equal(at > start, true);
  }
});
