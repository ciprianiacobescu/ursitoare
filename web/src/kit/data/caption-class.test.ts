/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { captionClass } from "./data-table.ts";

const TABLE_SOURCE = readFileSync(new URL("./DataTable.tsx", import.meta.url), "utf8");
const THEME = readFileSync(new URL("../theme.css", import.meta.url), "utf8");

test("C-97684e64 captionClass gives the visible and hidden class strings", () => {
  assert.equal(typeof captionClass, "function");
  assert.equal(captionClass(undefined), "ui-table-caption");
  assert.equal(captionClass("visible"), "ui-table-caption");
  assert.equal(captionClass("hidden"), "ui-table-caption ui-visually-hidden");
});

test("C-97684e64 DataTable writes the caption class and keeps both aria labels", () => {
  assert.equal(typeof captionClass, "function");
  assert.ok(TABLE_SOURCE.includes('captionDisplay?: "visible" | "hidden";'));
  assert.ok(
    TABLE_SOURCE.includes(
      "<caption className={captionClass(props.captionDisplay)}>{model.caption}</caption>",
    ),
  );
  assert.equal(TABLE_SOURCE.split("aria-label={model.caption}").length - 1, 2);
  const hidden = THEME.split(/\.ui-visually-hidden\s*\{/).length - 1;
  assert.equal(hidden, 1);
  assert.match(THEME, /\.ui-visually-hidden\s*\{[^}]*position:\s*absolute/);
});
