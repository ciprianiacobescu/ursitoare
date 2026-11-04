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
