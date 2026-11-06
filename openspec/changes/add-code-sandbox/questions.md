# Questions — add-code-sandbox

<!-- l4:questions v1
How to answer: write under "### Answer" and set **Status** to `answered`.
To accept the clarifier's suggestion as-is, set **Status** to `accepted`.
Status values: open · answered · accepted · answered-by-clarifier · dismissed · superseded
Kind values: technical · product · ambiguous · verdict · harness. For a `verdict` question, start the answer with `accept` or
`reject`, then give your reason; for a `harness` question, with `accept` or `retry`.
Do not change question IDs. Commit and push to the l4/… branch to resume the run. -->

<!-- l4:index:start -->
| ID | Status | Blocking | Kind | Question |
|----|--------|----------|------|----------|
| Q-001 | answered | 3.5 | harness | Task 3.5: the pre-satisfied check could not decide |
<!-- l4:index:end -->

---

## Q-001: Task 3.5: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.5
- **Kind:** harness
- **Asked:** 2026-11-06T20:30Z by deepseek-free, run r-20261106T1945Z-d26a, task 3.5
- **Criteria:** C-990d6a3c (sandbox › Stack depth, output size and nesting are capped › Recursion, clamp, byte limits and walker), C-a85c03b7 (sandbox › Guest memory is capped per memory bucket › Bombs are contained and buckets are isolated)

### Context
L4 could not run the pre-satisfied check of task 3.5, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and src/sandbox/limits-run.test.ts is not a Python file; the base run: its new tests fail against the unit base code only by an error, not by assertion
Runs: test-base-run
Kept real: nothing
Tests: src.sandbox.limits-run.test.ts::C-990d6a3c: output bytes and nesting are refused at their boundaries, src.sandbox.limits-run.test.ts::C-990d6a3c: stack bodies end in a typed fault and the pool keeps working, src.sandbox.limits-run.test.ts::C-990d6a3c: the stack clamp bounds recursion like its capped option, src.sandbox.limits-run.test.ts::C-a85c03b7: bombs stay inside their memory bucket and buckets are isolated

Changes the replay applies (1 files):
    added src/sandbox/limits-run.test.ts

Source of the tests (redacted; at most 40 lines each):
src.sandbox.limits-run.test.ts::C-990d6a3c: output bytes and nesting are refused at their boundaries:
    test("C-990d6a3c: output bytes and nesting are refused at their boundaries", async () => {
      const sandbox = createWorkerSandbox();
      try {
        const eur = await runChecked(sandbox, EURO, {}, { maxOutputBytes: 98 });
        assert.deepEqual(asValue(eur, "EURO at 98 bytes"), { s: "€".repeat(30) });
        const eurOver = await runChecked(sandbox, EURO, {}, { maxOutputBytes: 97 });
        expectFault(eurOver, "EURO at 97 bytes", "output_too_large");
    
        const ascii = await runChecked(sandbox, ASCII, {}, { maxOutputBytes: 108 });
        assert.deepEqual(asValue(ascii, "ASCII at 108 bytes"), { s: "x".repeat(100) });
        const asciiOver = await runChecked(sandbox, ASCII, {}, { maxOutputBytes: 107 });
        expectFault(asciiOver, "ASCII at 107 bytes", "output_too_large");
    
        const nestedAllowed = await runChecked(sandbox, nest(65), {});
        assert.ok(nestedAllowed.ok, "nesting 65 levels is accepted");
        const nestedRefused = await runChecked(sandbox, nest(66), {});
        expectFault(nestedRefused, "nesting 66 levels", "output_invalid");
      } finally {
        await sandbox.close();
      }
    });
src.sandbox.limits-run.test.ts::C-990d6a3c: stack bodies end in a typed fault and the pool keeps working:
    test("C-990d6a3c: stack bodies end in a typed fault and the pool keeps working", async () => {
      const sandbox = createWorkerSandbox();
      try {
        const allowed: readonly SandboxFaultCode[] = ["stack_overflow", "runtime_error", "memory_limit"];
        for (const maxStackBytes of [262144, 536870912]) {
          for (const row of STACK_BODIES) {
            const result = await runChecked(
              sandbox,
              row.body,
              {},
              { timeoutMs: 2000, memoryBytes: 67108864, maxStackBytes },
            );
            if (result.ok) {
              assert.fail(`stack body ${row.name} at ${maxStackBytes} returned ok instead of a typed fault`);
            }
            assert.ok(
              allowed.includes(result.fault.code),
              `stack body ${row.name} at ${maxStackBytes} gave ${result.fault.code}`,
            );
          }
        }
        assert.equal(sandbox.respawns, 0, "the stack bodies do not crash a worker");
    
        const normalize = await runChecked(sandbox, NORMALIZE, INPUT);
        assert.deepEqual(asValue(normalize, "NORMALIZE after the stack bodies"), NORMALIZE_VALUE);
      } finally {
        await sandbox.close();
      }
    });
src.sandbox.limits-run.test.ts::C-990d6a3c: the stack clamp bounds recursion like its capped option:
    test("C-990d6a3c: the stack clamp bounds recursion like its capped option", async () => {
      const sandbox = createWorkerSandbox();
      const capped = createWorkerSandbox({ stackCapBytes: 65536 });
      try {
        const depths = new Map<number, number>();
        for (const maxStackBytes of [262144, 65536, 1, 32768, 536870912]) {
          const result = await runChecked(sandbox, RECURSE, {}, { maxStackBytes });
          depths.set(maxStackBytes, depthOf(result, `RECURSE at ${maxStackBytes}`));
        }
    
        const atMax = depths.get(262144);
        const atTiny = depths.get(65536);
        const atOne = depths.get(1);
        const atMinimum = depths.get(32768);
        const atHuge = depths.get(536870912);
        assert.ok(atMax !== undefined && atTiny !== undefined, "the reference depths were recorded");
        assert.ok(atMax > 0 && atTiny > 0, "both reference depths are above zero");
        assert.ok(atTiny < atMax, `a 64 KiB stack (${atTiny}) recurses less deeply than a 256 KiB stack (${atMax})`);
        assert.equal(atOne, atMinimum, "1 byte clamps to the minimum stack size");
        assert.equal(atHuge, atMax, "512 MiB clamps to the pool's 256 KiB cap");
    
        const cappedResult = await runChecked(capped, RECURSE, {}, { maxStackBytes: 262144 });
        assert.equal(
          depthOf(cappedResult, "RECURSE on a pool capped at 64 KiB"),
          atTiny,
          "the pool's stackCapBytes bounds the depth like maxStackBytes 65536",
        );
      } finally {
        await sandbox.close();
        await capped.close();
      }
    });
src.sandbox.limits-run.test.ts::C-a85c03b7: bombs stay inside their memory bucket and buckets are isolated:
    test("C-a85c03b7: bombs stay inside their memory bucket and buckets are isolated", async () => {
      const sandbox = createWorkerSandbox();
      try {
        const warm = await runChecked(sandbox, NORMALIZE, INPUT);
        assert.deepEqual(asValue(warm, "warm-up NORMALIZE"), NORMALIZE_VALUE);
        const rssBefore = process.memoryUsage().rss;
    
        for (const [bodyIndex, body] of BOMBS.entries()) {
          for (let round = 1; round <= 3; round += 1) {
            const started = performance.now();
            const result = await runChecked(sandbox, body, {}, { timeoutMs: 5000 });
            const elapsed = performance.now() - started;
            expectFault(result, `bomb ${bodyIndex + 1} round ${round}`, "memory_limit");
            assert.equal(result.stats.memBytes, -1, `bomb ${bodyIndex + 1} round ${round}: memBytes is not sampled`);
            assert.ok(elapsed < 2000, `bomb ${bodyIndex + 1} round ${round} finished in ${elapsed} ms`);
          }
        }
    
        const rssGrowth = process.memoryUsage().rss - rssBefore;
        assert.ok(rssGrowth <= 268435456, `the bombs grew the process RSS by ${rssGrowth} bytes`);
    
        const smallFirst = await runChecked(sandbox, ALLOC, {}, { memoryBytes: 16777216 });
        expectFault(smallFirst, "ALLOC at 16 MiB", "memory_limit");
    
        const large = await runChecked(sandbox, ALLOC, {}, { memoryBytes: 268435456 });
        assert.deepEqual(asValue(large, "ALLOC at 256 MiB"), { n: 30 });
    
        const smallAgain = await runChecked(sandbox, ALLOC, {}, { memoryBytes: 16777216 });
        expectFault(smallAgain, "ALLOC back at 16 MiB", "memory_limit");
    
        const final = await runChecked(sandbox, NORMALIZE, INPUT);
        assert.deepEqual(asValue(final, "final NORMALIZE"), NORMALIZE_VALUE);
        assert.equal(sandbox.respawns, 0, "memory limits and buckets do not respawn a worker");
      } finally {
        await sandbox.close();
      }
    });

Diff of src/sandbox/limits-run.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/sandbox/limits-run.test.ts b/src/sandbox/limits-run.test.ts
    new file mode 100644
    index 0000000..9402a1a
    --- /dev/null
    +++ b/src/sandbox/limits-run.test.ts
    @@ -0,0 +1,241 @@
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +
    +import { createWorkerSandbox } from "./index.ts";
    +import type {
    +  SandboxFaultCode,
    +  SandboxJson,
    +  SandboxLimits,
    +  SandboxOptions,
    +  SandboxResult,
    +  WorkerSandbox,
    +} from "./index.ts";
    +
    +const LIM: SandboxLimits = {
    +  timeoutMs: 1000,
    +  memoryBytes: 33554432,
    +  maxStackBytes: 262144,
    +  maxOutputBytes: 1048576,
    +};
    +
    +const OPT: SandboxOptions = {
    +  seed: "r_1:normalize:1",
    +  nowIso: "2026-10-24T12:00:00.000Z",
    +  binding: "input",
    +  result: "object",
    +};
    +
    +const INPUT: SandboxJson = { amount: 1234.567, currency: "eur" };
    +
    +const NORMALIZE =
    +  "return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase(), is_large: input.amount > 1000 };";
    +
    +const NORMALIZE_VALUE: SandboxJson = { amount: 1234.57, currency: "EUR", is_large: true };
    +
    [cut: 207 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-code-sandbox/.l4/held/3.5-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 1 files (the whole patch is in `openspec/changes/add-code-sandbox/.l4/held/3.5-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: The held evidence is enough. The new tests are not vacuous: they assert the exact fault codes, values, depth relations, timings and respawn counts of the two spec scenarios (memory_limit for nine bomb runs with memBytes -1 and under 2000 ms, bounded RSS growth, ALLOC failing at 16 MiB and passing at 256 MiB, every stack body ending in stack_overflow, runtime_error or memory_limit with respawns 0, RECURSE depths ordered and clamped as the test plan states, EURO and ASCII accepted and refused at their byte boundaries, NEST(65) ok and NEST(66) output_invalid). The behaviour they check is already in the unit head: run-code.ts applies setMemoryLimit and the stack clamp and counts UTF-8 output bytes, wasm.ts builds one module per memory bucket with a bounded maximum, and the prelude's walker refuses nesting deeper than 64, __proto__ keys, toJSON members and oversized output. The base run could only end in an error because index.ts on the base branch is the milestone scaffold stub, whose createWorkerSandbox throws before any assertion runs. Counting these on the real run is sound, and the replay still runs every gate.
