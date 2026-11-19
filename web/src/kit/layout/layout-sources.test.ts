/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse } from "../contrast.ts";

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function names(dir: string): string[] {
  return readdirSync(new URL(dir, import.meta.url)).sort();
}

test("C-dac61932 the layout sources hold no landmark role link or inline style", () => {
  const header = read("./PageHeader.tsx");
  const section = read("./Section.tsx");
  for (const text of [header, section]) {
    for (const banned of ["role=", "aria-live", "<header", "<nav", "<a ", ".css"]) {
      assert.equal(text.includes(banned), false, banned);
    }
    assert.deepEqual(findInlineStyleUse(text), []);
  }
  assert.ok(
    header.includes(
      '<h1 className="ui-page-header-title" tabIndex={-1} ref={props.headingRef}>',
    ),
  );
  assert.ok(section.includes("aria-labelledby={headingId}"));
  assert.ok(section.includes("useId()"));
  assert.ok(section.includes('cn("ui-section", props.className)'));
  assert.ok(section.includes('import { cn } from "../../ui/cn.ts";'));

  assert.deepEqual(
    names("../").filter((name) => name.endsWith(".tsx")),
    ["ConfirmDialog.tsx", "EmptyState.tsx", "ErrorPanel.tsx", "LoadingState.tsx", "ToastRegion.tsx"],
  );
  assert.deepEqual(
    names("./").filter((name) => !name.includes(".test.")),
    ["PageHeader.tsx", "Section.tsx", "layout.ts"],
  );
});
