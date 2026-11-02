## Why

`add-mock-test-runs` lets an author test a stored version through the API. An author editing a file on disk needs the same check without a server or a database: validate the flow, check the mocks, run it, see each step.

Batch `m4-runs-timeline` (U30-U37 and U35b; closing unit `add-web-run-timeline`, journey `e2e/test_m4_runs.py`) delivers M4: an author test-runs a validated flow with mocked tools and follows each step on the run timeline; runs survive a kill. This unit's part: the offline `flow test` command, which runs the same mocked test without a server or a database.

Observable result: `ursitoare flow test --file <path> --mocks <path>` prints one line per step and `COMPLETED <terminal node>` (exit 0) or `FAILED <code> <node>` (exit 1). An invalid flow, a missing or malformed mock and a refused input also exit 1 with a stated reason; a bad option or unreadable file exits 2. It runs in-process on the in-memory run store, calls no tool and opens no connection. `ursitoare help` lists `flow test` next to `flow validate`.

## What Changes

- `src/cli/flow/test.ts` (the command), a named edit to `src/cli/flow/index.ts` (registration; `src/cli/builtin.ts` is not edited), the frozen test `src/cli/main.test.ts::C-2687097e registerAdminCommands and createDefaultRegistry list the five admin commands`, changed in place.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because it changes an existing file: the registration in `src/cli/flow/index.ts`. No new dependency.
- **Depends on:**
  - `add-mock-test-runs` (U35): `checkMocks` validates the mocks and `testRunInvokers` answers them; the command also needs its `createMockInvoker` behaviour and its problem `detail` strings, which it prints.
  - `add-interpreter-core` (U33): `startRun` and `executeRun` run the flow on `memoryWorkflowOps`, with `NO_EFFECT_GATE`.
  - `add-envelope-store` (U31): `createMemoryRunStore` is the in-memory `RunStore`, so no database is needed.
  - `add-effect-intents` (U34): its fixtures `payOnceVersion`, `PAY_ONCE_INPUT` and `PAY_ONCE_PAID_OUTPUT` serve the tests; the command itself does not use the intent store.
  - `add-admin-cli` (U20): the command registry (`CliCommand`, `createCommandRegistry`, `createDefaultRegistry`) and `cliMain`.
  - Also used from merged code: `add-flow-validator` (U25: `validateFlowText`, `catalogueFromJson`), `add-flow-format-model` (U22: `parseFlowText`, `contentHash`) and `add-test-catalogue` (U24: `TEST_CATALOGUE_PATH`). `test/arch/modules.ts` needs no change: `cli` may import `interpreter`, `runs`, `authoring`.
- **Rulings:** D14 (in-process, in-memory, no database), D6, D7 and D10 (through U33), D11 (the principal is the local user `cli`), conflict 7 (the ops-cli scenario that lists the default registry) and conflict 8 (the group's index file is edited, `builtin.ts` is not).
- **Changed:** `src/cli/flow/index.ts`; the frozen test above (seven names); the archived ops-cli requirement "The entry point runs the default registry" is MODIFIED, because its scenario still lists only the five admin commands although main registers `flow validate`.
- **Migrations, tables, endpoints, env vars, error codes:** none.

**Interfaces given** (exact shapes in `design.md` § Interfaces)

```ts
// src/cli/flow/test.ts
export const flowTestCommand: CliCommand;   // database: false; summary "run a flow offline against mocks"
// src/cli/flow/index.ts: registerFlowCommands also calls registry.registerCommand("flow test", flowTestCommand); src/cli/builtin.ts is unchanged
```

**Interfaces taken:**

- From `add-mock-test-runs`: `checkMocks`, `createMockInvoker`, `testRunInvokers`, `TestMocks`, `MockProblem`.
- From `add-interpreter-core`: `startRun`, `StartRunRequest`, `executeRun`, `InterpreterDeps`, `InterpreterError`, `memoryWorkflowOps`, `NO_EFFECT_GATE`.
- From `add-envelope-store`: `createMemoryRunStore`, `RunStore`, `TenantContext`. From `add-effect-intents`: `payOnceVersion`, `PAY_ONCE_INPUT`, `PAY_ONCE_PAID_OUTPUT` (tests).
- From merged code (`delivered-shapes.md`): the CLI registry and output helpers, `runCli`'s error handling, `validateFlowText`, `catalogueFromJson`, `parseFlowText`, `contentHash`, `formatOf`, `emptyCatalogue`, `TEST_CATALOGUE_PATH`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@e06fdb3, checked line by line; the sibling shapes are copied from their folders).

## Out of scope

The test endpoint and the version loader (`add-mock-test-runs`), live and stub modes, any node kind beyond `block`, `switch`, `wait` and `end` (U33 refuses the rest), reading a flow from the registry, intent rows (the CLI uses `NO_EFFECT_GATE`), and retries (D18).
