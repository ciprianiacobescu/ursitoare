# Proposal: follow-up 1 for add-hook-runtime

## Why
Requested by CiprianSpot, 2026-11-08T02:25:09Z in FB-001 (tests): Replay of a fused pre hook that changes the input is untested. Requirement "A replay runs no recorded hook and reaches the same rows" says a replay SHALL restore a fused node's input from its records. No test checks it: every pre hook of `onion-own` returns nothing, so with the pre re-application on replay disabled (`unwrap` in `src/interpreter/hooks/pipeline.ts`, `if (record.phase === "pre") applyPre(...)` skipped) all 432 tests of `src/interpreter`, `src/runs` and `test/support` still pass. Add a test to `src/interpreter/hooks/replay.test.ts` with a variant of `mutate` (its fused pre hook `trim_name` changes `lookup`'s input) whose `lookup` also gets an own-step post hook (one with `routes`, so it is not fused) that reads `ctx.input`: run it once, then replay over the prefix that ends after `lookup`'s fused step. Assert that the own-step post hook gets the same `ctx.input` as in the first run (the trimmed `vendor_name`), that the observer entries and `listSteps` equal the first run's (the `lookup` row's effective input included), and that the test fails when that `applyPre` line is skipped.

`add-hook-runtime` was merged, and a person asked for the changes above in its `feedback.md`. This change carries them out; each task names the finding it answers.

## What Changes
- F-1f1aad49: Feedback FB-001 (tests): Replay of a fused pre hook that changes the input is untested.

## Impact
The code and the tests of `add-hook-runtime`.
