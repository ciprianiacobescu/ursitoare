Specs: `specs/sandbox/spec.md`, `specs/sandbox-build/spec.md`; decisions: `design.md`; fixtures: `test-plan.md`, `escape-data.md`. Every test but 3.8 imports from `src/sandbox/index.ts`, wraps a stub-reaching call (async: `p.then((v) => v, (e: unknown) => e)`; sync: try/catch) so the failure is an assertion, uses `node:assert/strict`, closes pools in `finally`, and has no `.`, `[` or `::` in test names. Each task implements only what it names, so a later task's red tests fail by assertion.

## 1. Helpers

- [x] 1.1 Write `src/sandbox/limits.test.ts` first (scenario "Helper vectors, defaults and the error class"), then implement `src/sandbox/limits.ts`, `src/sandbox/types.ts` (types, `SandboxError`) and `src/sandbox/index.ts`, implementing requirement "Pure helpers and default objects fix the sandbox's numbers"
- [x] 1.2 Write `src/sandbox/classify.test.ts` first (scenario "Every classification row on synthetic facts") against the scaffold stub `classifyFault` (`src/sandbox/classify.ts`), then implement it, implementing requirement "A body runs in a fresh context and every failure is a typed fault"

## 2. Architecture rule

- [x] 2.1 Write `test/arch/sandbox-io.test.ts` first (scenario "Allowed, refused and ignored files"; it also asserts `checkSandboxIo(readSnapshot())` is `[]`, which later tasks must keep), then implement `checkSandboxIo` in `test/arch/sandbox-io.ts`, implementing requirement "The sandbox imports no host I/O"

## 3. The pool

- [x] 3.1 Write `src/sandbox/validate.test.ts` first (scenario "Each invalid argument is refused with no worker started"), then implement `src/sandbox/validate.ts` and the validation of `run` in `src/sandbox/pool.ts` (no worker yet), implementing requirement "A run refuses invalid arguments as input_invalid faults"
- [x] 3.2 Write `src/sandbox/run.test.ts` first (scenarios "Bindings, result modes and accepted boundaries" and "Faults of the body and no retry"), then implement `src/sandbox/worker-entry.ts`, `run-code.ts`, `prelude.ts` (driver and result modes only: no clock, PRNG or walker limits), `wasm.ts` (one module, no buckets) and in `pool.ts` one lazily spawned worker, one job at a time (`size` ignored), with a `close` that terminates it, implementing requirement "A body runs in a fresh context and every failure is a typed fault" (table: `design.md` § Failure classification)
- [x] 3.3 Write `src/sandbox/pool.test.ts` first (scenario "Spawn record, concurrency and options"), then extend `pool.ts` to `size` workers reserved synchronously, FIFO queue, spawn options, `unref()`, option validation, implementing requirement "The pool spawns workers lazily, one job each, and refuses bad options"
- [x] 3.4 Write `src/sandbox/determinism.test.ts` first (scenario "Same arguments, same output"), then add the clock, PRNG, UTC and deleted globals to `prelude.ts`, implementing requirement "Runs are deterministic"
- [x] 3.5 Write `src/sandbox/limits-run.test.ts` first (scenarios "Bombs are contained and buckets are isolated" and "Recursion, clamp, byte limits and walker"), then add memory buckets, `setMemoryLimit`, the stack clamp, the output walker and byte count to `run-code.ts`, `wasm.ts` and `prelude.ts`, implementing requirements "Guest memory is capped per memory bucket" and "Stack depth, output size and nesting are capped"
- [x] 3.6 Write `src/sandbox/deadline.test.ts` and `src/sandbox/crash.test.ts` first (scenarios "Interrupt, late finish and watchdog" and "Exit during a job, idle exit and a factory that throws"), create `test/support/sandbox-exit-worker.ts`, then add the interrupt and late-finish rule to `run-code.ts` and the watchdog, replacement and spawn failure to `pool.ts`, implementing requirements "A run past its deadline is a timeout, and a stuck worker is killed" and "A failed worker is replaced and the run reports sandbox_crash"
- [ ] 3.7 Write `src/sandbox/close.test.ts` first (scenario "Close mid-run, after close and process lifetime"), then complete `close` in `pool.ts` (reject pending runs, idempotent), implementing requirement "A closed sandbox rejects pending and later runs"
- [ ] 3.8 Write `src/sandbox/built.test.ts` (scenario "The built worker answers without a factory"; `BUILD` of `test-plan.md`); it is green on arrival (no stub after 3.2 and 3.3) and a failure is a build defect to fix in `src/sandbox/`, implementing requirement "The built worker entry answers a run without a factory"

## 4. The escape suite

- [ ] 4.1 Write `test/support/sandbox-escape.test.ts` and `src/sandbox/escape.test.ts` first (scenarios "Case data and verdicts" and "Every case on a real pool, variants and the host"; the first asserts the ids equal `ESCAPE_IDS`, the second the two digests of `escape-data.md`, hashing with `node:crypto`), then create `test/support/sandbox-escape.ts` and append its row and the exit worker's to `test/support/README.md`, implementing requirement "The escape suite is shared data and the guest stays contained"
