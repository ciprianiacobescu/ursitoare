# Proposal: follow-up 1 for add-dbos-runtime

## Why
Requested by CiprianSpot, 2026-11-05T00:40:54Z in FB-001 (behaviour, src/durable/steps.ts:126-136): runStep turns a replayed step error into dbos_failed When a recovered or forked workflow reaches a step that DBOS 5.3.0 has already recorded as failed, DBOS does not run the callback. It rethrows the recorded error, rebuilt by serialize-error: dbos-executor.js:576-587 and 165, serialization.js:339. serialize-error 8.1.0 builds a new Error and copies name, message, code and details onto it. That object is not callbackError and not instanceof DurableError, and callbackFailed is false, so the catch at steps.ts:128-135 throws dbosFailed(). A recovered run therefore takes a different path from its first run: an error that fn threw comes back as DURABLE_UNAVAILABLE dbos_failed. That error can be a DurableError, or an InterpreterError of a failed node, which add-interpreter-core recognises by code (design decision 9). This was finding F1 of the add-dbos-runtime review (Q-017, 2026-11-03). The fix unit add-dbos-runtime-fix-1 covered only F-1216922b, so F1 is still open on main. Suggested shape: inside the callback, mark fn's own error before DBOS records it, with an enumerable property that serialize-error keeps. Rethrow a marked error unchanged, and rebuild a revived error named Durabl...

      try {
        return await DBOS.runStep(callback, { name });
      } catch (error) {
        if (isDurableCancellation(error) || error instanceof DurableError) {
          throw error;
        }
        if (callbackFailed && error === callbackError) {
          throw error;
        }
        throw dbosFailed();
      }

`add-dbos-runtime` was merged, and a person asked for the changes above in its `feedback.md`. This change carries them out; each task names the finding it answers.

## What Changes
- F-3d0f9bb5: Feedback FB-001 (behaviour): runStep turns a replayed step error into dbos_failed

## Impact
The code and the tests of `add-dbos-runtime`.
