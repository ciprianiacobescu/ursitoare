# Questions — add-pdp-cedar-fix-2

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
| Q-001 | answered | 1.1 | harness | Task 1.1: the test chore discrimination check could not decide |
<!-- l4:index:end -->

---

## Q-001: Task 1.1: the test chore discrimination check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 1.1
- **Kind:** harness
- **Asked:** 2026-10-28T18:25Z by glm, run r-20261028T1818Z-7356, task 1.1

### Context
L4 could not run the test chore discrimination check of task 1.1, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: neither run could be made: the zero-value run and the base run vary Python production files only, and the tests import no Python module of the project and the unit changed no Python production file
Runs: none
Kept real: nothing
Tests: src.pdp.malformed.m8.test.ts::C-50748953 the M8 policy of the design names an undeclared action in the action scope, src.pdp.malformed.m8.test.ts::C-50748953 the undeclared action of the design M8 is a policy fault not a parse fault

Changes the replay applies (1 files):
    added src/pdp/malformed.m8.test.ts

Source of the tests (redacted; at most 40 lines each):
src.pdp.malformed.m8.test.ts::C-50748953 the M8 policy of the design names an undeclared action in the action scope:
    (the source of this test was not found)
src.pdp.malformed.m8.test.ts::C-50748953 the undeclared action of the design M8 is a policy fault not a parse fault:
    (the source of this test was not found)

Diff of src/pdp/malformed.m8.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/pdp/malformed.m8.test.ts b/src/pdp/malformed.m8.test.ts
    new file mode 100644
    index 0000000..484d215
    --- /dev/null
    +++ b/src/pdp/malformed.m8.test.ts
    @@ -0,0 +1,65 @@
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +
    +import { fixedClock, sequentialIds } from "../core/index.ts";
    +import { createLogger } from "../observability/index.ts";
    +import { PdpError, createPdp } from "./index.ts";
    +import type { PolicySource } from "./types.ts";
    +
    +const SCHEMA = `entity Role;
    +entity User in [Role];
    +entity Tool { effect: String };
    +entity Doc { owner: User, locked: Bool };
    +action read, write, send appliesTo {
    +  principal: User, resource: Doc, context: { n: Long, tool: Tool, amount?: decimal } };
    +`;
    +
    +// The M8 text of design.md § Test plan: an undeclared action in the action scope.
    +const M8_DESIGN = '@id("bad") permit (principal, action == Action::"reed", resource);';
    +
    +function silentLogger() {
    +  return createLogger({
    +    level: "silent",
    +    destination: {
    +      write(_line: string): void {},
    +    },
    +  });
    +}
    +
    +function create(source: PolicySource) {
    +  return createPdp({
    +    schema: SCHEMA,
    +    policies: [source],
    +    clock: fixedClock("2026-10-25T09:00:00Z"),
    +    ids: sequentialIds(),
    [cut: 31 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-pdp-cedar-fix-2/.l4/held/1.1-tests.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 1 files (the whole patch is in `openspec/changes/add-pdp-cedar-fix-2/.l4/held/1.1-tests.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: The check could not run for a structural reason, not for a fault of the change: the discrimination check varies Python production files only, while this project's test gate is pnpm run test over Node *.test.ts files and the task changed only a TypeScript test file, so a retry would end the same way. I read the whole saved change. Its two tests call createPdp with the exact M8 text of design.md § Test plan as the only policy of source m-src and assert, inside assert.rejects, that the rejection is a PdpError with code PDP_POLICY_INVALID, details.stage validate, details.ids ["bad"], message PDP_POLICY_INVALID: validate bad, and not the parse stage with ids ["m-src"]. createPdp calls loadPolicySet, whose strictValidate stage is the only place that fails with stage validate and the policy id, so a stub that resolves, a loader that skips validation, or one that reports the source id would fail these tests by assertion. The tests discriminate and are the kind of Node test AGENTS.md asks for. Counting them on the evidence of the real run is safe: the replay still runs every gate, and a failing gate uses the accept up.
