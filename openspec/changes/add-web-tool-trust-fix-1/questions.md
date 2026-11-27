# Questions — add-web-tool-trust-fix-1

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
| Q-001 | open | 1.1 | technical | web/src/tools/review-trust.test.ts:132 expectation contradicts carried-key emission |
<!-- l4:index:end -->

---

## Q-001: web/src/tools/review-trust.test.ts:132 expectation contradicts carried-key emission

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): Genuine conflict between two frozen tests and their specifications. The parent unit's frozen DB3 assertion (web/src/tools/review-trust.test.ts:132) passes carried = ds1.carried, which holds the carried-only key Log.Note: { unsafe_to_retry: false }, and expects only { find_vendor: { skip: true } }; test-plan.md DB3 pins that value and says DB3 holds on base code, and the parent spec says DB3 gives "the skip" body. The fix unit's frozen red test R1c (web/src/tools/review-carried.test.ts:32) and its regression scenario require a carried-only key to emit the overlay entry built from its carried fields, which makes DB3 emit Log.Note: { unsafe_to_retry: false }. I found no production-code rule in any document that satisfies both. Option 1 changes a frozen test from a fix task, which a person must commit; Option 2 fails the fix unit's own red test and contradicts its spec. No clarifier suggestion exists to accept. A person must decide which pinned value gives way.
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-11-27T02:02Z by beam, run r-20261127T0049Z-77ad, task 1.1

### Context
F-4ee90a68 requires discoverBody to collect keys from d.carried and emit an entry built from those carried fields. Under that behaviour, DB3's draft (effects find_vendor skip, carried ds1.carried which contains Log.Note: { unsafe_to_retry: false }) yields an additional Log.Note: { unsafe_to_retry: false } entry, but the frozen assertion at line 132 expects tools: { find_vendor: { skip: true } } only.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `web/src/tools/review-trust.test.ts`, write an answer that names its path exactly as written here or run `l4 questions accept Q-NNN --unit add-web-tool-trust-fix-1`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit web/src/tools/review-trust.test.ts:132: change the expected value to { tools: { find_vendor: { skip: true }, 'Log.Note': { unsafe_to_retry: false } } }
2. Keep the current expectation and leave carried-only keys unemitted

### Harness notes
Harness note: the previous attempt of this task was rejected: green broke existing tests: web.src.tools.review-trust.test.ts::C-cbd5fcec review-trust builds the overlay body from trust and carried fields (DB0 to DB6)
AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:

### Answer
<!-- write below this line -->
