# Questions — add-web-data-kit

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
| Q-001 | open | none | verdict | Criterion C-98c49746 (web-data-kit › A cursor list loads one page at a time and appends the next › Page size and subscribers): accept as satisfied? |
| Q-002 | answered | none | verdict | Finding F-27dc58cb: Load more after an empty page unmounts the focused button |
| Q-003 | open | none | verdict | Finding F-78d50e72: An unsupported property `c` comes back with an empty name |
| Q-004 | answered | none | verdict | Finding F-4c79e0be: task 1.1: no-op calls and loads do not settle with the request in flight |
| Q-005 | open | none | verdict | Finding F-d49cb373: task 4.1: an enum property without type is not rendered as an enum |
| Q-006 | open | none | verdict | Hold H-fe461ce5: UI criterion C-4ad6d2b9 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-007 | open | none | verdict | Hold H-ee891db8: UI criterion C-efc9d8f0 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-008 | open | none | verdict | Hold H-949d5558: UI criterion C-98c49746 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-c97509ef: UI criterion C-3d1d3680 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-e034653d: UI criterion C-79a9fd48 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-1632d223: UI criterion C-629f74f4 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-78854961: UI criterion C-d83105ac has no end-to-end test (not_testable); see the generated UI tests table |
| Q-013 | open | none | verdict | Hold H-e3eeb0c7: UI criterion C-bea5ecec has no end-to-end test (not_testable); see the generated UI tests table |
| Q-014 | open | none | verdict | Hold H-5ffc170f: UI criterion C-df0a8688 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-015 | open | none | verdict | Hold H-9e6818f7: UI criterion C-686289b8 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-016 | open | none | verdict | Hold H-6c2adf23: UI criterion C-3bc08473 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-017 | open | none | verdict | Hold H-d3cb390d: UI criterion C-56d95a76 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-018 | open | none | verdict | Hold H-52ff52d0: UI criterion C-8e9e0bb2 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-019 | open | none | verdict | Hold H-9be5d094: UI criterion C-76ec796a has no end-to-end test (not_testable); see the generated UI tests table |
| Q-020 | open | none | verdict | Hold H-9990db33: UI criterion C-d3d35a1c has no end-to-end test (not_testable); see the generated UI tests table |
| Q-021 | open | none | verdict | Hold H-c7821b44: UI criterion C-36608f1a has no end-to-end test (not_testable); see the generated UI tests table |
| Q-022 | open | none | verdict | Hold H-f819f6de: UI criterion C-547ad66e has no end-to-end test (not_testable); see the generated UI tests table |
| Q-023 | open | none | verdict | Hold H-d81669ad: UI criterion C-832d250d has no end-to-end test (not_testable); see the generated UI tests table |
| Q-024 | open | none | verdict | Hold H-a9305e9d: UI criterion C-a36860e0 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-025 | open | none | verdict | Hold H-9f575e04: UI criterion C-78331251 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-026 | open | none | verdict | Hold H-b9b4b515: UI criterion C-69d9392a has no end-to-end test (not_testable); see the generated UI tests table |
| Q-027 | open | none | verdict | Hold H-4f7f2c66: UI criterion C-9d1fffc7 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-028 | open | none | verdict | Hold H-772da66c: UI criterion C-412941ac has no end-to-end test (not_testable); see the generated UI tests table |
| Q-029 | open | none | verdict | Hold H-12fc3427: UI criterion C-0e0cc641 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-030 | open | none | verdict | Hold H-74697ad6: UI criterion C-dc43ef5f has no end-to-end test (not_testable); see the generated UI tests table |
| Q-031 | open | none | verdict | Hold H-ca2dd6a8: UI criterion C-08c4c2e4 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-032 | open | none | verdict | Hold H-979139da: UI criterion C-61a6e3a3 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-033 | open | none | verdict | Hold H-034ad64a: UI criterion C-74fd23b0 has no end-to-end test (not_testable); see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Criterion C-98c49746 (web-data-kit › A cursor list loads one page at a time and appends the next › Page size and subscribers): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-98c49746 (web-data-kit › A cursor list loads one page at a time and appends the next › Page size and subscribers)

### Context
Criterion C-98c49746 (web-data-kit › A cursor list loads one page at a time and appends the next › Page size and subscribers) is needs human after round 1.

Scenario:
\- **WHEN** `createCursorList` gets `pageSize` 0, 201, 1.5 and 200; a list without `pageSize` loads; a list has two subscribers, the first throwing
\- **THEN** the first three sizes throw `KitError` `KIT_PROP_INVALID`, 200 is accepted; the first request has `limit` 50 (`DEFAULT_PAGE_SIZE`); the second subscriber is called for every change; two `getState()` reads without a change are one object

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: web.src.kit.data.cursor-list.test.ts::C-98c49746 page size and subscribers (passed, red_assertion, inadequate)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-002: Finding F-27dc58cb: Load more after an empty page unmounts the focused button

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-686289b8). It reports behaviour that no scenario pins down.

Title: Load more after an empty page unmounts the focused button
Detail: After state (5) (loaded, no items, cursor c1), pressing Load more gives loading with no items. tableView returns body 'loading' and loadMore 'hidden', so the Load more button that has focus unmounts. focusAfterChange(loaded 0 c1, loading 0 c1) returns 'none', so keyboard focus is lost. This contradicts design Decision 4: Load more keeps focus while busy.
Suggested fix: WHEN tableView gets `loading` with no items and nextCursor "c1" (a Load more after an empty page) THEN body is `loading`, loadMore is `hidden` and focusAfterChange from (`loaded` none cursor "c1") gives `none`.
The suggested fix describes what the code does now, and a reject does not use it: to pin that behaviour, end the reason with it.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-686289b8 as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
reject The finding is right. In cursor-list.ts a loadMore keeps the items and the nextCursor of the page before it, so after state (5) the list is loading with no items and nextCursor "c1". In data-table.ts tableView makes body loading for any loading state with no items and loadMore busy only when there are items, so this state gets loadMore hidden; DataTable.tsx renders the Load more button only when loadMore is not hidden, so the button that was just pressed unmounts. focusAfterChange has no branch for loaded to loading, so it returns none and keyboard focus falls to the document body. Design Decision 4 says focusAfterChange names a target for every change that unmounts the focused button, so keyboard focus is never lost, and that Load more keeps focus while busy; Decision 9 of the decisions made while writing says the same. The frozen scenario (2) and its test only pin loading with no items and a null cursor, which is the first page, so the fix can tell a Load more after an empty page apart by its non-null nextCursor without touching any test. WHEN tableView gets a loading state with no items and a non-null nextCursor, the state a loadMore from a loaded page with no items and a cursor produces THEN loadMore is busy so the Load more button stays mounted with aria-disabled and keyboard focus stays on it, while loading with no items and a null cursor keeps body loading and loadMore hidden.
---

## Q-003: Finding F-78d50e72: An unsupported property `c` comes back with an empty name

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The finding is confirmed in the code: parseProperty in web/src/kit/data/schema-fields.ts (line 283-288) deliberately overrides a valid name with "" when the property has no type, so property c is returned with name "" and label "Field 3", and nothing identifies it as c; this is at odds with design D
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-78331251). It reports behaviour that no scenario pins down.

Title: An unsupported property `c` comes back with an empty name
Detail: The passing test expects the unsupported fields of properties a..g to be named ["a","b","","d","e","f","g"]. Property `c` ({}), whose reason is 'the property has no type', loses its name. That property can no longer be identified, which goes against 'never drop a property silently'. The test pins this behaviour instead of catching it.
Suggested fix: WHEN schemaToFields gets a property `c` whose schema is `{}` THEN its unsupported field has the reason `the property has no type` and the name "".
The suggested fix describes what the code does now, and a reject does not use it: to pin that behaviour, end the reason with it.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-78331251 as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-004: Finding F-4c79e0be: task 1.1: no-op calls and loads do not settle with the request in flight

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-efc9d8f0).

Title: task 1.1: no-op calls and loads do not settle with the request in flight
Detail: Task 1.1 says any other call is a no-op that settles with the request in flight (if any). load(), loadMore() and retry() always return Promise.resolve() at once, both after starting a request and when doing nothing. Awaiting them does not wait for the page.
Suggested fix: Keep the promise of the request in flight and return it (caught so it never rejects) from load, loadMore, retry and from the no-op calls.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-efc9d8f0 as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The finding is waived. The only basis for it is the task 1.1 sentence that a no-op call settles with the request in flight, and the task's own frozen test for the Nothing to do scenario reads that sentence the other way: it awaits loadMore and load while the first request is still unanswered and answers the request only afterwards, so a no-op call that returned the pending request's promise would never settle and the test would time out. The specification scenario asks only that fetchPage is called once and the state ends loaded with a, design Decision 2 says only that any other call is a no-op, and no document requires load, loadMore or retry to wait for the page. The code satisfies the criterion as written and the suggested fix cannot be made without changing a frozen test.
---

## Q-005: Finding F-d49cb373: task 4.1: an enum property without type is not rendered as an enum

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it.

Title: task 4.1: an enum property without type is not rendered as an enum
Detail: Task 4.1 says the enum kind is `enum` of texts with `type` absent or "string". parseProperty returns unsupported 'the property has no type' whenever `type` is missing, before it looks at `enum`. So `{ enum: ["a", "b"] }` becomes an unsupported field and the form is blocked.
Suggested fix: Treat a property with an own `enum` and no `type` as kind enum before the missing-type check.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
This finding cites no criterion: end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals, or no fix can be made from the reject.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-006: Hold H-fe461ce5: UI criterion C-4ad6d2b9 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-4ad6d2b9 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-007: Hold H-ee891db8: UI criterion C-efc9d8f0 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-efc9d8f0 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-008: Hold H-949d5558: UI criterion C-98c49746 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-98c49746 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-009: Hold H-c97509ef: UI criterion C-3d1d3680 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-3d1d3680 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-010: Hold H-e034653d: UI criterion C-79a9fd48 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-79a9fd48 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-011: Hold H-1632d223: UI criterion C-629f74f4 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-629f74f4 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-012: Hold H-78854961: UI criterion C-d83105ac has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-d83105ac has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-013: Hold H-e3eeb0c7: UI criterion C-bea5ecec has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-bea5ecec has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-014: Hold H-5ffc170f: UI criterion C-df0a8688 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-df0a8688 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-015: Hold H-9e6818f7: UI criterion C-686289b8 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-686289b8 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-016: Hold H-6c2adf23: UI criterion C-3bc08473 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-3bc08473 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-017: Hold H-d3cb390d: UI criterion C-56d95a76 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-56d95a76 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-018: Hold H-52ff52d0: UI criterion C-8e9e0bb2 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-8e9e0bb2 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-019: Hold H-9be5d094: UI criterion C-76ec796a has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-76ec796a has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-020: Hold H-9990db33: UI criterion C-d3d35a1c has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-d3d35a1c has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-021: Hold H-c7821b44: UI criterion C-36608f1a has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-36608f1a has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-022: Hold H-f819f6de: UI criterion C-547ad66e has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-547ad66e has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-023: Hold H-d81669ad: UI criterion C-832d250d has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-832d250d has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-024: Hold H-a9305e9d: UI criterion C-a36860e0 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-a36860e0 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-025: Hold H-9f575e04: UI criterion C-78331251 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-78331251 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-026: Hold H-b9b4b515: UI criterion C-69d9392a has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-69d9392a has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-027: Hold H-4f7f2c66: UI criterion C-9d1fffc7 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-9d1fffc7 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-028: Hold H-772da66c: UI criterion C-412941ac has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-412941ac has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-029: Hold H-12fc3427: UI criterion C-0e0cc641 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-0e0cc641 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-030: Hold H-74697ad6: UI criterion C-dc43ef5f has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-dc43ef5f has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-031: Hold H-ca2dd6a8: UI criterion C-08c4c2e4 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-08c4c2e4 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-032: Hold H-979139da: UI criterion C-61a6e3a3 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-61a6e3a3 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-033: Hold H-034ad64a: UI criterion C-74fd23b0 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-74fd23b0 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
