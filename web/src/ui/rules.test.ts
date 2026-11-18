import assert from "node:assert/strict";
import { test } from "node:test";

import { findBannedImports, findCssImports, findPaletteUtilities } from "./rules.ts";

const arbitrary = (prefix: string, value: string): string => [prefix, value].join("-");

test("C-d77fa65f palette utilities: hits and misses", () => {
  assert.equal(typeof findPaletteUtilities, "function");
  const hits = (source: string) => findPaletteUtilities(source);
  assert.deepEqual(hits('<p className="bg-white text-red-600">'), [
    { line: 1, text: '<p className="bg-white text-red-600">' },
  ]);
  assert.equal(hits('className="hover:bg-slate-50 md:text-black/50"').length, 1);
  assert.equal(hits(`className="${arbitrary("bg", "[#ff0000]")}"`).length, 1);
  assert.equal(hits(`x ${arbitrary("text", "[rgb(1 2 3)]")}`).length, 1);
  assert.equal(hits(`x ${arbitrary("border", "[color:var(--x)]")}`).length, 1);
  assert.equal(hits("x border-t-red-500 ring-offset-white").length, 1);
  assert.deepEqual(
    hits(
      'className="bg-surface text-text-muted border-border bg-quiet-surface text-accent bg-accent/90 border-transparent shadow-(--ui-shadow-sm)"',
    ),
    [],
  );
  assert.deepEqual(hits("context-white the bg-whitespace-nowrap text-blacklist"), []);
  assert.equal(hits("bg-neutral").length, 1);
  assert.deepEqual(hits("a\nb bg-green-500\nc"), [{ line: 2, text: "b bg-green-500" }]);
  assert.deepEqual(hits(""), []);
});

test("C-d77fa65f css imports: hits and misses", () => {
  assert.equal(typeof findCssImports, "function");
  const hits = (source: string) => findCssImports(source);
  assert.deepEqual(hits('import "./a.css";'), [{ line: 1, text: 'import "./a.css";' }]);
  assert.equal(hits('import x from "../b.css?inline";').length, 1);
  assert.equal(hits('const m = import("./c.css");').length, 1);
  assert.equal(hits("import './d.css'").length, 1);
  assert.equal(hits('export * from "./e.css";').length, 1);
  assert.deepEqual(hits('import "./a.css.ts";'), []);
  assert.deepEqual(hits('import "./a.cssx";'), []);
  assert.deepEqual(hits('import { x } from "./styles.ts";'), []);
});

test("C-d77fa65f banned imports: hits and misses", () => {
  assert.equal(typeof findBannedImports, "function");
  const hits = (source: string) => findBannedImports(source);
  assert.deepEqual(hits('import * as D from "@radix-ui/react-dialog";'), [
    { line: 1, text: 'import * as D from "@radix-ui/react-dialog";' },
  ]);
  assert.equal(hits('import "radix-ui";').length, 1);
  assert.equal(hits('import { s } from "radix-ui/internal";').length, 1);
  assert.equal(hits('const m = await import("react-remove-scroll");').length, 1);
  assert.equal(hits('import styled from "styled-components";').length, 1);
  assert.equal(hits('import { x } from "@mantine/core/styles.css";').length, 1);
  assert.equal(hits("import {a} from '@emotion/react'").length, 1);
  assert.equal(hits('export { x } from "@radix-ui/react-select";').length, 1);
  assert.deepEqual(hits('import { Slot } from "@radix-ui/react-slot";'), []);
  assert.deepEqual(hits('import x from "@radix-ui/react-dialog-extra";'), []);
  assert.deepEqual(hits('"@radix-ui/react-dialog",'), []);
});
