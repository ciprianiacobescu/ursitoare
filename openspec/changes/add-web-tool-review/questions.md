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
| Q-002 | open | 2.1 | technical | web/src/tools/review-discover.test.ts:268 expected string omits the reason |
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

- **Status:** open
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
