## Why

M6 lets an admin approve a tool server's surface, grant its tools and deploy the tenant's policy, but only through the API. This change adds the three admin pages and the logic behind them.

Observable result: carol (`tenant_admin`) follows the link `acme` on "Tool servers" to its "Surface", ticks "I approve my own surface" when she submitted it in a solo tenant, presses "Approve surface" and reads "Surface approved."; on "Grants" she creates a role grant for `author` on `acme.lookup_vendor@1`; on "Policies" she validates her Cedar ("Valid.") and deploys it ("Deployed version " and the first 12 hex digits of the new version). Alice sees none of the three menu entries.

Batch `m6-grants` (U40b, U45, U46, U45b, U47, U48, U49, U49b, U50, U51, U52, U52b in plan order; closing unit `add-web-dry-runs`, journey `e2e/test_m6_grants.py`) delivers M6: admins register tool servers and grant tools per role and step; an attended dry run reads through the broker with a one-step token and shows each effect's permit while stubbing it. This unit's part: the admin pages for tool servers, grants and policies. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- New capability `web-tools`, ADDED requirements only; no frozen test change.
- New: `web/src/tools/{messages,servers,grants,policies,pages}.ts`, `ServersPage.tsx`, `GrantsPage.tsx`, `PoliciesPage.tsx`, `tools.css`, the Node tests, and the feature files `64-admin-tool-servers.tsx`, `65-admin-grants.tsx` and `66-admin-policies.tsx` (paths, labels and capabilities in `TOOL_PAGES`, test-plan.md § Pages).

## Impact

- **Scaffold:** Signature stubs for the interfaces below are on the base branch (`docs/decisions/0002`) in `web/src/tools/`; this change implements them. Not scaffolded: the `.tsx` and `.css` files, the three feature files (discovered by `import.meta.glob`, so task 5.1 creates each with its page), the tests, and the module-internal `REASON_MESSAGES` and `refusalReason` of `messages.ts`. No API change, error code, migration, dependency or edit of an existing file.
- **Depends on:** `add-web-shell` (U07: `registerFeature`, `FeatureSpec`), `add-web-ui-kit` (U15: `ConfirmDialog`), `add-web-data-kit` (U15b: `DataTable`, `Form`, `Field`, `cursorPageFetcher`), `add-web-sign-in` (U16: the session), `add-web-admin` (U21: the admin page pattern, `featureLiterals`), `add-tool-registry` (U47: tool-server routes), `add-grants-model` (U49: grant routes) and `add-policy-deploy` (U49b: policy routes). Also merged: `add-block-registry` (U26: `GET /api/v1/blocks`).
- **Deviations from the card** (`pendingSubmittedBy`, the box beside the button, the roles list not fetched): design.md decisions 2, 4 and 6.
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@cf34c628, and from the sibling folders named, checked line by line).

**Interfaces given** (the block of `design.md` § Interfaces). `(card)` marks the card's names; every other name is an addition the pages need. The lists are `cursorPageFetcher(client, "/tool-servers" or "/grants", { parseItem })` in the pages.

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

**Interfaces taken:**

- From `add-tool-registry`: `ToolServerRecord`, `ToolServerDetail`, `ToolServerState`, `ToolAdapter` (the answers the parser reads). From `add-grants-model`: `GrantRecord`, `GrantStatus`. From `add-policy-deploy`: `PolicyValidation`, `PolicySetRecord`.
- From merged code (shapes in `delivered-shapes.md`): `FeatureSpec`, `createFeatureRegistry`, `visibleNav`, `CapabilityState`, `featureLiterals`, `Api`, `ApiRequestError`, `cursorPageFetcher`, `FetchPage`, `DataTableSpec`, `dataTableModel`, `ConfirmDialog`, `Form`, `Field`, `FormErrors`, `errorPanelModel`, `registerAdminMessages`, `findRawColours`, `findInlineStyleUse`.

## Out of scope

Registration and credential forms (U56, M7), the Dry run panel, run-page permits and the journeys (U52b), grant constraints on arguments, a roles list, a policy editor beyond a textarea, and any change to the API or the engine.
