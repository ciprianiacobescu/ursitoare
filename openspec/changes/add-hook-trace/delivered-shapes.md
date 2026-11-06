# Delivered shapes taken by add-hook-trace

Declarations from main@a6b5fb37 (`file:line`; `…` elides members this unit does not touch). U42's names are restated in `design.md` § Decisions 3 and `proposal.md`.

```ts
// src/runs/store/types.ts (U31)
:6   type PayloadValue = null | boolean | number | string | PayloadValue[] | { [key: string]: PayloadValue };    :18 type StepState = "started" | "completed" | "failed" | "skipped";
:105 interface StepWrite { runId; nodeId: string; effectSeq; turn; attempt; generation; seq: number; kind: string; state: StepState; input: PayloadValue | null; output: PayloadValue | null; outcome: string | null; error: RunError | null; taint: readonly string[]; policyDecisionId: string | null; idemKey: string | null; startedAt: Date; endedAt: Date | null }
:126 interface StepRecord { runId; nodeId; …; state: StepState; inputRef: string | null; outputRef: string | null; …; taint: string[]; …; startedAt: string; endedAt: string | null }  (StepWrite's columns, refs for payloads)
// src/runs/store/run-store.ts:15 RunStore: createRun, recordStep(ctx, step: StepWrite): Promise<StepRecord>, listSteps(ctx, runId, q: { limit: number; afterSeq?: number }): Promise<{ steps: StepRecord[]; next: number | null }>, getPayload(ctx, sha256): Promise<StoredPayload | null>.  :173 EnvelopeStore { put, get, referencedBy(tx, ctx, runId, sha256): Promise<boolean> }
// src/runs/store/validate.ts:224  assertStepWrite(step: StepWrite): void;  :259 assertPayloadValue(value: unknown, depth = 0): asserts value is PayloadValue
// src/api/run-views.ts:34 interface StepView { seq; nodeId; kind; effectSeq; attempt; state; outcome; error; inputRef; outputRef; idemKey; policyDecisionId; taint: string[]; startedAt: string; endedAt: string | null }  (15 members)
//   :101 const STEP_VIEW_PROPERTIES (15 entries);  :126 export const STEP_VIEW_SCHEMA: Readonly<Record<string, unknown>> = { type: "object", additionalProperties: false, required: Object.keys(STEP_VIEW_PROPERTIES), properties: STEP_VIEW_PROPERTIES };  :157 toStepView(step: StepRecord): StepView
```

## Facts from the merged code

- `src/runs/store/step-repository.ts:63-110`: `upsert` runs `assertStepWrite`, writes `input` and `output` with `envelopeStore.put`, then `INSERT … ON CONFLICT (tenant_id, run_day, run_id, node_id, effect_seq, turn, attempt, generation) DO UPDATE SET kind, state, input_ref = COALESCE(EXCLUDED.input_ref, step_execution.input_ref), output_ref = COALESCE(…), outcome, error, taint, policy_decision_id, idem_key, ended_at`; `STEP_COLUMNS` (`:8`) lists 18 columns.
- `src/db/migrations/0310_run_data.sql:48-81`: `step_execution` is partitioned by `run_day` with a default partition and forced row security; `GRANT SELECT, INSERT` on the table, `GRANT UPDATE (kind, state, input_ref, output_ref, outcome, error, taint, policy_decision_id, idem_key, ended_at)`; no privilege on a leaf (`src/runs/store/schema.test.ts::C-9c1a9ff9 rows land in the daily and monthly partitions`).
- `src/runs/store/envelope-store.ts:76-95`: `referencedBy` is true only for the run's `input_ref`, `mocks_ref`, `output_ref` or a step's `input_ref`, `output_ref`; `src/api/run-routes.ts:283` serves a payload only then.
- `src/interpreter/visit.ts:118-142,236`: `writeFinal` upserts the final row, swallows a store error when `state` is `failed`, and runs only `if (wrote)`: a fully replayed node writes nothing.
- `src/api/run-views.test.ts:181`: `C-8e399d8e the view schemas list exactly the view fields` asserts `Object.keys(stepProperties)` and `STEP_VIEW_SCHEMA.required` both equal `STEP_VIEW_KEYS` (the 15 fields). `src/main.conventions.test.ts:106`: `C-d150bfa4 the committed OpenAPI document equals the text the real engine serves`; `node test/support/openapi-docs.ts` rewrites the file.
