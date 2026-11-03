# Proposal: fix 1 for add-dbos-runtime

## Why
The verifier found problems in `add-dbos-runtime` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-1216922b (major): An after-observer failure is retried instead of failing the step: Decided by delegate in Q-019: The finding holds. In src/durable/steps.ts the JSON check of fn's result and the after observer call sit inside the per-attempt try whose catch counts an attempt and loops, so with retries above 0 and no retryable predicate an after observer that throws, or a non-JSON result, makes fn run again after it already succeeded. Design decision 6 says fn runs up to retries plus one times, the result is then checked, the after observer runs once, and an observer that throws fails the step; the spec says only fn is retried while retryable allows. Only errors thrown by fn itself may be retried. WHEN runStep runs with retries 2 and fn resolves a valid DurableJson but the after observer throws THEN fn has run exactly once, the step rejects with the observer's error unchanged and no second attempt of fn is made.. src/durable/steps.ts places the after observer inside the retry catch. A tran...

## Impact
The code and the tests of `add-dbos-runtime`.
