## Why

Approving a changed surface gives each changed tool a new ref (`ledger.create_payment@1` becomes `@2`), but grants and flows keep naming the old one and the Grants page shows nothing. Observable result: carol approves the drifted server `ledger` and reads "Refs changed: ledger.create_payment@1 → ledger.create_payment@2, ledger.list_vendors@1 → ledger.list_vendors@2. Grants and flows still name the old refs."; "Create the same grants for the new refs" lists one line per grant ("Created ledger.create_payment@2 for role author · any step.", "Not created for user u_bob · any step: arg_unknown.", "Update the flow first: …", "Effect changed: read → write; grant it again on the Grants page: …"); on Grants the old rows read "superseded", a row on a drifted server's ref "waiting for approval".

Batch `m8-stack` (U56d, U56e, U57, U59a, U58b, U58, U60, U59, U61, U61d, U61b, U61c in plan order; closing unit `add-stack-conformance`, test `e2e/test_stack_conformance.py`) delivers M8: `docker compose up` runs the six-container hobbyist stack, and every journey so far passes against real Keycloak and Mintkey. This unit's part: after an approval that changed refs, a notice, a one-press copy of the `any_step` grants, and the Grants markers "superseded" and "waiting for approval". After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the milestone's outcome is proved by the delegate's stack runs, not by a gate.

## What Changes

- `web-tools`: ten requirements ADDED; none MODIFIED (the pinned Grants and Servers texts hold byte for byte when no marker or notice shows).
- New `ref-carry.ts`, `RefCarryPanel.tsx`, `RefMarker.tsx`, their tests and two e2e files; named edits of `ServersPage.tsx` and `GrantsPage.tsx` (design 1). No API, engine, migration, message, CSS or journey change; every frozen test stays green unedited. No auto-revoke, no flow edit.

## Impact

- **Scaffold:** stubs of the interfaces below are on the base branch. Not scaffolded: the two `.tsx` files, the values of `REF_MARKERS` and `REF_CARRY_NAMES`, the page edits, the e2e files.
- **Depends on** (merged): `add-web-ui-kit`, `add-web-data-kit`, `restyle-web-kit`, `add-web-sign-in`, `add-tool-registry`, `add-grants-model`, `add-web-grants`, `add-web-tools`, `add-web-tool-review`, `add-web-tool-journeys`. In plan: `add-web-tool-trust` (U56d), by plan order only [D30]; no name is taken from it. Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@31968a29, checked line by line).
- **Shared file with U56d:** `add-web-tool-trust` changes exactly one line of `web/src/tools/ServersPage.tsx`, the attribute `surface={...}` of `<ReplaceSection`. This unit's `ServersPage.tsx` edits name their own anchors (design 1), none touches that element or adds `surface={`, so U56d's source row holds.
- **Deviations from the card:** two new `.tsx` files (design 1); the `(addition)` names below; a grant on a tool whose effect changed is listed, never copied (D49); the link "Deploy on Policies" shows only after a grant was created; `refState` gives `null` for a listed tool with a `null` ref; `effectChanged`, `none`, `listName` and `deployPath` join `REF_CARRY_NAMES`.

**Interfaces given:**

```ts
// web/src/tools/ref-carry.ts (new; imports ToolServerView from ./servers.ts and Api from ../admin/shared.ts)
export interface RefChange { tool: string; from: string; to: string; effect?: { from: string; to: string } }   // refs are "<server>.<tool>@N"; effect only when it changed (D49)
export function changedRefs(before: ToolServerView, after: ToolServerView, effectsBefore?: ReadonlyMap<string, string>): RefChange[];   // tools in both views whose refs are both non-null and differ, sorted by tool; effect from effectsBefore, else before's, to after's
export function approvedEffects(approved: unknown): ReadonlyMap<string, string>;   // (addition) tool name → effect of a raw approved surface; empty when unreadable
export function refNoticeText(changes: readonly RefChange[]): string | null;   // null for []; else "Refs changed: <from> → <to>, …. Grants and flows still name the old refs."
export type GrantSubject = { kind: "role"; role: string } | { kind: "user"; userId: string };
export type GrantScope = { kind: "any_step" } | { kind: "node"; flowId: string; nodeId: string };
export interface GrantArg { arg: string; op: "eq" | "lte" | "gte"; value: string | number | boolean }
export interface GrantRecord { id: string; subject: GrantSubject; tool: string; scope: GrantScope; args: readonly GrantArg[]; status: "active" | "needs_reconfirm" | "revoked" }
export function parseGrantRecord(raw: unknown): GrantRecord | null;   // one `{ grant, status }` item of GET /grants
export function loadAllGrants(api: Api<"get">, signal?: AbortSignal): Promise<{ grants: GrantRecord[]; complete: boolean }>;   // GET /grants?limit=100, up to 100 pages; complete false when the 100th still has a cursor; a bad item rejects
export function loadAllToolServers(api: Api<"get">, signal?: AbortSignal): Promise<{ servers: ToolServerView[]; complete: boolean }>;   // (addition) the same for GET /tool-servers
export interface CopyPlan { copy: { grant: GrantRecord; to: string }[]; flowFirst: { grant: GrantRecord; to: string }[]; effectChanged: { grant: GrantRecord; to: string; effect: { from: string; to: string } }[] }
export function copyPlan(grants: readonly GrantRecord[], changes: readonly RefChange[]): CopyPlan;   // non-revoked grants on a change's `from`: effect changed → effectChanged (any scope), else any_step → copy, node → flowFirst
export function copyGrantBody(grant: GrantRecord, to: string): { subject: GrantSubject; tool: string; scope: { kind: "any_step" }; args: GrantArg[] };   // fresh copies; RangeError for a bad `to`
export type CopyOutcome =
  | { grantId: string; to: string; ok: true; newId: string }
  | { grantId: string; to: string; ok: false; reason: string };   // reason: details.reason of a refusal, else the error code
export function copyGrants(api: Api<"post">, plan: CopyPlan, keyOf: (grantId: string, to: string) => string): Promise<CopyOutcome[]>;   // one POST /grants per plan.copy entry, in order, with Idempotency-Key keyOf(...); never rejects
export function carryKeys(newKey: () => string): (grantId: string, to: string) => string;   // (addition) one key per (grantId, to)
export type RefState = "current" | "superseded" | "waiting";
export function refState(tool: string, servers: readonly ToolServerView[]): RefState | null;   // server = text before the first ".", tool = up to the last "@"; null unless a non-pending listed server lists that tool with a ref (crm.find_customer@1 gets no marker); approved: equal → current, else superseded; drifted: equal → waiting, else superseded
export const REF_MARKERS: Readonly<{ superseded: string; waiting: string }>;   // { superseded: "superseded", waiting: "waiting for approval" }
export const REF_CARRY_NAMES: Readonly<Record<string, string>>;   // test-plan.md § Names
export function fillRefText(template: string, values: Readonly<Record<string, string>>): string;   // (addition) each "{key}" with an own key becomes its value, once
export function grantLabel(grant: GrantRecord): string;   // (addition) e.g. "role author · any step"
export interface CarryView { lines: string[]; empty: string | null; incomplete: string | null; deploy: boolean }   // (addition)
export function carryView(plan: CopyPlan, outcomes: readonly CopyOutcome[], complete: boolean): CarryView;   // (addition) lines: outcomes, then flowFirst, then effectChanged
export function carryGrants(api: Api<"get" | "post">, changes: readonly RefChange[], keyOf: (grantId: string, to: string) => string, signal?: AbortSignal): Promise<CarryView>;   // (addition) rejects only when grants cannot be read
```

**Interfaces taken:** from merged code (shapes in `delivered-shapes.md`): `ToolServerView`, `parseToolServer`, `approveToolSurface`; `parseReviewTools` (`review.ts:175`); `parseGrant` and `grantRowText` (read, not edited); `Api`, `ApiRequestError`, `createApiClient`, `cursorPageFetcher`, `ErrorPanel`, `browserSession`, the `Badge` classes. The routes `GET /tool-servers`, `GET /grants` and `POST /grants` as `delivered-shapes.md` states them.

## Out of scope

Revoking or editing a grant, editing a flow, copying a node-scoped grant, carrying a renamed or removed tool's grants, markers on Policies or in the flow editor, any API or engine change, carrying trust (U56d).
