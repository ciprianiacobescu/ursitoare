## Why

Admins approve a tool server's surface, grant its tools and deploy the policy only through the API; this change adds the three admin pages.

Observable result: carol (`tenant_admin`) follows the link `acme` on "Tool servers" to its "Surface", ticks "I approve my own surface" when she submitted it in a solo tenant and reads "Surface approved." after "Approve surface"; on "Grants" she creates a role grant for `author` on `acme.lookup_vendor@1`; on "Policies" she validates her Cedar ("Valid.") and deploys it ("Deployed version " and 12 hex digits). Alice sees none of the three menu entries. Batch `m6-grants` (U40b to U52b, acceptance profile `none`) delivers M6.

## What Changes

- New capability `web-tools`, ADDED requirements only; no frozen test change.
- New: `web/src/tools/{messages,servers,grants,policies,pages}.ts`, `ServersPage.tsx`, `GrantsPage.tsx`, `PoliciesPage.tsx`, `tools.css`, the Node tests, `e2e/test_m6_tool_pages.py` and the feature files `64-` to `66-`.

## Impact

- **Scaffold:** signature stubs for the interfaces below are on the base branch (`docs/decisions/0002`) in `web/src/tools/`; not scaffolded: the `.tsx` and `.css` files, the feature files, the tests, and the module-internal `REASON_MESSAGES`, `refusalReason`, `shortDigest` and grant-record check. No API change, error code, migration, dependency or edit of an existing file.
- **Depends on:** `add-web-shell` (U07), `add-web-ui-kit` (U15), `add-web-data-kit` (U15b), `add-web-sign-in` (U16), `add-web-admin` (U21), `add-tool-registry` (U47), `add-grants-model` (U49), `add-policy-deploy` (U49b). Merged: `add-block-registry` (U26). Shapes of the delivered names: `delivered-shapes.md` (main@3dd549bd).
- **Deviations from the card**: design.md decisions 4 and 6; `pendingSubmittedBy` is U47's (decision 2).

**Interfaces given** (the block of `design.md` § Interfaces). `regionState`, `actionState` and `approveControl` are the pure models of every page state; the lists are `cursorPageFetcher(client, "/tool-servers" or "/grants", { parseItem })`.

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

**Interfaces taken:** the records `ToolServerRecord`, `ToolServerDetail`, `GrantRecord`, `PolicyValidation`, `PolicySetRecord` of the three siblings (`delivered-shapes.md` § Sibling response shapes) and the merged names of `delivered-shapes.md`.

## Out of scope

Registration and credential forms (U56, M7), the Dry run panel, run-page permits and the journeys (U52b), grant constraints on arguments, a roles list, a policy editor beyond a textarea, any change to the API or the engine.
