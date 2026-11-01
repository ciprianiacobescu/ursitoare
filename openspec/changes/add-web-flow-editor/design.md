## Context

Two pages over U27's routes (shapes: U27's proposal). Merged names: `delivered-shapes.md`; unmerged: proposal.md § Interfaces taken. Facts used: `details.line` and `column` of a `FLOW_TEXT_INVALID` are 1-based; an `Issue.path` is a JSON Pointer; a stored `result` is a fact at `validatedAt`, never recomputed; `canonical` is the document U22 canonicalised; validation uses the tenant's imported blocks and roles (U26).

## Decisions

1. **Two pages, files 70 and 71.** `/flows` holds the create form and the table; `/flows/:flowId` the editor, diagnostics, versions and panels. A dynamic path cannot carry a `navLabel` (Facts), so only `/flows` is in the navigation.
2. **The API decides.** `/me` probes the Tenant (Facts). After U27 every user lists `read_flow` (its list policy permits it on the Tenant) and nobody lists `edit_flow` (permitted only on a Flow of the owner team), so "Flows" is gated by `read_flow` and shows for every user, carol included (her list is empty), while Create, Save and Validate are never gated: a user who may not edit gets the API's 403 as text with its decision id (journey: bob saving).
3. **CodeMirror under the policy: a shadow root, no policy change.** The policy is the constant `style-src 'self'` (Facts). `style-mod` appends a `<style>` to a document root, which the policy blocks, but adopts a constructed style sheet in a shadow root. Measured on 2026-11-01 in Chromium under that exact policy with the pinned packages: on the document, one `style-src-elem` violation and an unstyled editor (`.cm-scroller` `overflow-x` "visible"); with `root` set to an open shadow root, no violation, no `style` element, one adopted sheet, `overflow-x` "auto", axe-core clean, and `get_by_role("textbox", name=…)` and `fill` work. Rejected: a nonce (a header and an `index.html` rewrite per response), a hash, `unsafe-inline`, a stylesheet route (CodeMirror still injects its rules). So the name is `aria-label` (an IDREF does not cross the boundary) and the theme uses `var(--ui-…)` tokens (custom properties inherit).
4. **Editor build.** Packages `@codemirror/state`, `view`, `commands`, `lang-yaml`, `lint`. Extensions: `lineNumbers()`, `history()`, `drawSelection()`, `EditorView.lineWrapping`, `yaml()`, `keymap.of([...defaultKeymap, ...historyKeymap])` (no Tab binding: Tab leaves the editor), `linter(null)` (marks only through `setDiagnostics`), `EditorView.theme(EDITOR_THEME)`, content attributes `aria-label` and `aria-multiline` "true", and an `EditorView.updateListener` calling `onChange`. No syntax colours (the default highlight style holds raw colours).
5. **Text.** The document is the text; Save sends it unchanged with `detectFormat` (JSON when the first non-space character is `{`, else YAML) and a fresh `Idempotency-Key` (`crypto.randomUUID()`); validate sends none. `saveVersion` refuses an empty text and one over 1,048,576 characters (U27's bound) with `RangeError` messages "Enter the flow text first." and "The text is longer than 1,048,576 characters.", which `flowErrorMessage` passes through; a flow id or hash that breaks its pattern is a `RangeError` too (`..` would leave `/api/v1`).
6. **Baseline.** The baseline is the saved version the editor started from or last saved. "Validate" validates its hash when the text is unchanged, else saves first (`planValidate`), so a result always has a saved version behind it. "Open version N" makes that version the baseline.
7. **Diagnostics.** Rows come from the stored or fresh result (errors, then warnings, in the server's order) or from a text refusal (one row); message and node text are untrusted, rendered as text and cut to 300 characters.
8. **Docs link.** The engine serves no docs and `web/` must not import `src/authoring` (it would bundle ajv and acorn). `diagnosticHref(code)` is `REPO_DOCS_BASE + "docs/authoring/diagnostics.md#" + code.toLowerCase()` for `^(L[123]_|W_)[A-Z0-9_]+$` and `INTERNAL_ERROR`, else `null` (parser codes such as `FORMAT_YAML_SYNTAX` have no section). A test under `test/` requires equality with U25's `diagnosticLink` for every code.
9. **Positions.** `lineColumnOffset` places a parse error; `pointerRange` walks the tree of `yamlLanguage.parser.parse(text)`: in a mapping (`BlockMapping`, `FlowMapping`) it takes the `Pair` whose `Key` text, unquoted, equals the segment; in a sequence (`BlockSequence`, `FlowSequence`) the n-th `Item`; segments decode `~1` then `~0`. The range is the scalar value of the last resolved pair or item, or the pair's key when its value is a mapping, a sequence or absent, cut at the end of its first line. An unresolved segment leaves the last resolved key or item; with none (or a pointer without a leading `/`) it is the first line; the empty text gives 0 to 0.
10. **Panels for U29.** `registerEditorPanel` (the default registry) lets U29's feature file add a section without editing this unit's files. The page renders each panel as a `<section aria-labelledby>` with an `h2` of its title and `render(context)`; `context.version`, `canonical` and `result` are the baseline's while the text equals it, else `null`. The registry catalogue answers `modelProfile`, `delegateTarget` and `flow` as `undefined` (U26), so a journey flow uses blocks and roles only.
11. **Owner team is a text field:** no route an author may call lists teams (`GET /teams` needs `manage_users_roles`); a team the author is not in is a 403.
12. **Reuse and imports.** `Api`, `Check`, `clip` come from `web/src/admin/shared.ts`. The files that `test/` files import (the root typecheck has no DOM types) are `flows`, `versions`, `diagnostics`, `editor-model`, `messages`, `positions` and `pages`: they import no `.tsx`, DOM global or `editor-config.ts`, and `positions.ts` imports only `yamlLanguage`.

## Interfaces

Signatures: exactly those of proposal.md § Interfaces given, repeated here only as types (all under `web/src/flows/`):

```ts
type FlowFormat = "yaml" | "json"
type VersionState = "draft" | "validated" | "tested" | "reviewed" | "published" | "deprecated"
interface VersionRow { flowId: string; number: number; hash: string; state: VersionState; surface: FlowFormat; author: string; requestedBy: string | null; createdAt: string; validatedAt: string | null; validationOk: boolean | null }
interface FlowRow { flowId: string; ownerTeam: string; createdBy: string; createdAt: string; versionCount: number; latest: VersionRow | null }
interface SaveResult { version: VersionRow; created: boolean }  interface ValidateResult { version: VersionRow; result: ValidationView }
interface FlowCells { flow: string; ownerTeam: string; versions: string; latest: string }
interface VersionDetailRow extends VersionRow { text: string; canonical: unknown; result: ValidationView | null }
interface IssueView { layer: "L1" | "L2" | "L3"; code: string; node: string | null; path: string; message: string }
interface ValidationView { ok: boolean; errors: IssueView[]; warnings: IssueView[]; layers_run: ("L1" | "L2" | "L3")[] }
interface DiagnosticRow { key: string; severity: "error" | "warning"; code: string; message: string; where: string; href: string | null; linkText: string | null; path: string | null; position: { line: number; column: number } | null }
interface Baseline { text: string; version: VersionRow }
type FlowTables = Readonly<Record<"flows" | "versions", DataTableSpec>>  interface FlowFeatureLiterals { id: string; path: string; navLabel: string | null; capability: string | null }
interface FlowPage { id: string; file: string; path: string; navLabel: string | null; capability: string | null }
type EditorTheme = Readonly<Record<string, Readonly<Record<string, string>>>>  interface CodeEditorProps { initialText: string; onChange: (text: string) => void; onReady: (handle: EditorHandle | null) => void }
interface EditorHandle { getText(): string; setText(text: string): void; setDiagnostics(items: readonly Diagnostic[]): void; select(from: number, to: number): void; focus(): void; destroy(): void }
interface EditorPanelContext { flowId: string; text: string; version: VersionRow | null; canonical: unknown; result: ValidationView | null }
interface EditorPanel { id: string; title: string; render: (context: EditorPanelContext) => ReactNode }
interface EditorPanelRegistry { register(panel: EditorPanel): void; list(): readonly EditorPanel[] }
class EditorPanelError extends Error { readonly code: "EDITOR_PANEL_INVALID" | "EDITOR_PANEL_DUPLICATE"; constructor(code: EditorPanelError["code"], message: string) }
```

`Diagnostic` is `@codemirror/lint`'s, `EditorState` `@codemirror/state`'s. `flowFeatureLiterals` reads the four fields as string literals after `export const feature`; `null` for a missing `id` or `path`, `null` fields for the others.

## Component wiring

`node --test` has no JSX transform, so the typechecker and the browser journey check the `.tsx` files. Both pages import `./flows.css`, set `document.title` (`Flows · Ursitoare`; `Flow <id> · Ursitoare`) and render `<div className="flow-page"><h1 ref tabIndex={-1}>`.

- `FlowsPage`: `Form` "Create flow" (fields `name`, `ownerTeam`) with `Field` "Flow name" (hint `FLOW_NAME_MESSAGE`) and "Owner team" (hint "A team you belong to, for example finance."); the checks, then `postFlow(browserSession.api, …, crypto.randomUUID())`; success: toast `Created flow <name>.` and `useNavigate` to `/flows/<name>`; 409 is a field error on "Flow name", other refusals a toast with `flowErrorMessage`. Below, `DataTable` "Flows" over `flowListFetcher`, the Flow cell a router `Link`.
- `FlowEditorPage`: `useParams().flowId` (a bad id shows `ErrorPanel` with `ApiRequestError(404, "NOT_FOUND", "Not found")`); `LoadingState` "Loading flow", `ErrorPanel` with "Try again", then `loadFlow` and `loadVersion` of `latest.hash` (baseline and result) or `starterText` with no baseline. Parts: a status paragraph (`role="status"`, `editorStatus`); "Edit the flow" with `CodeEditor`, the hint "Press Tab to leave the editor." and the buttons "Save version" and "Validate" (`aria-disabled` while busy); the region "Diagnostics" (`aria-labelledby` its `h2`) with a `<p role="status">` (the summary, or "No validation result yet. Choose Validate.") and a `<ul aria-label="Issues">` of severity, code, `where`, message, the link and a button "Show <code> in the editor" (focuses the editor, selects the range); the table "Versions" with a button "Open version <n>" per row; one section per panel. A refused text sets the one text row and an error toast; a save sets the baseline, resets the versions list and toasts `saveMessage`; the marks are `lintItems` of the rows.
- Diagnostic links use `target="_blank"` and `rel="noopener noreferrer"`. `CodeEditor` makes a host `div`, calls `mountEditor(host, createEditorState(initialText, onChange))` in an effect, passes the handle to `onReady` and destroys it on cleanup. `mountEditor` calls `host.attachShadow({ mode: "open" })`, appends a child `div` and passes the shadow root as `root` to `new EditorView`.
- `flows.css`: `flow-page`, `flow-section`, `flow-editor-host` (bordered, `min-height` 20rem), `flow-hint` and the issues list; token colours only, no `style` attribute.

## For U29 (closing journey and graph)

Routes `/flows` and `/flows/:flowId`. Accessible names: table "Flows"; form "Create flow" with labels "Flow name" and "Owner team" and button "Create flow"; heading `Flow <id>`; text box "Flow text" (role `textbox`; `locator.fill` works on it); buttons "Save version" and "Validate"; region "Diagnostics" with its status and list "Issues"; links "Guide for <code> (opens in a new tab)"; table "Versions"; buttons "Open version <n>" and "Show <code> in the editor". Reusable: `starterText`, `diagnosticRows`, `pointerRange`. The graph calls `registerEditorPanel({ id, title, render })` at module level in its feature file and reads `context.canonical` (the saved version's document, so no YAML parser in the browser).

## Failure cases

| Situation | Behaviour |
|---|---|
| No session, or it ended | the first 401 of `browserSession.api` goes to `/sign-in?error=SESSION_ENDED` |
| List or load refused or down | `ErrorPanel` (a 403 with its decision id) and "Try again"; an action shows an error toast |
| Not an author of the owner team | 403 toast with the decision id; the editor text is kept |
| Unreadable or wrong-named text | 422: one diagnostic row and an error toast; nothing is saved |
| Same text twice; two clicks | 200 `created: false`, toast "Nothing to save…"; the second click is ignored while busy |
| Empty or oversized text, bad id or hash; wrong-shaped answer | `RangeError` before any request, the toast says why; `INVALID_RESPONSE` text |

## Security

1. No endpoint, table or query is added; the pages call U27's `session` routes with the CSRF header of `browserSession.api`; `/flows/*` is a static single-page-app path, so the API decides. 2. The tenant comes only from the session; another tenant's flow is a 404 (journey). 3. Flow text, node ids and messages are untrusted: React text, never HTML; ids and hashes are pattern-checked before a path is built. 4. No secret is read or stored; errors show catalogue text, never a server message. 5. Abuse, each a scenario: a reader saving (403), another tenant's flow (404), `../x` as an id, an oversized text, script or style from the editor (the policy is unchanged; the browser journey looks for violations).

## Test plan

Node tests beside each file, `node:assert/strict`, each beginning with `assert.equal(typeof <function>, "function")`; a call that reaches a stub is wrapped in `assert.doesNotThrow` or `.then((v) => v, (e: unknown) => e)` and its value asserted. Recording clients keep `{ path, body, opts }` of every call. `e2e/test_m3_flow_editor.py` follows `e2e/test_m2_admin.py` (fixtures `fresh_state`, `users`; `login`; role and label locators with `exact=True`; no sleeps) and listens with `page.on("console", …)`.

## Decisions made while writing

- **Shadow root, not a nonce:** measured, no policy change (decision 3). **No syntax colours** until a token-based highlight style exists.
- **Pointers are mapped in the editor** (U25's issues carry JSON Pointers, no line); a pointer to a missing key marks its nearest ancestor.
- **Validate may save first,** so a stored result always has a hash behind it. **Panels, not a route, for the graph:** U29 reads the canonical document.
- **Repository URL for the guide;** serving the docs is a later choice. **A browser journey in this unit** (the milestone one is U29's), so the policy claim is proved in a browser.
