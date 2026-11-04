Spec: `specs/interpreter/spec.md`; decisions: `design.md`; fixtures: `test-plan.md`. Every test file imports from `src/interpreter/index.ts` (the kit and `waitForRun` from `test/support`), starts with `assert.equal(typeof <the function it tests>, "function")`, wraps a call that reaches a scaffold stub (async: `p.then((v) => v, (e: unknown) => e)`; sync: try/catch) so the error is asserted, asserts errors by `code`, uses `node:assert/strict`, and has no `.`, `[` or `::` in test names. A test reads a runtime with `nodeRuntimeFor(kind)` and asserts it is defined before calling `execute`.

## 1. Registry, values and ops

- [x] 1.1 Write `src/interpreter/refs.test.ts` first (scenario "References, templates and unresolved paths"), then implement `InterpreterError` in `src/interpreter/errors.ts`, `registerNodeRuntime`, `nodeRuntimeFor`, `SUPPORTED_KINDS` in `src/interpreter/registry.ts` and `resolveValue` in `src/interpreter/refs.ts`, implementing requirement "Values resolve over recorded outputs"
- [x] 1.2 Write `src/interpreter/ops.test.ts`, `test/support/node-conformance.test.ts` and `test/support/run-wait.test.ts` first (scenario "Kit verdicts and a bounded wait"; `ops.test.ts` holds the function parts of the replay scenario of 3.2 and `NO_EFFECT_GATE`), then implement `memoryWorkflowOps` in `src/interpreter/ops.ts` and `NO_EFFECT_GATE` in `src/interpreter/gate.ts`, create `test/support/node-conformance.ts` and `test/support/run-wait.ts`, implementing requirements "A run records one numbered row per node visit" and "The conformance kit and waitForRun support the tests"

## 2. Node runtimes

- [x] 2.1 Write `src/interpreter/runtimes/control.test.ts` and `src/interpreter/runtimes/wait.test.ts` first (scenarios "Switch cases and end outputs through the conformance kit" and "Sleeping, skipping and parsing durations"), then implement `src/interpreter/runtimes/switch.ts`, `src/interpreter/runtimes/end.ts`, `src/interpreter/runtimes/wait.ts` and `durationMs` in `src/interpreter/refs.ts`, registered by `src/interpreter/index.ts`, implementing requirements "Switch and end nodes finish without a tool" and "A wait sleeps in live mode and is skipped in mock mode"
- [ ] 2.2 Write `src/interpreter/runtimes/block.test.ts` and `src/interpreter/registry.test.ts` first (scenarios "A read block, with schema and tool failures" and "Built-in kinds and registration rules"), then implement `src/interpreter/schema.ts` and the read path of `src/interpreter/runtimes/block.ts`, implementing requirements "A block calls its tool through the invoker" and "Node runtimes are registered once per kind"
- [ ] 2.3 Write `src/interpreter/runtimes/block-effect.test.ts` first (scenario "Gate order, decisions and failures"), then add the effect path to `src/interpreter/runtimes/block.ts`, implementing requirement "An effectful block runs inside the effect gate in every mode"

## 3. The run

- [ ] 3.1 Write `src/interpreter/start.test.ts` first (scenario "Refusals, enqueue and idempotence"), then implement `startRun` and `workflowIdOf` in `src/interpreter/start.ts`, implementing requirement "A run starts only by registry id and hash"
- [ ] 3.2 Write `src/interpreter/execute.test.ts` first (scenarios "A run walks block, switch, block and end" and "Replay reuses the numbers and the recorded results"; the tagged ops capture the `runStep` values), then implement `executeRun` in `src/interpreter/execute.ts` and `src/interpreter/visit.ts`, implementing requirement "A run records one numbered row per node visit"
- [ ] 3.3 Write `src/interpreter/execute-failures.test.ts` first (scenarios "Node failures" and "Run-level failures and nothing to do"), then complete the failure mapping, revisit guard and terminal-run shortcut in `src/interpreter/execute.ts` and `src/interpreter/visit.ts`, implementing requirement "A failing run ends failed with a RunError and leaks nothing"

## 4. Durable workflow

- [ ] 4.1 Write `src/interpreter/workflow.db.test.ts` first (scenario "A run on DBOS"), then implement `registerRunWorkflow`, `bindInterpreter`, `dbosWorkflowOps` in `src/interpreter/workflow.ts` and the exports of `src/interpreter/index.ts`, implementing requirement "The run workflow is durable"
