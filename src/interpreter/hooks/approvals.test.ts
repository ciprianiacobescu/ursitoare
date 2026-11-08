import assert from "node:assert/strict";
import { test } from "node:test";

import type { JsonValue } from "../../authoring/index.ts";
import type { StepState } from "../../runs/index.ts";
import { approvalsOnPath } from "./approvals.ts";
import type { Approval, PathStep } from "./approvals.ts";

assert.equal(typeof approvalsOnPath, "function");

type StepOver = {
  kind?: string;
  state?: StepState;
  outcome?: string | null;
  output?: JsonValue | null;
};

function S(nodeId: string, over: StepOver = {}): PathStep {
  return {
    nodeId,
    kind: "human.approval",
    state: "completed",
    outcome: "approved",
    output: { approver: "u_bob" },
    ...over,
  };
}

function withOutput(nodeId: string, output: unknown): PathStep {
  return { ...S(nodeId), output: output as JsonValue };
}

function ok(steps: readonly PathStep[]): Approval[] {
  let value: Approval[] | undefined;
  assert.doesNotThrow(() => {
    value = approvalsOnPath(steps);
  });
  return value as Approval[];
}

test("C-ccd6e529 approvalsOnPath lists approvals in input order and ignores other steps", () => {
  assert.deepEqual(ok([]), []);
  const steps: PathStep[] = [
    S("approve_big"),
    S("approve_cfo", { outcome: "rejected", output: { approver: "u_cfo", note: "no" } }),
    S("approve_late", { outcome: "timeout" }),
    S("form", { kind: "human.form" }),
    S("pay", { kind: "block" }),
    S("running", { state: "started" }),
    S("failed", { state: "failed" }),
    S("skipped", { state: "skipped" }),
    S("nulloutcome", { outcome: null }),
    S("noapprover", { output: {} }),
    S("nulloutput", { output: null }),
    S("again"),
    S("again", { outcome: "rejected", output: { approver: "u_eve" } }),
  ];
  assert.deepEqual(ok(steps), [
    { nodeId: "approve_big", decision: "approved", approver: "u_bob" },
    { nodeId: "approve_cfo", decision: "rejected", approver: "u_cfo" },
    { nodeId: "noapprover", decision: "approved", approver: null },
    { nodeId: "nulloutput", decision: "approved", approver: null },
    { nodeId: "again", decision: "approved", approver: "u_bob" },
    { nodeId: "again", decision: "rejected", approver: "u_eve" },
  ]);
});

test("C-ccd6e529 approvalsOnPath keeps only an own non-empty approver string of at most 128 characters", () => {
  const outputs: unknown[] = [
    { approver: "" },
    { approver: "x".repeat(128) },
    { approver: "x".repeat(129) },
    { approver: 5 },
    "u_bob",
    ["u_bob"],
    { approver: null },
    JSON.parse('{"__proto__":{"approver":"p"}}') as unknown,
    Object.create({ approver: "inherited" }) as unknown,
  ];
  const steps = outputs.map((output, index) => withOutput(`a${index + 1}`, output));
  const approvers: (string | null)[] = [
    null,
    "x".repeat(128),
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ];
  assert.deepEqual(
    ok(steps),
    approvers.map((approver, index) => ({
      nodeId: `a${index + 1}`,
      decision: "approved",
      approver,
    })),
  );
});

test("C-ccd6e529 approvalsOnPath ignores malformed steps and a non-array argument without throwing", () => {
  const malformed = [
    null,
    5,
    "x",
    S("ok"),
    { nodeId: 5, kind: "human.approval", state: "completed", outcome: "approved" },
  ] as unknown as readonly PathStep[];
  assert.deepEqual(ok(malformed), [{ nodeId: "ok", decision: "approved", approver: "u_bob" }]);
  assert.deepEqual(ok("x" as unknown as readonly PathStep[]), []);
});
