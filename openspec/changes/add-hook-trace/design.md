## Context

U42 runs a node's hooks and hands each `HookRun.entry` to `deps.hookObserver`; its pipeline keeps the entries of each attempt (add-hook-runtime design 1.8). This unit stores them in one nullable `hooks jsonb` column on the attempt's step row (D16: one row per node attempt stays true), stores the untrimmed input as an envelope payload when a pre-hook changed it (D15), adds the optional `hooks` to `StepView`, and adds the pure `approvalsOnPath` that U50 will pass to the PEP (ADR-16 X3 item 2, D23). The trace holds labels, action names, fixed error texts, tool references and keys, never hook source, arguments or outputs.

## Decisions

1. **Column.** `ALTER TABLE ursitoare.step_execution ADD COLUMN hooks jsonb CHECK (...)` and `GRANT UPDATE (hooks) ... TO ursitoare_app` (SQL: test-plan.md § Migration). The check accepts null, or an object with an `entries` array and an `inputOriginalRef` that is JSON null or 64 lowercase hex digits; `IS TRUE` guards each test because a missing key makes `jsonb_typeof` null, and a null inside a `CHECK` passes. `INSERT` is already granted on the table; the column reaches every partition and the app role still has no privilege on a leaf (`hooks` is not a key, identity or payload column, so `C-d540ef0d` and `C-9c1a9ff9` stay green).
2. **Write path.** `assertStepWrite` calls the new `assertStepHooks` before any SQL, so a refused write stores no payload. `stepRepository.upsert` then calls `envelopeStore.put` for a non-null `inputOriginal` and inserts `hooks` as `{ inputOriginalRef, entries }` in the same `withTenantTx`. The conflict branch sets `hooks = EXCLUDED.hooks`, not `COALESCE` as for `input_ref`: a `started` write after a final one resets the trace and the next final write sets it again. The memory store checks the size of `inputOriginal` before it stores anything, puts it, and keeps `hooks` only when given; it replaces its record whole, which is the same rule. Records are copies in both. The database returns jsonb in its own key order, so tests use `deepEqual`.
3. **`StepHookEntry` equals U42's `HookTraceEntry`.** The eleven members are identical field by field: `label: string`, `kind: "code" | "block"`, `fused: boolean`, `attempt: number`, `state: "completed" | "failed"`, `action` (U42: `HookOutcome["action"] | null`, i.e. `"continue" | "skip" | "redirect" | "retry" | "fail" | null`), `mutated: "input" | "output" | null`, `to: string | null`, `error: { code: string; message: string } | null`, `tool: string | null`, `idemKey: string | null`. `runs` may not import `interpreter` (`test/arch/modules.ts`: `runs` allows `core`, `db`, `tenancy`, `durable`), so `runs` redeclares it, and `visit.ts` assigns `HookTraceEntry[]` to `readonly StepHookEntry[]` with no cast; the typecheck gate proves the equality, as for U34's `EffectIntents` and `EffectGate`. U42 writes only `completed` code entries (a failing hook throws and the node fails); U43 adds `failed` and block entries, which the store accepts now.
4. **Label grammar.** `entry.label` is `${phase}:${placement.label}` (add-hook-runtime design 1.7), where `placement.label` is the hook's `id` or `rule.<ruleId>` (add-hook-checker design 2) and ids match `^[a-z][a-z0-9_]{0,63}$` (U41's `H_SCHEMA` bound; a version validated before U41 belongs to the stale-validation carry-forward). The `node/` in U42's `OBS` lists (`pay/pre:rule.rule_a`) is the observer's first argument, and `:r<attempt>` is a step-name suffix (`attemptStepName`); neither is in `label`, and `attempt` is its own member. The store pattern is `^(pre|post):(rule\.)?[a-z][a-z0-9_]{0,127}$`: the card's `{0,63}` becomes `{0,127}`, the bound of `NODE_ID_PATTERN`, so a label has at most 138 characters. A scratch probe over 63 labels (the hook and rule ids of the 45 files under `test/support/hook-flows/` and of every U42 fixture) matched all of them, refused 17 negatives (among them `pre:`, `pre:Bad`, `pay/pre:rule.rule_a`, `pre:rule.rule_a:r2`), and matched an id of 128 characters but not 129.
5. **Other limits.** At most 64 entries per row (the card's value); `attempt` 1 to 2,147,483,647; `to` as `assertNodeId`; `error.code` as `assertRunError`, `message` at most 500 well-formed characters without U+0000; `tool` the block-reference pattern of `schema.ts`, at most 256 characters; `idemKey` `ik1_` and 64 hex digits (stricter than the row's own, which takes any text up to 256 characters). Entries and `error` are plain objects with exactly their members.
6. **Wiring in `visit.ts`.** The pipeline's per-attempt list goes on the final row of the attempt, whether `completed`, `skipped` or `failed`: `hooks` is `{ inputOriginal, entries }` when the list is not empty, `inputOriginal` being the attempt's base input (the `input` of its `started` write) when some entry has `mutated: "input"`, else `null`. An empty list adds nothing and the `started` write never has `hooks`, so every M4 row and fixture is unchanged. A retry attempt has its own row and list. After a replay the list holds the entries restored from the fused records and the recorded own-step values plus the fresh ones (add-hook-runtime design 3), so a row written after a partial replay is the first run's. `writeFinal` for a `failed` attempt swallows a store error as in M4, so a refused trace on a failed row leaves its `started` row.
7. **View.** `toStepView` adds `hooks` last, as a `structuredClone`, only when the record has it. `STEP_VIEW_PROPERTIES` is split into `STEP_VIEW_FIELDS` (the 15) and `{ ...STEP_VIEW_FIELDS, hooks }`, and `required` is `Object.keys(STEP_VIEW_FIELDS)`. The schema describes every member as closed objects, because the response serializer drops what a closed schema does not list (inferred; the route scenario reads the body to prove the members arrive). `action` and `mutated` are `anyOf` null or an enum. `docs/api/openapi.json` is regenerated with `node test/support/openapi-docs.ts`; `src/main.conventions.test.ts::C-d150bfa4 the committed OpenAPI document equals the text the real engine serves` guards it and is not edited. The web parser ignores `hooks` until U44.
8. **D15.** `envelopeStore.referencedBy` consults only the run's `input_ref`, `mocks_ref`, `output_ref` and a step's `input_ref`, `output_ref`; it is unchanged, so the payload route answers 404 for `inputOriginalRef` and no route serves the original input. The payload stays findable by digest for the audit UI (M14).
9. **`approvalsOnPath`** is pure and total. In input order, `kind` `human.approval`, `state` `completed` and `outcome` `approved` or `rejected` give `{ nodeId, decision: outcome, approver }`, and everything else gives nothing (`timeout` included: no approval was given). `approver` is `output.approver` when `output` is an object, not an array, with that own member (`Object.hasOwn`), a string of 1 to 128 characters, else `null`. A node visited twice appears twice. A non-array argument, a non-object entry or a non-string `nodeId` gives nothing and never throws, so a corrupt path can lose approvals but never invent one. D23: U74b `add-approval-nodes` (M11) must record `output.approver` and the outcomes `approved`, `rejected`, `timeout`.

## Interfaces

Given, equal to `proposal.md`. Not scaffolded, taken from `proposal.md` § Impact: `StepWrite.hooks?`, `StepRecord.hooks?`, `StepView.hooks?`, the `STEP_VIEW_SCHEMA` member `hooks`, the migration file, `assertStepHooks`, the export lines. Merged shapes: `delivered-shapes.md`.

```ts
// src/runs/store/types.ts (exported from src/runs/index.ts)
export interface StepHookEntry { label: string; kind: "code" | "block"; fused: boolean; attempt: number; state: "completed" | "failed"; action: "continue" | "skip" | "redirect" | "retry" | "fail" | null; mutated: "input" | "output" | null; to: string | null; error: { code: string; message: string } | null; tool: string | null; idemKey: string | null }
export interface StepHooksWrite { inputOriginal: PayloadValue | null; entries: readonly StepHookEntry[] }
export interface StepHooks { inputOriginalRef: string | null; entries: StepHookEntry[] }
// src/db/migrations/0425_step_hooks.sql
// src/interpreter/hooks/approvals.ts (exported from src/interpreter/index.ts)
export interface PathStep { nodeId: string; kind: string; state: StepState; outcome: string | null; output: JsonValue | null }
export interface Approval { nodeId: string; decision: "approved" | "rejected"; approver: string | null }
export function approvalsOnPath(steps: readonly PathStep[]): Approval[];
```

## Shared files

`src/runs/store/*`, `src/runs/index.ts`, the migration, `src/api/run-views.ts` and `docs/api/openapi.json` are this unit's alone (tasks 1.1 to 2.1). `src/interpreter/visit.ts` (task 3.2) and `src/interpreter/index.ts` (task 3.1) are shared in the order U42, U42b, U43; `src/interpreter/hooks/approvals.ts` is created in 3.1.

## Failure cases

- A refused trace is `RUN_DATA_INVALID` (`RUN_DATA_TOO_LARGE` for an oversized `inputOriginal`), thrown before SQL; no row changes and no payload is stored. On a `completed` or `skipped` final write it propagates as in M4 (a store failure is not turned into a run failure); on a `failed` write it is swallowed (decision 6).
- Closed by `add-hook-checker` (U41): `H_SCHEMA` bounds a hook id at 64 characters and a node at 16 `pre` hooks, 16 `post` hooks and 16 rules, so a validated version gives at most 64 entries per attempt and labels within this pattern; the final write cannot fail on them after the node's work. A node id over 128 characters is a separate, older gap. No M5 fixture exceeds 8 entries.
- Two writers of one key: the last write wins. A database that is down: the driver's error propagates. `approvalsOnPath` never throws.

## Security

1. No endpoint and no PEP action: the steps route keeps `read_run`, so whoever reads a run's steps reads its trace, as they read `taint` and `idemKey`. U42 puts no hook text, argument or fault message in an entry.
2. `hooks` is a column of an existing tenant-leading table with forced row security; the original input is an envelope row keyed by tenant. Proof: "Objects, ledger and privileges" (`checkTenancyCatalog` returns `[]`, the app role cannot update `seq` or touch a leaf) and the unchanged `C-d540ef0d`.
3. Validation is at the store boundary (decisions 2 and 5), the check constraint is the second line. The original input may hold personal data: it is stored once per tenant, never served (D15), reachable only by digest. No secret is read or written.
4. Abuse cases: a malformed or oversized trace ("Malformed traces are refused"); a forged approval (started, failed or timed-out step, another kind, a non-string approver, an inherited or `__proto__` member: "Approvals, timeouts and malformed steps"); reading the untrimmed input through the payload route ("The route carries the trace and the payload route does not").

## Test plan

Fixtures, store sequences, refusal tables and pipeline rows: `test-plan.md`.

## Verification

Run on 2026-11-06 in a scratch copy of main@a6b5fb37 (Node 26.8.1, embedded Postgres) with the store, validation, migration, view and `approvals.ts` ported. **Ran:** the ledger row, the column on the parent, default and daily leaf, the privilege and check probes; test-plan.md § Store sequence, § Refusals and § Limits through both stores (equal results); the label probe; the route and both payload digests; the regenerated `docs/api/openapi.json` (134 lines added at one place, drift test green); the view, schema and `approvalsOnPath` cases; a two-way assignment compile of `HookTraceEntry` and `StepHookEntry` with a negative control; the frozen store, view, route and intent tests with the one edited assertion (all pass). **Derived, not run** (U42 is not on main): the entries and rows of `onion`, `mutate`, `f-ret`, `bad-upper` and the replay, and the wiring in `visit.ts`.

## Decisions made while writing

- Label bound 127 for the id (decision 4), not the card's 63. Entry limit 64 kept (decision 5), matched by U41's bounds (Failure cases).
- Eleven entry members (the card's seam lists eleven). The check constraint is added to the column (not in the card) so a direct write cannot store a shape the view schema would not describe.
- The rows scenarios compare a failed attempt's entries with what the observer received, because add-hook-runtime does not say whether a refused hook's entry is observed.
- Depends on gains U24 and U38 for names the scenarios call.
