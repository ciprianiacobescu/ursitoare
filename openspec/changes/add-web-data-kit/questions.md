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
| Q-001 | answered | none | verdict | Criterion C-98c49746 (web-data-kit › A cursor list loads one page at a time and appends the next › Page size and subscribers): accept as satisfied? |
| Q-002 | answered | none | verdict | Finding F-27dc58cb: Load more after an empty page unmounts the focused button |
| Q-003 | answered | none | verdict | Finding F-78d50e72: An unsupported property `c` comes back with an empty name |
| Q-004 | answered | none | verdict | Finding F-4c79e0be: task 1.1: no-op calls and loads do not settle with the request in flight |
| Q-005 | answered | none | verdict | Finding F-d49cb373: task 4.1: an enum property without type is not rendered as an enum |
| Q-006 | answered | none | verdict | Hold H-fe461ce5: UI criterion C-4ad6d2b9 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-007 | answered | none | verdict | Hold H-ee891db8: UI criterion C-efc9d8f0 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-008 | answered | none | verdict | Hold H-949d5558: UI criterion C-98c49746 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-009 | answered | none | verdict | Hold H-c97509ef: UI criterion C-3d1d3680 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-010 | answered | none | verdict | Hold H-e034653d: UI criterion C-79a9fd48 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-011 | answered | none | verdict | Hold H-1632d223: UI criterion C-629f74f4 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-012 | answered | none | verdict | Hold H-78854961: UI criterion C-d83105ac has no end-to-end test (not_testable); see the generated UI tests table |
| Q-013 | answered | none | verdict | Hold H-e3eeb0c7: UI criterion C-bea5ecec has no end-to-end test (not_testable); see the generated UI tests table |
| Q-014 | answered | none | verdict | Hold H-5ffc170f: UI criterion C-df0a8688 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-015 | answered | none | verdict | Hold H-9e6818f7: UI criterion C-686289b8 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-016 | answered | none | verdict | Hold H-6c2adf23: UI criterion C-3bc08473 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-017 | answered | none | verdict | Hold H-d3cb390d: UI criterion C-56d95a76 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-018 | answered | none | verdict | Hold H-52ff52d0: UI criterion C-8e9e0bb2 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-019 | answered | none | verdict | Hold H-9be5d094: UI criterion C-76ec796a has no end-to-end test (not_testable); see the generated UI tests table |
| Q-020 | answered | none | verdict | Hold H-9990db33: UI criterion C-d3d35a1c has no end-to-end test (not_testable); see the generated UI tests table |
| Q-021 | answered | none | verdict | Hold H-c7821b44: UI criterion C-36608f1a has no end-to-end test (not_testable); see the generated UI tests table |
| Q-022 | answered | none | verdict | Hold H-f819f6de: UI criterion C-547ad66e has no end-to-end test (not_testable); see the generated UI tests table |
| Q-023 | answered | none | verdict | Hold H-d81669ad: UI criterion C-832d250d has no end-to-end test (not_testable); see the generated UI tests table |
| Q-024 | answered | none | verdict | Hold H-a9305e9d: UI criterion C-a36860e0 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-025 | answered | none | verdict | Hold H-9f575e04: UI criterion C-78331251 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-026 | answered | none | verdict | Hold H-b9b4b515: UI criterion C-69d9392a has no end-to-end test (not_testable); see the generated UI tests table |
| Q-027 | answered | none | verdict | Hold H-4f7f2c66: UI criterion C-9d1fffc7 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-028 | answered | none | verdict | Hold H-772da66c: UI criterion C-412941ac has no end-to-end test (not_testable); see the generated UI tests table |
| Q-029 | answered | none | verdict | Hold H-12fc3427: UI criterion C-0e0cc641 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-030 | open | none | verdict | Hold H-74697ad6: UI criterion C-dc43ef5f has no end-to-end test (not_testable); see the generated UI tests table |
| Q-031 | open | none | verdict | Hold H-ca2dd6a8: UI criterion C-08c4c2e4 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-032 | open | none | verdict | Hold H-979139da: UI criterion C-61a6e3a3 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-033 | open | none | verdict | Hold H-034ad64a: UI criterion C-74fd23b0 has no end-to-end test (not_testable); see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Criterion C-98c49746 (web-data-kit › A cursor list loads one page at a time and appends the next › Page size and subscribers): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The criterion is satisfied as the code stands. createCursorList rejects a pageSize that is not an integer or lies outside 1 to 200 with a KitError of code KIT_PROP_INVALID, so 0, 201 and 1.5 throw and 200 is accepted, and a list without pageSize falls back to DEFAULT_PAGE_SIZE, which is 50, so its first request carries limit 50. commit calls every listener from a copy of the set inside a try block that swallows a throwing listener, so the second subscriber is called for every change even when the first throws. getState returns the snapshot variable itself, which only commit reassigns, so two reads without a change are the same object. The tracing test asserts the three rejected sizes, the accepted 200, the default limit and the second subscriber's calls past a throwing first subscriber; it does not assert the object identity of two getState reads, which the judge called inadequate, but that clause is plain from the implementation and adding the assertion would change a frozen test. The listener call at sign-up is an addition the specification neither asks for nor forbids and the frozen test relies on it.
---

## Q-002: Finding F-27dc58cb: Load more after an empty page unmounts the focused button

- **Status:** answered
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
reject This replaces the delegate's answer, which is right but covers the view only. Confirmed in the code. Load more after state (5) starts a request that keeps the items and nextCursor of the page before (cursor-list.ts:108-116), so the state is loading, no items, nextCursor "c1"; tableView (data-table.ts:140-149) then gives body loading and loadMore hidden, so the focused Load more button unmounts, and focusAfterChange (184-203) gives none for that change and also for the next one when that page ends the list, because it requires items before. design.md Decision 4 says Load more keeps focus while busy and focus moves to the table region when Load more ends the list. A first page (loading, no items, no cursor) keeps the view of scenario (2). WHEN tableView gets loading with no items and nextCursor "c1" (Load more pressed after an empty page) and focusAfterChange gets (loading none cursor "c1", loaded none no cursor) THEN the view's body, rowCount, loadMore, retry and showError are rows, 0, busy, hidden and false with the announcement "Loading more rows", and the focus target is table.
<!-- l4 questions --replace by CiprianSpot on 2026-10-30; previous answer:
> reject The finding is right. In cursor-list.ts a loadMore keeps the items and the nextCursor of the page before it, so after state (5) the list is loading with no items and nextCursor "c1". In data-table.ts tableView makes body loading for any loading state with no items and loadMore busy only when there are items, so this state gets loadMore hidden; DataTable.tsx renders the Load more button only when loadMore is not hidden, so the button that was just pressed unmounts. focusAfterChange has no branch for loaded to loading, so it returns none and keyboard focus falls to the document body. Design Decision 4 says focusAfterChange names a target for every change that unmounts the focused button, so keyboard focus is never lost, and that Load more keeps focus while busy; Decision 9 of the decisions made while writing says the same. The frozen scenario (2) and its test only pin loading with no items and a null cursor, which is the first page, so the fix can tell a Load more after an empty page apart by its non-null nextCursor without touching any test. WHEN tableView gets a loading state with no items and a non-null nextCursor, the state a loadMore from a loaded page with no items and a cursor produces THEN loadMore is busy so the Load more button stays mounted with aria-disabled and keyboard focus stays on it, while loading with no items and a null cursor keeps body loading and loadMore hidden.
-->
---

## Q-003: Finding F-78d50e72: An unsupported property `c` comes back with an empty name

- **Status:** answered
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
reject Confirmed: for a property without a type parseProperty (schema-fields.ts:283-287) blanks the name and replaces the label with "Field <i+1>", and SchemaForm shows that label above the unsupported error (SchemaForm.tsx:83-89), so the reader cannot tell which property is wrong. Task 4.1 makes an unsupported field's label its cleaned name, "Field <i+1>" only when the name is blank. This unit's test C-78331251 (schema-fields.test.ts:113) pins the blank name and no test pins this label, so fix the label only and leave the name as it is. WHEN schemaToFields gets the schema of scenario "Unsupported properties" THEN the field of c has the label "C" and the reason "the property has no type", and the other six fields keep their names, labels and reasons.
---

## Q-004: Finding F-4c79e0be: task 1.1: no-op calls and loads do not settle with the request in flight

- **Status:** answered
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
reject This replaces the delegate's accept, which did not know the M2 caller and read the test conflict as covering every call; it covers only calls that start nothing. Confirmed: load, loadMore and retry return Promise.resolve() at once even when they start a request (cursor-list.ts:178-204), so awaiting them does not wait for the page. Task 1.1 asks for calls that settle with the request in flight, and add-web-admin (M2) builds loadAllItems on that: it awaits load() and then loadMore() while the state is loaded with a nextCursor, so with this code it reads loading and stops with no items. Keep a call that starts nothing resolving at once: this unit's test C-efc9d8f0 (cursor-list.test.ts:181-182) awaits such calls while the first request is still unanswered. WHEN load() from idle, loadMore() from loaded with a nextCursor and retry() from error each start a request THEN the promise each returns resolves only once that request's page or error is committed, or once reset() drops it, never rejects, and the state read right after it is that outcome, while a call that starts nothing still resolves at once.
<!-- l4 questions --replace by CiprianSpot on 2026-10-30; previous answer:
> accept The finding is waived. The only basis for it is the task 1.1 sentence that a no-op call settles with the request in flight, and the task's own frozen test for the Nothing to do scenario reads that sentence the other way: it awaits loadMore and load while the first request is still unanswered and answers the request only afterwards, so a no-op call that returned the pending request's promise would never settle and the test would time out. The specification scenario asks only that fetchPage is called once and the state ends loaded with a, design Decision 2 says only that any other call is a no-op, and no document requires load, loadMore or retry to wait for the page. The code satisfies the criterion as written and the suggested fix cannot be made without changing a frozen test.
-->
---

## Q-005: Finding F-d49cb373: task 4.1: an enum property without type is not rendered as an enum

- **Status:** answered
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
reject Confirmed: parseProperty returns "the property has no type" (schema-fields.ts:283-287) before it looks at enum, so { enum: ["bug", "task"] } becomes an unsupported field and blocks the form. Task 4.1 defines the enum kind as enum of texts with type absent or "string", and only an enum with another type is refused (line 279). A property with neither type nor enum keeps the reason "the property has no type". WHEN schemaToFields gets an object schema whose only property kind is { enum: ["bug", "task"] } with no type THEN problems is empty and the one field is the same enum field Kind with options bug and task that { type: "string", enum: ["bug", "task"] } gives.
---

## Q-006: Hold H-fe461ce5: UI criterion C-4ad6d2b9 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold is waived. Criterion C-4ad6d2b9 is the scenario First page, then load more of the cursor list, which describes the states, items, cursors and requests of createCursorList, a plain state machine in cursor-list.ts with no markup of its own. The Node test for it creates a list with page size 2, asserts the idle, loading and loaded states, the two requests with cursor null then c1 and limit 2, a distinct AbortSignal on each, and the final items a, b and c, which is the whole scenario. No route of the web app mounts DataTable or any other data component, and the design's test plan and the proposal both state that this change has no kit demo route and no browser journey, leaving the markup to the first consumers add-web-task-inbox and add-web-admin. A browser test therefore cannot observe this criterion, and the unit can go on as it stands.
---

## Q-007: Hold H-ee891db8: UI criterion C-efc9d8f0 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-efc9d8f0 is the scenario "Nothing to do": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-008: Hold H-949d5558: UI criterion C-98c49746 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold is waived. Criterion C-98c49746 is the scenario Page size and subscribers of the cursor list, which describes the module API of createCursorList: a pageSize outside 1 to 200 or not an integer throws a KitError of code KIT_PROP_INVALID, a list without pageSize asks for limit 50, a second subscriber is called for every change even when the first throws, and two getState reads without a change are one object. None of that is page behaviour a browser could observe. The implementation in cursor-list.ts validates the page size, falls back to DEFAULT_PAGE_SIZE of 50, and calls every listener from a copy of the set inside a try block, and the Node test for the criterion asserts the three rejected sizes, the accepted 200, the default limit and the second subscriber's calls past a throwing first subscriber. No file outside web/src/kit/data imports the data components or createCursorList, so no route of the web app mounts them, and the design's test plan and the proposal both state that this change has no kit demo route and no browser journey, leaving the markup to the first consumers. An end-to-end test for this criterion is therefore impossible as well as unnecessary, and the unit can go on as it stands.
---

## Q-009: Hold H-c97509ef: UI criterion C-3d1d3680 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-3d1d3680 is the scenario "Failed pages and retry": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-010: Hold H-e034653d: UI criterion C-79a9fd48 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-79a9fd48 is the scenario "A stale answer after reset": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-011: Hold H-1632d223: UI criterion C-629f74f4 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-629f74f4 is the scenario "A malformed page": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-012: Hold H-78854961: UI criterion C-d83105ac has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-d83105ac is the scenario "Parsing and requesting": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-013: Hold H-e3eeb0c7: UI criterion C-bea5ecec has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-bea5ecec is the scenario "Bad body, item, query, client error": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-014: Hold H-5ffc170f: UI criterion C-df0a8688 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-df0a8688 is the scenario "The model": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-015: Hold H-9e6818f7: UI criterion C-686289b8 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-686289b8 is the scenario "The view for every state": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-016: Hold H-6c2adf23: UI criterion C-3bc08473 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-3bc08473 is the scenario "Where focus goes": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-017: Hold H-d3cb390d: UI criterion C-56d95a76 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-56d95a76 is the scenario "Field messages and unknown entries": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-018: Hold H-52ff52d0: UI criterion C-8e9e0bb2 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-8e9e0bb2 is the scenario "No usable details and other errors": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-019: Hold H-9be5d094: UI criterion C-76ec796a has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-76ec796a is the scenario "Hostile and oversized text": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-020: Hold H-9990db33: UI criterion C-d3d35a1c has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-d3d35a1c is the scenario "Field ids": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-021: Hold H-c7821b44: UI criterion C-36608f1a has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-36608f1a is the scenario "Invalid fields and forms": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-022: Hold H-f819f6de: UI criterion C-547ad66e has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-547ad66e is the scenario "The form model, focus target and attempts": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-023: Hold H-d81669ad: UI criterion C-832d250d has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-832d250d is the scenario "Every supported kind": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-024: Hold H-a9305e9d: UI criterion C-a36860e0 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-a36860e0 is the scenario "Labels and hints": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-025: Hold H-9f575e04: UI criterion C-78331251 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-78331251 is the scenario "Unsupported properties": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-026: Hold H-b9b4b515: UI criterion C-69d9392a has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-69d9392a is the scenario "Names, required and bounds": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-027: Hold H-4f7f2c66: UI criterion C-9d1fffc7 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-9d1fffc7 is the scenario "Root problems": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-028: Hold H-772da66c: UI criterion C-412941ac has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-412941ac is the scenario "Required, text and number rules": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
---

## Q-029: Hold H-12fc3427: UI criterion C-0e0cc641 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
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
accept The hold may be waived. Criterion C-0e0cc641 is the scenario "Enum and list rules": a call of the kit's functions and its return value, which no page shows. design.md "Browser coverage, stated plainly" says no page uses these components and add-web-ui-kit rules out a kit demo route, so this unit has no journey; what decides the DOM is in .ts and proved in Node, and the first consumers (add-web-task-inbox for SchemaForm, add-web-admin for DataTable) prove the markup with assert_accessible(page). Its Node test is traced as covered and passed with a red assertion.
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
