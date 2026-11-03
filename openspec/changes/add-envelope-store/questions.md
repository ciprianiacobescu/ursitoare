# Questions — add-envelope-store

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
| Q-001 | open | 4.1 | technical | src/runs/store/step-repository.test.ts:354 compares an object with assert.equal |
<!-- l4:index:end -->

---

## Q-001: src/runs/store/step-repository.test.ts:354 compares an object with assert.equal

- **Status:** open
- **Blocking tasks:** 4.1
- **Kind:** technical
- **Asked:** 2026-11-03T20:43Z by deepseek-free, run r-20261103T1925Z-0eec, task 4.1

### Context
At lines 354 and 358 the frozen test checks the empty page returned by stepRepository.list with `assert.equal(result, { steps: [], next: null })`. Because the file imports node:assert/strict, `equal` is reference equality, so no implementation returning a fresh page object can ever pass; the design only says an absent run gives the value `{ steps: [], next: null }`. The implementation itself returns deep-equal empty pages and the rest of the suite passes.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/runs/store/step-repository.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-envelope-store`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/runs/store/step-repository.test.ts`: replace the two `assert.equal` calls at lines 354 and 358 (the `r_unknown` page and the tenant B page) with `assert.deepEqual`, leaving every other statement unchanged.

### Clarifier suggestion
Edit `src/runs/store/step-repository.test.ts`: replace the two `assert.equal` calls at lines 354 and 358 (the `r_unknown` page and the tenant B page) with `assert.deepEqual`, leaving every other statement unchanged.

### Answer
<!-- write below this line -->
