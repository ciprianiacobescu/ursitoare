## Why

An admin can set an effect but not whether a result is trusted, and a Replace or rediscovery silently resets the trust, data class and retry flag the stored surface holds. Observable result: carol trusts `createPayment` on the OpenAPI server `ledger` and is refused with `Accept the warning for: createPayment.` (as for any tool she marks public) until she ticks `I accept the warning for createPayment`; a later Replace keeps the trust, the class and `unsafe_to_retry: false`, but sends no `unsafe_to_retry` when she moves the tool to `send`; on an MCP server "Discover tools" keeps the approved trust and "Changes" reads `Result: untrusted → trusted`.

Batch `m8-stack` (U56d, U56e, U57, U59a, U58b, U58, U60, U59, U61, U61d, U61b, U61c in plan order; closing unit `add-stack-conformance`, test `e2e/test_stack_conformance.py`) delivers M8: `docker compose up` runs the six-container hobbyist stack, and every journey so far passes against real Keycloak and Mintkey. This unit's part: per-tool trust and data class on registration, Replace and discovery, with a warning, a tick and carried values. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the milestone's outcome is proved by the delegate's stack runs, not by a gate.

## What Changes

- `web-tools`: five requirements ADDED; three MODIFIED and restated whole (the registration draft, the effect settings and the server page).
- New `trust.ts`, `TrustControls.tsx`, tests and two e2e files. Edited `register.ts`, `review.ts`, the three pages and one attribute of `ServersPage.tsx`. No API, engine, migration, message, CSS or journey change; `e2e/test_m7_tools.py` and `test/journeys/m7-tools.test.ts` stay green unedited. The four kept scenarios now name the frozen tests that carry them; every value those tests pin is unchanged.

## Impact

- **Scaffold:** stubs of the interfaces below are on the base branch. Not scaffolded: members of existing interfaces (`OpenApiDraft.trust?` and `carried?`, `DiscoverDraft.trust?` and `carried?`), the values of `DEFAULT_TRUST`, `TRUST_WARNING` and `TRUST_NAMES`, `TrustControls.tsx`, the `.tsx` edits, the e2e files.
- **Depends on** (all merged): `add-web-ui-kit`, `add-web-data-kit`, `restyle-web-kit`, `add-web-sign-in`, `add-tool-registry`, `add-web-grants`, `add-http-openapi-tools`, `add-mcp-client`, `add-web-tools`, `add-web-tool-review`, `add-web-tool-journeys`. No in-plan prerequisite. Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@31968a29, checked line by line).
- **Deviations from the card:** design.md § Decisions made while writing. The only `ServersPage.tsx` line this unit changes is the attribute `surface={...}` on `<ReplaceSection`.

**Interfaces given:**

```ts
// web/src/tools/trust.ts (new)
export type DataClass = "public" | "private";
export interface ToolTrust { trusted: boolean; dataClass: DataClass | null }
export const DEFAULT_TRUST: Readonly<ToolTrust>;   // { trusted: false, dataClass: null }, frozen
export interface StoredTool { name: string; effect: string; untrusted_result: boolean; unsafe_to_retry: boolean | null; data_class: DataClass | null; serverName: string | null }
export function storedTools(surface: unknown): ReadonlyMap<string, StoredTool> | null;   // raw surface; key: tool name
export function trustOf(t: StoredTool | undefined): ToolTrust;
export type OverlayAdapter = "openapi" | "mcp";
export interface Carried { name?: string; unsafe_to_retry?: boolean }
export function carriedFields(adapter: OverlayAdapter, stored: StoredTool | undefined, next: { effect: string; derivedName: string | null }): Carried;
export function carriedAfterEffect(adapter: OverlayAdapter, stored: ReadonlyMap<string, StoredTool> | null, lookup: string | null, effect: string, derivedName: string | null): Carried;   // (addition)
export function overlayEntry(adapter: OverlayAdapter, effect: string | null, trust: ToolTrust, carried: Carried): Record<string, string | boolean>;
export function prefillTrust(stored: ReadonlyMap<string, StoredTool>, operations: readonly OperationRowView[]): { trust: Record<string, ToolTrust>; carried: Record<string, Carried> };   // key: operationId
export function discoverSettings(stored: ReadonlyMap<string, StoredTool>): { trust: Record<string, ToolTrust>; carried: Record<string, Carried> };   // key: server tool name
export function trustAckMissing(trust: Readonly<Record<string, ToolTrust>>, ack: Readonly<Record<string, boolean>>): string[];   // trusted or public, not ticked, sorted
export function ackStatus(trust: Readonly<Record<string, ToolTrust>>, baseline: Readonly<Record<string, ToolTrust>>, ticks: Readonly<Record<string, boolean>>): { shown: string[]; missing: string[]; message: string | null };   // (addition)
export function valueChangeLines(approved: unknown, pending: unknown): ReadonlyMap<string, string[]>;
export interface ChangesText { text: string | null; items: { text: string; lines: string[] }[] }   // (addition) as changesView returns
export function withValueLines(view: ChangesText, values: ReadonlyMap<string, string[]>): ChangesText;   // (addition)
export function fillName(template: string, key: string): string;   // (addition) each "{key}" becomes key, literally
export const TRUST_WARNING: string;
export const TRUST_NAMES: Readonly<Record<string, string>>;
```

**Interfaces taken:**

- From `add-web-tools`: `OpenApiDraft`, `openApiRegistration`, `openApiReplacement`, `prefillEffects`, `OperationRowView`.
- From `add-web-tool-review`: `DiscoverDraft`, `initialDraft`, `discoverBody`, `changesView`, `surfaceDiff`.

## Out of scope

Carrying a `description` (O3), code-block trust and `untrusted_fields` (W8), trust on the MCP registration form, a new audit event (W6), any API or engine change, grants for new refs, pairing a renamed OpenAPI tool.
