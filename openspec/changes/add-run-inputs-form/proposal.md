## Why

A person who test-runs or dry-runs a flow types the input, the mocks and the fakes as raw JSON, although the flow declares its inputs as a JSON schema and the web kit already turns such a schema into fields (`schemaToFields`). This unit shows those fields above "Input (JSON)", adds one collapsed answer row per block node above "Mocks (JSON)" and "Fakes (JSON)" (D26), and keeps the JSON texts visible, in step and submitted as before.

Observable result, at 1366 by 860 in U28b's two-column workspace on `demo-pay`: the Test run panel (531 px wide) shows a group "Inputs" with "Vendor name (required)" above "Amount (required)" (side by side at 1024, where the page has one column), then the rows "Answers for lookup" and "Answers for pay"; typing `ACME` and `12.5` writes `{ "vendor_name": "ACME", "amount": 12.5 }` (two-space indent) into "Input (JSON)"; an answer typed in "Answers for pay" writes "Mocks (JSON)"; leaving "Amount" empty and pressing "Start test run" sends nothing and says "Required" there. Filling "Input (JSON)" with compact JSON, as the M4, M5 and M6 journeys do, refills the form and starts with the text as typed.

Batch `m6b-ui` (U15c, U18b, U15d, U07b, U21b, U07c, U28b, U37b, U37c, U52c in plan order; closing unit `add-visual-review`, journey `e2e/test_m6b_ui.py`) delivers M6b: the web app is restyled on Tailwind CSS v4 and Radix primitives with a grouped sidebar, a home page of recent work, a flow workspace, run inputs built from the flow's input schema, a readable run view and people's names instead of ids, with zero CSP violations. This unit's part: the input form and the answer rows of the Test run and Dry run panels, synced with their JSON texts. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- New in `web/src/runs/`: `input-form.ts`, `mock-rows.ts`, `use-run-document.ts`, `InputForm.tsx`, `MockRows.tsx`, their Node tests, `e2e/test_m6b_run_inputs.py`. Edited, each in a named task: `TestRunPanel.tsx` and `DryRunPanel.tsx`. No CSS: utilities with token colours.
- Capability `web-runs`: ADDED requirements only (design decision 9); no frozen test changes. The parsers, starters and form-error functions of the two panels are unchanged (M7 U56 edits them later). No API, error code, migration, e2e part, policy action, feature file, dependency or `src/` change.

## Impact

- **Scaffold:** Signature stubs for every name below, those beyond the card's seams included, are on the base branch (`docs/decisions/0002`); this change implements them. Stubs return empty values (`{ kind: "json", reason: "" }`, `null`, `[]`, `""`; `*SyncStart` gives `{ text, raw: {}, touched: [], attempted: false, source: "json" }` and `{ text, rows: [], attempted: false, source: "json" }`, `*SyncStep` its state, the views empty errors and `blocked: false`, `useRunDocument` `{ phase: "none" }`), so a red test fails by assertion. Not scaffolded: `InputForm.tsx` and `MockRows.tsx` (their props are the author's), the panel edits, the tests and the e2e file.
- **Depends on** (merged): `add-web-data-kit` (U15b), `add-mock-test-runs` (U35), `add-web-run-timeline` (U37), `add-web-flow-editor` (U28), `add-web-flow-graph` (U29: `layoutFlow`), `add-web-dry-runs` (U52b). In plan: `add-ui-foundation` (U15c: `Button`, `Collapsible*`, `findPaletteUtilities`), `restyle-web-kit` (U15d: `Field` order), `add-app-shell` (U07b) and `add-flow-workspace` (U28b: the layout numbers hold only with U07b's 240 px sidebar and U28b's two columns from 1280 px).
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

**Interfaces given** (as in design.md § Interfaces)

```ts
// web/src/runs/input-form.ts
import type { ApiClient } from "../api/client.ts";
import type { SchemaFields } from "../kit/data/schema-fields.ts";
import type { RawValues } from "../kit/data/schema-values.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
export type InputFormModel = { kind: "form"; fields: SchemaFields } | { kind: "json"; reason: string };
export function inputFormModel(canonical: unknown): InputFormModel;   // json reasons: spec "The input form is built from the flow's inputs…"
export function inputJsonFromForm(model: Extract<InputFormModel, { kind: "form" }>, raw: RawValues): { ok: true; text: string } | { ok: false; errors: FormErrors };
export function formFromInputJson(model: Extract<InputFormModel, { kind: "form" }>, text: string): RawValues | null;
export interface InputSync { text: string; raw: RawValues; touched: readonly string[]; attempted: boolean; source: "form" | "json" }
export type InputSyncEvent = { type: "field"; name: string; value: string | boolean } | { type: "text"; text: string } | { type: "attempt" };
export interface InputSyncView { fieldErrors: FormErrors; jsonError: string | null; hint: string | null; blocked: boolean }
export function inputSyncStart(model: InputFormModel | null, text: string): InputSync;
export function inputSyncStep(model: InputFormModel | null, sync: InputSync, event: InputSyncEvent): InputSync;
export function inputSyncView(model: InputFormModel | null, sync: InputSync): InputSyncView;
export type RunDocument = { phase: "none" } | { phase: "loading" } | { phase: "ready"; canonical: unknown } | { phase: "failed" };
export function runDocumentWanted(version: { hash: string } | null, canonical: unknown): boolean;
export function loadRunDocument(client: Pick<ApiClient, "get">, flowId: string, hash: string, signal?: AbortSignal): Promise<unknown>;
export function inputFormModelFor(document: RunDocument): InputFormModel | null;
// web/src/runs/mock-rows.ts
export interface MockNode { nodeId: string; uses: string }
export function mockableNodes(canonical: unknown): MockNode[];   // kind "block", in flow order (layoutFlow)
export interface MockRow { nodeId: string; answers: string[] }  // answer: JSON text of one `output`
export function mockRowsFromText(text: string, nodes: readonly MockNode[]): MockRow[] | null;
export function mockTextFromRows(rows: readonly MockRow[]): { ok: true; text: string } | { ok: false; nodeId: string; index: number; message: string };
export function answerLabel(nodeId: string, index: number): string; // `Output ${index + 1} for ${nodeId}`
export interface RowSync { text: string; rows: MockRow[]; attempted: boolean; source: "rows" | "json" }
export type RowSyncEvent = { type: "answer"; nodeId: string; index: number; value: string } | { type: "add"; nodeId: string } | { type: "remove"; nodeId: string; index: number } | { type: "text"; text: string } | { type: "attempt" };
export interface RowSyncView { answerErrors: Readonly<Record<string, string>>; jsonError: string | null; hint: string | null; formError: string | null; blocked: boolean }
export function rowSyncStart(nodes: readonly MockNode[], text: string): RowSync;
export function rowSyncStep(nodes: readonly MockNode[], sync: RowSync, event: RowSyncEvent): RowSync;
export function rowSyncView(nodes: readonly MockNode[], sync: RowSync): RowSyncView;
// web/src/runs/use-run-document.ts
import type { RunDocument } from "./input-form.ts";
import type { EditorPanelContext } from "../flows/editor-panels.ts";
export function useRunDocument(context: EditorPanelContext): RunDocument;   // a hook: source tests only
// web/src/runs/InputForm.tsx, web/src/runs/MockRows.tsx (components; props are the author's)
```

**Interfaces taken:** the names of `delivered-shapes.md`, and `Button`, `Collapsible*` from `add-ui-foundation`.

## Out of scope

Forms built from block output schemas (D26), `{ error }` mock entries as rows, nested or `oneOf` input schemas, the run page (U37c), the panels' place (U28b), any API or `src/` change.
Spec: `specs/web-runs/spec.md`; fixtures: `test-plan.md`, `test-plan-browser.md`; decisions: `design.md`. Each Node test begins with `assert.equal(typeof <function>, "function")` for the names it imports from the file its Interfaces header names (never an `index.ts`), wraps a call that reaches a stub in `assert.doesNotThrow`, uses `node:assert/strict` and has no `.`, `[` or `::` in its name. The `.tsx` files render what the `.ts` functions return; no Node test imports a `.tsx`.
