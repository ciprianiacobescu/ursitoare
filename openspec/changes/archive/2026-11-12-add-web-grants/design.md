## Decisions

1. **Files** are those of proposal § What Changes. D2 puts the dry-run UI in U52b; D13 makes grant changes take effect at the next deploy; U47 rulings 2 and 6 are decision 2 and § Parsing. No existing file changes (`admin/pages.ts` is pinned by frozen `C-2c3410e3`, so `tools/pages.ts` is the page table). Nav is gated by capability, routes are not.
2. **The approver is compared with the pending surface's submitter** (U47 ruling U52-1), never with `registeredBy`. With no submitter (`null`) the engine decides (422 `approver_is_submitter` or `self_approval_required`); `approveFailure` sets `ownSurface`, which shows the box for the retry.
3. **The detail is in-page.** A nav label needs a static path, so the link named the server id (`Link`) goes to `/admin/tool-servers?server=<id>` (`serverLink`); the page loads the detail of `serverIdFromSearch(useLocation().search)` (`AccountMenu.tsx:14`) whenever it changes.
4. **The self-approval box sits beside the button**: `ConfirmDialog` has no content slot (`ConfirmDialog.tsx:59-79`) and U15 is frozen. "Approve surface" opens the dialog only when `approveRequest` is ok (else its message is an alert); the dialog's action is also "Approve surface".
5. **Parsing is never stricter than the engine**: one unreadable item makes `cursorPageFetcher` answer "Invalid page" for the whole list, so the parsers use the engine's patterns (§ Parsing), which `grantBody` checks too. Outside strings are looked up with `Object.hasOwn`.
6. **Grants.** `GrantDraft` has no constraints, so a body sends `args: []`; the roles list (U18) is not fetched, the engine refuses an unknown role or user. Create, revoke and confirm answer a flat `GrantRecord`; a module-internal check accepts a record whose `id` matches the grant id pattern, else `INVALID_RESPONSE`. Revoke and confirm are single clicks without a dialog: audited, effective at the next deploy. A create's `Idempotency-Key` (`crypto.randomUUID()`) is made at the first submit of a draft and kept, after a refusal or a lost answer too, until a create succeeds or a field changes.
7. **Policies.** The textarea starts with the current source. "Deploy" sends it with a fresh `Idempotency-Key` per click and, when accepted, reloads the view; `checkPolicySource` runs first. `pendingGrants` is U49b's count: active grants not in `current.grantIds`, revoked grants in it, and each active grant in it whose compiled Cedar differs from the stored one or that `compileGrant` refuses (a confirm after a deploy, a node change; ruling R3), so "All grant changes are deployed." is true at 0.

## Parsing

`ToolServerView`: `id` `^[a-z][a-z0-9_]{0,31}$`; `adapter` `fixture`, `mcp`, `http_openapi` or `code_block`; `origin` (1-2048) and `registeredBy` (1-256) without control characters; digests null or `^sha256:[0-9a-f]{64}$`. The engine always sends `state`, `approvedDigest`, `pendingDigest` and `tools`, so a missing one is malformed; `pendingSubmittedBy` (null, or 1-256 characters without control characters), `approvedSurface` and `pendingSurface` may be absent (absent and `null` both mean none). The record's `tools` (at most 100) are `{ name, effect, ref }`: `name` `^[a-z][a-z0-9_]{0,63}$`, `effect` `read|write|send|pay`, `ref` null or a string matching the tool pattern below. The view's `tools` are those of `pendingSurface` when it is present and not null, else of `approvedSurface`, else the record's, so an approver sees the tools the posted digest covers. A surface is `{ tools }` of at most 100 tools with the same name and effect patterns (the other surface is ignored); `ref` is that of the record's same-named tool, else null (a drifted record holds the approved surface's refs, which an approval may replace). The surface tool gives `untrusted_result` (absent: true), `unsafe_to_retry` (absent: false) and `http` `{ method, path }` of strings (1-16 and 1-2048 characters, no control character; absent: null); a present member of another type makes the answer malformed. A record without a surface has the three defaults. `toolRows` shows `result` "untrusted" for `untrusted_result` true and "trusted" for false, and `call` `<method> <path>`.

`GrantView` (`parseGrant`) reads the item's `status` and the `id`, `subject`, `tool` and `scope` of its `grant`, ignores its other members, and accepts exactly what `createGrant` can store, else `null`: `status` `active`, `needs_reconfirm` or `revoked`; `id` `^grant_[A-Za-z0-9-]{1,64}$`; `tool` `^[a-z][a-z0-9._-]*@(0|[1-9][0-9]{0,8})$` of at most 128 characters (the `grant` table's checks: `add-grants-model` test-plan.md:60); `subject` `{ kind: "role", role }` (`^[a-z][a-z0-9_]{0,31}$`) or `{ kind: "user", userId }` (`^[A-Za-z0-9_-]{1,64}$`); `scope` `{ kind: "any_step" }` or `{ kind: "node", flowId, nodeId }` (`flowId` `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` of at most 64 characters, `nodeId` `^[a-z][a-z0-9_]*$`). The last four are the patterns of `add-grants-model` specs/grants/spec.md:33-42. `grantBody` checks all five, so the form creates nothing the list cannot read: `acme.lookup_vendor@999999999` passes, `@1000000000` and `@01` do not.

## Messages

`toolsErrorMessage` maps the reason of a 422 `OPERATION_REFUSED` to: `nothing_pending` "Nothing to approve."; `digest_mismatch` "The surface changed while you were reading it. Reload the page and review it again."; `approver_is_submitter` "Another admin must approve this surface."; `self_approval_required` 'You submitted this surface. Tick "I approve my own surface" to approve it.'; `role_unknown` "That role does not exist."; `user_unknown` "That user does not exist."; `tool_unknown` "That tool is not in the registry."; `flow_unknown` "That flow does not exist."; `version_not_validated` "That flow has no validated version yet."; `node_unknown` "That flow has no such step."; `not_node_scoped` "Only a grant for one step can be confirmed."; `revoked` "That grant is revoked."; `policy_invalid` "The policy is not valid.". Any other reason or code gets the kit's text (`errorPanelModel`). `registerToolMessages` calls `registerAdminMessages`. `approveRequest` refuses an unticked needed box with 'Tick "I approve my own surface" to approve a surface you submitted.'. The pages read the reason of a 422 `OPERATION_REFUSED` from `details.reason` (a string, looked up with `Object.hasOwn`): a refused create is the error of the field "Role or user" for `role_unknown` and `user_unknown`, "Tool" for `tool_unknown`, "Flow" for `flow_unknown` and `version_not_validated`, "Step" for `node_unknown`, and the form error for every other failure (a 400 included), with the `toolsErrorMessage` text.

## Roles and names

| Page | Structure and names |
|---|---|
| Tool servers | `h1` "Tool servers"; table "Tool servers" (Server = link named the id, Summary = `serverRowText`); with `?server=<id>`: a region named by `h2` "Surface" that holds `LoadingState` or `ErrorPanel` (`regionState`) or, when ready, `serverRowText`, the `stateNote`, table "Tools" (a `DataTable` over a one-page `useMemo` list of `toolRows`) and the `approvalView` message; in every state it also holds the checkbox "I approve my own surface" (when `ownBoxShown`), the button "Approve surface" (`aria-disabled` from `approveControl`), the `ConfirmDialog` `Approve surface <12>?`, then `p role="status"` "Surface approved." (the page then reads the detail again) or `p role="alert"` with the refusal, either kept across a reload of the detail |
| Grants | `h1` "Grants"; `p` "Grant changes take effect when you deploy the policy."; table "Grants" (Grant = `grantRowText`; Actions = buttons "Revoke" and, for `needs_reconfirm`, "Confirm for the newest version", each `aria-describedby` its Grant cell); form "New grant": group "Subject" (radios "Role", default, "User"), field "Role or user", select "Tool" (first option "Choose a tool"; `LoadingState` "Loading tools" while its refs load), group "Scope" (radios "Any step", default, "One step"), fields "Flow" and "Step" for "One step" only, button "Create grant"; `p role="status"` with `GRANT_DONE` (`role="alert"` with `toolsErrorMessage` when a revoke or confirm fails); after a successful create, revoke or confirm the table "Grants" reloads from its first page (`list.reset()`; U52b's journey relies on it); a refused create is a field error or the form error (§ Messages) |
| Policies | `h1` "Policies"; `p` `currentText`; `p` `pendingText`; textarea "Hand-written Cedar"; buttons "Validate" and "Deploy" (region: `LoadingState` or `ErrorPanel`); `p role="status"` with `validationText` or `deployText`, `role="alert"` with `policyErrorText` |

The textarea's `font-family` is `monospace` (`kit/tokens.css` has no mono token). `TOOL_NAMES` (21 keys): `surfaceHeading` "Surface", `approveButton` "Approve surface", `ownBox` "I approve my own surface", `grantForm` "New grant", `subjectGroup` "Subject", `subjectRole` "Role", `subjectUser` "User", `subjectField` "Role or user", `toolField` "Tool", `scopeGroup` "Scope", `scopeAny` "Any step", `scopeNode` "One step", `flowField` "Flow", `stepField` "Step", `createGrant` "Create grant", `revoke` "Revoke", `confirm` "Confirm for the newest version", `cedarField` "Hand-written Cedar", `validate` "Validate", `deploy` "Deploy", `deployHint` the sentence of the Grants page. `TOOL_TABLES` (caption; columns key "Header"; empty title): `servers` "Tool servers"; `server` "Server" (row header), `summary` "Summary"; "No tool servers". `tools` "Tools"; `name` "Name" (row header), `effect` "Effect", `block` "Block", `result` "Result", `call` "Call"; "No tools". `grants` "Grants"; `grant` "Grant" (row header), `actions` "Actions"; "No grants".

## Failure cases and security

The server detail, the policy view and the tool list are regions: `regionState` shows `LoadingState` or `ErrorPanel` (an unknown `?server=` is the 404 text) and their buttons are `aria-disabled` while `actionsDisabled`; an empty region keeps its actions. A failed tool list leaves the select on its placeholder with the error text. **`aria-disabled` leaves a button operable, so the handler of every disabled control (spec, last requirement) returns at once** (`Form` does it for its submit when `busy`; "Create grant" is `busy` while the tool list loads or has failed): else a click on a failed policy view would deploy the empty textarea over the tenant's Cedar. Only a refusal with `approveFailure.reload` reloads the detail. The tick is cleared each time a detail loads, so it never carries to a surface it was not given for; `ownSurface`, the status and the alert are cleared when `?server=` changes. The checks are advisory: the PEP decides every route (`register_tool_server`, `approve_tool_surface`, `deploy_policy`); a refused user gets the 403 text with its decision id. Self-approval is explicit (`selfApproval: true` only after the box is ticked) and audited (U47 records `tools.surface_self_approved`). Customer data (origins, tool names, subjects, policy text, problem ids) is React text only.

`loadToolRefs` offers every bound ref of `GET /blocks` (action `read_registry`, which every holder of `deploy_policy` has: `delivered-shapes.md`), also an older version a re-approval replaced, on which a grant is stored and allows nothing (U47 and U49 accept it; v0.1).

## Verification

Provenance: test-plan.md header. The pages are checked against mocked answers (test-plan-browser.md) and by U52b's journey against the real engine.

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. Merged shapes: `delivered-shapes.md`.

```ts
// web/src/tools/messages.ts
export function registerToolMessages(): void;
export function toolsErrorMessage(error: unknown): string;
// web/src/tools/servers.ts
export interface ToolServerView { id: string; adapter: string; origin: string; state: "pending" | "approved" | "drifted"; registeredBy: string; pendingDigest: string | null; approvedDigest: string | null; tools: { name: string; effect: "read" | "write" | "send" | "pay"; ref: string | null; untrusted_result: boolean; unsafe_to_retry: boolean; http: { method: string; path: string } | null }[]; pendingSubmittedBy: string | null;
}
export function parseToolServer(raw: unknown): ToolServerView | null;
export function serverRowText(s: ToolServerView): string;
export function approvalView(s: ToolServerView, me: { userId: string; reviewProfile: "solo" | "team" }): { canApprove: boolean; selfApproval: boolean; message: string | null };
export const SURFACE_APPROVED: string;
export function toolRows(s: ToolServerView): { name: string; effect: string; block: string; result: string; call: string }[];
export function stateNote(s: ToolServerView): string | null;
export function ownBoxShown(view: { selfApproval: boolean }, ownSurface: boolean): boolean;
export function approveRequest(s: ToolServerView, me: { userId: string; reviewProfile: "solo" | "team" }, input: { ticked: boolean; ownSurface: boolean }): { ok: true; body: { digest: string; selfApproval: boolean } } | { ok: false; message: string };
export function approveDialog(s: ToolServerView): { title: string; description: string; action: string } | null;
export function approveFailure(error: unknown): { message: string; ownSurface: boolean; reload: boolean };
export function approveControl(s: ToolServerView | null, me: { userId: string; reviewProfile: "solo" | "team" } | null, busy: boolean): { disabled: boolean; selfApproval: boolean; message: string | null };
export function serverLink(id: string): string;
export function serverIdFromSearch(search: string): string | null;
export function loadToolServer(client: Api<"get">, id: string, signal?: AbortSignal): Promise<ToolServerView>;
export function approveToolSurface(client: Api<"post">, id: string, body: { digest: string; selfApproval: boolean }): Promise<ToolServerView>;
// web/src/tools/grants.ts
export interface GrantView { id: string; subject: string; tool: string; scope: string; status: "active" | "needs_reconfirm" | "revoked" }
export function parseGrant(raw: unknown): GrantView | null;
export function grantRowText(g: GrantView): string;
export interface GrantDraft { subjectKind: "role" | "user"; subject: string; tool: string; scopeKind: "any_step" | "node"; flowId: string; nodeId: string }
export function grantBody(d: GrantDraft): { ok: true; body: unknown } | { ok: false; field: string; message: string };
export const GRANT_DONE: { created: string; revoked: string; confirmed: string };
export function grantActions(g: GrantView): { revoke: boolean; confirm: boolean };
export function loadToolRefs(client: Api<"get">, signal?: AbortSignal): Promise<string[]>;
export function postGrant(client: Api<"post">, draft: GrantDraft, key: string): Promise<string>;
export function revokeGrantById(client: Api<"delete">, id: string): Promise<void>;
export function confirmGrantById(client: Api<"post">, id: string): Promise<void>;
// web/src/tools/policies.ts
export interface PolicyView { version: string | null; source: string; pendingGrants: number }
export function parsePolicyView(raw: unknown): PolicyView | null;
export function validationText(v: { ok: boolean; problems: { stage: string; ids: string[]; message: string }[] }): string;
export function deployText(version: string): string;
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
export const TOOL_NAMES: Readonly<Record<string, string>>;
export type RegionLoad<T> = { phase: "loading" } | { phase: "error"; error: unknown } | { phase: "ready"; value: T };
export function regionState<T>(load: RegionLoad<T>, isEmpty?: (value: T) => boolean): { view: "loading" | "error" | "empty" | "ready"; actionsDisabled: boolean };
export type ActionPhase = { phase: "idle" } | { phase: "busy" } | { phase: "done"; text: string } | { phase: "failed"; text: string };
export function actionState(a: ActionPhase): { disabled: boolean; status: { role: "status" | "alert"; text: string } | null };
```
