/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { DRY_RUN_PANEL, dryRunPanelView, parseFakes } from "./dry-run.ts";

type PanelView = ReturnType<typeof dryRunPanelView>;
type Parsed = ReturnType<typeof parseFakes>;

function panel(caps: string[], version: { state: string } | null): PanelView {
  let out: PanelView | undefined;
  assert.doesNotThrow(() => {
    out = dryRunPanelView(new Set(caps), version);
  });
  return out as PanelView;
}

function fakes(text: string): Parsed {
  let out: Parsed | undefined;
  assert.doesNotThrow(() => {
    out = parseFakes(text);
  });
  return out as Parsed;
}

const NEEDS = { state: "needs_version", message: "Save and validate a version to dry-run it." };
const READY = { state: "ready", message: null };

test("C-0ba641d3 the panel follows the capability and the saved version", () => {
  assert.deepEqual(panel(["read_run"], { state: "validated" }), {
    state: "not_allowed",
    message: "Only members of the flow's owner team can dry-run it.",
  });
  assert.deepEqual(panel(["dry_run_flow"], null), NEEDS);
  assert.deepEqual(panel(["dry_run_flow"], { state: "draft" }), NEEDS);
  assert.deepEqual(panel(["dry_run_flow", "test_flow"], { state: "validated" }), READY);
  assert.deepEqual(panel(["dry_run_flow"], { state: "tested" }), READY);
  assert.deepEqual(DRY_RUN_PANEL, { id: "dry-run", title: "Dry run" });
});

test("C-b51ecdbd parseFakes accepts maps of lists", () => {
  assert.deepEqual(fakes('{"pay":[{"output":{"payment_id":"P-1","status":"created"}}]}'), {
    ok: true,
    fakes: { pay: [{ output: { payment_id: "P-1", status: "created" } }] },
  });
  assert.deepEqual(fakes("{}"), { ok: true, fakes: {} });
  const f10 = fakes('{"a/b":[{"error":{"code":"E","message":"m"}}]}');
  assert.deepEqual(f10, { ok: true, fakes: { "a/b": [{ error: { code: "E", message: "m" } }] } });
  const f11 = fakes('{"__proto__":[1]}');
  assert.equal(f11.ok, true);
  if (f11.ok) {
    assert.deepEqual(Object.keys(f11.fakes), ["__proto__"]);
    assert.equal(Object.getPrototypeOf(f11.fakes), Object.prototype);
  }
});

test("C-b51ecdbd parseFakes words each refusal", () => {
  assert.deepEqual(fakes("  "), { ok: false, message: "Enter a JSON object." });
  assert.deepEqual(fakes("{nope"), { ok: false, message: "This is not valid JSON." });
  for (const text of ["[]", "5", "null"]) {
    assert.deepEqual(fakes(text), { ok: false, message: "Enter a JSON object, for example {}." });
  }
  assert.deepEqual(fakes('{"pay":{"output":{}}}'), {
    ok: false,
    message: 'The fakes for "pay" must be a list.',
  });
  assert.deepEqual(fakes('{"pay":[],"x":"y"}'), {
    ok: false,
    message: 'The fakes for "x" must be a list.',
  });
});

test("C-b51ecdbd parseFakes copies the lists", () => {
  const first = fakes('{"pay":[1]}');
  const second = fakes('{"pay":[1]}');
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (first.ok && second.ok) {
    assert.deepEqual(first.fakes, { pay: [1] });
    assert.notEqual(first.fakes["pay"], second.fakes["pay"]);
  }
});
