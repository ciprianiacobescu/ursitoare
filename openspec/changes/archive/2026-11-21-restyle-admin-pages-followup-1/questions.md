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
| Q-001 | answered | 1.1 | harness | Task 1.1: the test chore discrimination check could not decide |
| Q-002 | answered | none | verdict | Hold H-91a276d8: UI criterion C-b824c627 has no end-to-end test; see the generated UI tests table |
| Q-003 | answered | none | verdict | Hold H-6e8dbf95: UI criterion C-e4e27fab has no end-to-end test; see the generated UI tests table |
| Q-004 | answered | none | verdict | Hold H-73dee3af: UI criterion C-e553aba2 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Task 1.1: the test chore discrimination check could not decide

- **Status:** answered
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
accept: verified by the delegate. The test-chore discrimination check could not run because its zero-value and base runs vary only Python production files, and this unit adds only tests. So I ran the discrimination by hand. I applied the held patch on main 9afc868e: py_compile, eslint and typecheck pass, and the Node test passes 1/1. e2e/test_m6b_section_layout.py against the offline e2e stack, with web built at head: 6 of 6 pass. With the kit rule '.ui-section > :not(.ui-section-title, .ui-section-actions) { grid-column: 1 / -1; }' removed from web/src/kit/theme.css and web rebuilt: 6 of 6 fail. So the browser test discriminates C-3802bfd0's region geometry in all six regions (New grant twice, Create team, Map a group, Chain verification, Filter the audit log, Surface). Replay the held patch.

---

## Q-002: Hold H-91a276d8: UI criterion C-b824c627 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-b824c627 has no end-to-end test; see the generated UI tests table

Step 5 for C-b824c627: not_testable after 1 attempt(s); The criterion is a static source-code inspection (a Node test reading four page TSX sources plus admin.css/tokens.css with custom find helpers such as findInlineStyleUse and findCssImports); none of those source-level properties are observable through the rendered page at the origin, so they cann....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept. Checked by the owner's delegate in round 2's verdict.json and verification.md: C-b824c627 has result pass (judge pass, confidence 0.91) and is traced by two Node tests in web/src/admin/admin-pages-restyle.test.ts that pass, one of them discriminating by mutation ("the checker fails three altered Users sources"). The scenario is a source rule (the four admin pages use PageHeader and the list width with no h1, no inline style and no CSS import; their class pins; no raw colour in admin.css), which a browser cannot observe, so step 5's not_testable is right. This unit adds only a browser test and a Node test and changes no source this rule reads.
---

## Q-003: Hold H-6e8dbf95: UI criterion C-e4e27fab has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-e4e27fab has no end-to-end test; see the generated UI tests table

Step 5 for C-e4e27fab: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_e4e27fab::test_exactly_four_captions_hidden[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept. Checked by the owner's delegate. C-e4e27fab has result pass in round 2's verdict.json (judge pass, confidence 0.84) and is traced by web/src/admin/captions-by-page.test.ts "exactly four captions are hidden", which passes; the scenario itself is a function-and-source check (captionDisplayFor over the eight pairs, and which page sources pass captionDisplay). I also checked the behaviour in a browser against a local stack built from this code with the mocks of e2e/test_m6b_admin.py: the captions "Users", "Group mappings", "Tool servers" and "Grants" carry ui-visually-hidden (position absolute, clip rect(0, 0, 0, 0)) and "Roles", "Teams" and "Tools" do not; the audit page screenshot shows "Audit events" visible. That is the scenario's hidden and visible sets. A clip-hidden caption keeps a 32 by 16 px box, which Playwright counts as visible, so a generated test that expects those captions to be hidden fails on correct pages; the generated test is not on the branch, so this cause is inferred, but the observed behaviour matches the spec.
---

## Q-004: Hold H-73dee3af: UI criterion C-e553aba2 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-e553aba2 has no end-to-end test; see the generated UI tests table

Step 5 for C-e553aba2: not_testable after 1 attempt(s); This criterion statically analyzes page sources and CSS (imports, inline styles, raw colours, data-tone/destructive props, grid classes); none of it is user-observable through the page's public interface, so a browser E2E test cannot check it..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept. Checked by the owner's delegate in round 2's verdict.json and verification.md: C-e553aba2 has result pass (judge pass, confidence 0.83) and is traced by two Node tests in web/src/tools/tools-pages-restyle.test.ts that pass, one of them discriminating by mutation ("the checker fails three altered Servers sources"). The scenario is a source rule over the three tool pages (layout parts, page widths, no CSS import, no inline style or raw colour, tone props), which a browser cannot observe, so step 5's not_testable is right. This unit changes no source this rule reads.
