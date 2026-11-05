# Feedback — add-dbos-runtime

<!-- l4:feedback v1
Ask for changes here while the unit's branch is open. The easy way is `l4 feedback add` (see `l4 feedback --help`).
An item is read only when its **Status** is `submitted`; `draft` items wait and `withdrawn` items are ignored.
Kinds: refactor · duplication · tests · config · behaviour (see docs/feedback.md).
Do not change item IDs. Commit and push to the l4/… branch: the harness takes submitted items at its next
verification round, turns them into a fix unit and checks that each one was addressed. -->

<!-- l4:feedback-index:start -->
| ID | Status | Kind | Where | Feedback |
|----|--------|------|-------|----------|
| FB-001 | taken | behaviour | src/durable/steps.ts:126 | runStep turns a replayed step error into dbos_failed |
<!-- l4:feedback-index:end -->

---

## FB-001: runStep turns a replayed step error into dbos_failed

- **Status:** taken
- **Kind:** behaviour
- **Where:** `src/durable/steps.ts:126-136`
- **Lesson:** no
- **By:** CiprianSpot, 2026-11-05T00:40:54Z

### Code
```typescript
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
```

### Feedback
runStep turns a replayed step error into dbos_failed

When a recovered or forked workflow reaches a step that DBOS 5.3.0 has already recorded as failed, DBOS does not run the callback. It rethrows the recorded error, rebuilt by serialize-error: dbos-executor.js:576-587 and 165, serialization.js:339. serialize-error 8.1.0 builds a new Error and copies name, message, code and details onto it. That object is not callbackError and not instanceof DurableError, and callbackFailed is false, so the catch at steps.ts:128-135 throws dbosFailed(). A recovered run therefore takes a different path from its first run: an error that fn threw comes back as DURABLE_UNAVAILABLE dbos_failed. That error can be a DurableError, or an InterpreterError of a failed node, which add-interpreter-core recognises by code (design decision 9).

This was finding F1 of the add-dbos-runtime review (Q-017, 2026-11-03). The fix unit add-dbos-runtime-fix-1 covered only F-1216922b, so F1 is still open on main.

Suggested shape: inside the callback, mark fn's own error before DBOS records it, with an enumerable property that serialize-error keeps. Rethrow a marked error unchanged, and rebuild a revived error named DurableError as a DurableError with its code and details. A real SDK or driver failure around fn stays dbos_failed. Replay can be tested in-process with DBOS.forkWorkflow from a later step; test files under src/durable may import DBOS.

### When / Then
- **When:** a recovered or forked workflow replays a step whose fn had thrown, once a DurableError and once a plain Error carrying a code
- **Then:** runStep rejects with an error of the same name, message, code and details as on the first run, the DurableError is again instanceof DurableError, fn is not called again, and neither rejection is DURABLE_UNAVAILABLE dbos_failed

### Outcome
<!-- written by the harness -->
Taken into add-dbos-runtime-followup-1
