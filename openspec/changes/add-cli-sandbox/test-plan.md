# Test plan: add-cli-sandbox

Values below were run in a scratch copy of main@3daa5c35 with the three source edits of `design.md` applied (probes `p1` to `p8`, Node 24.22.2, real `createWorkerSandbox`). Every stdout, exit code, event list and `run` argument in the specs is a probe output. The same argv on main (unedited `test.ts`) printed the `INTERPRETER_NO_SANDBOX` lines the specs name.

## Test files and ids

| File | Tests (name starts with) | Scenario |
|---|---|---|
| `test/arch/cli-sandbox.test.ts` | `C-90199ce0 the graph gives cli the sandbox edge and the CLI file uses it` | "The graph holds the 30 modules" |
| `test/arch/cli-sandbox.test.ts` | `C-d6eaf34e the CLI may import the sandbox and the API may not` | "The CLI may import the sandbox and the API may not" |
| `src/cli/flow/test-sandbox.test.ts` | `C-f20e390d a code node completes in the pool`, `C-8191a905 a code hook runs in the pool`, `C-8726b0c4 a sandbox fault fails the node and prints only its code` | the three scenarios of the first requirement |
| `src/cli/flow/test-pool.test.ts` | `C-4012f2ad the pool is created after validation and closed once on every exit path`, `C-00e31a66 a failing close changes nothing` | the two scenarios of the second requirement |

The four other scenarios of the MODIFIED requirement keep their frozen tests: `C-70858a5b` (version 3 edges), `C-65b86cc0` (consistent), `C-851f3c7c` (inconsistent graphs) and `C-6923119c` (egress), all in `test/arch/modules.test.ts`, unchanged. The frozen `C-90199ce0 C-851f3c7c: the graph holds the 30 modules in roadmap order` changes in two places: `assert.deepEqual(ruleOf(MODULES, "cli").allowed, [...apiAllowed, "sandbox"])`, and a last assertion that `collectImports` of `src/cli/flow/test.ts` in `readSnapshot()` holds a ref with specifier `../../sandbox/index.ts` and `typeOnly` false (it must fail at red: L4 refuses a changed named test that passes there).

Each test file starts with `assert.equal(typeof createFlowTestCommand, "function")` (the arch file: `typeof checkModuleGraph`), wraps every stub call in `try`/`catch` (`answer()` as `test/arch/modules.test.ts` does) so a throwing stub fails by assertion, and closes every pool it made in `finally`. Test names hold no `.`, `[` or `::`.

## Fixtures

`CAT` = `TEST_CATALOGUE_PATH`. Files are written to a temp directory with `mkdtemp` and removed in `finally`; `FILE` is `code-pay.yaml` unless a row says otherwise.

| Name | Content |
|---|---|
| `CODE_PAY_TEXT` | `test/support/code-pay.ts`; nodes `lookup` (block `erp.lookup_vendor@1`), `normalize` (code, `input` `{ amount, currency }` from `inputs`, `output_schema` with `amount`, `currency`, `is_large`), `pay` (block `erp.create_payment@1`), `done` (end) |
| `BOOM` | `CODE_PAY_TEXT.replace("Math.round(input.amount * 100) / 100", "input.missing.value")`; it validates, and its `normalize` throws a `TypeError` in the worker (fault `runtime_error`) |
| `MUTATE`, `FAIL` | `readHookRunText("mutate")` and `readHookRunText("fail")` (`test/support/hook-runs/index.ts`); written as `mutate.yaml`, `fail.yaml` |
| `M` (`mocks.json`) | `{ "lookup": [{ "output": { "vendor_id": "v1", "status": "active" } }], "pay": [{ "output": { "payment_id": "pay-1", "status": "paid" } }] }` |
| `MB` (`mocks-blocked.json`) | `M` with `lookup` answering `{ "vendor_id": "v2", "status": "blocked" }` |
| `I` | `{"vendor":"Acme","invoice":"inv-1","amount":1234.567,"currency":"eur"}` |
| `IH` | `{"vendor":" Acme ","amount":120,"currency":"eur"}` (the hook runs: no `invoice`) |
| `I-SHORT` | `{"vendor":"Acme"}` |
| `I-NUL` | the text `{"vendor":"Acme\u0000","invoice":"inv-1","amount":120,"currency":"eur"}` (backslash `u0000` in the file; the parse holds U+0000, which the memory store refuses with `RunDataError`) |
| `I-ARR` | `[]` |
| `M-EMPTY`, `M-BAD` | `{}` and `{` |
| `CLOCK`, `IDS` | `fixedClock("2026-11-13T09:00:00.000Z")`, `sequentialIds(0)` (the first run id is `run_00000000-0000-7000-8000-000000000000`) |

## The recording pool

`recordingPool(events, over?)` returns `{ createSandbox, args, runs, calls }`. `createSandbox(opts)` pushes `opts` to `args` and `"create"` to `events`, makes `real = createWorkerSandbox(opts)` and returns a `WorkerSandbox` with `size` and `respawns` read from `real`, a `run` that pushes `"run"` and `[code, input, limits, options]` to `runs`, awaits `real.run` and pushes its result to `calls`, and a `close` that pushes `"close"` to `events`, awaits `real.close()` and then runs `over.close?.()` (a throw or rejection of the row). `over.run` replaces the real `run` (rows P2, the fault rows) and then no real worker is spawned. `outputs(events)` is a `CliOutput` whose `write` pushes `"write"` (stdout) or `"errwrite"` (stderr) to `events` and appends to a buffer; P5's stdout also throws after pushing.

`exec(argv, { command, events, clock, ids })` builds `createCommandRegistry()`, registers `command` as `flow test` and awaits `cliMain(["flow", "test", ...argv], { env: {}, registry, stdout, stderr, clock, ids })` inside `assert.doesNotReject`.

## Scenario 1 and 2 values (probes `p1`, `p2`, `p3`, `p7`)

| Row | Flow, mocks, input | Exit | stdout | Pool `run` results (`value`) |
|---|---|---|---|---|
| A1 | `FILE`, `M`, `I`, injected pool | 0 | `0 lookup block completed\n1 normalize code completed\n2 pay block completed\n3 done end completed\nCOMPLETED done\n` | one: `{ amount: 1234.57, currency: "EUR", is_large: true }`; call `[normalize source, { amount: 1234.567, currency: "eur" }, limits, { seed: "run_00000000-0000-7000-8000-000000000000:normalize:1", nowIso: "2026-11-13T09:00:00.000Z", binding: "input", result: "object" }]`, `limits` `{ timeoutMs: 1000, memoryBytes: 33554432, maxStackBytes: 262144, maxOutputBytes: 1048576 }` |
| A2 | A1 with `--json` | 0 | one line: `{"state":"completed","terminalNode":"done","error":null,"output":{"payment_id":"pay-1"},"steps":[…four…]}` | as A1 |
| A3 | A1 through `flowTestCommand` | 0 | as A1 | none observed (the default pool is real) |
| H1 | `MUTATE`, `M`, `IH` | 0 | as A1 | three: `{ action: "continue", input: { vendor_name: "Acme" } }`, `{ amount: 120, currency: "eur" }`, `{ action: "continue", output: { amount: 120, currency: "EUR" } }` |
| H2 | `FAIL`, `MB`, `IH` | 1 | `0 lookup block failed\nFAILED HOOK_FAILED lookup\n` | one: `{ action: "fail", reason: "vendor blocked" }` |
| H3 | `FAIL`, `M`, `IH` | 0 | as A1 | two (the `post` hook on `lookup`, then `normalize`) |
| main | A1 / H1 / H2 on unedited main | 1 | `…1 normalize code failed\nFAILED INTERPRETER_NO_SANDBOX normalize\n` / `FAILED INTERPRETER_NO_SANDBOX lookup\n` twice | no `run` |

`A2`'s `steps`: `{ seq: 0, nodeId: "lookup", kind: "block", state: "completed", outcome: null, error: null }`, then `seq` 1 `normalize` `code`, 2 `pay` `block`, 3 `done` `end`, all the same `state`, `outcome`, `error`.

## Scenario 3 values (probes `p2`, `p7`)

| Row | Flow | Pool | Exit | stdout | Other |
|---|---|---|---|---|---|
| F1 | `BOOM`, `M`, `I` | real, recording | 1 | `0 lookup block completed\n1 normalize code failed\nFAILED INTERPRETER_CODE_FAILED normalize\n` | `calls[0].ok` false, `calls[0].fault.code` `runtime_error` |
| F2 | `FILE`, `M`, `I` | `run` resolves `{ ok: false, fault: { code: "runtime_error", message: "boom-secret" }, stats: { ms: 0, memBytes: 0 } }` | 1 | as F1 | `boom-secret` in no output |
| F3 | `FILE`, `M`, `I` | `run` rejects `new Error("pool-secret")` | 1 | as F1 | `pool-secret` in no output |

All three: stderr `""`.

## Pool rows (scenario 4; probes `p4`, `p5`, `p6`)

`createSandbox` calls, events and results; `FILE`, `M`, `I`, `CAT` unless the row says otherwise. `W` is `write`, `E` is `errwrite`.

| Row | Variation | Calls | `events` | Exit | stdout / stderr |
|---|---|---|---|---|---|
| P1 | none (real pool) | 1 | `create`, `run`, `W`, `close` | 0 | A1's stdout / `""` |
| P2 | pool `run` answers the F2 fault | 1 | `create`, `run`, `W`, `close` | 1 | F1's stdout / `""` |
| P3 | `--input` `I-SHORT` | 1 | `create`, `W`, `close` | 1 | `FAILED INTERPRETER_INPUT_INVALID -\n  path: /\n  keyword: required\n` / `""` |
| P4 | `--input` `I-NUL` | 1 | `create`, `close`, `E` | 1 | `""` / `CLI_INTERNAL: command failed\n` |
| P5 | stdout `write` pushes `W`, then throws `new Error("EPIPE secret")` | 1 | `create`, `run`, `W`, `close`, `E` | 1 | `""` (nothing kept) / `CLI_INTERNAL: command failed\n` |
| P6 | `createSandbox` pushes `create`, then throws `new Error("no pool")` | 1 | `create`, `E` | 1 | `""` / `CLI_INTERNAL: command failed\n` |
| P7 | `FILE` is `JSON.stringify(payOnceVersion().flow)` as `flow.json`, `--input` `PAY_ONCE_INPUT` (`{"vendor":"Acme","invoice":"inv-1","amount":120}`), mocks `M` | 1 | `create`, `W`, `close` | 0 | `0 lookup block completed\n1 route switch completed active\n2 pay block completed\n3 done end completed\nCOMPLETED done\n` / `""` |
| N1 | no `--catalogue` | 0 | `W` | 1 | starts `INVALID <FILE>: 2 error(s)\n  L2 L2_UNKNOWN_BLOCK /nodes/lookup/uses: block "erp.lookup_vendor@1" is not in the catalogue\n`, ends `  hint: no --catalogue given, so every block is unknown\n` / `""` |
| N2 | mocks `M-EMPTY` | 0 | `W` | 1 | `MOCKS 2 problem(s)\n  lookup missing: no mock entry\n  pay missing: no mock entry\n` / `""` |
| N3 | `--input` `I-ARR` | 0 | `E` | 2 | `""` / `CLI_USAGE: --input must be a JSON object\n` |
| N4 | mocks `M-BAD` | 0 | `E` | 2 | `""` / `CLI_USAGE: --mocks is not valid JSON\n` |
| N5 | argv `["--help"]` only | 0 | seven `W` | 0 | starts `usage: node src/cli/main.ts flow test --file <string> --mocks <string>` / `""` |

Every `args[i]` deep-equals `{ size: 1 }`. In P1 the `close` count is 1 (a count of `close` in `events`, never a time). P6 is the only row where `createSandbox` ran and no pool exists, so nothing closes; P7 shows a flow with no code still creates and closes its pool and spawns no worker (no `run`).

## Close rows (scenario 5; probes `p4`, `p7`)

| Row | Base row | `close` of the pool | Exit | stdout / stderr |
|---|---|---|---|---|
| C1 | P1 | closes the real pool, then rejects `new Error("close-secret")` | 0 | A1's stdout / `""` |
| C2 | P2, with the fake pool object (its `run` answers the F2 fault) | its `close` is a plain (not `async`) function that throws `new Error("close-secret")`; it does not close a real pool, since none was made | 1 | F1's stdout / `""` |
| C3 | P4 | as C1 | 1 | `""` / `CLI_INTERNAL: command failed\n` |

`over.close` of the recording pool serves C1 and C3 only. Each row: `close` ran once; `close-secret` is in no stdout or stderr.

## Scenario 6 values (probe `p8`)

Files for `snapshotOf`: `src/cli/flow/test.ts`: `import { createWorkerSandbox } from "../../sandbox/index.ts";\n`; `src/api/a.ts`: `\n\n\nimport type { T } from "../sandbox/index.ts";\n`; `src/cli/flow/x.ts`: `\nimport { r } from "../../runtimes/index.ts";\n`; `src/cli/flow/y.ts`: `import { p } from "../../sandbox/pool.ts";\n`. The first call returns, in order, `{ code: "ARCH_MODULE_EDGE", file: "src/api/a.ts", line: 4, message: "api may not import sandbox; allowed: " + MODULES.api.allowed.join(", ") + " (test/arch/modules.ts)" }`, `{ code: "ARCH_MODULE_EDGE", file: "src/cli/flow/x.ts", line: 2, message: "cli may not import runtimes; allowed: " + MODULES.cli.allowed.join(", ") + " (test/arch/modules.ts)" }` and `{ code: "ARCH_DEEP_IMPORT", file: "src/cli/flow/y.ts", line: 1, message: "import sandbox through src/sandbox/index.ts" }`. `MODULES.cli.allowed` has 27 names, the last `sandbox`; `MODULES.api.allowed` has 26.

## Red and green

| Task | Fails by assertion at red because |
|---|---|
| 1.1 | `createFlowTestCommand` is a stub, so every `exec` of `test-sandbox.test.ts` fails on its stdout or its `answer()` marker; `test/arch/cli-sandbox.test.ts` fails on the `collectImports` assertion (`src/cli/flow/test.ts` has no sandbox import on main); the graph assertions pass at red (the data file is edited in the same red step), and the edited frozen test and both new arch tests fail on their `collectImports` assertion |
| 2.1 | `close` events are absent (the pool is created but never closed after task 1.1), so P1 to P5 and C1 to C3 fail on their `events` or close counts |

## Timing and isolation

No assertion reads a duration. The real runs use the interpreter's own code limits (`timeoutMs` 1000 for the code's execution), as `src/interpreter/code-run.test.ts` on main does with a real pool. No network, no database, no Docker: `fetch` is not touched, and the memory store is the command's own.
