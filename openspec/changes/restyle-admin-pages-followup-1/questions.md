# Questions — restyle-admin-pages-followup-1

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
| Q-001 | open | 1.1 | harness | Task 1.1: the test chore discrimination check could not decide |
<!-- l4:index:end -->

---

## Q-001: Task 1.1: the test chore discrimination check could not decide

- **Status:** open
- **Blocking tasks:** 1.1
- **Kind:** harness
- **Asked:** 2026-11-21T12:55Z by claude-sonnet, run r-20261121T1135Z-2172, task 1.1

### Context
L4 could not run the test chore discrimination check of task 1.1, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: neither run could be made: the zero-value run and the base run vary Python production files only, and the tests import no Python module of the project and the unit changed no Python production file
Runs: none
Kept real: nothing
Tests: web.src.tools.section-layout-browser-test.test.ts::C-3802bfd0 the browser test measures the Section layout of all six admin regions

Changes the replay applies (2 files):
    added e2e/test_m6b_section_layout.py
    added web/src/tools/section-layout-browser-test.test.ts

Source of the tests (redacted; at most 40 lines each):
web.src.tools.section-layout-browser-test.test.ts::C-3802bfd0 the browser test measures the Section layout of all six admin regions:
    test("C-3802bfd0 the browser test measures the Section layout of all six admin regions", () => {
      const source = readFileSync(new URL("../../../e2e/test_m6b_section_layout.py", import.meta.url), "utf8");
      for (const name of REGIONS) {
        assert.ok(source.includes(`"${name}"`), `${name} is measured`);
      }
      assert.ok(source.includes("getBoundingClientRect"), "children are measured with getBoundingClientRect");
      assert.ok(source.includes('@pytest.mark.l4("C-3802bfd0")'), "the browser tests carry the criterion");
    });

Diff of e2e/test_m6b_section_layout.py (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/e2e/test_m6b_section_layout.py b/e2e/test_m6b_section_layout.py
    new file mode 100644
    index 0000000..c4bfff9
    --- /dev/null
    +++ b/e2e/test_m6b_section_layout.py
    @@ -0,0 +1,139 @@
    +"""The Section layout of the admin regions, measured in the browser (C-3802bfd0): a heading sits above its body."""
    +
    +import pytest
    +from playwright.sync_api import Page, expect
    +
    +from test_m6b_admin import (
    +    CAROL,
    +    FORBIDDEN,
    +    LISTITEM,
    +    SERVER,
    +    answer,
    +    grant_item,
    +    listing,
    +    open_page,
    +)
    +
    +MEASURE = """(region) => {
    +  const heading = region.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]');
    +  const h = heading.getBoundingClientRect();
    +  const fontSize = parseFloat(getComputedStyle(heading).fontSize);
    +  const others = Array.from(region.children)
    +    .filter((child) => child !== heading && !child.contains(heading))
    +    .map((child) => { const r = child.getBoundingClientRect(); return { left: r.left, top: r.top }; });
    +  return { headingLeft: h.left, headingBottom: h.bottom, headingHeight: h.height, fontSize, others,
    +           headingIsChild: heading.parentElement === region };
    +}"""
    +
    +
    +def assert_section_layout(page: Page, name: str) -> None:
    +    region = page.get_by_role("region", name=name, exact=True)
    +    expect(region).to_be_visible()
    +    found = region.evaluate(MEASURE)
    +    assert found["headingIsChild"], name
    +    assert found["headingHeight"] < 2 * found["fontSize"], (name, found)
    [cut: 105 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/restyle-admin-pages-followup-1/.l4/held/1.1-tests.patch` on the unit branch]

Diff of web/src/tools/section-layout-browser-test.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/web/src/tools/section-layout-browser-test.test.ts b/web/src/tools/section-layout-browser-test.test.ts
    new file mode 100644
    index 0000000..c8fd8d1
    --- /dev/null
    +++ b/web/src/tools/section-layout-browser-test.test.ts
    @@ -0,0 +1,15 @@
    +/// <reference types="node" />
    +import assert from "node:assert/strict";
    +import { readFileSync } from "node:fs";
    +import { test } from "node:test";
    +
    +const REGIONS = ["New grant", "Create team", "Map a group", "Chain verification", "Filter the audit log", "Surface"];
    +
    +test("C-3802bfd0 the browser test measures the Section layout of all six admin regions", () => {
    +  const source = readFileSync(new URL("../../../e2e/test_m6b_section_layout.py", import.meta.url), "utf8");
    +  for (const name of REGIONS) {
    +    assert.ok(source.includes(`"${name}"`), `${name} is measured`);
    +  }
    +  assert.ok(source.includes("getBoundingClientRect"), "children are measured with getBoundingClientRect");
    +  assert.ok(source.includes('@pytest.mark.l4("C-3802bfd0")'), "the browser tests carry the criterion");
    +});

`accept: <why>` replays exactly the saved change of 2 files (the whole patch is in `openspec/changes/restyle-admin-pages-followup-1/.l4/held/1.1-tests.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
