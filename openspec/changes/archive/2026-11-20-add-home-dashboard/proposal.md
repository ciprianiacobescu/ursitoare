## Why

The owner called the web app unusable. After sign-in the home page still says only "Engine healthy". This unit makes the signed-in home page a dashboard: the person's recent runs, recent flows, and next steps that come from the state the API shows for their role. The signed-out page stays as it is (D12): the pinned journeys read its whole `main` text.

Observable result (probed at 1366 by 860 against the offline stack): alice with no data sees "Recent runs" and "Recent flows", each an empty state with a button, and the step "Create your first flow". After she validates and test-runs `demo-pay`, "Recent runs" holds a `completed` "Run 43be4520 of demo-pay" ("just now · <1 s · by you"), "Recent flows" holds `demo-pay` (`v1 · validated`) and `demo-draft`, and the step reads "Start a test run". Carol sees "Review pending tool servers" (badge "1") for the seeded `acme` server, "Deploy grant changes" after two grants, and "Nothing needs your attention right now." after she deploys. Each list loads, fails ("Recent runs could not be loaded." and "Try again") and is empty on its own, with no `alert`. Signed out, `main` holds "Ursitoare" and the health text only.

Batch `m6b-ui` (U15c, U18b, U15d, U07b, U21b, U07c, U28b, U37b, U37c, U52c in plan order; closing unit `add-visual-review`, journey `e2e/test_m6b_ui.py`) delivers M6b: the web app is restyled on Tailwind CSS v4 and Radix primitives with a grouped sidebar, a home page of recent work, a flow workspace, run inputs built from the flow's input schema, a readable run view and people's names instead of ids, with zero CSP violations. This unit's part: the home page of recent runs, recent flows and next steps for a signed-in person. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- New: `web/src/app/home.ts` (the logic), `web/src/app/HomePage.tsx`, the tests `home-rows.test.ts`, `home-steps.test.ts`, `home-load.test.ts` and `home-sources.test.ts` beside them, and `e2e/test_m6b_home.py`.
- Edited, in a named task: `web/src/features/10-home.tsx` (renders `<HomePage />`; `id`, `path`, `navLabel` stay). `Landing` moves into `HomePage.tsx` as the signed-out branch, unchanged.
- Capability `web-shell`: ADDED requirements only; no MODIFIED requirement, no frozen test change.
- No API, error code, migration, part, policy action, dependency, token, stylesheet or CSP change: every request is a read of an existing route (design decision 5).

## Impact

- **Scaffold:** Signature stubs for the interfaces below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded: the edit of `10-home.tsx`, the four test files and `e2e/test_m6b_home.py`. Stubs return empty values (`{ kind: "public" }`, `[]`, `{ steps: [], settled: false }`, zero counts, resolved empty lists), so a red test fails by assertion.
- **Depends on** (merged): `add-web-shell` (U07), `add-web-sign-in` (U16), `add-web-flow-editor` (U28), `add-web-run-timeline` (U37), `add-web-ui-kit` (U15), `add-web-data-kit` (U15b), `add-web-admin` (U21) and `add-web-grants` (U52) (the page tables); for the routes read: `add-flow-registry`, `add-runs-api`, `add-admin-api`, `add-tool-registry`, `add-policy-deploy`. In plan: `add-ui-foundation` (U15c), `restyle-web-kit` (U15d), `add-people-lookup` (U18b) and `add-app-shell` (U07b: its `Shell.tsx` mounts the `TooltipProvider` that `Tooltip` needs).
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

**Interfaces given** (as in design.md § Interfaces)

```ts
// web/src/app/home.ts
import type { ApiClient } from "../api/client.ts";
import type { FlowRow } from "../flows/flows.ts";
import type { CapabilityState } from "../kit/capabilities.ts";
import type { RunView } from "../runs/types.ts";
import type { Tone } from "../ui/tones.ts";
export const HOME_LIMIT = 5;        // rows in "Recent runs" and "Recent flows"
export const HOME_PAGE_SIZE = 200;  // the page size the loaders ask (the API maximum)
export interface NextStep { id: string; label: string; href: string; description: string; badge: string | null }
export type Fact<T> = { kind: "unknown" } | { kind: "known"; value: T };   // unknown: not asked, loading or failed
export interface Counted { count: number; complete: boolean }              // complete: the page had no next_cursor
export interface HomeFacts {
  runs: Fact<readonly RunView[]>; flows: Fact<{ items: readonly FlowRow[]; complete: boolean }>;
  servers: Fact<Counted>; policy: Fact<{ deployed: boolean; pendingGrants: number }>; unassigned: Fact<Counted>;
}
export type HomeView =
  | { kind: "public" }
  | { kind: "dashboard"; capabilities: ReadonlySet<string>; userId: string; displayName: string };
export function homeView(session: CapabilityState | null): HomeView;
export function recentRunLinkName(run: { id: string; flowId: string }): string;   // `Run ${last 8 characters of id} of ${flowId}`
export interface RunRowView {
  id: string; href: string; shortId: string; flowId: string; state: string; tone: Tone;
  started: string; startedIso: string; exact: string; duration: string; by: string | null;
}
export function runRows(runs: readonly RunView[], ctx: { nowMs: number; meId: string; names: ReadonlyMap<string, string> }): RunRowView[];
export function recentFlows(flows: readonly FlowRow[]): FlowRow[];
export interface FlowRowView {
  flowId: string; href: string; ownerTeam: string; version: string; tone: Tone;
  changed: string; changedIso: string; exact: string;
}
export function flowRows(flows: readonly FlowRow[], nowMs: number): FlowRowView[];
export function nextSteps(capabilities: ReadonlySet<string>, facts: HomeFacts): { steps: NextStep[]; settled: boolean };
export function loadRecentRuns(client: Pick<ApiClient, "get">, signal: AbortSignal): Promise<readonly RunView[]>;
export function loadFlowSet(client: Pick<ApiClient, "get">, signal: AbortSignal): Promise<{ items: readonly FlowRow[]; complete: boolean }>;
export function loadPendingServers(client: Pick<ApiClient, "get">, signal: AbortSignal): Promise<Counted>;
export function loadUnassigned(client: Pick<ApiClient, "get">, signal: AbortSignal): Promise<Counted>;
export function loadPolicyFact(client: Pick<ApiClient, "get">, signal: AbortSignal): Promise<{ deployed: boolean; pendingGrants: number }>;
// web/src/app/HomePage.tsx
export function HomePage(): ReactNode;
```

**Interfaces taken:**

- From merged code (shapes in `delivered-shapes.md`): `useSession`, `CapabilityState`, `FlowRow`, `VersionRow`, `RunView`, `flowListFetcher`, `runListFetcher`, `parseCursorPage`, `EmptyState`, `healthView`, `loadEngineHealth`, `createApiClient`, `ApiRequestError`, `ADMIN_PAGES`, `TOOL_PAGES`, `FLOW_PAGES`, `RUN_PAGES`, `findInlineStyleUse`; in Python `assert_accessible`.
- From `add-ui-foundation`: `Badge`, `Skeleton`, `Tooltip`, `Button`, `buttonClasses`, `cn`, `Tone`, `formatAgo`, `formatInstant`, `formatDuration`, `runStateTone`, `versionStateTone`, `findPaletteUtilities`, `findCssImports`, `findBannedImports`, and in `e2e/conftest.py` `watch_csp` and `assert_layout`.
- From `restyle-web-kit`: `Section` (props `title`, `actions`, `className`; a `region` named by its heading) and `PageHeader` (props `title`, `description`, `meta`).
- From `add-people-lookup`: `useDisplayNames`.

## Out of scope

The signed-out page; totals; search and filters; charts; auto-refresh; a new API route (a recency order for `/flows` would be one: design decision 4). Spec: `specs/web-shell/spec.md`; fixtures: `test-plan.md`, `test-plan-browser.md`; decisions: `design.md`. Each Node test begins with `assert.equal(typeof <function>, "function")` for the names it imports from `home.ts` (never an `index.ts`), wraps a call that reaches a stub in `assert.doesNotThrow`, uses `node:assert/strict` and has no `.`, `[` or `::` in its name.
