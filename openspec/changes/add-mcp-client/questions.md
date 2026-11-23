# Questions — add-mcp-client

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
| Q-001 | accepted | 2.1 | technical | src/tools/mcp/surface.test.ts:540 asserts checkSchema(find.output, {}).ok is true, but the schema requires vendor_id and status |
<!-- l4:index:end -->

---

## Q-001: src/tools/mcp/surface.test.ts:540 asserts checkSchema(find.output, {}).ok is true, but the schema requires vendor_id and status

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.1
- **Kind:** technical
- **Asked:** 2026-11-23T05:07Z by claude-sonnet, run r-20261123T0346Z-0270, task 2.1

### Context
The test 'C-8557e582 M13 pattern id and anchor are dropped so the output compiles twice' first asserts `find.output` deep-equals `findOutput()`, which has `required: ["vendor_id","status"]` and `additionalProperties: false`. Lines 540 and 541 then assert `checkSchema(find.output, {}).ok === true`. `checkSchema` validates the data `{}` against the schema, so `required` makes `ok` false. The spec only says the two compiles of the output pass. Every other new test in the file passes, including the deep-equal assertion at line 539.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/tools/mcp/surface.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-mcp-client`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/tools/mcp/surface.test.ts`: change both `checkSchema(find.output, {})` calls (lines 540 and 541) to `checkSchema(find.output, { vendor_id: "V-ACME", status: "active" })`

### Clarifier suggestion
Edit `src/tools/mcp/surface.test.ts`: change both `checkSchema(find.output, {})` calls (lines 540 and 541) to `checkSchema(find.output, { vendor_id: "V-ACME", status: "active" })`

### Answer
<!-- write below this line -->
