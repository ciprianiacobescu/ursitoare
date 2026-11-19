## Provenance

Every value below was run on 2026-11-18 in a scratch copy of main@3daa5c35 holding an implementation of this change (embedded Postgres, `node --test`). With it, all of `web/src`, `test/arch`, `src/identity` and `src/api` plus `src/main.api.test.ts`, `src/main.conventions.test.ts` and `src/main.admin.test.ts` stayed green (836 tests; `test/arch/repo.test.ts` needs a git checkout and passed once the copy was one), and `tsc` for `src` and `web` and `eslint` on the production files and on the four scratch test files were clean. Measured: the size scenario's answer is 65,611 bytes; the document grows from 48 paths and 320,500 bytes to 50 paths and 326,004 bytes.

## Users

Inserted with the app role, one transaction per user: `withTenantTx(db.appPool, ctx, tx => tx.query('INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, email, state) VALUES ($1,$2,$3,$4,$5,$6,$7)', …))` (the app role may insert and the transaction satisfies the row-level policy; a bare `ownerPool.query` does not). The recording transaction of scenario 3 answers `{ rows: [{ t: "tenant_a" }] }` to `SELECT current_setting('app.tenant_id', true) AS t` and `{ rows: [] }` to anything else. `seedTwoTenants(db)` gives `a` (`tenant_a`) and `b` (`tenant_b`).

| Tenant | `user_id` | `display_name` | kind | owner | state | email |
|---|---|---|---|---|---|---|
| A | `u_carol` | Carol Example | human | | active | `carol@example.test` |
| A | `u_dan` | Dan Disabled | human | | disabled | `dan@example.test` |
| A | `svc_ci` | CI bot | service | `u_carol` | active | |
| A | `twin` | Alice Twin | human | | active | |
| B | `twin` | Mallory Twin | human | | active | |
| B | `u_erin` | Erin Other | human | | active | |

Route tests also sign in `alice`, `bob` (tenant A) and `mallory` (tenant B) with `createTestSession(db, ctx, subject, clock)` of `test/support/api-session.ts`; their ids are generated (`usr_…`), so a test names them as `alice.userId` and never writes one in a THEN. Their display names are `alice`, `bob`, `mallory` and their emails null; the size scenario and the privacy assertion set alice's email by `UPDATE ursitoare."user" SET email = 'alice@example.test' …` in a tenant-A transaction.

## Engines and servers

- Allow: `createPolicyEngine({ srcDir: <empty temp dir>, clock, ids: sequentialIds(500), logger })` as `src/api/me.test.ts` does (the platform layer permits `read_self`). Deny: a `PolicyEngine` whose `check` answers `{ decision: "deny", decisionId: "decision-deny", decidedAt, reasons: [], errors: [], policySetVersion: "a".repeat(64) }`, with `actions: []`, `policies: []`, `allowedActions: async () => []`.
- Server: `buildServer({ version: "0.0.0", ids: sequentialIds(100), logger, tracer: noopTracer })`, then `installPep` and `registerPeopleRoutes` (and `registerMeRoute` in the teams test) with `{ pool: db.appPool, engine, clock, publicBaseUrl: "http://127.0.0.1:8080" }`; the null case uses `pool: null, engine: null`. Each test closes the server and the database.
- The deny case runs on its own server and database (the PEP is installed once per server). In `me-teams.test.ts` the disabled-caller case (scenario 7) and the teams case (scenario 8, where bob must be active) each use their own `test` and `withTestDatabase()`.
- Counters: `SELECT count(*) FROM ursitoare.policy_decision WHERE action = 'read_self'` and `SELECT count(*) FROM ursitoare.audit_event`, in a tenant-A `withTenantTx`.

## Route rows (scenarios 4 to 8)

- Refusals (all 400 `VALIDATION_FAILED`; the field is `details.fields[0].field`): no `ids` `querystring/ids` ("must have required property 'ids'"); `ids=`, `ids=a%20b`, `ids=a,,b`, `ids=a%0A`, 65 `x`, 51 ids `n0`…`n50`: `querystring/ids` (the message quotes the pattern); `ids=a&ids=b`: `querystring/ids` ("must be string"); `ids=a&x=1`: `querystring/x`; `tenant_id=tenant_a&ids=u_carol`: `querystring/tenant_id`.
- Size: 50 service accounts (owner `u_carol`) `big00` to `big49`, each followed by 59 `x` (64 characters), display name `"\u0001".repeat(200)`, tenant A (about 3.3 KB of query string); 65,611 bytes measured.
- Teams: in tenant A `INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ('tenant_a','finance'),('tenant_a','audit')`, then `INSERT INTO ursitoare.membership (tenant_id, membership_id, user_id, team_id, source, source_issuer)` rows `('tenant_a','m1', <alice>, 'finance', 'idp_claim', 'https://idp.test')` and `m2` for `audit`; tenant B team `ops` and membership `m3` for mallory; all through the app role in a `withTenantTx`.
- Disabled caller: `UPDATE ursitoare."user" SET state = 'disabled' WHERE tenant_id = $2 AND user_id = $3` for bob, as `me.test.ts` does.

## Parsers (scenario 10)

`parsePeople` valid: `{ items: [{ userId: "u_carol", displayName: "Carol Example", kind: "human" }, { userId: "svc_ci", displayName: "CI bot", kind: "service", email: "x" }] }` gives the two items without `email`; `{ items: [] }` gives `[]`; a name `"\u00a0"` is kept. The 13 malformed, with `good` = `{ userId: "u1", displayName: "A", kind: "human" }`: `null`, `[]`, `{}`, `{ items: "x" }`, `{ items: [null] }`, `good` with `userId` `"a b"`, `""`, or 65 `x`; with `displayName` `""` or `7`; with `kind` `"robot"`; without `kind`; `{ items: [good, { ...good, kind: 1 }] }`.

`parseMyTeams` valid: `{ items: [{ id: "finance" }, { id: "audit" }, { id: "finance" }], next_cursor: null }` gives `["finance", "audit"]`; `{ items: [] }` gives `[]`. The 7 malformed: `null`, `{ items: {} }`, ids `"Finance"`, `""`, 65 `a`, `{}`, `null` as the item.

`personLabel` over `new Map([["u_carol", "  Carol Example "], ["u_b", "   "], ["u_c", ""]])`: `u_carol` `Carol Example`; `u_zed` `u_zed`; `u_b` `u_b`; `u_c` `u_c`.

`loadMyTeams` uses a fake `{ get(path, opts) }` that records `[path, opts]`: no signal `["/me/teams", undefined]`; with `c.signal` `["/me/teams", { signal: c.signal }]`; `[]` for `ApiRequestError(401, "UNAUTHENTICATED", …)`, `ApiRequestError(500, "INTERNAL", …)`, `new TypeError()` and the body `{ items: [{ id: "Bad" }] }`; a thrown `new DOMException("aborted", "AbortError")` rejects with `{ name: "AbortError" }`.

## Cache (scenarios 11 and 12)

The fake is `{ get(path, opts) }` that pushes `{ path, opts }` and answers `{ items: <asked ids> → { userId: id, displayName: "Name " + id, kind: "human" } }`; `idsOf(call)` splits `opts.query.ids` on `,`. Rows:

- 60 ids `u0`…`u59`: calls equal `[{ path: "/people", opts: { query: { ids: "u0,…,u49" } } }, { path: "/people", opts: { query: { ids: "u50,…,u59" } } }]` (no `signal` key); the map has 60 entries in that order; a second resolve adds no call; `peek("u7")` `Name u7`, `peek("zz")` `undefined`.
- `createNameCache(fake, 2)`, `["a","b","c"]`, `signal` from an `AbortController`: the `opts` are `{ query: { ids: "a,b" }, signal }` and `{ query: { ids: "c" }, signal }` (the same signal object).
- Invalid and duplicates: `["b","a b","","x"×65,"a,b","é","ok","b","ghost"]` with an answer that omits `ghost` and adds `{ userId: "u_x", displayName: "X", kind: "human" }`: one call asking `["b","ok","ghost"]`; the map `[["b","Name b"],["ok","Name ok"]]`; `peek("u_x")` `undefined`; a resolve of `["ghost"]` adds no call; `["u_x"]` adds one; `["a b",""]` gives an empty map and no call.
- In flight: `Promise.all([resolve(["a","b"]), resolve(["b","a"])])` makes 1 call; `Promise.all([resolve(["a","b"]), resolve(["b","c"])])` makes 2 (`["a","b"]`, `["c"]`) and the second map's keys are `["b","c"]`.
- Failure rows: the first call throws `ApiRequestError(500, "INTERNAL", …)`, `ApiRequestError(401, "UNAUTHENTICATED", …)`, `new TypeError()` or answers `{ items: [{ userId: "a" }] }`; the second answers `a`: the first resolve gives size 0 and `peek("a")` `undefined`, the second `[["a","Name a"]]`, 2 calls. With 60 ids and the second call failing: 50 names, then 60 with exactly one more call of `u50`…`u59`.
- Abort: a resolve with an already aborted signal rejects `{ name: "AbortError" }` with 0 calls; a fake that rejects `new DOMException("aborted", "AbortError")` when `opts.signal` aborts, aborted after the call started, rejects the same way and `peek("a")` is `undefined`.
- Plain client (scenario 12): set `globalThis.window = { location: { pathname: "/flows", search: "?x=1", assign(url: string) {…} } } as unknown as Window & typeof globalThis` (uncast, the red typecheck fails, TS2740) and `globalThis.fetch` to a stub that records `` `${init.method} ${input}` ``, and restore both in `finally`. A 200 `{ items: [{ userId: "u_carol", displayName: "Carol Example", kind: "human" }] }` gives exactly `GET /api/v1/people?ids=u_carol` and `nameCache.resolve(["u_carol"])` `[["u_carol","Carol Example"]]`. Then the stub answers status 401 with `{ error: { code: "UNAUTHENTICATED", message: "x" } }`: `resolve(["u_bob"])` twice gives an empty map each time and two records `GET /api/v1/people?ids=u_bob`; `loadMyTeams(createApiClient())` gives `[]` and the next record is `GET /api/v1/me/teams`; `assign` was called 0 times. Last, `readFileSync(new URL("people.ts", import.meta.url))` and `use-names.ts` match no `/browser-session|browserSession/` and include `createApiClient(`.

## Test files

| File | Scenarios |
|---|---|
| `src/identity/person-names.test.ts` | 1, 2, 3 (it also asserts `typeof (identity as unknown as Record<string, unknown>).getPersonNames === "function"` through `import * as identity from "./index.ts"`) |
| `src/api/people-routes.test.ts` | 4, 5, 6 |
| `src/api/me-teams.test.ts` | 7, 8 |
| `src/api/people-openapi.test.ts` | 9 (reads `docs/api/openapi.json` with `readFile`; the served text is `servedOpenApiText()` of `test/support/openapi-docs.ts`) |
| `web/src/people/people.test.ts` | 10 |
| `web/src/people/name-cache.test.ts` | 11, 12 |

Each test starts with `assert.equal(typeof <name>, "function")` for the names it imports, wraps calls that reach a stub so its throw fails by assertion, and has no `.`, `[` or `::` in its name. `PEOPLE_MAX_IDS` is never asserted alone: scenario 6 builds its 50 and 51 ids from it.
