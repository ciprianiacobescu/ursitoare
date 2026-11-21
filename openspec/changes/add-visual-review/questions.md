# Questions — add-visual-review

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
| Q-001 | answered | 1.1 | harness | Task 1.1: the pre-satisfied check could not decide |
| Q-002 | answered | 1.1 | harness | Task 1.1: the pre-satisfied check could not decide |
| Q-003 | answered | none | verdict | Criterion C-54891f4b (web-design-system › Every page is photographed only when loaded, with a clean check › Every page leaves a loaded screenshot and no CSP message): accept as satisfied? |
| Q-004 | answered | none | verdict | Criterion C-0462bba1 (web-design-system › The flow workspace is beside, complete and at most 3,000 px tall › The workspace of demo-ui is two columns and at most 3,000 px tall): accept as satisfied? |
| Q-005 | open | none | verdict | Criterion C-1beceb27 (web-design-system › A test run from the form reaches a readable run page › Alice starts a test run from the form and reads the run): accept as satisfied? |
| Q-006 | open | none | verdict | Criterion C-de5dc745 (web-design-system › The lists and the home page show the finished run › Runs, home and the graph page show alice's work): accept as satisfied? |
| Q-007 | open | none | verdict | Hold H-527bcb10: UI criterion C-8ac052fa has no end-to-end test; see the generated UI tests table |
| Q-008 | open | none | verdict | Hold H-5c490932: UI criterion C-54891f4b has no end-to-end test; see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-0de5f245: UI criterion C-0462bba1 has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-0bc13fcf: UI criterion C-1beceb27 has no end-to-end test; see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-02e09269: UI criterion C-de5dc745 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Task 1.1: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 1.1
- **Kind:** harness
- **Asked:** 2026-11-21T09:05Z by deepseek-free, run r-20261121T0829Z-500c, task 1.1
- **Criteria:** C-8ac052fa (web-design-system › The journey lists every page of every role › The journey lists every page of every role and keeps its checks)

### Context
L4 could not run the pre-satisfied check of task 1.1, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and web/src/visual-pages.test.ts is not a Python file; the base run: every new test passes against the unit base code too
Runs: test-base-run
Kept real: nothing
Tests: web.src.visual-pages.test.ts::C-8ac052fa the journey lists every page of every role and keeps its checks

Changes the replay applies (2 files):
    added e2e/test_m6b_ui.py
    added web/src/visual-pages.test.ts

Source of the tests (redacted; at most 40 lines each):
web.src.visual-pages.test.ts::C-8ac052fa the journey lists every page of every role and keeps its checks:
    test("C-8ac052fa the journey lists every page of every role and keeps its checks", () => {
      assert.ok(existsSync(JOURNEY), "e2e/test_m6b_ui.py must exist");
      const source = readFileSync(JOURNEY, "utf8");
      const homeSource = readFileSync(HOME, "utf8");
      const rows: PageTables = { ADMIN_PAGES, TOOL_PAGES, FLOW_PAGES, RUN_PAGES };
    
      const pages = visualPages(source);
      assert.ok(pages !== null, "the journey holds the VISUAL_PAGES literal");
      assert.deepEqual(pages["signed-out"], ["/", "/sign-in", "/no-such-page"]);
      assert.equal(requiredPaths(rows, homeSource).length, 13);
      assert.doesNotThrow(() => {
        assert.deepEqual(journeyProblems(source, rows, homeSource), []);
      });
    
      const renamed = source.split('"/admin/grants"').join('"/x"');
      assert.deepEqual(journeyProblems(renamed, rows, homeSource), ["no page for /admin/grants"]);
    
      const unwatched = source.split("watch_csp(").join("watch(");
      assert.deepEqual(journeyProblems(unwatched, rows, homeSource), ["missing watch_csp("]);
    
      assert.deepEqual(journeyProblems("", rows, homeSource), ["VISUAL_PAGES is missing"]);
    });

Diff of e2e/test_m6b_ui.py (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/e2e/test_m6b_ui.py b/e2e/test_m6b_ui.py
    new file mode 100644
    index 0000000..318e321
    --- /dev/null
    +++ b/e2e/test_m6b_ui.py
    @@ -0,0 +1,521 @@
    +"""The M6b closing journey: every page of every role, checked and photographed."""
    +
    +import json
    +import os
    +import re
    +import struct
    +from pathlib import Path
    +
    +import pytest
    +from playwright.sync_api import Page, expect
    +
    +from conftest import assert_accessible, assert_layout, login, watch_csp
    +
    +WIDE = {"width": 1366, "height": 860}
    +NARROW = {"width": 900, "height": 800}
    +MAX_BANNER_PX = 72
    +MAX_FLOW_PAGE_PX = 3000
    +REPO_ROOT = Path(__file__).resolve().parent.parent
    +VISUAL_DIR = Path(os.environ.get("E2E_VISUAL_DIR") or REPO_ROOT / ".l4-out" / "visual")
    +
    +DEMO_UI = "\n".join(
    +    [
    +        'ursitoare: "0.1"',
    +        "flow: demo-ui",
    +        "version: 1.0.0",
    +        "inputs:",
    +        "  type: object",
    +        "  properties:",
    +        "    vendor_name: { type: string }",
    +        "    amount: { type: number }",
    +        "  required: [vendor_name, amount]",
    +        "start: lookup",
    +        "nodes:",
    +        '  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: route }',
    [cut: 487 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-visual-review/.l4/held/1.1-pre_satisfied.patch` on the unit branch]

Diff of web/src/visual-pages.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/web/src/visual-pages.test.ts b/web/src/visual-pages.test.ts
    new file mode 100644
    index 0000000..488fcd5
    --- /dev/null
    +++ b/web/src/visual-pages.test.ts
    @@ -0,0 +1,159 @@
    +/// <reference types="node" />
    +import assert from "node:assert/strict";
    +import { existsSync, readFileSync } from "node:fs";
    +import { test } from "node:test";
    +
    +import { ADMIN_PAGES } from "./admin/pages.ts";
    +import { FLOW_PAGES } from "./flows/pages.ts";
    +import { RUN_PAGES } from "./runs/pages.ts";
    +import { TOOL_PAGES } from "./tools/pages.ts";
    +
    +interface PageRow {
    +  readonly path: string;
    +  readonly navLabel: string | null;
    +}
    +
    +interface PageTables {
    +  readonly ADMIN_PAGES: readonly PageRow[];
    +  readonly TOOL_PAGES: readonly PageRow[];
    +  readonly FLOW_PAGES: readonly PageRow[];
    +  readonly RUN_PAGES: readonly PageRow[];
    +}
    +
    +const JOURNEY = new URL("../../e2e/test_m6b_ui.py", import.meta.url);
    +const HOME = new URL("./features/10-home.tsx", import.meta.url);
    +const LITERAL = "VISUAL_PAGES: dict[str, list[str]] = {";
    +const ROLES = ["signed-out", "alice", "carol"] as const;
    +const NEEDLES = [
    +  "watch_csp(",
    +  "assert_layout(",
    +  "assert_accessible(",
    +  "E2E_VISUAL_DIR",
    +  '".l4-out"',
    +  '"width": 1366',
    +  '"height": 860',
    [cut: 125 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-visual-review/.l4/held/1.1-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 2 files (the whole patch is in `openspec/changes/add-visual-review/.l4/held/1.1-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: The inconclusive result is the one the unit's own documents predicted, and the real run is enough evidence. Both files of task 1.1 match the test globs of the repository's L4 configuration, so the unit changes no production file and the zero-value run has nothing to vary; the base run passing is what tasks.md and design.md say must happen for a unit made only of tests. The Node test discriminates on its own through the T3 mutation rows: J0 checks the real journey against the real page tables, which give exactly 13 required paths from the home feature, four admin pages, three tool pages, the flows and runs list pages and the three detail routes; J1 renames every quoted /admin/grants in the journey text and expects exactly one missing-page problem, J2 renames the only watch_csp( call and expects exactly one missing-needle problem, and J3 feeds empty text and expects the literal to be reported missing. I read the saved patch and confirmed that the journey holds every needle, the three milestone marks, no banned wait or skip, and the roles in the required order, so the real run is a real check and not a vacuous pass. Count the held test on the evidence of the real run; the three browser tests stay with the verifier, as the unit's documents say.

---

## Q-002: Task 1.1: the pre-satisfied check could not decide

- **Status:** answered
- **Blocking tasks:** 1.1
- **Kind:** harness
- **Asked:** 2026-11-21T09:50Z by deepseek-free, run r-20261121T0908Z-8d27, task 1.1
- **Criteria:** C-8ac052fa (web-design-system › The journey lists every page of every role › The journey lists every page of every role and keeps its checks)

### Context
L4 could not run the pre-satisfied check of task 1.1, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and web/src/visual-pages.test.ts is not a Python file; the base run: every new test passes against the unit base code too
Runs: test-base-run
Kept real: nothing
Tests: web.src.visual-pages.test.ts::C-8ac052fa the journey lists every page of every role and keeps its checks

Changes the replay applies (2 files):
    added e2e/test_m6b_ui.py
    added web/src/visual-pages.test.ts

Source of the tests (redacted; at most 40 lines each):
web.src.visual-pages.test.ts::C-8ac052fa the journey lists every page of every role and keeps its checks:
    test("C-8ac052fa the journey lists every page of every role and keeps its checks", () => {
      assert.ok(existsSync(JOURNEY), "e2e/test_m6b_ui.py must exist");
      const source = readFileSync(JOURNEY, "utf8");
      const homeSource = readFileSync(HOME, "utf8");
      const rows: PageTables = { ADMIN_PAGES, TOOL_PAGES, FLOW_PAGES, RUN_PAGES };
    
      const pages = visualPages(source);
      assert.ok(pages !== null, "the journey holds the VISUAL_PAGES literal");
      assert.deepEqual(pages["signed-out"], ["/", "/sign-in", "/no-such-page"]);
      assert.equal(requiredPaths(rows, homeSource).length, 13);
      assert.doesNotThrow(() => {
        assert.deepEqual(journeyProblems(source, rows, homeSource), []);
      });
    
      const renamed = source.split('"/admin/grants"').join('"/x"');
      assert.deepEqual(journeyProblems(renamed, rows, homeSource), ["no page for /admin/grants"]);
    
      const unwatched = source.split("watch_csp(").join("watch(");
      assert.deepEqual(journeyProblems(unwatched, rows, homeSource), ["missing watch_csp("]);
    
      assert.deepEqual(journeyProblems("", rows, homeSource), ["VISUAL_PAGES is missing"]);
    });

Diff of e2e/test_m6b_ui.py (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/e2e/test_m6b_ui.py b/e2e/test_m6b_ui.py
    new file mode 100644
    index 0000000..25c0f7a
    --- /dev/null
    +++ b/e2e/test_m6b_ui.py
    @@ -0,0 +1,532 @@
    +"""The M6b closing journey: every page of every role, checked and photographed."""
    +
    +import json
    +import os
    +import re
    +import struct
    +from pathlib import Path
    +
    +import pytest
    +from playwright.sync_api import Page, expect
    +
    +from conftest import assert_accessible, assert_layout, login, watch_csp
    +
    +WIDE = {"width": 1366, "height": 860}
    +NARROW = {"width": 900, "height": 800}
    +MAX_BANNER_PX = 72
    +MAX_FLOW_PAGE_PX = 3000
    +
    +_REPO_ROOT = Path(__file__).resolve().parent.parent
    +VISUAL_DIR = Path(os.environ.get("E2E_VISUAL_DIR") or (_REPO_ROOT / ".l4-out" / "visual"))
    +
    +VISUAL_PAGES: dict[str, list[str]] = {
    +    "signed-out": ["/", "/sign-in", "/no-such-page"],
    +    "alice": [
    +        "/",
    +        "/flows",
    +        "/flows/demo-ui",
    +        "/runs/{run_id}",
    +        "/runs",
    +        "/flows/demo-ui/graph",
    +    ],
    +    "carol": [
    +        "/",
    +        "/admin/users",
    [cut: 498 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-visual-review/.l4/held/1.1-pre_satisfied.patch` on the unit branch]

Diff of web/src/visual-pages.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/web/src/visual-pages.test.ts b/web/src/visual-pages.test.ts
    new file mode 100644
    index 0000000..f1dec0a
    --- /dev/null
    +++ b/web/src/visual-pages.test.ts
    @@ -0,0 +1,130 @@
    +/// <reference types="node" />
    +import assert from "node:assert/strict";
    +import { existsSync, readFileSync } from "node:fs";
    +import { test } from "node:test";
    +
    +import { ADMIN_PAGES } from "./admin/pages.ts";
    +import { FLOW_PAGES } from "./flows/pages.ts";
    +import { RUN_PAGES } from "./runs/pages.ts";
    +import { TOOL_PAGES } from "./tools/pages.ts";
    +
    +const JOURNEY = new URL("../../e2e/test_m6b_ui.py", import.meta.url);
    +const HOME = new URL("./features/10-home.tsx", import.meta.url);
    +
    +interface PageRow {
    +  path: string;
    +  navLabel: string | null;
    +}
    +
    +interface PageTables {
    +  ADMIN_PAGES: readonly PageRow[];
    +  TOOL_PAGES: readonly PageRow[];
    +  FLOW_PAGES: readonly PageRow[];
    +  RUN_PAGES: readonly PageRow[];
    +}
    +
    +const LITERAL = "VISUAL_PAGES: dict[str, list[str]] = {";
    +
    +function visualPages(source: string): Record<string, string[]> | null {
    +  const start = source.indexOf(LITERAL);
    +  if (start < 0) return null;
    +  const tail = source.slice(start + LITERAL.length);
    +  const end = tail.search(/^}/m);
    +  if (end < 0) return null;
    +  const body = tail.slice(0, end);
    [cut: 96 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-visual-review/.l4/held/1.1-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 2 files (the whole patch is in `openspec/changes/add-visual-review/.l4/held/1.1-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: verified by the owner's delegate. The held patch is test-only (e2e/test_m6b_ui.py, web/src/visual-pages.test.ts), so the base run passing is expected. Applied on main 21263517: typecheck, eslint, py_compile pass; visual-pages.test.ts 1/1. The journey against a local e2e stack built at main passed 3/3 twice and wrote all 21 screenshots. It fixes both failures of Q-001's replay (the previews now wait for each JSON text before json.loads; the signed-out home asserts the status, the main-text detail stays covered by frozen test_m6b_home.py:439). Checks kept: Approve surface, Start a test run, Recent runs and flows; 92 expect/assert lines vs 85 before.

---

## Q-003: Criterion C-54891f4b (web-design-system › Every page is photographed only when loaded, with a clean check › Every page leaves a loaded screenshot and no CSP message): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-54891f4b (web-design-system › Every page is photographed only when loaded, with a clean check › Every page leaves a loaded screenshot and no CSP message)

### Context
Criterion C-54891f4b (web-design-system › Every page is photographed only when loaded, with a clean check › Every page leaves a loaded screenshot and no CSP message) is needs human after round 1.

Scenario:
\- **WHEN** the three tests of test-plan-browser.md run against the offline stack with `E2E_VISUAL_DIR` unset
\- **THEN** `.l4-out/visual/` holds the 21 files of test-plan.md T1 (3 signed-out, 8 alice, 10 carol), each at least as tall as its page (measured 860 px for the pages that fit the window; 2,706 for `alice-flows-demo-ui.png`, 2,978 for `alice-flows-demo-ui-answers.png`, 1,415 for the graph page, 1,016 for Group mappings, 4,117 for the audit log, 1,417 for `carol-home-narrow.png` at 900 wide); no file shows "Loading" or "Checking" text or a sidebar without the account banner; no toast is in any picture; each test ends with `visual.csp == []`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_ui::test_signed_out_pages_are_styled[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied by the journey itself, which is the test the unit's documents say the verifier runs. Its three tests ran in the verifier's e2e gate and passed with no failure or skip. Each capture goes through the same check: the banner must hold the account name (or the Main navigation when signed out), the page's own ready element must be visible, no visible text in main may start with Loading or Checking, the toast list must reach zero, layout and axe must pass, the page is scrolled to the top and the full-page file is asserted to exist, to be non-empty and to be at least scrollHeight minus one pixel tall. The three tests assert 3, 8 and 10 shots, which are the 21 files, and each ends with an empty CSP list. The default directory is .l4-out/visual when E2E_VISUAL_DIR is unset. The exact heights in the scenario are measurements, not requirements, and the only bound, 3,000 px for the flow page, is asserted. The verifier marked this criterion not testable by a generated browser test because it describes the run of the suite itself, which is the case the design foresaw and said to accept on the journey's passing run.
---

## Q-004: Criterion C-0462bba1 (web-design-system › The flow workspace is beside, complete and at most 3,000 px tall › The workspace of demo-ui is two columns and at most 3,000 px tall): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-0462bba1 (web-design-system › The flow workspace is beside, complete and at most 3,000 px tall › The workspace of demo-ui is two columns and at most 3,000 px tall)

### Context
Criterion C-0462bba1 (web-design-system › The flow workspace is beside, complete and at most 3,000 px tall › The workspace of demo-ui is two columns and at most 3,000 px tall) is needs human after round 1.

Scenario:
\- **WHEN** alice (team `finance`) opens "Flows", sees "Owner team" prefilled, creates `demo-ui`, saves and validates the text of test-plan-browser.md, and the page is measured before any row opens
\- **THEN** "Owner team" has value `finance`; the title is `Flow demo-ui · Ursitoare`; "Diagnostics" contains `Valid. 0 errors`; the tops of "Graph" and "Edit the flow" differ by at most 8 (measured 239 and 239); the tops of "Test run" and "Dry run" differ by at most 8 (measured 1,573 and 1,573); the height is at most 3,000 (measured 2,706); `alice-flows-demo-ui.png` exists

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_ui::test_alice_builds_tests_and_reads_a_flow[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. Alice's journey test asserts every clause of the scenario in the named state: Owner team has the value finance, the title is Flow demo-ui · Ursitoare, Diagnostics contains Valid. 0 errors, the tops of the regions Graph and Edit the flow differ by at most 8, the tops of Test run and Dry run differ by at most 8, document.documentElement.scrollHeight is at most 3,000, and the check of the flow page writes alice-flows-demo-ui.png and asserts it exists and is as tall as the page. The measurement runs after Validate and before any answer row opens. That test ran in the verifier's e2e gate and passed. The generated test that failed at head also failed at base, so it discriminates nothing; the journey, which asserts exactly the scenario's bounds against the same stack, passed, so its failure comes from the generated test and not from the page. The numbers in brackets in the scenario are measurements, not bounds.
---

## Q-005: Criterion C-1beceb27 (web-design-system › A test run from the form reaches a readable run page › Alice starts a test run from the form and reads the run): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-1beceb27 (web-design-system › A test run from the form reaches a readable run page › Alice starts a test run from the form and reads the run)

### Context
Criterion C-1beceb27 (web-design-system › A test run from the form reaches a readable run page › Alice starts a test run from the form and reads the run) is needs human after round 1.

Scenario:
\- **WHEN** alice fills the two fields, opens both answer rows, fills `{"vendor_id":"V-1","status":"active"}` for `lookup` and `{"payment_id":"P-1","status":"created"}` for `pay`, clicks "Start test run", opens the one link of the panel and focuses the `time` that starts with "Started "
\- **THEN** the panel holds one link named `Open run <id>`; the status "Run state" reads `State: completed` with `data-tone` `success` (within 20,000 ms); "Started by Alice Example" is visible; three `p.runs-preview` parse to `{"vendor_id":"V-1","status":"active"}`, `{"payment_id":"P-1","status":"created"}` and `{"payment_id":"P-1"}`; the tooltip text matches `YYYY-MM-DD HH:MM UTC`; axe passes with it open; `alice-flows-demo-ui-answers.png` and `alice-runs-run-id.png` exist

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_ui::test_alice_builds_tests_and_reads_a_flow[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-006: Criterion C-de5dc745 (web-design-system › The lists and the home page show the finished run › Runs, home and the graph page show alice's work): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-de5dc745 (web-design-system › The lists and the home page show the finished run › Runs, home and the graph page show alice's work)

### Context
Criterion C-de5dc745 (web-design-system › The lists and the home page show the finished run › Runs, home and the graph page show alice's work) is needs human after round 1.

Scenario:
\- **WHEN** alice opens "Runs", then "Home", then `/flows/demo-ui/graph`
\- **THEN** the row of `demo-ui` contains `completed`, `Alice Example` and the duration `<1 s`; "Recent runs" contains `Run <last 8> of demo-ui`; the link `demo-ui` is under "Recent flows"; "Next steps" contains "Start a test run"; the heading is "Graph of demo-ui"; `alice-runs.png`, `alice-home.png` and `alice-flows-demo-ui-graph.png` exist

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_ui::test_alice_builds_tests_and_reads_a_flow[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-007: Hold H-527bcb10: UI criterion C-8ac052fa has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-8ac052fa has no end-to-end test; see the generated UI tests table

Step 5 for C-8ac052fa: not_testable after 1 attempt(s); The criterion checks a node:test unit test (web/src/visual-pages.test.ts) reading source files and page tables; it has no browser-observable outcome for a Playwright test..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-008: Hold H-5c490932: UI criterion C-54891f4b has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-54891f4b has no end-to-end test; see the generated UI tests table

Step 5 for C-54891f4b: not_testable after 1 attempt(s); Criterion is about running the three journey tests and inspecting 21 screenshot files on disk (.l4-out/visual), a meta-run of the suite itself, not a user-observable behavior of one page..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-009: Hold H-0de5f245: UI criterion C-0462bba1 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-0462bba1 has no end-to-end test; see the generated UI tests table

Step 5 for C-0462bba1: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_0462bba1::test_demo_ui_workspace_is_two_columns_and_short[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-010: Hold H-0bc13fcf: UI criterion C-1beceb27 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-1beceb27 has no end-to-end test; see the generated UI tests table

Step 5 for C-1beceb27: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_1beceb27::test_alice_starts_run_from_form_and_reads_it[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-011: Hold H-02e09269: UI criterion C-de5dc745 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-de5dc745 has no end-to-end test; see the generated UI tests table

Step 5 for C-de5dc745: not_testable after 1 attempt(s); Needs alice's completed demo-ui run, created by earlier journey steps through UI flows not shown; seed state unknown, and screenshots are artifacts of the journey itself..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
