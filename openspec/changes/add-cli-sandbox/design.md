## Context

`flow test` runs a flow in mode `mock` on an in-memory store. A `code` node and a `code` hook need `InterpreterDeps.sandbox`: the node runtime throws `INTERPRETER_NO_SANDBOX` without it, and the hook pipeline throws the same code for a code hook before the node starts (`delivered-shapes.md`). The command never set it. The fix is a pool made by the command, which makes `cli` import `sandbox`, an edge the module graph exists to show, so the graph row changes in the same unit (carry-forward D5, decision D4 of the M7 cards).

## Decisions

1. **A factory with one seam.** `createFlowTestCommand(deps?: FlowTestDeps)` returns the `CliCommand`; `deps.createSandbox` defaults to `createWorkerSandbox`. `flowTestCommand` is `createFlowTestCommand()`, so `src/cli/flow/index.ts` and `builtin.ts` stay as they are and the default registry is unchanged. Tests inject `createSandbox` to record the pool; a real `createWorkerSandbox` stays the default so the shipped command is the tested one.
2. **`FLOW_TEST_POOL` is `Object.freeze({ size: 1 })`.** The interpreter visits one node at a time, so one worker is enough; the pool spawns workers lazily, so a flow with no code spawns none. No option or flag changes it (Out of scope).
3. **Creation point.** `run` creates the pool after `validateFlowText`, `parseFlowText`, `checkMocks` and the `--input` parse have all succeeded, immediately before `runFlow`, and passes it in. So `INVALID`, `MOCKS`, every usage error and `--help` create nothing. A `startRun` refusal (`INTERPRETER_INPUT_INVALID`) and a `startRun` throw happen after creation, so they close the pool.
4. **Closing.** `run` wraps `await runFlow(...)` in `try`/`finally`; the `finally` does `try { await sandbox.close(); } catch { /* ignored */ }`. The `catch` covers a rejected promise and a synchronous throw. It sits in the `finally`, after `runFlow` has written stdout, so the output comes first and a thrown error, a throwing stdout and a failed `close` all leave the original outcome. The creation call is outside the `try`: when `createSandbox` throws, no pool exists, nothing is closed and the error reaches `runCli` (`CLI_INTERNAL: command failed`, exit 1).
5. **The graph.** `MODULES.cli.allowed` is the 26 names of `api` followed by `sandbox` (27). Rejected: re-exporting a sandbox factory from `interpreter` (no graph change, but it hides the edge). `runtimes` stays closed to `cli`. `api` stays without `sandbox`.
6. **No change to `InterpreterDeps` or to the runtimes.** Code limits come from the interpreter's `CODE_LIMITS` (the sandbox defaults), the seed from `codeSeed`; `flow test` adds nothing.
7. **Tests.** Workers start only where code runs through the real pool: rows A1 to A3, H1 to H3, F1, P1, P5 and C1. In P3, P4, P7 and C3 the pool is created and closed but runs no code; in F2, F3, P2 and C2 `run` is replaced, so no worker starts. Event order (`create`, `run`, `write`, `close`) is recorded in one list, so "after the output" is an order check, never a time check.

## The four unchanged scenarios

"The graph carries the version 3 edges", "The shipped graph is consistent", "Inconsistent graphs are reported" and "A new egress capability is refused" are restated unchanged because the MODIFIED block replaces the whole requirement. Their frozen tests (`C-70858a5b`, `C-65b86cc0`, `C-851f3c7c`, `C-6923119c`) hold: none reads `cli`. `C-65b86cc0` asserts `checkGraphIntegrity()` is `[]` for the edited graph (no cycle: `sandbox` lists only `core` and `config`).

## Interfaces

Given, equal to `proposal.md`. Taken: `delivered-shapes.md`.

```ts
// src/cli/flow/test.ts
export interface FlowTestDeps { createSandbox?: (opts: WorkerSandboxOptions) => WorkerSandbox }   // test seam; default createWorkerSandbox
export function createFlowTestCommand(deps?: FlowTestDeps): CliCommand;
export const FLOW_TEST_POOL: Readonly<WorkerSandboxOptions>;   // { size: 1 }
```

`src/cli/flow/test.ts` imports `createWorkerSandbox` as a value and `WorkerSandbox`, `WorkerSandboxOptions` as types from `../../sandbox/index.ts`. Red tests import `createFlowTestCommand`, `flowTestCommand` and `FLOW_TEST_POOL` from `src/cli/flow/test.ts`, never from `src/cli/flow/index.ts`; the arch tests import from `test/arch/modules.ts`, `rules.ts` and `sources.ts`.

## Failure cases

| Case | Result |
|---|---|
| `createSandbox` throws | no pool, no `close`; exit 1, stderr `CLI_INTERNAL: command failed`, stdout empty (row P6) |
| A code node faults, or the pool's `run` rejects | `FAILED INTERPRETER_CODE_FAILED <node>`, exit 1; no fault text printed (rows F1 to F3) |
| `startRun` refuses or throws | after creation: the pool is closed (rows P3, P4) |
| stdout throws | the pool is closed, the error reaches `runCli` (row P5) |
| `close` rejects or throws | ignored; output and exit code unchanged (rows C1 to C3) |
| `close` never settles | the command waits for it (the pool's own `close` joins its workers); not tested, no timer added |
| Invalid flow, mock problem, usage error, `--help` | no pool (rows N1 to N5) |
| A flow with no code | the pool is created and closed with no worker spawned; output unchanged (row P7; the existing `test.test.ts` rows) |

## Risks

- An unclosed pool leaves a live worker thread until the process ends. The pool unrefs its workers (`delivered-shapes.md`, `sandbox/pool.ts`), so the process still exits (probe `p10`: a `flow test` run whose `close` does nothing exited in 0.5 s); the card's "keeps the CLI process alive" was not reproduced. `finally` is the requirement all the same: it releases the worker at once and makes the lifecycle observable. Tasks 1.1 and 2.1 split the work so each red test fails by assertion; task 2.1 adds the `finally`.
- `test/arch/modules.ts` is an L4 support file: only the red step of task 1.1 edits it, whole, so green cannot. The row is the card's: `[...api's 26 names, "sandbox"]`.
- The real-pool rows depend on the sandbox's own limits (1000 ms for the code's execution), as `src/interpreter/code-run.test.ts` on main does; no assertion reads a duration.
