## ADDED Requirements

### Requirement: Only a ready session gets the dashboard
`homeView(session)` SHALL answer `{ kind: "public" }` for `null`, `signed_out` and `failed`, and `{ kind: "dashboard", capabilities, userId, displayName }` from `me.capabilities`, `me.user.id` and `me.user.displayName` for a ready session. `HomePage` SHALL render the landing page's markup unchanged for `public`, the dashboard for `dashboard`, and make one health request per load.

#### Scenario: The view follows the session state
- **WHEN** `home-rows.test.ts` calls `homeView` with `null`, `{ status: "signed_out" }`, `{ status: "failed", code: "UNKNOWN_ERROR" }` and a ready state of user `usr_me` "Alice Example" with capabilities `read_self` and `read_run` (test-plan.md T1)
- **THEN** the first three answers deep-equal `{ kind: "public" }`; the fourth has `kind` `"dashboard"`, capabilities `["read_self", "read_run"]`, `userId` `"usr_me"` and `displayName` `"Alice Example"`

#### Scenario: The signed-out home is unchanged
- **WHEN** `test_the_signed_out_home_is_unchanged` answers `/api/v1/me` with 401 and opens `/` at 1366 by 860, then answers every `/api/v1/*` call with alice's `/me` body and opens `/` again
- **THEN** the first `main` text is "Ursitoare Engine healthy" with one `status` and no `region`; the second is the T8 text with 0 `alert`; axe passes on both and the `watch_csp` list is `[]`; `test_l4_c_87996887.py`, `test_m0_skeleton.py` and `test_l4_c_1542e67b.py` pass unchanged

### Requirement: Recent runs show at most five runs with state, flow, time, duration and name
`runRows(runs, ctx)` SHALL return a view for each of the first `HOME_LIMIT` (5) runs in the given order: `href` `/runs/<id>`, `shortId` (the last 8 characters of the id), `state`, `tone` (`runStateTone`), `started`, `startedIso` and `exact` from `startedAt` (else `createdAt`) by `formatAgo` and `formatInstant`, `duration` (`formatDuration(startedAt, endedAt, nowMs)`, `"—"` when `startedAt` is null) and `by`: `"by you"` for `ctx.meId`, `"by <name>"` for a name in `ctx.names` not blank after trimming, else `null`. `recentRunLinkName(run)` SHALL be `Run <last 8 characters of the id> of <flowId>` (the whole id when shorter).

#### Scenario: Seven runs give five rows with distinct link names
- **WHEN** `runRows` gets the runs R1 to R7 of test-plan.md T2 with `nowMs` 2026-11-18T12:00:00Z, `meId` `usr_me` and the names `usr_bob` "Bob Example" and `usr_pad` "   "; `recentRunLinkName` gets `run_01a1eb72-3179-7000-a94d-6c6eaf5d03ac` and `…5d03ad` with `demo-pay`, and `r1` with `x-y`
- **THEN** 5 rows come back with the values of T2 (the first: `af5d03ac`, `completed`, `success`, "3 min ago", "2026-11-18 11:56 UTC", "1.4 s", "by you"; the queued run "1 d ago" and "—"; `usr_ghost` and the blank `usr_pad` give `null`), `runRows([], …)` is `[]`, and the names are `Run af5d03ac of demo-pay`, `Run af5d03ad of demo-pay` and `Run r1 of x-y`

### Requirement: Recent flows are the five changed last
`recentFlows(flows)` SHALL return the `HOME_LIMIT` flows changed last, newest first, where the change instant is `Date.parse` of `latest.createdAt` (else `createdAt`; unparsable counts as 0) and a tie goes to the smaller `flowId`. `flowRows(flows, nowMs)` SHALL map them to `href` `/flows/<id>`, `ownerTeam`, `version` ("No version yet" without a latest version; `v<n> · has errors` with tone `danger` when `validationOk` is false; else `v<n> · <state>` with `versionStateTone`), `changed` (`formatAgo`), `changedIso` and `exact`.

#### Scenario: Seven flows in name order give five by recency
- **WHEN** `flowRows` gets the flows F1 to F7 of test-plan.md T3, in flow-id order as `GET /api/v1/flows` answers, with `nowMs` 2026-11-18T12:00:00Z
- **THEN** the rows are `demo-draft` ("No version yet", "5 min ago"), `demo-pay` ("v2 · validated", `success`, "1 h ago"), `alpha-flow` ("v1 · has errors", `danger`), `beta-flow` and `zeta-flow` (tied at "8 d ago"); `gone` and `old-one` are left out and `recentFlows([])` is `[]`; a published latest version reads "v4 · published" with `info`

### Requirement: Next steps follow the role and the state the API shows
`nextSteps(capabilities, facts)` SHALL return `{ steps, settled }` with, in this order:
- with `test_flow` and known flows: "Create your first flow" (`/flows`) when there is none; else "Start a test run" (`/flows/<id>`) for the flow changed last whose latest version has `validationOk` true; else "Open a flow" (`/flows/<id>`) for the flow changed last;
- with `read_run` and known runs: "Review a failed run" (`/runs/<id>`) for the first `failed` of the first five;
- with `manage_users_roles`: "Give people a role" (`/admin/users`) when the count of active human accounts without a role is above 0;
- with `register_tool_server`: "Review pending tool servers" (`/admin/tool-servers`) when the count of `pending` servers is above 0;
- with `deploy_policy`: "Deploy grant changes" (`/admin/policies`) when `pendingGrants` is above 0.

A step SHALL appear only for a known fact. A count step SHALL carry its count as `badge` (`"<n>+"` and "At least" in the description when the page was not complete). `settled` SHALL be true when at least one capability asked for a fact and every fact asked for is known.

#### Scenario: An author's steps follow her flows and runs
- **WHEN** `nextSteps` gets the author capabilities and the facts of rows N1 to N5b of test-plan.md T4
- **THEN** no flow gives only `create-first-flow` with `settled` true; `demo-pay` validated gives `start-test-run` at `/flows/demo-pay`; two unvalidated flows give `open-a-flow` at `/flows/demo-draft`; a failed run and no flow give `create-first-flow` then `review-failed-run`; the texts are those of T4

#### Scenario: An administrator's steps are the three setup counts
- **WHEN** `nextSteps` gets carol's eleven capabilities and rows N10 to N15
- **THEN** one unassigned person, 2 pending servers and 2 undeployed grants give `assign-roles` (badge "1"), `review-pending-tool-servers` ("2") and `deploy-grant-changes` ("2") in that order with `settled` true; an incomplete 200 gives badge "200+" and "At least"; counts 0 give `[]` with `settled` true

#### Scenario: Nothing is claimed that the page has not read
- **WHEN** `nextSteps` gets the reader capabilities with rows N6 to N9, and rows N13 and N16 to N18
- **THEN** a completed run gives `[]` with `settled` true; a failed run in sixth place gives `[]`; unknown runs give `[]` with `settled` false; with policy and users unknown and 3 servers incomplete an administrator gets only `review-pending-tool-servers` ("3+") with `settled` false; `read_self` alone and an author with no facts give `[]` with `settled` false

### Requirement: Every next step links to a page that exists
Each `NextStep` SHALL have an `href` that matches the `path` of a page of `ADMIN_PAGES`, `TOOL_PAGES`, `FLOW_PAGES` or `RUN_PAGES`, a `label` that is not a navigation label and does not contain "Ursitoare", and a unique `id` and `label`.

#### Scenario: The seven steps link to registered pages
- **WHEN** `home-steps.test.ts` collects the steps of an administrator-author with all five facts (5 steps), of an author with a validated flow and of an author with a draft flow (T5)
- **THEN** the ids are exactly `assign-roles`, `create-first-flow`, `deploy-grant-changes`, `open-a-flow`, `review-failed-run`, `review-pending-tool-servers` and `start-test-run`, with the hrefs `/flows`, `/runs/run_01a1eb70-0000-7000-8000-00000000be11`, `/admin/users`, `/admin/tool-servers`, `/admin/policies`, `/flows/demo-pay` and `/flows/demo-draft`; each href matches a path of the four tables; no label equals one of the 10 navigation labels or contains "Ursitoare"; the 7 labels are distinct

### Requirement: The home loaders read one page each and fail loudly
`loadRecentRuns`, `loadFlowSet`, `loadPendingServers`, `loadUnassigned` and `loadPolicyFact` SHALL each make one `GET` with the caller's signal (`/runs` with `limit` 5; `/flows`, `/tool-servers` and `/users` with `limit` `HOME_PAGE_SIZE`; `/policies` with no query). `loadFlowSet` SHALL report `complete` false when `next_cursor` is a string; the counters SHALL count the `pending` servers and the active humans whose `roles` and `localRoles` are both empty. A client rejection SHALL reject the loader with the same error; a body that is not a page, a refused item, a non-record item, or a policy body with a negative or missing `pendingGrants` or a `current` that is neither null nor an object SHALL reject with `ApiRequestError` code `INVALID_RESPONSE` and status 200.

#### Scenario: The loaders ask one page, count, and fail loudly
- **WHEN** `home-load.test.ts` runs the loaders against a fake client with the answers of rows L1 to L9 of test-plan.md T6, then makes the client reject with `ApiRequestError(500, "INTERNAL", "x")` and with an `AbortError`, then answers the malformed bodies of rows L10 to L19
- **THEN** the calls are `{ path: "/runs", query: { limit: 5 } }`, `/flows`, `/tool-servers` and `/users` with `{ limit: 200 }`, and `{ path: "/policies", query: undefined }`; the results are the rows of T6 (`{ count: 2, complete: true }` for servers and users, `complete` false for a flow page with a cursor, `{ deployed: false, pendingGrants: 2 }`); each loader rejects with the same 500 error object after one call, the abort passes through, and each malformed body rejects with `INVALID_RESPONSE` and status 200

### Requirement: The home page keeps its pins
`HomePage.tsx` SHALL hold exactly two `role="status"` (the signed-out line and the dashboard's health pill, one rendered at a time), one `<h1>Ursitoare</h1>` and none of `role="alert"`, `aria-live`, `DataTable`, `ErrorPanel`, `LoadingState`, `browserSession`, `style=`, `outline-none` or a native `disabled`; it SHALL read its lists with `createApiClient()`. `home.ts` SHALL be pure: no React, `browserSession`, `document`, `window`, `Date.now(`, `Math.random(` or `new Date(`.

#### Scenario: The sources keep the pinned markup
- **WHEN** `home-sources.test.ts` reads `HomePage.tsx`, `10-home.tsx` and `home.ts` (test-plan.md T7)
- **THEN** the needles of T7 are present and absent as listed, `10-home.tsx` renders `<HomePage />` with `id: "home"`, `path: "/"` and `navLabel: "Home"`, and `findInlineStyleUse`, `findPaletteUtilities`, `findCssImports` and `findBannedImports` are `[]` on all three files

### Requirement: The dashboard renders each list and step from its own state
Each list SHALL show three `Skeleton` bars while loading (no `status`), its rows when loaded, an `EmptyState` with a link when empty, and "<Recent runs|Recent flows> could not be loaded." with a "Try again" button when its request failed (for a 401 `UNAUTHENTICATED`: "Your session has ended." and a link "Sign in again" to `/sign-in?error=SESSION_ENDED&return_to=%2F`, no redirect); one list's state SHALL NOT change another list, the health line or the page's `alert`, `status` and `[aria-live]` counts.

#### Scenario: Alice sees her runs, flows and next step
- **WHEN** `test_alice_sees_recent_runs_recent_flows_and_her_next_step` mocks alice's six capabilities, three runs, three flows and `/api/v1/people`, and opens `/` at 1366 by 860
- **THEN** "Recent runs" lists 3 items, the first "completed Run af5d03ac of demo-pay 3 min ago · 1.4 s · by you" and the second "failed Run 0000be11 of demo-grants 2 h ago · 1 min 15 s · by Bob Example"; "Recent flows" lists `demo-draft`, `demo-pay` and `alpha-flow`; "Next steps" links "Start a test run" (`/flows/demo-pay`) and "Review a failed run"; hovering the first time shows "<UTC minute of 200 s ago> UTC"; `status`, `alert` and `[aria-live]` counts are 1, 0, 1; there is one `/api/v1/me` and one `/api/v1/people?ids=user-2` request; layout (`assert_layout(page, 72)`), axe and CSP checks pass (the other texts are in test-plan-browser.md)

#### Scenario: Carol sees setup steps from what the API shows
- **WHEN** `test_carol_sees_setup_steps_from_what_the_api_shows` mocks carol's eleven capabilities, empty runs and flows, three tool servers (2 pending), `{ current: null, pendingGrants: 2 }` and three accounts (one active human without a role), and opens `/`
- **THEN** "Next steps" lists "Give people a role", "Review pending tool servers" and "Deploy grant changes" with the texts of T4 N10 and the hrefs `/admin/users`, `/admin/tool-servers` and `/admin/policies`; "No runs yet" and "No flows yet" show the links "Browse flows" and "Go to flows" (`href` `/flows`); layout, axe and CSP checks pass

#### Scenario: A failing list fails alone and Try again reads it again
- **WHEN** `test_a_failing_list_fails_alone_and_try_again_reads_it_again` answers `/api/v1/runs` with 500 once and then an empty page, and `/api/v1/flows` with `{}`, for alice, and clicks "Try again" in "Recent runs"; then a second page whose runs route answers 401 opens `/`
- **THEN** both "could not be loaded." lines show with 0 `alert`, one `status` "Engine healthy" and no "Next steps" region; after the click "No runs yet" and the link "Choose a flow to test" (`/flows`) show, the flows line stays, the runs route was hit twice, and axe and CSP checks pass; the second page shows "Your session has ended." and "Sign in again", no "Try again" in "Recent runs" and one `/api/v1/me`
