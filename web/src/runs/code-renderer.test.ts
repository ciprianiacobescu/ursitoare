/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { CODE_STEP_RENDERER, registerCodeRenderer } from "./code-renderer.ts";
import { stepRendererFor, stepRenderers } from "./step-renderers.ts";
import type { StepRenderer } from "./step-renderers.ts";
import { stepDetailRows, timelineItems } from "./timeline.ts";
import type { StepView } from "./types.ts";

const CODE: StepView = {
  seq: 2,
  nodeId: "normalize",
  kind: "code",
  effectSeq: 0,
  attempt: 1,
  state: "completed",
  outcome: null,
  error: null,
  inputRef: null,
  outputRef: null,
  idemKey: null,
  policyDecisionId: null,
  taint: ["untrusted", "private"],
  startedAt: "2026-11-06T09:00:00.000000Z",
  endedAt: "2026-11-06T09:00:01.000000Z",
};

test("C-d630941c: registering the code renderer makes a code step render", () => {
  let beforeKinds: string[] = [];
  let beforeRenderer: StepRenderer | undefined;
  let beforeTexts: string[] = [];
  assert.doesNotThrow(() => {
    beforeKinds = stepRenderers.list().map((r) => r.kind);
    beforeRenderer = stepRendererFor("code");
    beforeTexts = timelineItems([CODE], "completed").map((item) => item.text);
  });
  assert.deepEqual(beforeKinds, ["block", "switch", "wait", "end"]);
  assert.equal(beforeRenderer?.kind, "*");
  assert.deepEqual(beforeTexts, ["code (unknown kind) · completed"]);

  assert.doesNotThrow(() => {
    registerCodeRenderer();
  });
  assert.doesNotThrow(() => {
    registerCodeRenderer();
  });

  let afterKinds: string[] = [];
  let afterRenderer: StepRenderer | undefined;
  let afterTexts: string[] = [];
  let details: { term: string; value: string }[] = [];
  let label = "";
  assert.doesNotThrow(() => {
    afterKinds = stepRenderers.list().map((r) => r.kind);
    afterRenderer = stepRendererFor("code");
    afterTexts = timelineItems([CODE], "completed").map((item) => item.text);
    details = stepDetailRows(CODE, "completed").map((row) => ({
      term: row.term,
      value: row.value,
    }));
    label = CODE_STEP_RENDERER.label({ ...CODE, outcome: "ok" });
  });
  assert.deepEqual(afterKinds, ["block", "switch", "wait", "end", "code"]);
  assert.equal(afterRenderer, CODE_STEP_RENDERER);
  assert.deepEqual(afterTexts, ["code · completed"]);
  assert.deepEqual(details.slice(-2), [
    { term: "Attempt", value: "1" },
    { term: "Taint", value: "untrusted, private" },
  ]);
  assert.equal(
    details.some((row) => row.term === "Idempotency key"),
    false,
  );
  assert.equal(label, "code: ok");
});
