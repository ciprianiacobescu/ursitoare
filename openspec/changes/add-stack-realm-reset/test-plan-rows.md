# Test plan (rows): add-stack-realm-reset

Each row ran in the scratch copy (`test-plan.md`). `users` and `callers` are the fixtures there; `overlay` is `stackOverlay(users, callers)`.

## States

**State B** (U58's import, ids as given): groups `g1` `ursitoare-admins`, `g2` `ursitoare-authors`, `g3` `team-default`; organization `o1` `home` with members `["owner"]`; user `u1` `owner` in the three groups; clients `["ursitoare-engine", "ursitoare-mcp"]`.

**Full state:** B plus the groups `g-team-finance`, `g-ursitoare-approvers`; organizations `o-org-a` (`alice`, `bob`, `carol`) and `o-org-b` (`mallory`); users `u-alice` (`ursitoare-authors`, `team-finance`), `u-bob` (`ursitoare-approvers`, `team-finance`), `u-carol` (`ursitoare-admins`), `u-mallory` (`ursitoare-authors`); clients plus `e2e-mcp-caller`, `e2e-plain-caller`.

**State F0** (what `readAdminState` answers on a fresh `startFakeAdmin`): groups `[{ id: "grp-0001", name: "ursitoare-admins" }, { id: "grp-0002", name: "ursitoare-authors" }, { id: "grp-0003", name: "team-default" }]`; organizations `[{ id: "org-0005", alias: "home", members: ["owner"] }]`; users `[{ id: "usr-0004", username: "owner", groups: ["ursitoare-admins", "ursitoare-authors", "team-default"] }]`; clients `["ursitoare-engine", "ursitoare-mcp"]`.

## Plan rows (`overlay-plan.test.ts`; `planOverlay` then `overlayGaps`)

| Row | State | `planOverlay` | `overlayGaps` |
|---|---|---|---|
| P1 | B | ten `POST`s under `/admin/realms/ursitoare/`: `groups` `{ name: "team-finance" }`, `groups` `{ name: "ursitoare-approvers" }`, `organizations` for `org-a` and `org-b` (`{ name, alias, enabled: true, domains: [] }`), `clients` for `e2e-mcp-caller` and `e2e-plain-caller`, `users` for `alice`, `bob`, `carol`, `mallory` (bodies in `test-plan-data.md`) | `group team-finance`, `group ursitoare-approvers`, `organization org-a`, `organization org-b`, `client e2e-mcp-caller`, `client e2e-plain-caller`, `user alice`, `user bob`, `user carol`, `user mallory` |
| P2 | Full | `[]` | `[]` |
| P3 | Full, `o-org-b` members `[]` | `[{ method: "POST", path: "/admin/realms/ursitoare/organizations/o-org-b/members", body: "u-mallory" }]` | `["user mallory in organization org-b"]` |
| P4 | Full, `u-alice` groups `["ursitoare-authors"]` | `[{ method: "PUT", path: "/admin/realms/ursitoare/users/u-alice/groups/g-team-finance", body: null }]` | `["user alice in group team-finance"]` |
| P5 | Full, `u-bob` groups plus `extra` | `[]` | `[]` |
| P6 | B plus `u-alice` (both groups), the two groups and `o-org-a` with members `[]` | `POST` organizations (`org-b`), `POST` clients (two), `POST` users (`bob`, `carol`, `mallory`), then `POST .../organizations/o-org-a/members` with body `"u-alice"` | `organization org-b`, `client e2e-mcp-caller`, `client e2e-plain-caller`, `user alice in organization org-a`, `user bob`, `user carol`, `user mallory` |
| P7 | B, overlay `groups` `[]` and alice with groups `["nope"]` | throws `Error` `group nope is neither in the realm nor in the overlay` | not called |

Every path of P1 matches `^/admin/realms/ursitoare/(groups|organizations|clients|users)(/|$)`.

## Write order (`overlay-admin.test.ts`, first run)

The 14 writes, in order: `POST .../groups` ×2, `.../organizations` ×2, `.../clients` ×2, `.../users` ×4 (rows P1 order); then, in round 2, `POST /admin/realms/ursitoare/organizations/org-0010/members` with the bodies `"usr-0014"`, `"usr-0015"`, `"usr-0016"` and `.../organizations/org-0011/members` with `"usr-0017"`. The 47 requests are round 1 (a token, 6 reads, 10 writes), round 2 (a token, 12 reads, 4 writes), round 3 (a token, 12 reads). The 12 reads, in order: `GET .../groups?first=0&max=1000`, `.../organizations?first=0&max=1000`, `.../organizations/<id>/members?first=0&max=1000` for `org-0005`, `org-0010`, `org-0011`, `.../users?first=0&max=1000&briefRepresentation=true`, `.../users/<id>/groups?briefRepresentation=true` for `usr-0004`, `usr-0014` to `usr-0017`, `.../clients?first=0&max=1000`.

## After the first run (`fake.snapshot()`)

Groups `ursitoare-admins`, `ursitoare-authors`, `team-default`, `team-finance`, `ursitoare-approvers`. Organizations `home` (`owner`), `org-a` (`alice`, `bob`, `carol`), `org-b` (`mallory`). Users: `owner` in the three base groups with `password` null; `alice` (`ursitoare-authors`, `team-finance`), `bob` (`ursitoare-approvers`, `team-finance`), `carol` (`ursitoare-admins`), `mallory` (`ursitoare-authors`), each with the fixture `password`, `email` `<name>@example.invalid`, `firstName` the capitalised name, `lastName` `Example`. Clients: `ursitoare-engine` and `ursitoare-mcp` untouched (`secret` null, `serviceAccounts` false, `standardFlow` true); `e2e-mcp-caller` (its secret, `serviceAccounts` true, `standardFlow` false, `audiences` `["ursitoare-mcp"]`); `e2e-plain-caller` (its secret, same flags, `audiences` `[]`).

## Error rows (`overlay-admin.test.ts`, `applyRealmOverlay`; `rejects` with `Error` and exactly this message)

| Row | Setup | Message | Also |
|---|---|---|---|
| E1 | `adminPassword` `wrong-fixture` | `overlay: the admin token request answered 401` | 1 request recorded |
| E2 | fake with `missingRealm` | `overlay: GET /admin/realms/ursitoare/groups?first=0&max=1000 answered 404` | 2 requests (token, that read) |
| E3 | `failOn` `POST /admin/realms/ursitoare/clients` 500 | `overlay: POST /admin/realms/ursitoare/clients answered 500` | snapshot: no `e2e` client, users `["owner"]`, groups and organizations already created |
| E4 | fake with `hang`, `requestTimeoutMs` 150 | `overlay: the admin token request timed out` | |
| E5 | `adminBaseUrl` `http://127.0.0.1:1` | `overlay: the admin token request could not be sent` | |
| E6 | `fetch` wrapper removing `alice` from the answer of `GET .../users?first=0...` | `overlay: the realm still lacks user alice` | 6 `POST .../users` recorded (four in round 1, `alice` again in rounds 2 and 3, each answered 409) |
| E7 | `fetch` wrapper answering `{}` to `GET .../groups?...` | `overlay: GET /admin/realms/ursitoare/groups?first=0&max=1000 answered a body that is not a list` | |
| E8 | `fetch` wrapper answering 200 `{"x":1}` to the token request | `overlay: the admin token request answered no access token` | |

In every row the message is searched for `ADMIN`, the four passwords and the two secrets: it holds none.
