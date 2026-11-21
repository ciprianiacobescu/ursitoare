## Context

The panels each hold a kit `Form` of two `Field`s. Rulings D5, D10, D26.

## Decisions

1. **The text is the truth; the form and rows are buffers.** A pure state per panel (`InputSync`, `RowSync`) holds the text, a buffer and `source`, the side edited last; three events move it, with no effect loops. A form edit rewrites the text from the buffer's valid fields (an invalid or blank one is left out). A text edit keeps the text and refills the buffer only when it fits (else a hint says so); `fill()` on a JSON textarea is a text edit, so the M4, M5 and M6 journeys run unchanged. The start sends the text, **except that while `source` is `form` (or `rows`) and the buffer has an error it is refused** and the errors show on their fields; a text edit makes the text the source again, so a person can always start from JSON.
2. **Subset.** Fields show only when `schemaToFields` reports no problem and no unsupported field: type `object` with only the keywords `$schema`, `type`, `title`, `description`, `properties`, `required`, `additionalProperties`; properties of type `string` (`minLength`, `maxLength`, `pattern`), `number` and `integer` (`minimum`, `maximum`), `boolean`, `string` with `enum`, and `array` of strings. Anything else (nested objects, `oneOf`, `$ref`, `format`, `default`, other arrays, a `required` name without a property) gives JSON only with the note "The input schema uses features the form cannot show, so enter the input as JSON.". This unit adds three rules: at most 20 fields (`Form` throws above 100); no field named `input`, `mocks` or `fakes` (control names `Form` finds by name); at least one field, else "This flow declares no inputs.". `InputForm.tsx` repeats `SchemaForm`'s markup, as `SchemaForm` owns its own `Form` and submit (U15d owns the kit).
3. **Order.** The stored document loses key order: probed on `demo-pay`, the API answers `properties` as `amount, vendor_name` and `nodes` as `pay, done, route, lookup, blocked` (a `jsonb` effect). Fields list the `required` names first, in that order. Rows follow flow order (ruling Q1): `mockableNodes` takes the block nodes from `layoutFlow(canonical).layout.nodes`, else, when its status is not `ok`, the block ids sorted by code unit; never key order. `demo-pay` gives `lookup`, `pay` (probed). The runs files import `../flow-graph/layout.ts` directly, as `features/75-flow-graph.tsx` does; no `test/arch` rule covers `web/` imports (grep).
4. **The document.** After "Save version" and "Validate" the editor sets `canonical` to `null` (probed: non-null only when a version is opened), as the graph panel handles with `needsDocument`; the card's seam would say "no inputs" after every save, so `useRunDocument` reads the version (`loadRunDocument`) when `runDocumentWanted`, with an `AbortController`, and answers `loading`, `ready` or `failed` (probed: three equal GETs after "Validate"). While loading only the JSON shows, with no note and no `status`, and typing works; **on arrival the state restarts from the current text and never changes it** (the fields fill when it fits, else stay empty with the hint; the same for the rows), also on a re-read after "Validate"; on failure the note is "The inputs of this version could not be read, so enter the input as JSON.".
5. **Split.** The panels keep the `Form`, the three labels and every string `C-f665c2d6` reads. `InputForm` renders only the group "Inputs" (`fieldset` with a `legend`), `MockRows` only the rows. Schema field errors go through `Form`'s `errors`, and their names into its `fields` before `input` and `mocks`, so the first invalid field takes focus after a refused start. Answer textareas are not kit `Field`s: `Field` throws on a label over 80 characters and `answerLabel` of a 128-character node id exceeds it; they use the kit classes `ui-field`, `ui-field-label`, `ui-input`, `ui-field-error` and the hidden "Error: " span.
6. **Rows.** One `Collapsible` per block node, closed by default; the trigger's name is exactly `Answers for <nodeId>` (the answer count and `uses` sit outside it). Open, a row shows one textarea per answer (a blank one when there is none), `Remove output N for <nodeId>` (`aria-label`; visible text "Remove", kept next to its label at the textarea's right edge) and `Add an answer for <nodeId>`. A blank answer is not an answer and is left out of the text (extending the card's "each answer must parse as JSON", so that opening a row never makes the text invalid); a non-blank answer that is not JSON shows "This is not valid JSON." and is left out; a refused start shows the form's own alert, since a closed row hides its error. An `{ error }` entry or any other shape does not fit: the buffer stays, the hint says so, the text is used as written. The Dry run panel has rows for every block node although only write, send and pay steps take fakes (D26); an intro line says so, and after a refused dry run each row the "Fakes (JSON)" error names opens with its part of the error. Icons: `lucide-react` (scaffold-installed, `M6B_PACKAGES`), `aria-hidden`.
7. **Live JSON error.** With a form (or rows) shown, text that is not a JSON object shows `parseTestInputs`' message at once, the form and rows untouched (ruling Q3); with neither, the error stays at submit. Any edit clears an earlier submit error.
8. **Style.** Utilities with token colours only (no palette word, hex, `style=` or `outline-none`). The group is a container whose fields share a row from 36 rem (`@xl:grid-cols-2`) and stack below (stacked fields in a 531 px panel are fine); the JSON textareas shrink to 4 rows when a form or rows exist.
9. **No MODIFIED requirement.** "The Test run panel starts a mocked run" (both texts parsed before any request) still holds: the new refusal comes before it, only while the last edit was in the form or rows. `submit` sends the `attempt` events, returns when a view is `blocked`, then runs the unchanged code.

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. Taken from `add-ui-foundation`: `Button` (a `<button type="button">`, never `disabled`, `tone` and `size` props) and `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` (Radix wrappers; a closed content is unmounted).

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

## Failure cases

- A refused start sends no request and never reaches `parseTestInputs`; a start whose last edit was the text never reads the buffer. A failed document read leaves the JSON-only panel and the note; an aborted read changes nothing. The only new request is the existing version read (`read_flow`); no action or CSP change. A server refusal is worded by the unchanged `testRunFormErrors` and `dryRunFormErrors` on its JSON field.

## Frozen pins checked

| Pin | How it holds |
|---|---|
| Regions "Test run" and "Dry run"; textboxes "Input (JSON)", "Mocks (JSON)", "Fakes (JSON)" found by exact name and filled (m4:86-87, m5:160-161, g:50-51); "Save and validate a version to test-run it." and bob's "Only authors can start a test run." (m4:197) unchanged | names unchanged; the 73 old e2e tests pass |
| One link per panel after a start (m4:90, m5:163, g:53); one `<code>` in Dry run (g:119); one `status`; `alert` only from `Form` | none added (0 links before a start, probed) |
| `DryRunPanel.tsx` strings (C-f665c2d6); no inline style (C-d365d748); no stylesheet import or palette utility; `aria-disabled`, never `disabled`; native `<select>`; 2 px outline; `Field` errors with the hidden "Error: "; `Form` at most 100 names | kept; the new files are scanned; `Button`; no `outline-none`; probed "Error: Required"; 20 plus two |

## Verification

**Ran** on a prototype in the composed build: every fixture of `test-plan.md`, the seven browser runs and the full e2e suite.

At 1366: page 2,706 px (rows closed), 2,978 (open and filled); no sideways scroll or CSP message.

**UNVERIFIED:** Firefox and Safari; a 20-field flow; a 128-character node id in a row header; screen-reader reading.
