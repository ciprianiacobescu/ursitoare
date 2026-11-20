## Context

On main the home page is `Landing` (`web/src/features/10-home.tsx`): the heading "Ursitoare", the health `status` and, when the engine is unavailable, "Check again". D12 and the pins: signed out, the whole `main` text depends only on `/health` (`test_l4_c_87996887.py`). A signed-in person gets, under the same heading and health line, "Recent runs", "Recent flows" and "Next steps". The card's steps were a static table keyed by capability; reading main showed it cannot work (decisions 2, 3).

## Decisions

1. **One page owns health and session.** `HomePage` runs the health effect once (the code of `Landing`) and `useSession()`; `PublicHome` is today's markup (`h1`, `p.engine-health[role=status][tabindex=-1]`, "Check again" with `aria-disabled`). `Dashboard` mounts only for a ready session, so a visitor triggers no list request and the swap does not refetch `/health`. Probed: a signed-in load makes one `/api/v1/me` and one `/health`; the public markup shows during the `/me` round trip.
2. **The author signal is `test_flow`.** Probed `/me` capabilities: alice (author) `dry_run_flow, read_flow, read_registry, read_run, read_self, test_flow`; bob (approver) `read_flow, read_registry, read_run, read_self`; carol (tenant admin) the eleven of test-plan.md T4. `author_flow` and `edit_flow` are in nobody's list: no `.cedar` file permits `author_flow`, and `flows.cedar:1-3` (`src/registry/policy/`) permits `edit_flow` only on a Flow of the person's team, which `allowedActions` never lists. `test_flow` and `dry_run_flow` have tenant permits only for `Role::"author"` (`src/interpreter/policy/flow-testing.cedar:5-6`, `dry-runs.cedar:5-6`). The card's `author_flow` row would show for no one.
3. **A step exists only for a state the page has read** (`nextSteps(capabilities, facts)`; the order and texts are in the spec). A `Fact` is `known` or `unknown` (not asked, loading or failed); unknown adds no step and no all-clear. With `settled` and no step the section reads "Nothing needs your attention right now."; with an unknown fact and no step it is left out; a person whose capabilities ask for nothing (`read_self` only) gets no section. A page of 200 rows with a `next_cursor` makes a count a floor ("At least 200", badge "200+").
4. **Recent flows need a sort.** `GET /flows` orders by flow id (`src/registry/flows/flows.ts:250`), so `limit=5` would show the five alphabetically first; `GET /runs` orders `created_at DESC` (`src/runs/store/run-repository.ts:232`), so 5 is right there. The page reads one page of 200 flows and `recentFlows` sorts by `Date.parse` of `latest.createdAt`, else `createdAt` (ISO strings with 0 to 6 fraction digits do not sort as text), ties by flow id. With a `next_cursor` the note "Shown from the first 200 flows, in name order." appears. A recency order on the route is a new API behaviour: out of scope.
5. **The lists use `createApiClient()`, not `browserSession.api`.** `browserSession.api` wraps `fetch` in `withSessionEnd` (`web/src/auth/session-fetch.ts:47-70`, `session-client.ts:38-41`): a 401 `UNAUTHENTICATED` redirects to `/sign-in?error=SESSION_ENDED`. Probed: the session client leaves `/` and sends a second `/me` (pins `test_m1_web_kit.py:97, 122`, `test_l4_c_f6d2569a.py:52`). A 401 is the one failure "Try again" cannot fix (30-minute idle timeout): the list shows "Your session has ended." and the link "Sign in again" instead, with no redirect. The name cache of `add-people-lookup` also uses the plain client (ruling R5), so a failed name lookup never ends the session.
6. **Markup.** `PageHeader` (`h1` "Ursitoare", the greeting "Welcome, <name>.", the health `status` as a pill in `meta`, same text and `tabindex`) then `Section`s. No `DataTable` (a second `[aria-live="polite"]`; the toast region is the one), `ErrorPanel` (`role="alert"`) or `LoadingState` (`role="status"`): loading is three `Skeleton` bars (`aria-hidden`), a failure a `<p>` and a `Button` "Try again".
   - Run row: `Badge`, one `Link` "Run <id end in `font-mono`> of <flow in `<strong>`>" (its name is `recentRunLinkName`), then "<ago> · <duration> · by <name>"; `<time dateTime tabIndex={0}>` carries a `Tooltip` of the exact UTC minute, which focus also opens, as on the run page (`add-run-view` decision 3). Flow row: `Link`, `Badge`, "<team> · Updated <ago>". Step card: the label is the only link, `text-accent font-semibold`, with a trailing `ArrowRight` from `lucide-react` (`aria-hidden="true"`, `size-4`, so the link's name stays the label) (`after:absolute after:inset-0` makes the card clickable and its name the label alone), a warning `Badge` for the count, the description.
   - Empty states use `EmptyState` level 3 and a primary link: runs "Choose a flow to test" (author) or "Browse flows"; flows "Create a flow" (author) or "Go to flows".
7. **Names (D8).** Own runs read "by you"; other principals come from `useDisplayNames` (probed: one `GET /api/v1/people?ids=user-2`). An unresolved name is left out: the page never shows a raw user id.
8. **Layout (D24).** `grid gap-4 xl:grid-cols-2` with the two sections (`content-start`, so a short list does not centre its rows), then "Next steps" full width; `main` is unbounded. Measured at 1366 by 860 (alice): `main` x 240, 1,126 wide; sections 531 wide at x 264 and 811; "Next steps" 1,078 wide; at 1024 and 800 the sections stack (736 and 768 wide); `scrollWidth` equals `innerWidth` at all three.

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded.

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

## Failure cases and security

A failed request, a non-page body and a refused row each leave that list at "could not be loaded." (a 401: "Your session has ended.") and the page working; an abort is ignored; a failed fact is `unknown`. A queued run shows its `createdAt` time and "—"; a blank name is left out. No endpoint, policy action, table, secret or CSP change: every request is a `GET` the person's capabilities already allow (so none answers 403), API text is React text, and the Tooltip adds no `<style>` (0 CSP messages, hover included).

## Frozen pins checked

- Signed out: one `/health`, `main` text "Ursitoare" plus the health text, one `status`, "Check again" with `aria-disabled` and focus (`test_l4_c_87996887.py`, `test_m0_skeleton.py:91-176`, `test_l4_c_1542e67b.py:38-62`): `Landing`'s markup is kept.
- Signed in: one `[aria-live="polite"]` (the toasts), one `/api/v1/me` per load (`test_m1_web_kit.py:61, 97, 122`, `test_l4_c_f6d2569a.py:52`; decision 5), no "Dismiss" button. Probed on alice: `status` 1, `alert` 0, `[aria-live]` 1.
- `test_l4_c_e3de8f9e.py`: `read_self` only gives "Your account has no access to flows or runs yet. Ask an administrator for a role."; with every call answered by the `/me` body, the failure lines and no crash.
- Nav-name clicks start from `/`: no link or button has an exact navigation label; "Ursitoare" is one `h1`, no link (m0:91, 114, 199); title `Ursitoare` (`test_l4_c_acc8eaf4.py:16`).
- U07b's `test_long_names_truncate_and_never_grow_the_banner` (900 by 800, 60-character name) now renders this dashboard: the greeting wraps through U15d's `.ui-page-header-description` rule.
- `web-shell` "Feature registry": `10-home.tsx` keeps `id: "home"`, `path: "/"`, `navLabel: "Home"`; `test/arch/web-routes.test.ts` ran green. C-d365d748 (no inline style) and the three scanners: `[]` on the three files. No CSS file is touched.

## Verification

**Ran** on a scratch copy with the four in-plan drafts (Node 24.22.2, Playwright 1.63.0): this folder's Node and browser tests inside the whole e2e suite (77 passed), `tsc`, `eslint` and five frozen web tests; screenshots read by eye.

**Not run (UNVERIFIED):** 1280 by 720; Firefox and Safari; screen-reader output; 200 or more flows, servers or users (a Node row only); the real `useDisplayNames` (the scratch used the draft); a root font size other than 16 px.

## Decisions made while writing

Seam deviations from the card: `NEXT_STEPS` and `nextSteps(capabilities): NextStep[]` become `nextSteps(capabilities, facts)` (decisions 2, 3); `NextStep` gains `badge`; `HomeView`'s dashboard member carries `capabilities`, `userId` and `displayName`, not `steps`; `personLabel` is not taken (decision 7); `flowListFetcher` is read with limit 200, not 5 (decision 4); `Depends on` adds `add-app-shell`. `recentRunLinkName`, `HOME_LIMIT` and `HomePage` are as the card gives them.
