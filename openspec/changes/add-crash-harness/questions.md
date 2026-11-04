# Questions — add-crash-harness

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
| Q-001 | answered | 4.1 | harness | Task 4.1: the pre-satisfied check could not decide |
| Q-002 | answered | none | verdict | Criterion C-0f1c4174 (test-crash-harness › A scenario child starts with a closed environment and reports ready › Option errors and start failures): accept as satisfied? |
| Q-003 | answered | none | verdict | Finding F-2c3fda0e: spawnEngine accepts non-plain args objects |
| Q-004 | answered | none | verdict | Finding F-fb0ff054: Duplicate part names leak the first part handle |
<!-- l4:index:end -->

---

## Q-001: Task 4.1: the pre-satisfied check could not decide

- **Status:** answered
- **Blocking tasks:** 4.1
- **Kind:** harness
- **Asked:** 2026-11-04T00:24Z by deepseek-free, run r-20261103T2229Z-1f61, task 4.1
- **Criteria:** C-dfcb53d2 (test-crash-harness › A scenario child starts with a closed environment and reports ready › Ready, environment, arguments, log)

### Context
L4 could not run the pre-satisfied check of task 4.1, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and test/support/crash/engine.test.ts is not a Python file; the base run: its new tests fail against the unit base code only by an error, not by assertion
Runs: test-base-run
Kept real: nothing
Tests: test.support.crash.engine.test.ts::C-dfcb53d2: a spawned child starts closed with its arguments and writes the ready line

Changes the replay applies (1 files):
    added test/support/crash/engine.test.ts

Source of the tests (redacted; at most 40 lines each):
test.support.crash.engine.test.ts::C-dfcb53d2: a spawned child starts closed with its arguments and writes the ready line:
    test("C-dfcb53d2: a spawned child starts closed with its arguments and writes the ready line", async () => {
      const root = tempRoot();
      const dataDir = join(root, "data");
      mkdirSync(dataDir, { recursive: true });
      const cluster = clusterFor(dataDir, { URSITOARE_PROBE: "p1", L4_X: "leak" });
      const scenario = scenarioFile(root, "probe.mjs", PROBE);
      const parentPath = process.env["PATH"];
      const parentHome = process.env["HOME"];
      const previousParentOnly = process.env["CRASH_PARENT_ONLY"];
      process.env["CRASH_PARENT_ONLY"] = "parent-only";
    
      let first: EngineProcess | undefined;
      let second: EngineProcess | undefined;
    
      try {
        first = await spawnEngine({ cluster, scenario, faultPoints: ["before:x"], args: { a: "1" } });
        assert.ok(Number.isInteger(first.pid) && first.pid > 0, "the engine reports a positive pid");
        assert.equal(isAlive(first.pid), true, "the engine process is alive");
        assert.equal(first.deaths, 0, "a running child has no deaths");
    
        const probe = readJson(join(dataDir, "probe.json"));
        assert.ok(
          typeof probe["version"] === "string" && probe["version"].startsWith("v24."),
          "the child runs Node 24",
        );
        assert.deepEqual(probe["args"], { a: "1" });
        assert.deepEqual(probe["armed"], ["before:x"]);
        assert.equal(probe["dataDir"], cluster.dataDir);
    
        const env = probe["env"] as Record<string, string>;
        const ctxEnv = probe["ctxEnv"] as Record<string, string>;
        assert.equal(env["URSITOARE_PROBE"], "p1");
        assert.equal(ctxEnv["URSITOARE_PROBE"], "p1");
        if (parentPath !== undefined) {
          assert.equal(env["PATH"], parentPath, "the child keeps the parent PATH");
        }
        if (parentHome !== undefined) {
          assert.equal(env["HOME"], parentHome, "the child keeps the parent HOME");
        }
        for (const keys of [Object.keys(env), Object.keys(ctxEnv)]) {
    [cut: 45 more lines]

Diff of test/support/crash/engine.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/test/support/crash/engine.test.ts b/test/support/crash/engine.test.ts
    new file mode 100644
    index 0000000..a5403b6
    --- /dev/null
    +++ b/test/support/crash/engine.test.ts
    @@ -0,0 +1,330 @@
    +import assert from "node:assert/strict";
    +import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
    +import os from "node:os";
    +import { join } from "node:path";
    +import { after, test } from "node:test";
    +
    +import { E2eStackError } from "../e2e-stack/part.ts";
    +import type { CrashCluster } from "./cluster.ts";
    +import {
    +  READY_TIMEOUT_MS,
    +  spawnEngine,
    +  spawnEngineTuned,
    +  type EngineProcess,
    +} from "./engine.ts";
    +
    +const tempDirs: string[] = [];
    +
    +after(() => {
    +  for (const dir of tempDirs) {
    +    rmSync(dir, { recursive: true, force: true });
    +  }
    +});
    +
    +function tempRoot(): string {
    +  const dir = mkdtempSync(join(os.tmpdir(), "crash-engine-"));
    +  tempDirs.push(dir);
    +  return dir;
    +}
    +
    +function clusterFor(dataDir: string, env: Readonly<Record<string, string>> = {}): CrashCluster {
    +  return {
    +    env,
    +    ownerUrl: "postgres://owner@127.0.0.1:1/ursitoare",
    +    appEndpoint: {
    [cut: 296 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-crash-harness/.l4/held/4.1-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 1 files (the whole patch is in `openspec/changes/add-crash-harness/.l4/held/4.1-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: the orchestrator checked the captured test (held patch 4.1-pre_satisfied.patch) against the scenario 'Ready, environment, arguments, log', clause by clause. It asserts every clause:
- a live positive pid and deaths 0;
- version v24., args {a:'1'}, armed ['before:x'] and dataDir;
- URSITOARE_PROBE p1 in both env and ctxEnv;
- PATH and HOME equal to the parent's;
- no L4_X, no CRASH_PARENT_ONLY and no L4_ key in env or ctxEnv;
- the probe line and CRASH_READY in engine.log;
- no HOME on a second spawn after HOME is deleted.
It reads the child's own probe.json, so it checks real behaviour. It fails at the unit base only by error because spawnEngine is the scaffold stub there, and the base run reported 'fail only by an error', not 'pass'.

---

## Q-002: Criterion C-0f1c4174 (test-crash-harness › A scenario child starts with a closed environment and reports ready › Option errors and start failures): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-0f1c4174 (test-crash-harness › A scenario child starts with a closed environment and reports ready › Option errors and start failures)

### Context
Criterion C-0f1c4174 (test-crash-harness › A scenario child starts with a closed environment and reports ready › Option errors and start failures) is needs human after round 1.

Scenario:
\- **WHEN** `spawnEngine` runs with a relative `scenario`, a missing `scenario` file, `faultPoints: ["pay"]` and `args: { a: 1 }` (cast), and `spawnEngineTuned` with a valid scenario and `readyTimeoutMs` `0`, `-1`, `1.5`, `NaN`, `600001`; then with test-written scenarios that throw an error with `code` `"E_X"`, return without `ready()`, export no `start`, hold a syntax error, and write `fatal thing` with `writeSync(2, ...)` then `process.exit(3)`; then `spawnEngineTuned` with `1500` runs on a scenario whose `start` never settles; and `READY_TIMEOUT_MS` is read
\- **THEN** the first nine reject `E2eStackError` `CRASH_OPTIONS_INVALID` with `details.field` `scenario`, `scenario`, `faultPoints`, `args`, and the five bad timeouts with `readyTimeoutMs`; no child was spawned and no `engine.log` exists; the next five scripted ones reject `CRASH_START_FAILED` with `details.reason` `exited`, `details.line` `crash-child: scenario_failed E_X`, `crash-child: scenario_not_ready`, `crash-child: scenario_invalid`, `crash-child: scenario_unloadable`, `fatal thing` and `details.exitCode` `1`, `1`, `1`, `1`, `3`; the hanging one rejects with `details.reason` `timeout` and a `details.pid` that is dead; `READY_TIMEOUT_MS` is `30000`

Why: judge fail counted as insufficient_evidence: counterexample unexecuted (not executed in M0: the verifier worktree is M1 (verifier 1.5))
Judge: fail
Tracing tests: test.support.crash.engine.test.ts::C-0f1c4174: a child that cannot become ready rejects with its failure line and no live process (passed, pre_satisfied); test.support.crash.engine.test.ts::C-0f1c4174: unusable spawn options are refused before a child or a log exists (passed, pre_satisfied)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as written. validateOptions runs before any directory, log or child exists and names scenario, faultPoints, args and readyTimeoutMs with the bounds the scenario gives; the child writes one stderr line and exits 1 for scenario_failed, scenario_not_ready, scenario_invalid and scenario_unloadable, the parent keeps the last non-empty stderr line and the exit code in CRASH_START_FAILED, a ready timeout SIGKILLs the child and rejects with reason timeout and the dead pid, and READY_TIMEOUT_MS is 30000. The two tracing tests assert every clause of the scenario, including the five failure lines, the exit codes 1, 1, 1, 1, 3, the dead timed-out pid and the absent engine.log, and both passed. The judge's fail came only from an unexecuted counterexample about non-plain args objects, which this scenario does not pin down.
---

## Q-003: Finding F-2c3fda0e: spawnEngine accepts non-plain args objects

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-0f1c4174).

Title: spawnEngine accepts non-plain args objects
Detail: The spawn boundary must accept a plain object of string values. test/support/crash/engine.ts validates only that args is a non-null non-array object with string Object.values, so Date and class instances are accepted and silently spread into an empty payload object.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-0f1c4174 as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The finding is waived. The args option is typed Readonly<Record<string, string>> on a test-only harness, so a Date or class instance reaches validateOptions only through an explicit cast in test code. The validation refuses a non-object, null, an array and any non-string own value, which is what the specification's scenario pins down with args { a: 1 }; an object with string own fields is copied correctly, and the child re-validates the payload. An empty args from a Date has no effect on production code, no security impact and no scenario that it breaks, so a fix unit is not warranted.
---

## Q-004: Finding F-fb0ff054: Duplicate part names leak the first part handle

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-5f05917f). It reports behaviour that no scenario pins down.

Title: Duplicate part names leak the first part handle
Detail: startCrashCluster stores handles by name. A later successfully started part with the same name overwrites the first handle; shutdown iterates the duplicate names and closes the final handle twice while leaving the first handle unclosed.
Suggested fix: WHEN startCrashCluster receives two successfully started parts with the same name THEN it overwrites the first handle and closes the second handle twice without closing the first handle.
The suggested fix describes what the code does now, and a reject does not use it: to pin that behaviour, end the reason with it.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-5f05917f as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The finding is waived. Part names are the key of the e2e stack's handle map by contract: PartContext.handles is a ReadonlyMap keyed by name and parts find each other through it, so two parts with one name are unsupported everywhere in the stack. Both discoverParts and the part registry reject a duplicate name with STACK_PART_DUPLICATE before startCrashCluster sees the list, and withDedicatedCluster passes only the discovered list. startCrashCluster stores and closes handles exactly as startE2eStack does, which design decision 5 asks for. No scenario pins the duplicate-name case, and a test handing in two same-named fakes would be misusing the part model, not exposing a defect of this unit.
