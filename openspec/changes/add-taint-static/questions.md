# Questions — add-taint-static

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
| Q-001 | open | 2.3 | technical | src/authoring/taint/hooks.test.ts:176 asserts fetch fields {} but the same scenario requires fetch to be an invoices.get block with untrusted fields |
<!-- l4:index:end -->

---

## Q-001: src/authoring/taint/hooks.test.ts:176 asserts fetch fields {} but the same scenario requires fetch to be an invoices.get block with untrusted fields

- **Status:** open
- **Blocking tasks:** 2.3
- **Kind:** technical
- **Asked:** 2026-11-01T06:50Z by deepseek-free, run r-20261101T0551Z-0bc2, task 2.3

### Context
At line 176 the frozen test asserts that node fetch has fields {}. The hook sample (reference.md) declares fetch as block invoices.get@1, and catalogue C gives invoices.get@1 untrusted_fields [raw_text, vendor_name]. Decision 2 and C-feb77bd3 (RF-1) require this block to report fields { raw_text: [untrusted], vendor_name: [untrusted] }. The same test also expects the edge at /nodes/fetch/post/0/with/text (ref hook.output.raw_text) to carry [untrusted], which is only possible when fetch.fields.raw_text is untrusted. Reporting fields {} and an untrusted raw_text edge at once is self-contradictory. A scratch copy with only this assertion corrected makes both scenarios pass.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/authoring/taint/hooks.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-taint-static`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/authoring/taint/hooks.test.ts`: replace the loop at lines 175-177 with `assert.deepEqual(nodeAt(result, "fetch"), { input: [], output: [], fields: { raw_text: ["untrusted"], vendor_name: ["untrusted"] } });` followed by `for (const id of ["lk", "done"]) {` / ` assert.deepEqual(nodeAt(result, id), { input: [], output: [], fields: {} }, id);` / `}`.
2. Edit `src/authoring/taint/hooks.test.ts`: replace the loop at lines 175-177 with assertions on only `input` and `output` for `fetch`, `lk` and `done`, leaving `fields` unasserted as the scenario text does.

### Clarifier suggestion
Edit `src/authoring/taint/hooks.test.ts`: replace the loop at lines 175-177 with `assert.deepEqual(nodeAt(result, "fetch"), { input: [], output: [], fields: { raw_text: ["untrusted"], vendor_name: ["untrusted"] } });` followed by `for (const id of ["lk", "done"]) {` / ` assert.deepEqual(nodeAt(result, id), { input: [], output: [], fields: {} }, id);` / `}`.

### Answer
<!-- write below this line -->
