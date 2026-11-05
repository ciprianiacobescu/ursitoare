import assert from "node:assert/strict";
import { test } from "node:test";

import { NODE_KINDS } from "../authoring/index.ts";
import type { NodeKind } from "../authoring/index.ts";
import {
  InterpreterError,
  nodeRuntimeFor,
  registerNodeRuntime,
  SUPPORTED_KINDS,
} from "./index.ts";
import type { NodeOutcome, NodeRuntime } from "./index.ts";

const OUTCOME: NodeOutcome = { output: null, outcome: null, next: null, end: null };
const RT: NodeRuntime = { execute: async () => OUTCOME };

function codeAndKind(run: () => void): { code: string; kind: unknown } {
  try {
    run();
  } catch (error) {
    assert.ok(error instanceof InterpreterError, "throws InterpreterError");
    return { code: error.code, kind: error.details["kind"] };
  }
  return { code: "NONE", kind: undefined };
}

test("C-f3de9ac6 built-in kinds are registered and the rest are not", () => {
  assert.deepEqual(SUPPORTED_KINDS, ["block", "end", "switch", "wait"]);
  assert.equal(NODE_KINDS.length, 14);
  for (const kind of NODE_KINDS) {
    const runtime = nodeRuntimeFor(kind);
    if (SUPPORTED_KINDS.includes(kind)) {
      assert.equal(typeof runtime?.execute, "function", `${kind} has a runtime`);
    } else {
      assert.equal(runtime, undefined, `${kind} has none`);
    }
  }
  assert.equal(nodeRuntimeFor("constructor" as NodeKind), undefined);
});

test("C-f3de9ac6 registration refuses duplicates and invalid runtimes", () => {
  assert.deepEqual(codeAndKind(() => registerNodeRuntime("block", RT)), {
    code: "NODE_RUNTIME_DUPLICATE",
    kind: "block",
  });
  assert.deepEqual(
    codeAndKind(() => registerNodeRuntime("human.form", {} as NodeRuntime)),
    { code: "NODE_RUNTIME_INVALID", kind: "human.form" },
  );
  assert.deepEqual(codeAndKind(() => registerNodeRuntime("nope" as NodeKind, RT)), {
    code: "NODE_RUNTIME_INVALID",
    kind: "nope",
  });
  assert.equal(nodeRuntimeFor("human.form"), undefined);
  registerNodeRuntime("human.form", RT);
  assert.equal(nodeRuntimeFor("human.form"), RT);
  assert.deepEqual(codeAndKind(() => registerNodeRuntime("human.form", RT)), {
    code: "NODE_RUNTIME_DUPLICATE",
    kind: "human.form",
  });
});
