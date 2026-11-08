# Feedback — add-hook-runtime

<!-- l4:feedback v1
Ask for changes here while the unit's branch is open. The easy way is `l4 feedback add` (see `l4 feedback --help`).
An item is read only when its **Status** is `submitted`; `draft` items wait and `withdrawn` items are ignored.
Kinds: refactor · duplication · tests · config · behaviour (see docs/feedback.md).
Do not change item IDs. Commit and push to the l4/… branch: the harness takes submitted items at its next
verification round, turns them into a fix unit and checks that each one was addressed. -->

<!-- l4:feedback-index:start -->
| ID | Status | Kind | Where | Feedback |
|----|--------|------|-------|----------|
| FB-001 | addressed | tests |  | Replay of a fused pre hook that changes the input is untested. |
<!-- l4:feedback-index:end -->

---

## FB-001: Replay of a fused pre hook that changes the input is untested.

- **Status:** addressed
- **Kind:** tests
- **Lesson:** no
- **By:** CiprianSpot, 2026-11-08T02:25:09Z

### Feedback
Replay of a fused pre hook that changes the input is untested.

Requirement "A replay runs no recorded hook and reaches the same rows" says a replay SHALL restore a fused node's input from its records. No test checks it: every pre hook of `onion-own` returns nothing, so with the pre re-application on replay disabled (`unwrap` in `src/interpreter/hooks/pipeline.ts`, `if (record.phase === "pre") applyPre(...)` skipped) all 432 tests of `src/interpreter`, `src/runs` and `test/support` still pass. Add a test to `src/interpreter/hooks/replay.test.ts` with a variant of `mutate` (its fused pre hook `trim_name` changes `lookup`'s input) whose `lookup` also gets an own-step post hook (one with `routes`, so it is not fused) that reads `ctx.input`: run it once, then replay over the prefix that ends after `lookup`'s fused step. Assert that the own-step post hook gets the same `ctx.input` as in the first run (the trimmed `vendor_name`), that the observer entries and `listSteps` equal the first run's (the `lookup` row's effective input included), and that the test fails when that `applyPre` line is skipped.

### Outcome
<!-- written by the harness -->
Addressed in round 1 at 090d021fdd: src/interpreter/hooks/replay-fused-pre.test.ts adds the requested replay test: run the mutate variant once, replay over the prefix ending after lookup's fused step, assert the own post hook sees the trimmed ctx.input, that obs and listSteps equal the first run, and that lookup is not reinvoked; t...
