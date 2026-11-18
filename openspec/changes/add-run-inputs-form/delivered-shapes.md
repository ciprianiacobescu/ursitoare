# Delivered shapes this change takes

Declarations (`export` omitted) from main@3daa5c35, checked line by line; the last block is in plan.

```ts
// web/src/kit/data/schema-fields.ts:65-97, schemaToFields at :383 (never throws)
interface SchemaFieldBase { name: string; label: string; hint: string | null; required: boolean }
type SchemaField = SchemaFieldBase & (
  | { kind: "string"; minLength: number | null; maxLength: number | null; pattern: string | null }
  | { kind: "integer" | "number"; minimum: number | null; maximum: number | null }
  | { kind: "boolean" } | { kind: "enum"; options: readonly string[] } | { kind: "string-list"; /* item limits */ }
  | { kind: "unsupported"; reason: string; error: string })
interface SchemaFields { fields: readonly SchemaField[]; problems: readonly string[] }
function schemaToFields(schema: unknown): SchemaFields
  // label = title, else the name spaced and capitalised; a `required` name with no property is unsupported
// web/src/kit/data/schema-values.ts:8-14, :120, :129
type RawValues = Readonly<Record<string, string | boolean>>
function initialValues(parsed: SchemaFields): RawValues
function validateValues(parsed: SchemaFields, raw: RawValues): ValidatedValues
  // blank omitted ("Required" if required); a bad number "Enter a number"; a boolean always present; a list is its non-blank lines
// web/src/kit/data/form-errors.ts:4, :7
const FORM_ERROR_KEY = "$form";  type FormErrors = Readonly<Record<string, string>>
// web/src/kit/data/field.ts:3-10, :26, :31; Field.tsx:8-19 (U15d reorders: label, control, hint, error)
interface FieldSpec { name: string; label: string; hint?: string | null; error?: string | null; required?: boolean; layout?: "stacked" | "inline" }   // name ^[A-Za-z][A-Za-z0-9_]{0,63}$ (isFieldName); a label over 80 characters throws KitError
// Field(props: FieldSpec & { idPrefix; children }): the label gets " (required)"; the error has a hidden "Error: " span
// web/src/kit/data/Form.tsx:9-14; form.ts:7-13, :29
interface FormSpec { label: string; submitLabel: string; fields: readonly string[]; errors: FormErrors; busy?: boolean }
interface FormProps extends FormSpec { onSubmit: () => void; children?: ReactNode }
// Form(props): at most 100 unique names (else KitError); a submit focuses [name] of the first of `fields` with an error; $form is role="alert"
// web/src/runs/test-run.ts:11-13, :84; dry-run.ts:27
type TestInputs = { ok: true; input: Record<string, unknown>; mocks: Record<string, unknown> } | { ok: false; errors: FormErrors }
function parseTestInputs(inputText: string, mocksText: string): TestInputs   // errors.input / errors.mocks: "Enter a JSON object.", "This is not valid JSON.", "Enter a JSON object, for example {}."
function parseFakes(text: string): { ok: true; fakes: Record<string, unknown[]> } | { ok: false; message: string }
// web/src/flows/editor-panels.ts:8-14; versions.ts:31-35, :175
interface EditorPanelContext { flowId: string; text: string; version: VersionRow | null; canonical: unknown; result: ValidationView | null }
interface VersionDetailRow extends VersionRow { text: string; canonical: unknown; result: ValidationView | null }
function loadVersion(client: Api<"get">, flowId: string, hash: string, signal?: AbortSignal): Promise<VersionDetailRow>
  // RangeError for a bad flow id or hash; GET /flows/{id}/versions/{encodeURIComponent(hash)}; ApiRequestError(200, "INVALID_RESPONSE") if malformed
// web/src/flow-graph/layout.ts:30-42, :58-70, :11, :161 (pure module; no flow-graph barrel)
interface LayoutNode { id: string; kind: string | null; reachable: boolean; start: boolean; layer: number; index: number; /* known, x, y, successors, missing */ }
type LayoutResult = { status: "ok"; layout: { nodes: LayoutNode[]; /* … */ } } | { status: "invalid"; reason: "not_object" | "no_nodes" } | { status: "too_large"; count: number; limit: number }
function layoutFlow(doc: unknown): LayoutResult
  // `nodes` in order of layer (`start` is layer 0; layers follow the successor edges of every node kind, `successorTargets` at :87), then id by code unit; unreachable nodes in the last layer; "too_large" over 200 nodes; "invalid" when the document or its `nodes` is not a record
// web/src/api/client.ts:13, :43: `class ApiRequestError extends Error` (status, code, details); `interface ApiClient { get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>; … }`
```

The editor (`web/src/flows/FlowEditorPage.tsx`): `canonical` is `null` after "Validate" and after a new "Save version", is the version's own after a version is opened (also at page load), and the panel context carries `canonical: null` and `version: null` while the text differs from the saved baseline. Both panels hold `FORM_FIELDS` (replaced here) and `rows={8}` textareas.

From `add-ui-foundation` (in plan, `web/src/ui/`): `Button(props: ComponentProps<"button"> & { tone?: ButtonTone; size?: "sm" | "md"; asChild?: boolean }): ReactNode` (`button.tsx`; type `"button"`, never `disabled`); `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` (`collapsible.tsx`, props of the Radix parts); `findPaletteUtilities(source: string): SourceHit[]` (`rules.ts`).
