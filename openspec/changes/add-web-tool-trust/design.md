## Context

`operationOverlay` and `discoverBody` send the effect alone, so Replace and Discover reset `untrusted_result`, `unsafe_to_retry` and `data_class` to the engine's defaults (`src/tools/openapi/read.ts:387-392`, `src/tools/mcp/surface.ts:481-484`).

## Decisions

1. **Files.** New: `trust.ts` and `TrustControls.tsx` (`TrustToggle`, `DataClassSelect`, `TrustNotes`: native checkbox and `<select className="ui-input">`, a `<p>`, `tools-checkbox` labels; no CSS). Named edits: `register.ts` (`OpenApiDraft` gains optional `trust` and `carried` by operationId; `operationOverlay` takes the draft), `review.ts` (`DiscoverDraft` gains them by server tool name), the three pages, and one attribute of `ServersPage.tsx`, `surface={pendingSurface !== null ? pendingSurface : approvedSurface}` (the cards give that file to U56e; a second detail read breaks the frozen read counts).
2. **`storedTools`** reads own members only: at most 100 tools with unique names `^[a-z][a-z0-9_]{0,63}$`, an effect of the four, flags absent or boolean, `data_class` absent, `null`, `public` or `private`, a `call` absent, `null` or an object (an `mcp` call needs a `name` `^[A-Za-z0-9_.-]{1,128}$`); else `null`. Its own reader keeps `trust.ts` a leaf (`register.ts` and `review.ts` import it: no cycle). A `null` map carries nothing, so the frozen Replace test, which has no surface, still PUTs `{ effect: "pay" }`.
3. **Carry-forward.** The engine stores the defaulted `unsafe_to_retry` (a `read` is stored `false` with no one choosing it); carried onto a `pay`, `false` lets a crashed intent be invoked again (`src/runs/intents/gate.ts:68-72`). So `carriedFields` carries it only when the effect is unchanged and the value is not the adapter's default (a scratch `importOpenApi` stored `true` for `read` set to `pay` without it, `false` with it). `carriedAfterEffect` recomputes after each effect change (MCP Proposed is `write`: `entry?.effect ?? "write"`). A `description` is never carried (O3). MCP names stay carried by `initialDraft`.
4. **`overlayEntry`** orders effect, name, `untrusted_result` (only `false`), `unsafe_to_retry`, `data_class`; trust off is absent (W1), so pinned bodies are unchanged.
5. **Pairing.** `prefillTrust` pairs by derived name like the frozen `prefillEffects`, so trust is prefilled where the effect is. A stored tool renamed by an API overlay is not paired (its effect is not prefilled today either; a later fix); the `name` rule serves a caller that pairs otherwise.
6. **Acknowledgement.** The baseline is the trust at the form's load (registration `{}`; Replace the `prefillTrust` result; Tool settings `discoverSettings` of the pending surface); a tick shows only for a key newly trusted or newly `public` against it (a `public` class loosens the private-data check as trust loosens taint: `capabilities.ts` counts a read tool as private unless `data_class` is `public`), and persists while the form lives. After a `name_collision` refusal the rows start at default trust, as their effects do. A change of trust, class or tick resets the registration `Idempotency-Key`, as every field does.
7. **Changes.** `valueChangeLines` has its own reader with the digest's defaults, so a tool has a line exactly when `surfaceDiff` names the field (VL7); added and removed tools get none. A `data_class` goes through a copy of `review.ts`'s neutraliser (LF as `↵`, categories Cc, Cf, Co, Cn, Zl, Zp as `?`, cut at 2,000).
8. **Pages.** Both columns follow "Effect"; an excluded row's cells are empty. The Operations tables sit in a `div` with `overflow-x-auto` so the columns never scroll the page. `TrustToggle` has `aria-label` `fillName(trustedOf, key)` and `aria-describedby` the warning paragraph's `useId`; `DataClassSelect` has "Not set" (value `""`), "public", "private". A missing tick is the form alert (`$form`) or the Discovery alert (no new `tools-feedback`). Values come from `prefillTrust` after each Replace preview and from `discoverSettings` of the pending surface on each loaded detail; "Discover tools" posts the approved surface's.

## Interfaces

As in `proposal.md`. Merged shapes: `delivered-shapes.md`.

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

## Failure cases and security

- Keys and tool names are React text, literal in `fillName` and the message (`$&` is not expanded: AK8, AK9); every lookup by one uses `Object.hasOwn` or a `Map` (RG1, DB5). A bad draft value is a `RangeError` before any call.
- A trusted result lifts `L3_TAINT_TO_CONSEQUENTIAL` for the tool (`src/authoring/validate/taint-checks.ts`: any block whose effect is not `read`). So trust is off by default, the warning is fixed text, the tick is per tool, every approval stores submitter, approver and trust (W6) and solo self-approval is unchanged (W3). A new ref follows from the content hash, which holds `untrusted_result` (`src/tools/surface.ts`). No secret, endpoint, action or migration is touched.

## UNVERIFIED

Not run: the `.tsx` edits and the four browser tests; axe and `assert_layout` on the wider table at 1366 (the `overflow-x-auto` wrapper is the guard); `to_have_accessible_description` in Playwright 1.63 (derived: added in 1.44). Engine values come from source and from `importOpenApi` and `mcpSurface` runs, not the routes.

## Decisions made while writing

- **`TRUST_WARNING`** says "On a registered server this change leaves it drifted" (a first registration is pending).
- **Rulings (coordinator):** a renamed OpenAPI tool is not paired (a later fix); a `public` data class needs a tick; the `TRUST_WARNING` wording is accepted.
