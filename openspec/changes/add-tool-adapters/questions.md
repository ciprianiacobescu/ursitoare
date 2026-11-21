# Questions — add-tool-adapters

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
| Q-001 | accepted | 2.2 | technical | src/tools/adapter-submit.db.test.ts:134 compares JSON text of a jsonb payload |
<!-- l4:index:end -->

---

## Q-001: src/tools/adapter-submit.db.test.ts:134 compares JSON text of a jsonb payload

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.2
- **Kind:** technical
- **Asked:** 2026-11-21T21:06Z by claude-sonnet, run r-20261121T2043Z-ef00, task 2.2

### Context
The test asserts `JSON.stringify(p) === JSON.stringify({ digest: dC, drift: true })` on rows read from audit_event.payload, which is jsonb. Postgres orders jsonb keys by length then bytes, so `drift` comes before `digest` and the strings differ whatever the code does. The spec only requires the event payload `{ digest, drift }`.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/tools/adapter-submit.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-tool-adapters`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/tools/adapter-submit.db.test.ts`: at line 134 compare with `assert.deepEqual` (for example `assert.ok((await submitted(...)).some((p) => isDeepStrictEqual(p, { digest: dC, drift: true })))`) instead of `JSON.stringify` text

### Clarifier suggestion
Edit `src/tools/adapter-submit.db.test.ts`: at line 134 compare with `assert.deepEqual` (for example `assert.ok((await submitted(...)).some((p) => isDeepStrictEqual(p, { digest: dC, drift: true })))`) instead of `JSON.stringify` text

### Answer
<!-- write below this line -->
