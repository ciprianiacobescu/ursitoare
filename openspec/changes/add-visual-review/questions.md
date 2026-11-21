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
