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
| Q-002 | answered | 3.6 | harness | Task 3.6: the pre-satisfied check could not decide |
| Q-003 | answered | 3.8 | harness | Task 3.8: the pre-satisfied check could not decide |
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

---

## Q-002: Task 3.6: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.6
- **Kind:** harness
- **Asked:** 2026-11-06T21:22Z by deepseek-free, run r-20261106T2053Z-6f18, task 3.6
- **Criteria:** C-57ff720c (sandbox › A failed worker is replaced and the run reports sandbox_crash › Exit during a job, idle exit and a factory that throws), C-8bb9cb9b (sandbox › A run past its deadline is a timeout, and a stuck worker is killed › Interrupt, late finish and watchdog)

### Context
L4 could not run the pre-satisfied check of task 3.6, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and src/sandbox/crash.test.ts is not a Python file; the base run: its new tests fail against the unit base code only by an error, not by assertion
Runs: test-base-run
Kept real: nothing
Tests: src.sandbox.crash.test.ts::C-57ff720c: a factory that throws reports sandbox_crash and the next run succeeds, src.sandbox.crash.test.ts::C-57ff720c: a worker that exits during a job is replaced and the run reports sandbox_crash, src.sandbox.crash.test.ts::C-57ff720c: an idle worker exit is replaced lazily on the next run, src.sandbox.deadline.test.ts::C-8bb9cb9b: a late finish is a timeout without a respawn, src.sandbox.deadline.test.ts::C-8bb9cb9b: a loop is interrupted at its deadline and the pool keeps working, src.sandbox.deadline.test.ts::C-8bb9cb9b: the watchdog kills a stuck worker and a replacement answers, src.sandbox.deadline.test.ts::C-8bb9cb9b: the watchdog message names a custom grace

Changes the replay applies (2 files):
    added src/sandbox/crash.test.ts
    added src/sandbox/deadline.test.ts

Source of the tests (redacted; at most 40 lines each):
src.sandbox.crash.test.ts::C-57ff720c: a factory that throws reports sandbox_crash and the next run succeeds:
    test("C-57ff720c: a factory that throws reports sandbox_crash and the next run succeeds", async () => {
      let attempts = 0;
      const sandbox = createWorkerSandbox({
        size: 1,
        workerFactory: (url, options) => {
          attempts += 1;
          if (attempts === 1) {
            throw new Error("no worker");
          }
          return new Worker(url, options);
        },
      });
      try {
        const crashed = await runWithDefaults(sandbox, NORMALIZE, INPUT);
        const message = expectFault(crashed, "the run whose factory throws", "sandbox_crash");
        assert.equal(message, "worker thread could not be started", "the spawn failure message");
        assert.equal(crashed.stats.memBytes, -1, "a failed spawn reports no memory sample");
    
        const after = await runWithDefaults(sandbox, NORMALIZE, INPUT);
        assert.deepEqual(asValue(after, "the run after a failed spawn"), NORMALIZE_VALUE);
        assert.equal(attempts, 2, "the next run tries the factory again");
      } finally {
        await sandbox.close();
      }
    });
src.sandbox.crash.test.ts::C-57ff720c: a worker that exits during a job is replaced and the run reports sandbox_crash:
    test("C-57ff720c: a worker that exits during a job is replaced and the run reports sandbox_crash", async () => {
      const { sandbox, calls } = exitThenRealPool();
      try {
        const crashed = await runWithDefaults(sandbox, NORMALIZE, INPUT);
        const message = expectFault(crashed, "the first run on the exiting worker", "sandbox_crash");
        assert.equal(message, "worker thread exited unexpectedly", "the exit message");
        assert.equal(crashed.stats.memBytes, -1, "a crashed run reports no memory sample");
        assert.equal(sandbox.respawns, 1, "the exited worker is replaced and counted");
        assert.equal(calls.length, 2, "the pool spawned a replacement at once");
    
        const after = await runWithDefaults(sandbox, NORMALIZE, INPUT);
        assert.deepEqual(asValue(after, "the second run"), NORMALIZE_VALUE);
        assert.equal(sandbox.respawns, 1, "the replacement answers without another respawn");
        assert.equal(calls.length, 2, "the replacement answers without another spawn");
      } finally {
        await sandbox.close();
      }
    });
src.sandbox.crash.test.ts::C-57ff720c: an idle worker exit is replaced lazily on the next run:
    test("C-57ff720c: an idle worker exit is replaced lazily on the next run", async () => {
      const { sandbox, calls } = exitThenRealPool();
      try {
        const crashed = await runWithDefaults(sandbox, NORMALIZE, INPUT);
        expectFault(crashed, "the first run on the exiting worker", "sandbox_crash");
        const second = await runWithDefaults(sandbox, NORMALIZE, INPUT);
        assert.deepEqual(asValue(second, "the second run"), NORMALIZE_VALUE);
        assert.equal(sandbox.respawns, 1, "the first replacement is counted");
        assert.equal(calls.length, 2, "the pool has one live worker after the second run");
    
        const idle = calls[1];
        assert.ok(idle !== undefined, "the replacement worker was recorded");
        const exited = new Promise<void>((resolve) => {
          idle.worker.once("exit", () => {
            resolve();
          });
        });
        await idle.worker.terminate();
        await exited;
    
        assert.equal(sandbox.respawns, 1, "an idle exit is not counted before the next run");
        assert.equal(calls.length, 2, "an idle exit spawns no worker by itself");
    
        const third = await runWithDefaults(sandbox, NORMALIZE, INPUT);
        assert.deepEqual(asValue(third, "the run after the idle exit"), NORMALIZE_VALUE);
        assert.equal(sandbox.respawns, 2, "the lazy replacement is counted on the next run");
        assert.equal(calls.length, 3, "the next run spawns the replacement");
      } finally {
        await sandbox.close();
      }
    });
src.sandbox.deadline.test.ts::C-8bb9cb9b: a late finish is a timeout without a respawn:
    test("C-8bb9cb9b: a late finish is a timeout without a respawn", async () => {
      const sandbox = createWorkerSandbox({ size: 1, graceMs: 8000 });
      try {
        const warm = await runWithDefaults(sandbox, NORMALIZE, INPUT);
        assert.deepEqual(asValue(warm, "warm-up NORMALIZE"), NORMALIZE_VALUE);
    
        const late = await timedRun(sandbox, LATE, { timeoutMs: 50 });
        const message = expectFault(late.result, "LATE at timeoutMs 50", "timeout");
        assert.equal(message, TIMEOUT_MESSAGE, "a run that ends after its deadline is a timeout");
        assert.ok(late.elapsed >= 50, `LATE finished after ${late.elapsed} ms, at least its deadline`);
        assert.ok(late.elapsed <= 10050, `LATE finished after ${late.elapsed} ms, before the watchdog`);
        assert.equal(sandbox.respawns, 0, "a late finish does not respawn a worker");
      } finally {
        await sandbox.close();
      }
    });
src.sandbox.deadline.test.ts::C-8bb9cb9b: a loop is interrupted at its deadline and the pool keeps working:
    test("C-8bb9cb9b: a loop is interrupted at its deadline and the pool keeps working", async () => {
      const sandbox = createWorkerSandbox({ size: 1 });
      try {
        const warm = await runWithDefaults(sandbox, NORMALIZE, INPUT);
        assert.deepEqual(asValue(warm, "warm-up NORMALIZE"), NORMALIZE_VALUE);
    
        const loop = await timedRun(sandbox, LOOP, { timeoutMs: 200 });
        const message = expectFault(loop.result, "LOOP at timeoutMs 200", "timeout");
        assert.equal(message, TIMEOUT_MESSAGE, "LOOP is interrupted, not killed by the watchdog");
        assert.ok(loop.elapsed >= 200, `LOOP finished after ${loop.elapsed} ms, at least its deadline`);
        assert.ok(loop.elapsed <= 2450, `LOOP finished after ${loop.elapsed} ms, within the window`);
        assert.equal(sandbox.respawns, 0, "an interrupted run does not respawn a worker");
    
        const after = await runWithDefaults(sandbox, NORMALIZE, INPUT);
        assert.deepEqual(asValue(after, "NORMALIZE after LOOP"), NORMALIZE_VALUE);
      } finally {
        await sandbox.close();
      }
    });
src.sandbox.deadline.test.ts::C-8bb9cb9b: the watchdog kills a stuck worker and a replacement answers:
    test("C-8bb9cb9b: the watchdog kills a stuck worker and a replacement answers", async () => {
      const { sandbox, calls } = recordingPool({ size: 1 });
      try {
        const big = await timedRun(sandbox, BIG, { timeoutMs: 50 });
        const message = expectFault(big.result, "BIG at timeoutMs 50", "timeout");
        assert.match(
          message,
          /^worker watchdog killed the sandbox after \d+ ms \(limit 50 \+ grace 250\)$/,
          "the watchdog message names the limit and the default grace",
        );
        assert.ok(big.elapsed >= 50, `BIG finished after ${big.elapsed} ms, at least its deadline`);
        assert.ok(big.elapsed <= 2300, `BIG finished after ${big.elapsed} ms, within the window`);
        assert.equal(big.result.stats.memBytes, -1, "a watchdog timeout reports no memory sample");
        assert.equal(sandbox.respawns, 1, "the watchdog replacement counts one respawn");
        assert.equal(calls.length, 2, "the pool spawned the killed worker and its replacement");
    
        const after = await runWithDefaults(sandbox, NORMALIZE, INPUT);
        assert.deepEqual(asValue(after, "NORMALIZE on the replacement"), NORMALIZE_VALUE);
        assert.equal(calls.length, 2, "the replacement answers without another spawn");
      } finally {
        await sandbox.close();
      }
    });
src.sandbox.deadline.test.ts::C-8bb9cb9b: the watchdog message names a custom grace:
    test("C-8bb9cb9b: the watchdog message names a custom grace", async () => {
      const sandbox = createWorkerSandbox({ size: 1, graceMs: 1000 });
      try {
        const big = await timedRun(sandbox, BIG, { timeoutMs: 50 });
        const message = expectFault(big.result, "BIG at timeoutMs 50 with grace 1000", "timeout");
        assert.match(
          message,
          /^worker watchdog killed the sandbox after \d+ ms \(limit 50 \+ grace 1000\)$/,
          "the watchdog message names the custom grace",
        );
        assert.ok(big.elapsed >= 50, `BIG finished after ${big.elapsed} ms, at least its deadline`);
        assert.ok(big.elapsed <= 3050, `BIG finished after ${big.elapsed} ms, within the window`);
        assert.equal(sandbox.respawns, 1, "a watchdog kill counts one respawn");
      } finally {
        await sandbox.close();
      }
    });

Diff of src/sandbox/crash.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/sandbox/crash.test.ts b/src/sandbox/crash.test.ts
    new file mode 100644
    index 0000000..1ee1273
    --- /dev/null
    +++ b/src/sandbox/crash.test.ts
    @@ -0,0 +1,154 @@
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +import { Worker } from "node:worker_threads";
    +import type { WorkerOptions } from "node:worker_threads";
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
    [cut: 120 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-code-sandbox/.l4/held/3.6-pre_satisfied.patch` on the unit branch]

Diff of src/sandbox/deadline.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/sandbox/deadline.test.ts b/src/sandbox/deadline.test.ts
    new file mode 100644
    index 0000000..94f6cb5
    --- /dev/null
    +++ b/src/sandbox/deadline.test.ts
    @@ -0,0 +1,182 @@
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +import { Worker } from "node:worker_threads";
    +import type { WorkerOptions } from "node:worker_threads";
    +
    +import { createWorkerSandbox } from "./index.ts";
    +import type {
    +  SandboxFaultCode,
    +  SandboxJson,
    +  SandboxLimits,
    +  SandboxOptions,
    +  SandboxResult,
    +  WorkerSandbox,
    +  WorkerSandboxOptions,
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
    [cut: 148 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-code-sandbox/.l4/held/3.6-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 2 files (the whole patch is in `openspec/changes/add-code-sandbox/.l4/held/3.6-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: accept: The held evidence is enough. The seven new tests are not vacuous: they assert the exact fault codes, messages, memBytes, respawn counts, factory call counts and timing windows that the two spec scenarios "Interrupt, late finish and watchdog" and "Exit during a job, idle exit and a factory that throws" prescribe (LOOP interrupted with the execution exceeded timeoutMs message in 200 to 2450 ms and no respawn, LATE a timeout without a respawn before the watchdog, BIG killed by the watchdog with the message naming limit 50 and grace 250 or 1000 and one respawn and two factory calls, an exiting worker giving worker thread exited unexpectedly with an immediate replacement, an idle exit replaced lazily with the respawn counted on the next run, a throwing factory giving worker thread could not be started and the next run succeeding). The behaviour is already in the unit head: pool.ts arms the watchdog at timeoutMs plus graceMs on postMessage, terminates and replaces the worker and counts a respawn, replaces a worker that exits during a job at once and an idle one on the next spawn, and turns a throwing factory into a spawn fault; classify.ts carries the three exact messages; run-code.ts interrupts at the deadline and reports a settled run past its deadline as a timeout. The base run could only end in an error because the base branch carries the milestone scaffold stub of the sandbox index, whose bodies throw not implemented before any assertion runs, so the inconclusive result reflects the scaffold, not the tests. The exit worker support file that the crash tests reference is created by the task's green step as tasks.md 3.6 says; the red-scope guard excluded it from this change. Counting these tests on the real run is sound, and the replay still runs every gate, so a failure there is caught.

---

## Q-003: Task 3.8: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.8
- **Kind:** harness
- **Asked:** 2026-11-06T22:42Z by deepseek-free, run r-20261106T2145Z-e456, task 3.8
- **Criteria:** C-ed57e3cd (sandbox-build › The built worker entry answers a run without a factory › The built worker answers without a factory)

### Context
L4 could not run the pre-satisfied check of task 3.8, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and src/sandbox/built.test.ts is not a Python file; the base run: its new tests fail against the unit base code only by an error, not by assertion
Runs: test-base-run
Kept real: nothing
Tests: src.sandbox.built.test.ts::C-ed57e3cd: the built worker answers a run without a factory

Changes the replay applies (1 files):
    added src/sandbox/built.test.ts

Source of the tests (redacted; at most 40 lines each):
src.sandbox.built.test.ts::C-ed57e3cd: the built worker answers a run without a factory:
    test("C-ed57e3cd: the built worker answers a run without a factory", async () => {
      await mkdir(BUILD_CACHE, { recursive: true });
      const outDir = await mkdtemp(join(BUILD_CACHE, "ursitoare-sandbox-build-"));
      let sandbox: WorkerSandbox | undefined;
      try {
        await writeFile(join(outDir, "package.json"), JSON.stringify({ type: "module" }), "utf8");
    
        const build = await runBuild(outDir);
        assert.equal(build.code, 0, `tsc exits 0: ${build.stdout}${build.stderr}`);
    
        const poolPath = join(outDir, "sandbox", "pool.js");
        const workerEntryPath = join(outDir, "sandbox", "worker-entry.js");
        const indexUrl = pathToFileURL(join(outDir, "sandbox", "index.js")).href;
    
        const built = (await import(indexUrl)) as BuiltModule;
    
        const entryUrl = built.workerEntryUrl(pathToFileURL(poolPath).href);
        assert.equal(entryUrl.protocol, "file:", "the built worker entry is a file URL");
        assert.equal(
          entryUrl.href,
          pathToFileURL(workerEntryPath).href,
          "the built pool resolves its own worker-entry.js beside it",
        );
        assert.equal(existsSync(workerEntryPath), true, "the built worker-entry.js exists");
    
        sandbox = built.createWorkerSandbox({ size: 1 });
        assert.equal(sandbox.size, 1, "the built pool reports the requested size");
    
        const result: SandboxResult = await sandbox.run(NORMALIZE, INPUT, LIM, OPT);
        assert.equal(
          result.ok,
          true,
          result.ok ? "the built run succeeds" : `the built run faulted: ${result.fault.code}: ${result.fault.message}`,
        );
        if (result.ok) {
          assert.deepEqual(result.value, NORMALIZE_VALUE, "the built worker answered the normalize body");
        }
      } finally {
        if (sandbox !== undefined) {
          await sandbox.close();
    [cut: 4 more lines]

Diff of src/sandbox/built.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/sandbox/built.test.ts b/src/sandbox/built.test.ts
    new file mode 100644
    index 0000000..fdb7750
    --- /dev/null
    +++ b/src/sandbox/built.test.ts
    @@ -0,0 +1,122 @@
    +import assert from "node:assert/strict";
    +import { execFile } from "node:child_process";
    +import { existsSync } from "node:fs";
    +import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
    +import { join } from "node:path";
    +import { test } from "node:test";
    +import { fileURLToPath, pathToFileURL } from "node:url";
    +
    +import type {
    +  SandboxJson,
    +  SandboxLimits,
    +  SandboxOptions,
    +  SandboxResult,
    +  WorkerSandbox,
    +  WorkerSandboxOptions,
    +} from "./index.ts";
    +
    +const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
    +
    +const BUILD_CACHE = join(REPO_ROOT, "node_modules", ".cache");
    +
    +const TSC = join(REPO_ROOT, "node_modules", "typescript", "bin", "tsc");
    +
    +const BUILD_TIMEOUT_MS = 60000;
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
    [cut: 88 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-code-sandbox/.l4/held/3.8-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 1 files (the whole patch is in `openspec/changes/add-code-sandbox/.l4/held/3.8-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: accept: The held evidence is enough. The new built-worker test is not vacuous: it asserts that tsc exits 0, that the built pool's workerEntryUrl resolves to the file URL of an existing worker-entry.js beside pool.js, that the built pool reports size 1, and that a real run of the normalize body returns ok true with the exact normalize value, with no workerFactory supplied. The behaviour it checks is in the unit head: tsconfig.build.json compiles src without the test files into the chosen outDir with relative .ts imports rewritten to .js, limits.ts maps a .js module URL to worker-entry.js, pool.ts spawns a real Worker at workerEntryUrl(import.meta.url) when no factory is given, and worker-entry.ts answers each job through runCode. The base run could only end in an error because the base branch carries the milestone scaffold stub of the sandbox, whose createWorkerSandbox throws before any assertion runs, so the inconclusive result reflects the scaffold, not the test. tasks.md states that this test is green on arrival by design and that a failure is a build defect to fix in src/sandbox, so a passing real run is the intended evidence. The replay still runs every gate, so a build defect would be caught there.
