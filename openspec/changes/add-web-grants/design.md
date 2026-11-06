## Decisions

1. **Files** are those of proposal § What Changes; rulings D2, D13 and U47 2 and 6 bind them. No existing file changes (`admin/pages.ts` is pinned by the frozen `C-2c3410e3` tests, so `tools/pages.ts` is the page table). Features are found by `import.meta.glob`: task 5.1 creates each with its page, never as a stub. Nav is gated by capability, routes are not (`features.ts:178-190`).
2. **The approver is compared with the pending surface's submitter** (U47 ruling 2), never with `registeredBy`. No U47 answer names the submitter (`submitted_by` is only a column), so `pendingSubmittedBy` is read when an answer carries it and is `null` otherwise. With `null`, `approvalView` blocks nobody and the engine decides: 422 `approver_is_submitter` (team) or `self_approval_required` (solo) reaches the admin as the text of § Messages, and `approveFailure` sets `ownSurface`, which shows the box "I approve my own surface" for the retry. The engine sets `self_approved` itself, so a flag from a non-submitter changes nothing. **Needed from U47** (a consistency-pass item): `ToolServerDetail` and the list item gain `pendingSubmittedBy: string | null`, the submitter of the newest unapproved surface; no web change follows.
3. **The detail is in-page.** Three feature files give no `/admin/tool-servers/:id` route (a nav label needs a static path). The link named the server id goes to `/admin/tool-servers?server=<id>` (`serverLink`); the page reads it with `serverIdFromSearch` and loads `loadToolServer`.
4. **The self-approval box sits beside the button.** `ConfirmDialog` has a title, a description and two buttons, no content slot (`ConfirmDialog.tsx:59-79`), and U15 is frozen. The button "Approve surface" opens the dialog only when `approveRequest` is ok; the dialog's action is also "Approve surface" (the page behind a modal is inert, so one button of that name is reachable).
5. **Parsing is never stricter than the engine.** `cursorPageFetcher` turns one unreadable item into "Invalid page" for the whole list, so the parsers use the engine's patterns (§ Parsing) and short strings for roles, users, flows and steps; only `grantBody`, which checks what the admin types, uses the strict patterns of delivered-shapes.md. Outside strings are looked up with `Object.hasOwn`.
6. **Grants.** The tool select lists the bound refs of `GET /blocks`. `GrantDraft` has no constraints, so a body sends `args: []`; the roles list (U18) is not fetched, the engine refuses an unknown role or user. `TOOL_TABLES` columns are rendered with a `switch` on `column.key` as `UsersPage` does, so no `!` is needed. Revoke and confirm are single clicks without a dialog: audited, effective at the next deploy, and a revoked grant can be created again. U49's list item is `{ grant, status }` (`listGrants`), the one shape `parseGrant` reads.
7. **Policies.** The textarea starts with the current hand-written source. "Deploy" sends it with a fresh `Idempotency-Key` (`crypto.randomUUID()` per click) and reloads the view; `checkPolicySource` runs first (Ajv counts code points, so a longer source is a 400).

## Parsing

`ToolServerView`: `id` `^[a-z][a-z0-9_]{0,31}$`; `adapter` `fixture`, `mcp`, `http_openapi` or `code_block`; `origin` (1-2048) and `registeredBy` (1-256) without control characters; digests null or `^sha256:[0-9a-f]{64}$`; at most 100 tools (name `^[a-z][a-z0-9_]{0,63}$`, effect `read|write|send|pay`, `ref` null or a block ref; `untrusted_result` and `unsafe_to_retry` booleans and `http` `{ method, path }` of strings (1 to 16 and 1 to 2048 characters, no control character) are read from the same-named tool of the answer's `pendingSurface`, else its `approvedSurface`; absent members give true, false and null, and a present member of another type makes the answer malformed). `toolRows` shows `result` "untrusted" for `untrusted_result` true and "trusted" for false, and `call` `<method> <path>`, because the approved digest covers both and `untrusted_result: false` switches the taint of a third party's answers off. `unsafe_to_retry` is kept in the view for the pages that will need it and has no column in M6. `GrantView`: id `^grant_[A-Za-z0-9-]{1,64}$`, tool `^[a-z][a-z0-9._-]*@(0|[1-9][0-9]{0,8})$` (the `grant` table's checks). `grantBody`: the role, user id, flow and step patterns of delivered-shapes.md; tool a block ref of at most 128 characters; flow at most 64.

## Messages

`toolsErrorMessage` maps the reason of a 422 `OPERATION_REFUSED` to: `nothing_pending` "Nothing to approve."; `digest_mismatch` "The surface changed while you were reading it. Reload the page and review it again."; `approver_is_submitter` "Another admin must approve this surface."; `self_approval_required` 'You submitted this surface. Tick "I approve my own surface" to approve it.'; `role_unknown` "That role does not exist."; `user_unknown` "That user does not exist."; `tool_unknown` "That tool is not in the registry."; `flow_unknown` "That flow does not exist."; `version_not_validated` "That flow has no validated version yet."; `node_unknown` "That flow has no such step."; `not_node_scoped` "Only a grant for one step can be confirmed."; `revoked` "That grant is revoked."; `policy_invalid` "The policy is not valid.". Any other reason or code gets the kit's text (`errorPanelModel`); a 403 decision id is appended as " Decision id: <id>". `registerToolMessages` calls `registerAdminMessages`.

## Roles and names

Titles are set by an effect as `UsersPage` does; tables are `DataTable`s. The textarea's `font-family` is `monospace` (`kit/tokens.css` has no mono token, and the token check refuses a `var(--…)` it lacks).

| Page | Structure and names |
|---|---|
| Tool servers | `h1` "Tool servers"; table "Tool servers" (Server = a link named the id, Summary = `serverRowText`); with `?server=<id>`: a region named by `h2` "Surface" holding `serverRowText`, the `stateNote`, table "Tools" (a `DataTable` over a one-page `useMemo` list of `toolRows`: Name, Effect, Block, Result, Call), the `approvalView` message, the checkbox "I approve my own surface" (when `ownBoxShown`), the button "Approve surface" (`aria-disabled` unless `canApprove`), the `ConfirmDialog` `Approve surface <12>?`, then `p role="status"` "Surface approved." (the region then shows the view `approveToolSurface` answered: state `approved`, the tools with their refs) or `p role="alert"` with the refusal |
| Grants | `h1` "Grants"; `p` "Grant changes take effect when you deploy the policy."; table "Grants" (Grant = `grantRowText`; Actions = buttons "Revoke" and, for `needs_reconfirm`, "Confirm for the newest version", each `aria-describedby` its Grant cell); form "New grant": group "Subject" (radios "Role", default, "User"), field "Role or user", select "Tool" (first option "Choose a tool"), group "Scope" (radios "Any step", default, "One step"), fields "Flow" and "Step" for "One step" only, button "Create grant"; `p role="status"` with `GRANT_DONE`; after a successful create, revoke or confirm the table "Grants" reloads from its first page, so the changed row shows at once (U52b's journey relies on it); failures are field errors or the form error |
| Policies | `h1` "Policies"; `p` `currentText`; `p` `pendingText`; textarea "Hand-written Cedar"; buttons "Validate" and "Deploy"; `p role="status"` with `validationText`, `deployText` or `policyErrorText` |

`TOOL_NAMES` values, in the key order of the Interfaces block: "Surface", "Approve surface", "I approve my own surface", "New grant", "Subject", "Role", "User", "Role or user", "Tool", "Scope", "Any step", "One step", "Flow", "Step", "Create grant", "Revoke", "Confirm for the newest version", "Hand-written Cedar", "Validate", "Deploy", "Grant changes take effect when you deploy the policy.". `TOOL_TABLES`: `servers` caption "Tool servers", columns `server` ("Server", row header) and `summary` ("Summary"), empty title "No tool servers"; `tools` caption "Tools", columns `name` ("Name", row header), `effect` ("Effect"), `block` ("Block"), `result` ("Result") and `call` ("Call"), empty title "No tools"; `grants` caption "Grants", columns `grant` ("Grant", row header) and `actions` ("Actions"), empty title "No grants".

## Failure cases and security

While the server detail or the policy view loads, its region shows the kit's `LoadingState` and its buttons are `aria-disabled` (lists use `DataTable`'s own); a list the parser refuses shows the kit's error panel; a detail or policy that fails to load shows `ErrorPanel` (an unknown `?server=` the 404 text); a failed tool list leaves the select with its placeholder and the error text; a stale digest is 422 `digest_mismatch` and the page reloads the detail; a request in flight sets `aria-disabled` on its button. The checks are advisory: the PEP decides every route (`register_tool_server`, `approve_tool_surface`, `deploy_policy`, held by `tenant_admin`) and a user without the capability gets the 403 text with its decision id. Self-approval is explicit and audited: `selfApproval: true` is sent only after the box is ticked, and the engine records `tools.surface_self_approved` (U47). Customer data (origins, tool names, subjects, policy text, problem ids) is React text only: no `dangerouslySetInnerHTML`, no style attribute. No credential passes through these pages.

## Verification

**Ran** (2026-11-06, scratch copy of main@cf34c628, Node 24.22.2): prototypes of the five modules, the three feature files and the tests under `node --test` (11 pass; every value of test-plan.md not marked derived is their output, and `featureLiterals` reads the feature files); prototypes of `ServersPage.tsx` and `GrantsPage.tsx` against the kit, and `tsc -p web/tsconfig.json --noEmit`, clean for `web/src/tools/` and the feature files (the token check refused `--ui-font-mono`, which `kit/tokens.css` lacks). **Derived**: the sibling response shapes, the carol capability list. **Not run**: `PoliciesPage.tsx`, `pnpm run build`, `eslint`, `test/arch/web-routes.test.ts` on the new files, rendering, `import.meta.glob` discovery, the journeys.

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. Merged shapes: `delivered-shapes.md`.

```ts
// web/src/tools/messages.ts
export function registerToolMessages(): void;                  // registers the admin messages; idempotent
export function toolsErrorMessage(error: unknown): string;     // 422 reason text, else the kit's text; a 403 decision id is appended
// web/src/tools/servers.ts
export interface ToolServerView {                              // (card) plus pendingSubmittedBy and the surface members of each tool
  id: string; adapter: string; origin: string; state: "pending" | "approved" | "drifted"; registeredBy: string;
  pendingDigest: string | null; approvedDigest: string | null;
  tools: { name: string; effect: "read" | "write" | "send" | "pay"; ref: string | null;
           untrusted_result: boolean; unsafe_to_retry: boolean; http: { method: string; path: string } | null }[];   // the last three from the answer's pendingSurface, else approvedSurface: true, false, null when it has none
  pendingSubmittedBy: string | null;                           // null when the answer has none (design decision 2)
}
export function parseToolServer(raw: unknown): ToolServerView | null;            // (card) null: malformed
export function serverRowText(s: ToolServerView): string;                         // (card) `${id} · ${origin} · ${state}`
export function approvalView(s: ToolServerView, me: { userId: string; reviewProfile: "solo" | "team" }):
  { canApprove: boolean; selfApproval: boolean; message: string | null };         // (card)
export const SURFACE_APPROVED: string;                                            // "Surface approved."
export function toolRows(s: ToolServerView): { name: string; effect: string; block: string; result: string; call: string }[];   // result "untrusted" | "trusted", call `<method> <path>` or "—"
export function stateNote(s: ToolServerView): string | null;
export function ownBoxShown(view: { selfApproval: boolean }, ownSurface: boolean): boolean;
export function approveRequest(s: ToolServerView, me: { userId: string; reviewProfile: "solo" | "team" }, input: { ticked: boolean; ownSurface: boolean }):
  { ok: true; body: { digest: string; selfApproval: boolean } } | { ok: false; message: string };
export function approveDialog(s: ToolServerView): { title: string; description: string; action: string } | null;
export function approveFailure(error: unknown): { message: string; ownSurface: boolean };
export function serverLink(id: string): string;
export function serverIdFromSearch(search: string): string | null;
export function loadToolServer(client: Api<"get">, id: string, signal?: AbortSignal): Promise<ToolServerView>;
export function approveToolSurface(client: Api<"post">, id: string, body: { digest: string; selfApproval: boolean }): Promise<ToolServerView>;
// web/src/tools/grants.ts
export interface GrantView { id: string; subject: string; tool: string; scope: string; status: "active" | "needs_reconfirm" | "revoked" }   // (card)
  // subject "role author" | "user <id>"; scope "any step" | "<flow> / <node>"
export function parseGrant(raw: unknown): GrantView | null;                       // (card) a list item { grant, status } (U49 listGrants)
export function grantRowText(g: GrantView): string;                               // (card) `${subject} · ${tool} · ${scope} · ${status}`
export interface GrantDraft { subjectKind: "role" | "user"; subject: string; tool: string; scopeKind: "any_step" | "node"; flowId: string; nodeId: string }   // (card)
export function grantBody(d: GrantDraft): { ok: true; body: unknown } | { ok: false; field: string; message: string };   // (card)
export const GRANT_DONE: { created: string; revoked: string; confirmed: string };
export function grantActions(g: GrantView): { revoke: boolean; confirm: boolean };
export function loadToolRefs(client: Api<"get">, signal?: AbortSignal): Promise<string[]>;   // bound refs of GET /blocks
export function postGrant(client: Api<"post">, draft: GrantDraft, key: string): Promise<string>;   // POST /grants; the id
export function revokeGrantById(client: Api<"delete">, id: string): Promise<void>;
export function confirmGrantById(client: Api<"post">, id: string): Promise<void>;    // confirm sends {}
// web/src/tools/policies.ts
export interface PolicyView { version: string | null; source: string; pendingGrants: number }   // (card)
export function parsePolicyView(raw: unknown): PolicyView | null;                 // (card)
export function validationText(v: { ok: boolean; problems: { stage: string; ids: string[]; message: string }[] }): string;   // (card) "Valid." or "Not valid: <stage> <ids>: <message>; ..." (ids and message left out when empty)
export function deployText(version: string): string;                              // (card) `Deployed version ${version.slice(0, 12)}.`
export function currentText(v: PolicyView): string;                               // `Current version ${v12}` or "No policy deployed."
export function pendingText(n: number): string;                                   // "<n> grant changes are not deployed."
export function checkPolicySource(source: string): { ok: true } | { ok: false; message: string };
export function policyErrorText(error: unknown): string;
export function loadPolicy(client: Api<"get">, signal?: AbortSignal): Promise<PolicyView>;
export function validatePolicy(client: Api<"post">, source: string): Promise<{ ok: boolean; problems: { stage: string; ids: string[]; message: string }[] }>;
export function deployPolicy(client: Api<"post">, source: string, key: string): Promise<string>;   // the version
// web/src/tools/pages.ts
export const TOOL_PAGES: readonly { id: string; file: string; path: string; navLabel: string; capability: string }[];
export const TOOL_TITLES: { servers: string; grants: string; policies: string };  // "<name> · Ursitoare"
export const TOOL_TABLES: Readonly<Record<"servers" | "tools" | "grants", DataTableSpec>>;
export const TOOL_NAMES: Readonly<Record<"surfaceHeading" | "approveButton" | "ownBox" | "grantForm" | "subjectGroup" | "subjectRole" | "subjectUser" | "subjectField" | "toolField" | "scopeGroup" | "scopeAny" | "scopeNode" | "flowField" | "stepField" | "createGrant" | "revoke" | "confirm" | "cedarField" | "validate" | "deploy" | "deployHint", string>>;
```
