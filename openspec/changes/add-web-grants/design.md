## Decisions

1. **Files** are those of proposal § What Changes; rulings D2, D13 and U47 2 and 6 bind them. No existing file changes (`admin/pages.ts` is pinned by the frozen `C-2c3410e3` tests, so `tools/pages.ts` is the page table). Features are found by `import.meta.glob`, so task 5.1 creates each with its page. Nav is gated by capability, routes are not.
2. **The approver is compared with the pending surface's submitter** (U47 ruling U52-1), never with `registeredBy`. U47's records carry `pendingSubmittedBy`: the submitter of the newest unapproved surface, else `null` (also an answer without the member): `approvalView` then blocks nobody and the engine decides, 422 `approver_is_submitter` (team) or `self_approval_required` (solo); `approveFailure` sets `ownSurface`, which shows the box "I approve my own surface" for the retry.
3. **The detail is in-page.** A nav label needs a static path, so the link named the server id goes to `/admin/tool-servers?server=<id>` (`serverLink`, read by `serverIdFromSearch`).
4. **The self-approval box sits beside the button**: `ConfirmDialog` has a title, a description and two buttons, no content slot (`ConfirmDialog.tsx:59-79`), and U15 is frozen. "Approve surface" opens the dialog only when `approveRequest` is ok; the dialog's action is also "Approve surface".
5. **Parsing is never stricter than the engine.** `cursorPageFetcher` turns one unreadable item into "Invalid page" for the whole list, so the parsers use the engine's patterns (§ Parsing), which `grantBody` checks too. Outside strings are looked up with `Object.hasOwn`.
6. **Grants.** `GrantDraft` has no constraints, so a body sends `args: []`; the roles list (U18) is not fetched, the engine refuses an unknown role or user. Revoke and confirm are single clicks without a dialog: audited, effective at the next deploy.
7. **Policies.** The textarea starts with the current source. "Deploy" sends it with a fresh `Idempotency-Key` (`crypto.randomUUID()` per click) and, when accepted, reloads the view; `checkPolicySource` runs first (a longer source is a 400).

## Parsing

`ToolServerView`: `id` `^[a-z][a-z0-9_]{0,31}$`; `adapter` `fixture`, `mcp`, `http_openapi` or `code_block`; `origin` (1-2048) and `registeredBy` (1-256) without control characters; digests null or `^sha256:[0-9a-f]{64}$`; at most 100 tools (name `^[a-z][a-z0-9_]{0,63}$`, effect `read|write|send|pay`, `ref` null or a block ref; `untrusted_result` and `unsafe_to_retry` booleans and `http` `{ method, path }` of strings (1 to 16 and 1 to 2048 characters, no control character) are read from the same-named tool of the answer's `pendingSurface`, else its `approvedSurface`; absent members give true, false and null, and a present member of another type makes the answer malformed). `toolRows` shows `result` "untrusted" for `untrusted_result` true and "trusted" for false, and `call` `<method> <path>`, because the approved digest covers both. `unsafe_to_retry` has no column in M6. `GrantView` (`parseGrant`) reads the item's `status` and the `id`, `subject`, `tool` and `scope` of its `grant`, ignores every other member of U49's `GrantRecord`, and accepts exactly what `createGrant` can store and `listGrants` return, else `null`: `status` `active`, `needs_reconfirm` or `revoked`; `id` `^grant_[A-Za-z0-9-]{1,64}$`; `tool` `^[a-z][a-z0-9._-]*@(0|[1-9][0-9]{0,8})$` of at most 128 characters (the `grant` table's checks: `add-grants-model` test-plan.md:59); `subject` `{ kind: "role", role }` (`^[a-z][a-z0-9_]{0,31}$`) or `{ kind: "user", userId }` (`^[A-Za-z0-9_-]{1,64}$`); `scope` `{ kind: "any_step" }` or `{ kind: "node", flowId, nodeId }` (`flowId` `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` of at most 64 characters, `nodeId` `^[a-z][a-z0-9_]*$`). U49 states no pattern for these four; they are the checks of the stores `createGrant` reads (U49 design 1 and 5): `role_id` (`0170_rbac.sql`), `user_id` (`0100_identity.sql`), `flow_id` (`0270_flow_registry.sql`), `nodeId` (`schema.ts:92`), and U49's compiler refuses the same families (§ Compile refusals). `grantBody` checks all five fields against these patterns, so the form creates nothing the list cannot read: `acme.lookup_vendor@999999999` passes, `@1000000000` and `@01` do not.

## Messages

`toolsErrorMessage` maps the reason of a 422 `OPERATION_REFUSED` to: `nothing_pending` "Nothing to approve."; `digest_mismatch` "The surface changed while you were reading it. Reload the page and review it again."; `approver_is_submitter` "Another admin must approve this surface."; `self_approval_required` 'You submitted this surface. Tick "I approve my own surface" to approve it.'; `role_unknown` "That role does not exist."; `user_unknown` "That user does not exist."; `tool_unknown` "That tool is not in the registry."; `flow_unknown` "That flow does not exist."; `version_not_validated` "That flow has no validated version yet."; `node_unknown` "That flow has no such step."; `not_node_scoped` "Only a grant for one step can be confirmed."; `revoked` "That grant is revoked."; `policy_invalid` "The policy is not valid.". Any other reason or code gets the kit's text (`errorPanelModel`). `registerToolMessages` calls `registerAdminMessages`.

## Roles and names

The textarea's `font-family` is `monospace` (`kit/tokens.css` has no mono token).

| Page | Structure and names |
|---|---|
| Tool servers | `h1` "Tool servers"; table "Tool servers" (Server = link named the id, Summary = `serverRowText`); with `?server=<id>`: a region named by `h2` "Surface" that holds `LoadingState` or `ErrorPanel` (`regionState`) or, when ready, `serverRowText`, the `stateNote`, table "Tools" (a `DataTable` over a one-page `useMemo` list of `toolRows`) and the `approvalView` message; in every state it also holds the checkbox "I approve my own surface" (when `ownBoxShown`), the button "Approve surface" (`aria-disabled` from `approveControl`, so true while loading or failed), the `ConfirmDialog` `Approve surface <12>?`, then `p role="status"` "Surface approved." (the region then shows the view `approveToolSurface` answered) or `p role="alert"` with the refusal, either kept across a reload of the detail |
| Grants | `h1` "Grants"; `p` "Grant changes take effect when you deploy the policy."; table "Grants" (Grant = `grantRowText`; Actions = buttons "Revoke" and, for `needs_reconfirm`, "Confirm for the newest version", each `aria-describedby` its Grant cell); form "New grant": group "Subject" (radios "Role", default, "User"), field "Role or user", select "Tool" (first option "Choose a tool"; `LoadingState` "Loading tools" while its refs load), group "Scope" (radios "Any step", default, "One step"), fields "Flow" and "Step" for "One step" only, button "Create grant"; `p role="status"` with `GRANT_DONE` (`role="alert"` with `toolsErrorMessage` when a revoke or confirm fails); after a successful create, revoke or confirm the table "Grants" reloads from its first page (`list.reset()`; U52b's journey relies on it); failures are field errors or the form error |
| Policies | `h1` "Policies"; `p` `currentText`; `p` `pendingText`; textarea "Hand-written Cedar"; buttons "Validate" and "Deploy" (region: `LoadingState` or `ErrorPanel`); `p role="status"` with `validationText` or `deployText`, `role="alert"` with `policyErrorText` |

`TOOL_NAMES` (21 keys): `surfaceHeading` "Surface", `approveButton` "Approve surface", `ownBox` "I approve my own surface", `grantForm` "New grant", `subjectGroup` "Subject", `subjectRole` "Role", `subjectUser` "User", `subjectField` "Role or user", `toolField` "Tool", `scopeGroup` "Scope", `scopeAny` "Any step", `scopeNode` "One step", `flowField` "Flow", `stepField` "Step", `createGrant` "Create grant", `revoke` "Revoke", `confirm` "Confirm for the newest version", `cedarField` "Hand-written Cedar", `validate` "Validate", `deploy` "Deploy", `deployHint` "Grant changes take effect when you deploy the policy.". `TOOL_TABLES` (caption; columns key "Header"; empty title): `servers` "Tool servers"; `server` "Server" (row header), `summary` "Summary"; "No tool servers". `tools` "Tools"; `name` "Name" (row header), `effect` "Effect", `block` "Block", `result` "Result", `call` "Call"; "No tools". `grants` "Grants"; `grant` "Grant" (row header), `actions` "Actions"; "No grants".

## Failure cases and security

The server detail, the policy view and the tool list are regions: `regionState` shows `LoadingState` or `ErrorPanel` (an unknown `?server=` is the 404 text) and their buttons are `aria-disabled` while `actionsDisabled`; an empty region keeps its actions. A failed tool list leaves the select with its placeholder and the error text, and "Create grant" `aria-disabled`; a stale digest is 422 `digest_mismatch` and the page reloads the detail. The checks are advisory: the PEP decides every route (`register_tool_server`, `approve_tool_surface`, `deploy_policy`) and a user without the capability gets the 403 text with its decision id. Self-approval is explicit (`selfApproval: true` only after the box is ticked) and audited (U47 records `tools.surface_self_approved`). Customer data (origins, tool names, subjects, policy text, problem ids) is React text only; no credential passes through these pages.

More than 1,000 block entries is beyond v0.1: `loadToolRefs` stops at 10 pages (the engine refuses an unknown ref).

## Verification

Provenance: test-plan.md header. The models decide every page state; `e2e/test_m6_tool_pages.py` (task 5.1) checks each page against mocked API answers; the M6 journey of `add-web-dry-runs` proves them against the real engine.

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. Merged shapes: `delivered-shapes.md`.

```ts
// web/src/tools/messages.ts
export function registerToolMessages(): void;
export function toolsErrorMessage(error: unknown): string;
// web/src/tools/servers.ts
export interface ToolServerView {   // (card)
  id: string; adapter: string; origin: string; state: "pending" | "approved" | "drifted"; registeredBy: string;
  pendingDigest: string | null; approvedDigest: string | null;
  tools: { name: string; effect: "read" | "write" | "send" | "pay"; ref: string | null;
           untrusted_result: boolean; unsafe_to_retry: boolean; http: { method: string; path: string } | null }[];
  pendingSubmittedBy: string | null;                           // design decision 2
}
export function parseToolServer(raw: unknown): ToolServerView | null;   // (card)
export function serverRowText(s: ToolServerView): string;   // (card)
export function approvalView(s: ToolServerView, me: { userId: string; reviewProfile: "solo" | "team" }):
  { canApprove: boolean; selfApproval: boolean; message: string | null };         // (card)
export const SURFACE_APPROVED: string;
export function toolRows(s: ToolServerView): { name: string; effect: string; block: string; result: string; call: string }[];
export function stateNote(s: ToolServerView): string | null;
export function ownBoxShown(view: { selfApproval: boolean }, ownSurface: boolean): boolean;
export function approveRequest(s: ToolServerView, me: { userId: string; reviewProfile: "solo" | "team" }, input: { ticked: boolean; ownSurface: boolean }):
  { ok: true; body: { digest: string; selfApproval: boolean } } | { ok: false; message: string };
export function approveDialog(s: ToolServerView): { title: string; description: string; action: string } | null;
export function approveFailure(error: unknown): { message: string; ownSurface: boolean };
export function approveControl(s: ToolServerView | null, me: { userId: string; reviewProfile: "solo" | "team" } | null, busy: boolean):
  { disabled: boolean; selfApproval: boolean; message: string | null };
export function serverLink(id: string): string;
export function serverIdFromSearch(search: string): string | null;
export function loadToolServer(client: Api<"get">, id: string, signal?: AbortSignal): Promise<ToolServerView>;
export function approveToolSurface(client: Api<"post">, id: string, body: { digest: string; selfApproval: boolean }): Promise<ToolServerView>;
// web/src/tools/grants.ts
export interface GrantView { id: string; subject: string; tool: string; scope: string; status: "active" | "needs_reconfirm" | "revoked" }   // (card)

export function parseGrant(raw: unknown): GrantView | null;   // (card) item { grant, status }
export function grantRowText(g: GrantView): string;   // (card)
export interface GrantDraft { subjectKind: "role" | "user"; subject: string; tool: string; scopeKind: "any_step" | "node"; flowId: string; nodeId: string }   // (card)
export function grantBody(d: GrantDraft): { ok: true; body: unknown } | { ok: false; field: string; message: string };   // (card)
export const GRANT_DONE: { created: string; revoked: string; confirmed: string };
export function grantActions(g: GrantView): { revoke: boolean; confirm: boolean };
export function loadToolRefs(client: Api<"get">, signal?: AbortSignal): Promise<string[]>;
export function postGrant(client: Api<"post">, draft: GrantDraft, key: string): Promise<string>;
export function revokeGrantById(client: Api<"delete">, id: string): Promise<void>;
export function confirmGrantById(client: Api<"post">, id: string): Promise<void>;
// web/src/tools/policies.ts
export interface PolicyView { version: string | null; source: string; pendingGrants: number }   // (card)
export function parsePolicyView(raw: unknown): PolicyView | null;                 // (card)
export function validationText(v: { ok: boolean; problems: { stage: string; ids: string[]; message: string }[] }): string;   // (card)
export function deployText(version: string): string;   // (card)
export function currentText(v: PolicyView): string;
export function pendingText(n: number): string;
export function checkPolicySource(source: string): { ok: true } | { ok: false; message: string };
export function policyErrorText(error: unknown): string;
export function loadPolicy(client: Api<"get">, signal?: AbortSignal): Promise<PolicyView>;
export function validatePolicy(client: Api<"post">, source: string): Promise<{ ok: boolean; problems: { stage: string; ids: string[]; message: string }[] }>;
export function deployPolicy(client: Api<"post">, source: string, key: string): Promise<string>;
// web/src/tools/pages.ts
export const TOOL_PAGES: readonly { id: string; file: string; path: string; navLabel: string; capability: string }[];
export const TOOL_TITLES: { servers: string; grants: string; policies: string };
export const TOOL_TABLES: Readonly<Record<"servers" | "tools" | "grants", DataTableSpec>>;
export const TOOL_NAMES: Readonly<Record<string, string>>;  // 21 keys: design § Roles and names
export type RegionLoad<T> = { phase: "loading" } | { phase: "error"; error: unknown } | { phase: "ready"; value: T };
export function regionState<T>(load: RegionLoad<T>, isEmpty?: (value: T) => boolean): { view: "loading" | "error" | "empty" | "ready"; actionsDisabled: boolean };
export type ActionPhase = { phase: "idle" } | { phase: "busy" } | { phase: "done"; text: string } | { phase: "failed"; text: string };
export function actionState(a: ActionPhase): { disabled: boolean; status: { role: "status" | "alert"; text: string } | null };
```
