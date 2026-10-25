# format-ts/ — TypeScript call-list authoring surface (M4b)

A restricted TypeScript builder for Ursitoare format v0 (`ursitoare: "0.1"`, design.md section 4.5). A program is evaluated inside a fresh QuickJS-in-Wasm context; the builder records the calls and emits the same document that is written in YAML. A printer goes the other way (YAML document to TypeScript) so that edit tasks can be seeded in either surface. `transpile(print(doc))` is canonical-equal to `doc`.

Node 26, ESM. Pinned: `quickjs-emscripten` 0.32.0, `esbuild` 0.28.2 (type stripping), `yaml` 2.9.1; dev: `typescript` 7.0.2, `tsx` 4.23.15. `npm` reports esbuild's postinstall as not covered by `allowScripts`; the platform binary still resolves and everything runs.

```bash
cd format-ts
npm ci
npm test            # 74 tests, ~6 s
npm run typecheck
npx tsx scripts/gen-guide.ts          # regenerates ../eval/guides/ts.md from ../eval/guides/yaml.md
npx tsx scripts/gen-guide.ts --check  # exit 1 if ts.md is stale
npx tsx scripts/guide-diff.ts         # information-asymmetry report between the two guides
```

## CLI

```bash
npx tsx src/cli.ts transpile <file.ts>   [--out file.yaml] [--json]
npx tsx src/cli.ts print     <file.yaml> [--out file.ts]
npx tsx src/cli.ts roundtrip <file.yaml>
```

* `transpile`: YAML to stdout (or `--out`). `--json` prints `{file, ok, doc, errors:[{layer:"L0", code, message, line?}]}`. Without `--json`, errors go to stderr as `file:line: CODE: message`.
* `print`: TypeScript to stdout (or `--out`). Fails with exit 1 if the document cannot be printed (see "What the printer refuses").
* `roundtrip`: `print`, `transpile`, compare with M4a's `canonicalEqual`; on failure lists the differing canonical paths.
* Exit codes: `0` ok, `1` L0 errors / print failure / mismatch, `2` usage or I/O error.

## API

```ts
import { transpile, print, roundtrip, PrintError } from "./src/index.ts";

transpile(tsSource: string, opts?: { timeoutMs?: number /*2000*/, memoryBytes?: number /*32 MiB*/, maxSourceChars?: number /*1e6*/ })
  : Promise<{ doc?: object; errors: { layer: "L0"; code: L0Code; message: string; line?: number }[] }>
print(doc: unknown, opts?: { width?: number }): string          // throws PrintError
roundtrip(doc): Promise<{ ok: boolean; ts?: string; errors: ...; diff: string[] }>
```

`transpile` is async because QuickJS's Wasm module loads asynchronously. It never throws. `doc` is returned together with `errors: []` only when evaluation succeeded; the document is *not* validated (that is M4a's L1-L3). Typical latency for RF-1 after warm-up: p50 about 11 ms, p95 about 25-50 ms (one fresh runtime per call; measured on the dev host, noisy).

### L0 errors

| code | when |
|---|---|
| `L0_SYNTAX` | esbuild cannot parse the source (line of the error), QuickJS reports a `SyntaxError`, source too long |
| `L0_EVAL_ERROR` | the program throws (ReferenceError, TypeError, ...), runs out of memory or stack, uses `Date` / `Math.random` / `eval` / `require` (they do not exist), or imports anything other than `@ursitoare/flow` |
| `L0_TIMEOUT` | wall-clock budget exceeded (interrupt handler); infinite loops |
| `L0_BUILDER_MISUSE` | the program used the builder in a way no document can express (list below); message says what and `line` where |
| `L0_NO_FLOW` | evaluation finished without a call to `flow(...)` |

`line` refers to the author's original source (esbuild source map, decoded in `src/sourcemap.ts`). A misuse is recorded even if the program catches the exception.

**Misuse is deliberately narrow.** Everything the validator layers can judge is passed through unchanged, so the TS arm and the YAML arm fail at the same layer for the same mistake: unknown options become unknown fields (`L1_ADDITIONAL_PROPERTY`), a missing option is a missing field (`L1_REQUIRED`), a wrong value type is passed as written, a reference without a path stays `${{ nodes.x.output }}`. Misuse is only: `flow()` called twice / with wrong arguments / with an async function; a node id that is not a string; a duplicate node id; a node handle used as a value; `f.cases` on a kind without cases; `f.next` on `end`/decide/switch/approval; `f.cases` / `f.next` / `f.start` given twice; an unknown node as the first argument of `f.next` / `f.cases`; a value JSON cannot hold (function, symbol, bigint, NaN, Infinity, class instance, `undefined` in a list, nesting deeper than 120); using the builder after `flow()` returned.

## Builder API (what runs in the sandbox)

The only global is `flow` (also importable: `import { flow } from "@ursitoare/flow"`; any other import is `L0_EVAL_ERROR`). `Date`, `Math.random` and `eval` are deleted; `console.*` is a silent no-op so a stray log line is not a failure. The sandbox has no host functions at all: the host reads the result by calling a function the prelude returned.

```ts
flow(meta: { id: string; version: string; description?: string; inputs: JSONSchema },
     build: (f: Builder) => void): void
```

Writes `ursitoare: "0.1"` (always), `flow: meta.id`, `version`, `description`, `inputs`, `start`, `nodes`. Other keys of `meta` are passed through unchanged (including `ursitoare`).

### Node-creating calls

Each returns a **handle** `h` with `h.id`, `h.out.<path>` (reference `nodes.<id>.output.<path>`) and `h.outcome` (reference `nodes.<id>.outcome`). Options are spelled camelCase; the snake_case spelling of the format is accepted as well (undocumented in the guide); unknown options are passed through.

```ts
f.block(id, uses, with)                                                    // kind block
f.code(id, { language, input, source, outputSchema })                      // kind code
f.llmExtract(id, { input, instructions, outputSchema, modelProfile? })     // kind llm.extract
f.llmGenerate(id, { input, instructions, outputSchema, modelProfile? })    // kind llm.generate
f.llmDecide(id, { input, instructions, outcomes, modelProfile? })          // kind llm.decide     (+ f.cases)
f.agent(id, { input, goal, tools, maxSteps, outputSchema, modelProfile? }) // kind agent
f.switch(id, { on, default })                                              // kind switch         (+ f.cases)
f.humanApproval(id, { assigneeRole, summary, timeout })                    // kind human.approval (+ f.cases)
f.humanForm(id, { assigneeRole, formSchema, timeout, onTimeout })          // kind human.form
f.foreach(id, { items, uses | subflow, with, maxParallel? })               // kind foreach
f.subflow(id, flow, with)                                                  // kind subflow
f.delegate(id, { target, workflow, with, callbackTimeout, onTimeout })     // kind delegate
f.wait(id, { duration })                                                   // kind wait
f.end(id, { status, output? })                                             // kind end
```

`id` is a string. `onTimeout` / `default` take a node id or a handle.

### Wiring calls (create no node)

```ts
f.cases(node: Handle | string, cases: Record<string, Handle | string>): void  // llm.decide, switch, human.approval; once per node
f.next(from: Handle | string, to: Handle | string): void                       // kinds with `next`; once per node; `from` must already exist
f.start(node: Handle | string): void                                           // once
f.template`text ${ref} text`: string                                           // identity-ish tag: refs become ${{ ... }}
f.inputs.<path>   // reference inputs.<path>
f.item.<path>     // reference item.<path>; bare `f.item` is "${{ item }}" (foreach with only)
```

References are Proxies: `f.inputs.a.b.c` is `${{ inputs.a.b.c }}`, `h.out.a.b` is `${{ nodes.<id>.output.a.b }}`, `h.outcome` is `${{ nodes.<id>.outcome }}` and `h.out.outcome` is `${{ nodes.<id>.output.outcome }}` (the authored spelling is kept; the validator accepts both and the canonical form does not merge them). Anywhere a value is allowed a reference serialises to its `${{ }}` string, also nested in literals. A reference also stringifies to that text, so plain template literals and `+` concatenation produce templates too (tolerated, not documented in the guide). Field names `then`, `toString`, `toJSON`, `valueOf` cannot be read through a reference; the printer leaves such references as plain strings.

`cases` and `next` may also be given as options on the node call (tolerated, not documented); giving a successor twice is a misuse.

### Default sequencing rule (the only inferred edge)

Only **node-creating** calls advance the sequence (`f.cases`, `f.next`, `f.start`, `f.template` do not). A node whose kind has `next` (`block`, `code`, `llm.extract`, `llm.generate`, `agent`, `human.form`, `foreach`, `subflow`, `delegate`, `wait`) and that has no explicit `next` gets `next` = the id of the node created by the following node-creating call. `llm.decide`, `switch`, `human.approval` and `end` never get one; the last node gets nothing (the validator then reports the missing successor). `start` = `f.start(...)` or `meta.start`, else the first node created. Nothing else is injected or removed: `model_profile` and `max_parallel` appear only if written; `language: "js"` must be written on `code` nodes.

## Printer layout rules

`print(doc)` is deterministic. Nodes are emitted by walking from `start`: follow `next`, then take pending branch targets (cases, default, on_timeout) in discovery order, then any node unreachable from `start` in document order. `next` is omitted when it names the node emitted right after; otherwise `f.next(h, "id")` follows the node. A `const` is declared only for nodes referenced through a handle. References are written as handles (`fetchInvoice.out.raw_text`), mixed text as ``f.template`...` ``; strings outside value positions are never rewritten. `code.source` is a template literal (or `String.raw` when it has backslashes, or a JSON string when neither is safe). Node order therefore differs from the YAML seed; the graph does not.

### What the printer refuses (`PrintError`)

Only documents the builder cannot reproduce, all of them invalid for M4a anyway: a node without a string `kind` or with an unknown kind; no `start`; no `ursitoare`; a `block`/`subflow` node with extra fields (their arguments are positional); a node of a kind with `next` that has none but is followed by another node (the builder would add one); an extra key that equals the camelCase spelling of a real option. Of M4a's 114 invalid fixtures, 3 are not YAML, 5 are refused for these reasons and **106 round-trip exactly**.

## Sandbox limits

Fresh runtime and context per call; wall-clock interrupt (`timeoutMs`, default 2 s); stack 64 KiB; memory ceiling by a dedicated Wasm instance whose linear-memory maximum is 16 MiB (initial) + `memoryBytes` rounded up to 16 MiB, so 48 MiB by default (quickjs-emscripten 0.32.0's `setMemoryLimit` does not count bytes in the prebuilt build; finding from M7). After a host-side fault the Wasm module is discarded. The prelude is not hardened against an author who corrupts built-ins (`JSON.stringify = ...`): the authors are LLMs under test, not adversaries; a fresh context per call keeps any damage inside that call.

## Layout

```
src/kinds.ts       the table of node kinds (builder methods, fields, successor mechanism)
src/prelude.js     the builder, runs inside QuickJS
src/transpile.ts   esbuild + QuickJS host, L0 error mapping
src/sourcemap.ts   source-map v3 line lookup
src/print.ts       YAML document -> TS (also fragment mode for documentation snippets)
src/roundtrip.ts   print + transpile + canonical compare
src/cli.ts         CLI            src/yamlio.ts  YAML parse/dump (YAML 1.2 core, no tags)
scripts/gen-guide.ts   builds ../eval/guides/ts.md from ../eval/guides/yaml.md
scripts/guide-diff.ts  information-asymmetry report
test/              node:test suites (roundtrip, l0, print, guide, cli)
```
