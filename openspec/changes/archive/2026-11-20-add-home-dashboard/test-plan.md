# Fixtures for the Node tests

Every value was run in a scratch copy of main@3daa5c35 with the in-plan units and this design (Node 24.22.2; 11 tests green). Tests are in `web/src/app/` and import from `./home.ts`; fixtures are typed literals inside each file. `NOW` is `Date.UTC(2026, 10, 18, 12, 0, 0)`, `HASH` is `"sha256:" + "ab".repeat(32)`. A run literal has the 15 keys of `RunView` (`mode` "mock", `trigger` "test", `ownerTeam` "finance", the rest null); a version literal the 10 keys of `VersionRow`; a flow literal `ownerTeam` "finance", `createdBy` `usr_me`.

## T1 `homeView` (`home-rows.test.ts`)

A ready state is `{ status: "ready", me }` with `me.user` `{ id: "usr_me", displayName: "Alice Example", email: null }` and `me.capabilities` `new Set(["read_self", "read_run"])`; the other rows are in the spec.

## T2 `runRows` (`home-rows.test.ts`)

`names` is `Map([["usr_bob", "Bob Example"], ["usr_pad", "   "]])`, `meId` `usr_me`. Ids start `run_01a1eb`; times are 2026-11-18; `+n` is `startedAt` plus n.

| row | id tail | flow | state | user | startedAt | endedAt | createdAt |
|---|---|---|---|---|---|---|---|
| R1 | `72-3179-7000-a94d-6c6eaf5d03ac` | demo-pay | completed | usr_me | 11:56:40Z | +1.4 s | 11:56:35Z |
| R2 | `70-0000-7000-8000-00000000be11` | demo-grants | failed | usr_bob | 09:55:00Z | +75 s | 09:54:50Z |
| R3 | `6f-0000-7000-8000-00000000cafe` | demo-pay | queued | usr_bob | null | null | 2026-11-17T12:00:00Z |
| R4 | `6e-0000-7000-8000-00000000f00d` | demo-pay | running | usr_ghost | 11:59:50Z | null | 11:59:49Z |
| R5 | `6d-0000-7000-8000-00000000d00d` | demo-pay | cancelled | usr_pad | 11:00:00Z | +0.3 s | 10:59:59Z |
| R6, R7 | `6c-…a001`, `6b-…a002` | demo-pay | completed | usr_me | 10:00:00Z, 09:00:00Z | +1 s, +90 min | = startedAt |

Expected: 5 rows (R6, R7 left out), `[shortId, tone, started, exact, duration, by]`: R1 `af5d03ac`, success, "3 min ago", "2026-11-18 11:56 UTC", "1.4 s", "by you"; R2 `0000be11`, danger, "2 h ago", "2026-11-18 09:55 UTC", "1 min 15 s", "by Bob Example"; R3 `0000cafe`, neutral, "1 d ago", "2026-11-17 12:00 UTC", "—", "by Bob Example"; R4 `0000f00d`, info, "just now", "2026-11-18 11:59 UTC", "10.0 s", `null`; R5 `0000d00d`, neutral, "1 h ago", "2026-11-18 11:00 UTC", "<1 s", `null`. `rows[0].href` is `/runs/` plus R1's id, `rows[0].startedIso` `2026-11-18T11:56:40.000000Z`. `recentRunLinkName`: R1's id with `demo-pay` gives `Run af5d03ac of demo-pay`; the id ending `…5d03ad` gives `Run af5d03ad of demo-pay`; `{ id: "r1", flowId: "x-y" }` gives `Run r1 of x-y`.

## T3 `flowRows` (`home-rows.test.ts`)

Input in flow-id order; `latest` is `(number, state, validationOk, createdAt)`:

| row | flow | createdAt | latest |
|---|---|---|---|
| F1 | alpha-flow | 2026-11-14T12:00:00Z | v1 draft, false, 2026-11-14T12:00:00Z |
| F2 | beta-flow | 2026-11-10T12:00:00Z | v1 draft, null, 2026-11-10T12:00:00Z |
| F3 | demo-draft | 2026-11-18T11:55:00Z | null |
| F4 | demo-pay | 2026-11-14T08:00:00Z | v2 validated, true, 2026-11-18T11:00:00Z |
| F5 | gone | 2026-09-01T00:00:00Z | null |
| F6 | old-one | 2026-09-01T00:00:00Z | v3 published, true, 2026-10-01T00:00:00Z |
| F7 | zeta-flow | 2026-11-10T12:00:00Z | null |

Expected `[flowId, version, tone, changed, exact]`: `demo-draft`, "No version yet", neutral, "5 min ago", "2026-11-18 11:55 UTC"; `demo-pay`, "v2 · validated", success, "1 h ago", "2026-11-18 11:00 UTC"; `alpha-flow`, "v1 · has errors", danger, "4 d ago", "2026-11-14 12:00 UTC"; `beta-flow`, "v1 · draft", neutral, "8 d ago", "2026-11-10 12:00 UTC"; `zeta-flow`, "No version yet", neutral, "8 d ago", "2026-11-10 12:00 UTC". `href` is `/flows/<id>`, `rows[0].ownerTeam` "finance", `rows[1].changedIso` `2026-11-18T11:00:00.000000Z`. Also `p-one` (v4 published true, 11:30Z) and `t-one` (v2 tested true, 11:20Z) give `[["v4 · published", "info"], ["v2 · tested", "success"]]`.

## T4 `nextSteps` (`home-steps.test.ts`)

Capabilities: AUTHOR `read_self, read_flow, read_run, read_registry, test_flow, dry_run_flow`; READER the first four; ADMIN `read_self, read_flow, read_run, read_registry, manage_users_roles, read_audit, register_tool_server, approve_tool_surface, deploy_policy, manage_credentials, manage_tenant`; NONE `read_self`. Flows: PAY demo-pay (latest v2 validated true), DRAFT demo-draft (latest null, created 11:55Z), ERR alpha-flow (v1 draft false). Runs: OK `…5d03ac` completed; FAILED `run_01a1eb70-0000-7000-8000-00000000be11` demo-grants failed. Flows facts are `{ items, complete: true }` unless noted; an omitted fact is unknown. Result `[ids] settled`:

| row | capabilities, facts | result |
|---|---|---|
| N1 | AUTHOR, flows [], runs [] | `[create-first-flow]` true: "Create your first flow", `/flows`, "No flow of your teams exists yet. Name one, write it in YAML and validate it.", badge null |
| N2 | AUTHOR, flows [PAY], runs [OK] | `[start-test-run]`: "Start a test run", `/flows/demo-pay`, "demo-pay has a validated version 2. Run it with mocked tools." |
| N3 | AUTHOR, flows [ERR, DRAFT], runs [] | `[open-a-flow]`: `/flows/demo-draft`, "None of your flows has a validated version yet. Open demo-draft to write and validate one." |
| N4 | AUTHOR, flows [DRAFT, PAY], runs [] | `[start-test-run]` at `/flows/demo-pay` |
| N5 | AUTHOR, flows [], runs [OK, FAILED] | `[create-first-flow, review-failed-run]`; the second "Review a failed run" at `/runs/run_01a1eb70-0000-7000-8000-00000000be11`, "Run 0000be11 of demo-grants failed. Open it to see which step stopped and why." |
| N5b | AUTHOR, flows [PAY] with `complete` false, runs [] | `[start-test-run]` |
| N6, N7 | READER, flows [], runs [OK] / [FAILED] | `[]` true / `[review-failed-run]` |
| N8 | READER, runs [OK ×5, FAILED] | `[]` true |
| N9 | READER, flows [], runs unknown | `[]` false |
| N10 | ADMIN, runs [], unassigned {1, true}, servers {2, true}, policy {deployed false, 2} | `[assign-roles, review-pending-tool-servers, deploy-grant-changes]` true; badges "1", "2", "2"; "Give people a role" `/admin/users` "1 active person has no role yet. Assign a role, or map an identity-provider group."; "Review pending tool servers" `/admin/tool-servers` "2 tool servers wait for their surfaces to be approved before flows can call their tools."; "Deploy grant changes" `/admin/policies` "2 grant changes are not deployed, so they are not in force yet." |
| N11 | ADMIN, runs [], unassigned {200, false}, servers {1, true}, policy {true, 1} | "At least 200 active people have no role yet. Assign a role, or map an identity-provider group." ("200+"); "1 tool server waits for its surface to be approved before flows can call its tools." ("1"); "1 grant change is not deployed, so it is not in force yet." ("1") |
| N12 | ADMIN, runs [], unassigned {0, true}, servers {0, true}, policy {false, 0} | `[]` true |
| N13 | ADMIN, runs [], unassigned unknown, servers {3, false}, policy unknown | `[review-pending-tool-servers]` false; "3+"; "At least 3 tool servers wait for their surfaces to be approved before flows can call their tools." |
| N14 | `deploy_policy` only, policy {true, 1} | `[deploy-grant-changes]` true, "1" |
| N15 | ADMIN, runs [], servers {1, false}, unassigned {0, true}, policy {true, 0} | one step: "At least 1 tool server waits for its surface to be approved before flows can call its tools." |
| N16 | NONE, flows [], runs [FAILED], servers {1, true} | `[]` false |
| N17 | AUTHOR, no facts | `[]` false |
| N18 | ADMIN, runs [FAILED] only | `[review-failed-run]` false |

## T5 The link rule (`home-steps.test.ts`)

Steps come from `nextSteps(ADMIN + test_flow, { flows [], runs [FAILED], unassigned {2, true}, servers {2, true}, policy {true, 3} })` (5 steps) and the author calls of N2 and N3. Paths are `"/"` plus the `path` of every row of `ADMIN_PAGES`, `TOOL_PAGES`, `FLOW_PAGES` and `RUN_PAGES`, each `:param` replaced by `[^/]+` in an anchored RegExp; the 10 navigation labels are `Home` plus the nine non-null `navLabel`s.

## T6 Loaders (`home-load.test.ts`)

`fake(answer)` is `{ get(path, opts) }` recording `{ path, query: opts?.query }`; an `Error` answer rejects. `page(items, next = null)` is `{ items, next_cursor: next }`.

| row | loader, answer | result |
|---|---|---|
| L1, L2 | `loadRecentRuns`: R1's JSON and a copy with id `run_2`, next "c1" / `page([])` | 2 runs, one call `{ path: "/runs", query: { limit: 5 } }` / `[]` |
| L3, L4 | `loadFlowSet`: alpha-flow, beta-flow, demo-pay (latest null) / one flow, next "alpha-flow" | 3 flows `complete` true, call `{ path: "/flows", query: { limit: 200 } }` / `complete` false |
| L5, L6 | `loadPendingServers`: states pending, approved, drifted, pending / one pending, next "n" | `{ count: 2, complete: true }`, call `/tool-servers` with `{ limit: 200 }` / `{ count: 1, complete: false }` |
| L7 | `loadUnassigned`: `u1` human active `[]` `[]`; `u2` roles `[author]`; `u3` localRoles `[author]`; `u4` human disabled; `u5` service active; `u6` human active `[]` `[]` | `{ count: 2, complete: true }`, call `/users` with `{ limit: 200 }` |
| L8, L9 | `loadPolicyFact`: `{ current: null, pendingGrants: 2 }` / `{ current: { version: "f" × 64, source: "permit (principal, action, resource);" }, pendingGrants: 0 }` | `{ deployed: false, pendingGrants: 2 }`, call `{ path: "/policies", query: undefined }` / `{ deployed: true, pendingGrants: 0 }` |

Malformed, each rejecting with `ApiRequestError`, `code` `INVALID_RESPONSE`, `status` 200: L10 runs `[{ id: "x" }]`; L11 runs `{ items: "no", next_cursor: null }`; L12 flows `[{ flowId: "Bad Id" }]`; L13 servers `{}`; L14 servers `[7]`; L15 users `[null]`; L16 policy `[]`; L17 policy `{ current: null, pendingGrants: -1 }`; L18 `{ current: "x", pendingGrants: 1 }`; L19 `{ current: null }`. Failing dependency: each loader with a client rejecting `ApiRequestError(500, "INTERNAL", "x")` rejects with that object after one call; `DOMException("aborted", "AbortError")` passes through.

## T7 Source needles (`home-sources.test.ts`)

`HomePage.tsx` contains `homeView(`, `useSession()`, `useDisplayNames(`, `createApiClient()`, `<PageHeader`, `<EmptyState`, `<Skeleton`, `<Tooltip`, `title="Recent runs"`, `title="Recent flows"`, `title="Next steps"`, `what="Recent runs"`, `what="Recent flows"`, `Try again`, `could not be loaded.`, `All runs`, `All flows`, `Check again`, `aria-disabled`, `after:absolute`, `<ArrowRight`, `aria-hidden="true"`, `Shown from the first 200 flows, in name order.`, `Nothing needs your attention right now.` and `Your account has no access to flows or runs yet. Ask an administrator for a role.`; counts `role="status"` 2, `<h1>Ursitoare</h1>` 1, `title="Ursitoare"` 1, `Ursitoare` 2, `className="engine-health"` 1; none of `role="alert"`, `aria-live`, `DataTable`, `ErrorPanel`, `LoadingState`, `browserSession`, `style=`, `outline-none`, `dangerouslySetInnerHTML`; `/(?<!aria-)disabled/` does not match. `10-home.tsx` contains `<HomePage />`, `id: "home"`, `path: "/"`, `navLabel: "Home"`, not `useState`. `home.ts` contains none of `browserSession`, `react`, `document`, `window`, `Date.now(`, `Math.random(`, `new Date(`. The four scanners give `[]` on each. It reads each file as `existsSync(url) ? readFileSync(url, "utf8") : ""`, so the stub of `HomePage.tsx` fails by assertion at red.

## T8 The `/me`-body text

With every `/api/v1/*` answered by alice's `/me` body (`read_self`, `read_flow`, `read_run`), the collapsed `main` text is "Ursitoare Welcome, Alice Example. Engine healthy Recent runs All runs Recent runs could not be loaded. Try again Recent flows All flows Recent flows could not be loaded. Try again".
