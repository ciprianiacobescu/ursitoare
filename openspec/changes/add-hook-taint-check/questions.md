# Questions — add-hook-taint-check

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
| Q-001 | answered | 2.1 | harness | Task 2.1: the pre-satisfied check could not decide |
| Q-002 | open | none | verdict | Criterion C-be8bdbfa (taint › Hooks add taint and never remove it › Hook references, widening and flow rules): accept as satisfied? |
<!-- l4:index:end -->

---

## Q-001: Task 2.1: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.1
- **Kind:** harness
- **Asked:** 2026-11-08T17:33Z by claude-sonnet, run r-20261108T1636Z-0d2a, task 2.1
- **Criteria:** C-4f58ed6e (flow-validation › Taint uses the shared algebra › Hook edges that stay allowed)

### Context
L4 could not run the pre-satisfied check of task 2.1, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and src/authoring/validate/hook-taint.test.ts is not a Python file; the base run: every new test passes against the unit base code too
Runs: test-base-run
Kept real: nothing
Tests: src.authoring.validate.hook-taint.test.ts::C-4f58ed6e hook edges that stay allowed give no taint error

Changes the replay applies (2 files):
    added src/authoring/validate/hook-taint.test.ts
    modified src/authoring/validate/taint.test.ts

Source of the tests (redacted; at most 40 lines each):
src.authoring.validate.hook-taint.test.ts::C-4f58ed6e hook edges that stay allowed give no taint error:
    test("C-4f58ed6e hook edges that stay allowed give no taint error", () => {
      const edits: Array<(d: Doc) => void> = [
        (d) => {
          node(d, "send").pre = [
            { id: "peek", kind: "code", source: "return;", input: { raw: "${{ nodes.fetch.output.content }}" } },
          ];
        },
        (d) => {
          node(d, "extract").pre = [
            { id: "look", kind: "block", uses: "kb.search@1", with: { query: "${{ nodes.fetch.output.content }}" } },
          ];
        },
        (d) => {
          node(d, "send").pre = [
            { id: "note", kind: "block", uses: "mail.send@1", with: mail("${{ nodes.extract.output.summary }}") },
          ];
        },
        (d) => {
          node(d, "extract").pre = [
            { id: "ghost", kind: "block", uses: "nope.tool@1", with: { x: "${{ nodes.fetch.output.content }}" } },
          ];
        },
        (d) => {
          node(d, "fetch").post = [
            {
              id: "tell",
              kind: "block",
              uses: "slack.post_message@1",
              with: { channel: "#ap", text: "${{ hook.node.id }}" },
            },
          ];
        },
      ];
      const results = edits.map((e) => check(e));
      for (const r of results) {
        assert.deepEqual(l3(r), []);
        assert.deepEqual(r.layers_run, ["L1", "L2", "L3", "H"]);
      }
      for (const i of [0, 1, 2, 4]) {
        assert.equal(results[i]?.ok, true, `N${i + 1}`);
    [cut: 9 more lines]

Diff of src/authoring/validate/hook-taint.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/authoring/validate/hook-taint.test.ts b/src/authoring/validate/hook-taint.test.ts
    new file mode 100644
    index 0000000..003b971
    --- /dev/null
    +++ b/src/authoring/validate/hook-taint.test.ts
    @@ -0,0 +1,253 @@
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +
    +import { parseFlowText } from "../format/index.ts";
    +import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
    +import { caseCatalogue, flowCases } from "../../../test/support/flow-cases/index.ts";
    +import type { Issue, ValidationResult } from "./types.ts";
    +import { validateFlow } from "./validate.ts";
    +
    +assert.equal(typeof validateFlow, "function");
    +
    +const HB = `
    +ursitoare: "0.1"
    +flow: hook-taint
    +version: 1.0.0
    +inputs: { type: object, properties: { url: { type: string } }, required: [url] }
    +start: fetch
    +nodes:
    +  fetch: { kind: block, uses: docs.fetch@1, with: { url: "\${{ inputs.url }}" }, next: extract }
    +  extract:
    +    kind: llm.extract
    +    input: { text: "\${{ nodes.fetch.output.content }}" }
    +    instructions: Extract the summary.
    +    output_schema: { type: object, properties: { summary: { type: string } }, required: [summary] }
    +    next: send
    +  send: { kind: block, uses: mail.send@1, with: { to: ops@example.com, subject: Digest, body: "\${{ nodes.extract.output.summary }}" }, next: done }
    +  done: { kind: end, status: completed }
    +`;
    +
    +type Doc = { nodes: Record<string, Record<string, unknown>>; hooks?: unknown[] };
    +
    +function base(): Doc {
    +  const parsed = parseFlowText(HB, "yaml");
    +  assert.equal(parsed.ok, true);
    [cut: 219 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-hook-taint-check/.l4/held/2.1-pre_satisfied.patch` on the unit branch]

Diff of src/authoring/validate/taint.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/authoring/validate/taint.test.ts b/src/authoring/validate/taint.test.ts
    index e1329da..0ce4461 100644
    --- a/src/authoring/validate/taint.test.ts
    +++ b/src/authoring/validate/taint.test.ts
    @@ -147,6 +147,17 @@ test("C-f97887e5 hook edges are not checked", () => {
       assert.doesNotThrow(() => {
         r = validateFlow(doc, caseCatalogue());
       });
    -  assert.deepEqual(r?.errors, []);
    +  assert.equal(r?.ok, false);
    +  assert.deepEqual(r?.errors, [
    +    {
    +      layer: "L3",
    +      code: "L3_TAINT_TO_CONSEQUENTIAL",
    +      node: "extract",
    +      path: "/nodes/extract/pre/0/with/body",
    +      message:
    +        "untrusted data from fetch reaches hook h on extract through nodes.fetch.output.content, a block with side effects; pass it through an llm.extract node first",
    +    },
    +  ]);
       assert.deepEqual(r?.warnings, []);
    +  assert.deepEqual(r?.layers_run, ["L1", "L2", "L3"]);
     });

`accept: <why>` replays exactly the saved change of 2 files (the whole patch is in `openspec/changes/add-hook-taint-check/.l4/held/2.1-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: The held test traces the scenario "Hook edges that stay allowed", which the unit designs as a guard that passes at red: tasks.md task 2.1 says N1 to N5 "pass at red as guards", and the test plan reports the same values for them. Its passing against the base code is therefore the planned behaviour of a negative scenario, not a sign of a pre-satisfied criterion. The base validator already skips every hook edge (taint-checks.ts line 33) and already runs layer H after a clean L3 when hooks are declared (validate.ts lines 64 to 66), so L3ERR empty, layers_run with H and N4's H_BLOCK error are base behaviour, exactly as the spec scenario states. The positive tests P1 to P4 of the same file are not held, so they fail at base and carry the discriminating assertions of task 2.1. A retry would not help: the zero-value run varies Python files only, which is a fixed limitation for a TypeScript test. The evidence of the real base run is enough; replay the saved change.

---

## Q-002: Criterion C-be8bdbfa (taint › Hooks add taint and never remove it › Hook references, widening and flow rules): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-be8bdbfa (taint › Hooks add taint and never remove it › Hook references, widening and flow rules)

### Context
Criterion C-be8bdbfa (taint › Hooks add taint and never remove it › Hook references, widening and flow rules) is needs human after round 1.

Scenario:
\- **WHEN** the test analyzes the hook sample with catalogue C (test-plan.md § Hook sample: nodes `fetch`, `ex`, `ex2`, `lk`, `pay`, `done` and the rules `guard`, `audit`, `idle`)
\- **THEN** `ex` (post code hook) has `input` `["untrusted"]` and `output` `["extracted", "untrusted"]`; `ex2` (pre block hook only) has `["untrusted"]` and `["extracted"]`; `pay` has `["untrusted"]` and `["untrusted"]`; `fetch`, `lk` and `done` have `[]` and `[]`, so `idle` changed nothing and `guard` did not reach `lk`
\- **THEN** `edges` has 12 entries; the seven with a non-null `hook` are, in order, as `to` `path` (`ref`, `from`, `taint`, `hook`): `done` `/hooks/1/pre/with/v` (`nodes.fetch.output.raw_text`, `fetch`, `["untrusted"]`, `a`); `done` `/hooks/1/pre/with/s` (`hook.input.x`, `null`, `[]`, `a`); `ex2` `/nodes/ex2/pre/0/with/z` (`hook.input.t`, `null`, `["untrusted"]`, `note`); `fetch` `/nodes/fetch/post/0/with/text` (`hook.output.raw_text`, `fetch`, `["untrusted"]`, `tell`), `.../with/id` (`hook.output.id`, `fetch`, `[]`, `tell`) and `.../with/who` (`hook.node.id`, `null`, `[]`, `tell`); `pay` `/hooks/0/pre/input/raw` (`nodes.fetch.output.raw_text`, `fetch`, `["untrusted"]`, `g`); all have `resolved` `true`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: src.authoring.taint.hooks.test.ts::C-be8bdbfa Hook references widening and flow rules (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
