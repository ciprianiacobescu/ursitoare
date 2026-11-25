# Questions — add-web-tool-review

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
| Q-001 | accepted | 1.2 | technical | web/src/tools/review-diff.test.ts:227 expected diff omits removed log_note |
| Q-002 | accepted | 2.1 | technical | web/src/tools/review-discover.test.ts:268 expected string omits the reason |
| Q-003 | open | none | verdict | Criterion C-9da14d6e (web-tools › The server page shows discovery, settings, changes and calls › An MCP server is discovered, given a setting and discovered again): accept as satisfied? |
| Q-004 | open | none | verdict | Criterion C-c8329b48 (web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server): accept as satisfied? |
| Q-005 | open | none | verdict | Hold H-63664d16: UI criterion C-9da14d6e has no end-to-end test; see the generated UI tests table |
| Q-006 | open | none | verdict | Hold H-c8ca5be3: UI criterion C-c8329b48 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: web/src/tools/review-diff.test.ts:227 expected diff omits removed log_note

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 1.2
- **Kind:** technical
- **Asked:** 2026-11-25T03:13Z by deepseek-free, run r-20261125T0140Z-462b, task 1.2

### Context
The test `surfaceDiff carries described input properties of an added and a changed tool` calls `surfaceDiff(S(LOG), S(FD))` at line 227. `LOG` is `log_note` and `FD` is `find_vendor`, so `log_note` exists only in the approved surface. The test expects only the added `find_vendor`, but the requirement says surfaceDiff returns `removed` for one only in `approved`, D9 in test-plan.md runs `S(LOG) -> S(FD)`, and the sibling D2 test expects `{ name: "log_note", kind: "removed", fields: [] }` in the same situation. The implementation returns that removed item, so the gate fails on this one anchor while the other 3080 tests pass.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `web/src/tools/review-diff.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-web-tool-review`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `web/src/tools/review-diff.test.ts`: after the `find_vendor` item in the expected array of the `surfaceDiff(S(LOG), S(FD))` assertion at line 227, add `{ name: "log_note", kind: "removed", fields: [] },` so the accepted array is `[ { name: "find_vendor", kind: "added", fields: [], description: { old: null, new: "Find a vendor." }, input: [{ property: "vendor_name", text: "Vendor to look up." }] }, { name: "log_note", kind: "removed", fields: [] } ]`.
2. Keep the test unchanged and confirm that `surfaceDiff` must omit a `removed` item for an approved tool missing from the pending surface in this case, which contradicts D2 and the ADDED requirement.

### Clarifier suggestion
Edit `web/src/tools/review-diff.test.ts`: after the `find_vendor` item in the expected array of the `surfaceDiff(S(LOG), S(FD))` assertion at line 227, add `{ name: "log_note", kind: "removed", fields: [] },` so the accepted array is `[ { name: "find_vendor", kind: "added", fields: [], description: { old: null, new: "Find a vendor." }, input: [{ property: "vendor_name", text: "Vendor to look up." }] }, { name: "log_note", kind: "removed", fields: [] } ]`.

### Answer
<!-- write below this line -->

---

## Q-002: web/src/tools/review-discover.test.ts:268 expected string omits the reason

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.1
- **Kind:** technical
- **Asked:** 2026-11-25T04:38Z by beam, run r-20261125T0316Z-e642, task 2.1

### Context
The test asserts text.length === 145 but expects equality to "Discovered 2 tools over MCP 2026-07-28. Left out: " + "n".repeat(79) + "…", which is 130 characters. The spec formats each left-out entry as <name> (<reason>), so the 145 length can only be reached by appending " (name_invalid)" (15 characters).

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `web/src/tools/review-discover.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-web-tool-review`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `web/src/tools/review-discover.test.ts`: change the expected string on the assertion to `"Discovered 2 tools over MCP 2026-07-28. Left out: " + "n".repeat(79) + "… (name_invalid)"`

### Clarifier suggestion
Edit `web/src/tools/review-discover.test.ts`: change the expected string on the assertion to `"Discovered 2 tools over MCP 2026-07-28. Left out: " + "n".repeat(79) + "… (name_invalid)"`

### Answer
<!-- write below this line -->

---

## Q-003: Criterion C-9da14d6e (web-tools › The server page shows discovery, settings, changes and calls › An MCP server is discovered, given a setting and discovered again): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-9da14d6e (web-tools › The server page shows discovery, settings, changes and calls › An MCP server is discovered, given a setting and discovered again)

### Context
Criterion C-9da14d6e (web-tools › The server page shows discovery, settings, changes and calls › An MCP server is discovered, given a setting and discovered again) is needs human after round 1.

Scenario:
\- **WHEN** the steps of test-plan-browser.md § Review 1 run (a 422 `credential_missing`, a 422 `name_collision`, a 200 that lists `route_ticket` as left out after a tool name, a 200 after the settings `read` and `Skip`)
\- **THEN** the first refusal is an alert in "Discovery" with one post and no second detail read; the second names the two tools and shows "Tool settings" for them; the third post is `{"tools": {"Find.Vendor": {"name": "find_vendor_2"}}}`, and its success shows the status with the tool left out, the table for the discovered tools, "Calls" cells read exactly and "Changes" listing both tools as `added` with the first surface's description and input description; the fourth post is `{"tools": {"find_vendor": {"effect": "read"}, "log_note": {"skip": true}}}`, with `log_note` left out as `skipped`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m7_tool_review::test_discovery_settings_and_calls[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-004: Criterion C-c8329b48 (web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-c8329b48 (web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server)

### Context
Criterion C-c8329b48 (web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server) is needs human after round 1.

Scenario:
\- **WHEN** the steps of § Review 2 run (a drifted MCP server whose pending surface changes a hint, an effect and a description, drops a tool and adds one; then "Discover tools")
\- **THEN** "Changes" lists `changed find_vendor: hints`, `changed log_note: effect, description` with the lines `Description before: (none)` and `Description after: Log a note`, `removed old_tool`, `added ping`; "Calls" has four rows and the `readNote` sentence, and the combobox of `log_note` reads `send`; "Discover tools" posts `{"tools": {"find_vendor": {"effect": "read"}}}`, the effect of the approved surface, and "Calls" then has three rows (the second read has no `ping`)

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m7_tool_review::test_changes_and_calls_of_a_drifted_server[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-005: Hold H-63664d16: UI criterion C-9da14d6e has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-9da14d6e has no end-to-end test; see the generated UI tests table

Step 5 for C-9da14d6e: not_testable after 1 attempt(s); The test plan's Review 1 steps aren't shown. That leaves the seeded server id, the sign-in user, the fake engine's four discover answers and the exact expected texts unknown, so a test would have to guess them..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-006: Hold H-c8ca5be3: UI criterion C-c8329b48 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-c8329b48 has no end-to-end test; see the generated UI tests table

Step 5 for C-c8329b48: not_testable after 1 attempt(s); The scenario depends on the '§ Review 2' setup, which isn't shown. That setup covers the drifted server's id, the signed-in user, and the fake stack's seeded approved and pending surfaces. Without it the test would have to guess the URL, the login and the data..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
