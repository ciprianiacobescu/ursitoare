## Context

The command is an author's offline check (D14). It reuses the interpreter exactly as the API does, with three differences: the store is `createMemoryRunStore()`, the workflow ops are `memoryWorkflowOps`, and no effect journal is kept (`NO_EFFECT_GATE`). It makes no network call and opens no database (`database: false`), as the architecture rules for the `cli` module require.

## Decisions

1. **Options.** `file` and `mocks` (string, required), `input` (string, a JSON file, default `{}`), `catalogue` (string, a catalogue JSON file as `flow validate` reads it, default `emptyCatalogue`), `json` (boolean), in that order, with the option summaries `flow file to test`, `mocks JSON file`, `input JSON file, default {}`, `catalogue JSON file` and `print the result as JSON`; `--help` is rendered by the existing `writeUsage` of `src/cli/run.ts` (usage line, summary, then one line per option), which this change does not touch. `run.ts` already rejects a missing required option with `CLI_USAGE`, exit 2.
2. **Reading.** Order: `--file`, `--catalogue`, validation, `--mocks`, `--input`. A file read refuses missing, unreadable, non-regular and oversized files with `CLI_USAGE: cannot read <option> (<reason>)`, `<reason>` being the errno (`ENOENT`, ...), `too large` for a file over 1,048,576 bytes (1,048,577 is refused) and `not a regular file` for every path that is not a regular file: a directory, a FIFO or a device such as `/dev/null`, one wording for all (`flow validate` words a directory `EISDIR`; this command does not). The size and kind are checked with `statSync` before the read, so a FIFO is refused without blocking. No EACCES case is tested: a root runner can read a chmod-000 file, so the `(<errno>)` form is proven by `ENOENT` alone. `--mocks` or `--input` text that does not parse is `CLI_USAGE: <option> is not valid JSON`; an `--input` that is not a plain object is `CLI_USAGE: --input must be a JSON object`. A `--catalogue` file that `catalogueFromJson` rejects (`CatalogueFileError`) is `CLI_USAGE: catalogue: <message>`, the error's own message through `safeText` (for text `{`: `invalid JSON`), exit 2, like `--mocks`; an unreadable `--catalogue` path is the read refusal above.
3. **Flow.** `validateFlowText(text, formatOf(file), catalogue)`; not ok: print `INVALID <file>: <n> error(s)` and one line `  <layer> <code> <path>: <message>` per error and, without `--catalogue`, the last line `  hint: no --catalogue given, so every block is unknown`, return 1. Then `doc = parseFlowText(text, formatOf(file)).doc as Flow` and `hash = contentHash(doc)`.
4. **Mocks.** `checkMocks(doc, catalogue, mocks)`; with problems print `MOCKS <n> problem(s)` and `  <nodeId>[<index>] <reason>: <detail>` per problem (no brackets when `index` is null) and return 1. `detail` is the text U35 gives it (`no mock entry`, `/ required`, ...).
5. **Run.** `store = createMemoryRunStore()`, tenant `{ tenantId: "local", reviewProfile: "solo" }`, `deps = { store, durable: null, loadVersion` answering `{ flowId: doc.flow, hash, state: "validated", ownerTeam: "local", flow: doc }`, `catalogueFor` the catalogue, `invokerFor: testRunInvokers(store)`, `effects: NO_EFFECT_GATE`, `clock: call.clock`, `ids: call.ids }`. `startRun(deps, tenant, { flowId, hash, mode: "mock", input, mocks, principal: { userId: "cli", kind: "human" }, actorChain: ["cli"], runId: call.ids.next("run") })`, then `executeRun(memoryWorkflowOps(runId), deps, tenant, runId)`. An `InterpreterError` from `startRun` prints `FAILED <code> -`, then `  <key>: <value>` per `details` entry (arrays joined by `, `), and returns 1.
6. **Output.** One line per step in `seq` order (`listSteps` paged until `next` is null): `<seq> <nodeId> <kind> <state>` plus ` <outcome>` when the outcome is not null; then `COMPLETED <terminalNode>` (exit 0) or `FAILED <error.code> <error.node or "-">` (exit 1). With `--json` one line `{ state, terminalNode, error, output, steps }` through `safeJson`: `output` is the output payload (`getPayload`) or `null`, each step `{ seq, nodeId, kind, state, outcome, error }`. Every printed string goes through `safeText`.
7. **Errors.** No `InterpreterError` escapes `run`: `runCli` knows only `CLI_*`, `RBAC_*`, `IDENTITY_*`, `AUDIT_*` and `TENANT_*` codes and would print `CLI_INTERNAL`. Any other error escapes and `runCli` prints `CLI_INTERNAL: command failed` and exits 1 with stdout empty; the natural trigger is an `--input` holding a string with U+0000, which `startRun` hands to the memory store, and the store refuses with `RunDataError` (U31). A mock error entry fails its run with `INTERPRETER_TOOL_FAILED` at its node and its `code` and `message` appear nowhere (U35).
8. **Registration.** `registerFlowCommands` registers `"flow test"` before `"flow validate"`; `list()` sorts by name.

## Interfaces

```ts
// src/cli/flow/test.ts
export const flowTestCommand: CliCommand;   // database: false; summary "run a flow offline against mocks"
// src/cli/flow/index.ts: registerFlowCommands also calls registry.registerCommand("flow test", flowTestCommand); src/cli/builtin.ts is unchanged
```

## Failure cases

An unreadable, oversized or malformed file: exit 2, nothing run. An invalid flow, a mock problem, a refused input or a failed run: exit 1 with the reason on stdout. An error from the run path that is not an `InterpreterError` (proven case: `startRun`'s store write refuses U+0000 in `--input` with `RunDataError`): `CLI_INTERNAL: command failed`, exit 1, no other text. Errors during node visits are mapped by U33 itself.

## Security

No endpoint, table or PEP action: the command acts on local files the caller names. It opens no connection (`database: false`) and no tool is reachable: the only invoker is the mock one. Files are size-bounded (1 MiB) and read only when regular files: a directory, a FIFO or a device (`/dev/null`) is refused with `not a regular file`, exactly as Decision 2 says. Output passes through `safeText` and `safeJson`, so control and bidirectional characters in node ids or messages cannot reach the terminal. A mock `message` never prints. Abuse: a directory or device as `--file` (usage error), a hostile node id with escape codes (escaped), a huge mocks file (refused), a mock that raises an error (fixed code only).

## Test plan

Environment: the gates run on GitHub's Linux runners (`.github/workflows/l4.yml`, `runs-on: ubuntu-24.04`) and locally on macOS. Both are POSIX, which the repository already needs (embedded Postgres, `bash` setup), and `mkfifo` and `/dev/null` belong to it. No Windows support is claimed.

`flow.json` is `JSON.stringify(payOnceVersion().flow)` written to a `mkdtemp` directory with the mocks and input files; `CAT` is `TEST_CATALOGUE_PATH`; `MOCKS` is `{ lookup: [{ output: { vendor_id: "v1", status: "active" } }], pay: [{ output: PAY_ONCE_PAID_OUTPUT }] }`, `PAID` is `PAY_ONCE_PAID_OUTPUT`, the input file holds `PAY_ONCE_INPUT`. The directory case passes the `mkdtemp` directory itself; the oversized case a file of 1,048,577 `x` characters; the device case `/dev/null`; the FIFO case `execFileSync("mkfifo", [path])` in the `mkdtemp` directory (available on macOS and Linux). `FLOW0` is `payOnceVersion().flow` with `inputs` `{ type: "object" }`, `lookup.with` `{ vendor_name: "Acme" }` and `pay.with` `{ vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: 120, currency: "EUR", reference: "inv-1" }`, written as `flow0.json`. Each test builds `registry = createCommandRegistry()` with `registerCommand("flow test", flowTestCommand)` and calls `cliMain(argv, { env: {}, registry, stdout, stderr, ids: sequentialIds(0) })` with capturing outputs; `globalThis.fetch` is replaced by a recorder and restored in `finally`. The registry scenario uses `createDefaultRegistry()` and `cliMain(["help"])` without a custom registry.

## Decisions made while writing

- The command prints its own failure lines for `InterpreterError`, because `runCli` would turn them into `CLI_INTERNAL`.
- The local tenant is `local` and the version state `validated` with owner team `local`: they exist only to satisfy `startRun` and appear in no output.
- `createMockInvoker` is taken but called only through `testRunInvokers`; it is listed because the command's output depends on its failure rules.
