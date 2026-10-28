# Ursitoare Phase-1 roadmap: milestones, units and dependencies

This is the index of every Phase-1 unit of work. Each unit is one OpenSpec change under `openspec/changes/<id>/`,
implemented test-first by L4 as one pull request. Each milestone is an L4 batch.

Version 3 (2026-10-25), after a consistency check of version 2 (adjudication in the run log). Scope source: the
architecture v0.1-r5 (§13 Phase-1 plan and exit tests 1–23). Owner decisions:
`docs/decisions/0001-repo-and-toolchain.md`.

## How to read this

- **Unit ids** are OpenSpec change ids. `U07`-style numbers exist only on this page.
- **Depends on** lists the units whose code, tables, endpoints, fixtures or files this unit uses or changes. The
  evidence for each edge is in the unit's `proposal.md` (Impact). An edge never points to a later milestone.
- **Closing unit:** the last row of each milestone depends on every other unit of its milestone, so it runs last and
  its own verification runs the browser e2e suite on a tree that holds the whole milestone.
- **Independently testable:** every unit's tests run in the L4 gates against merged predecessors only, with embedded
  Postgres and the fakes of `test/support/`. No unit needs Docker, a secret, the network or a person in its gates.
  Evidence that only real services or a person can give is listed per milestone under "Outside L4".
- **Status:** `planned` (listed here), `drafted` (spec written), `reviewed` (passed the four-lens spec review),
  `ready` (passed `openspec validate --strict`, the plan validator and the L4 readiness review).

## Milestones

| M | Outcome a person can see | Units | Browser journey (fake profile) | Outside L4 |
|---|---|---|---|---|
| M0 | The engine serves the web app and reports a migrated database; supply-chain and architecture rules guard every later change | U01–U07 | `test_m0_skeleton.py` | — |
| M1 | A user signs in through OIDC into their tenant; every API call is authenticated, policy-checked and, when refused, audited | U08–U16 | `test_m1_sign_in.py` | — |
| M2 | An admin manages roles, teams and IdP group mappings and reads a verified audit log; the first admin is bootstrapped | U17–U21 | `test_m2_admin.py` | — |
| M3 | An author creates a flow from YAML, sees diagnostics and a read-only graph, and saves validated versions | U22–U29 | `test_m3_authoring.py` | — |
| M4 | An author test-runs a validated flow with mocked tools and follows each step on the run timeline; runs survive a kill | U30–U37 | `test_m4_runs.py` | — |
| M5 | Flows with pure `code` nodes and pre/post hooks run durably; hook routes into effect nodes are rejected | U38–U44 | `test_m5_code_hooks.py` | — |
| M6 | Admins register tool servers and grant tools per role and step; an attended dry run reads through the broker with a one-step token and shows each effect's permit while stubbing it | U45–U52 | `test_m6_grants.py` | — |
| M7 | An admin adds an HTTP/OpenAPI, MCP or code-block tool, approves its surface and stores its credential; a flow calls it (F9) | U53–U56 | `test_m7_tools.py` | — |
| M8 | `docker compose up` runs the six-container hobbyist stack; every journey so far passes against real Keycloak and Mintkey | U57–U61 | all so far | **first stack run**: journeys, contract suites against the real services, exit tests 10 (runtime), 12, 19 |
| M9 | The RF-1 core flow runs with LLM extract and decide nodes, every call journaled and costed; a `pay` whose amount an LLM extracted is refused when no approval is on the path, with the reason shown | U62–U70 | `test_m9_llm.py` | stack run; exit 11 at the concurrency the broker allows |
| M10 | An author describes a flow and the LLM author drafts it with a capped repair loop; approved-fact context reaches LLM nodes | U71–U73 | `test_m10_assist.py` | stack run |
| M11 | A reviewed flow is published with `run_as`, started by a signed webhook, paused on an approval decided in the inbox, and then pays; a hobbyist completes first-run setup (F1, F8) | U74–U81 | `test_m11_publish.py`, `test_m11_solo.py`, `test_m11_first_run.py` | stack run (solo profile, the hobbyist default) |
| M12 | Pinned subflows, bounded `foreach` with one effect per item, and delegation to n8n; the full RF-1 runs; the integrated recovery suite passes | U82–U87 | `test_m12_composition.py` | stack run |
| M13 | `agent` nodes run a bounded loop under grants and taint; published flows are MCP tools for authorised MCP callers | U88–U90 | `test_m13_agents_mcp.py` | stack run; MCP client onboarding |
| M14 | Authors diff versions with flagged authority changes, fork runs without re-firing effects, and gate profiles with code-graded evals (F2, F3, F4) | U91–U95 | `test_m14_change.py` | stack run; exit 17 authoring eval with real models (person, reported) |
| M15 | Release readiness: observability, retention, the two-tenant sweep, SBOM and NOTICE, the load and footprint harness | U96–U100 | full suite | full stack run; exits 9 and 10 on the 2 CPU / 4 GB Linux host (person); exit 20 image SBOM |

Milestones run in order (each plan batch depends on the previous batch). Inside a milestone, units run in the
order of their edges, one at a time.

## Milestone protocol (smoke and end-to-end)

1. **Every unit (L4):** setup, build, lint, typecheck, unit and integration tests on embedded Postgres, and the whole
   browser e2e suite against the offline e2e stack (L4 runs the e2e gate in every unit's verification). Units that
   change `web/**` also get L4's generated browser checks.
   - Every task adds at least one Node test; a browser journey goes in a task that also adds Node tests (L4's red step
     runs only the test gate).
2. **Every merge to `main`:** `.github/workflows/e2e.yml` runs the browser suite on the merged tip (owner-owned).
3. **Every milestone (L4 batch acceptance, profile `milestone`):** build, lint, typecheck and test on the merged tip.
   L4 refuses an acceptance profile that lists e2e while the e2e gate serves an app, so the browser proof per
   milestone is step 1 in the closing unit plus step 2.
4. **Every milestone from M8 (outside L4):** `scripts/stack-e2e.sh` runs the same journeys with `E2E_PROFILE=stack`
   against the real compose stack, the contract suites of the fakes against the real services, and the milestone's
   "Outside L4" items. The result goes into the run log before the next plan is activated.
5. **Before activating a milestone's plan:** refresh its specs against the merged code of the previous milestone (names,
   signatures, files), then re-run `openspec validate --strict`, the plan validator and the L4 readiness review. Until
   L4 admits TypeScript stubs in red (`docs/decisions/0002`), a person also commits the milestone's signature-only
   scaffold, generated from its specs' Interfaces sections.
6. A milestone that fails stops the plan (`batch_failed`); the fix is feedback on the unit that broke it, or a new unit.

## Cross-cutting rules every spec follows

- **Security from the first unit:** every endpoint declares its authentication kind and PEP action (U13); every table is
  tenant-leading with forced RLS, or is on U03's closed allowlist of global routing tables; lookups before the tenant is
  known use U03's resolver and nothing else; every tool, LLM and delegate call is permit-first through the gateway
  (U50); only `src/identity` (OIDC) and `src/observability` (OTLP) make other outbound calls, and the architecture tests
  (U04) enforce it from M0; refusals are audited in their own transaction.
- **No real effect before publish.** Mocked test runs (U35) and attended dry runs (U51) never perform a `write`,
  `send` or `pay` effect; they evaluate and record its permit. Only published versions run live (U77).
- **External inputs are untrusted by default:** documents, tool and MCP results, webhook bodies (U78) and MCP caller
  arguments (U89) carry the `untrusted` label.
- **Shared files have one extension point.** The e2e stack grows only through part files under
  `test/support/e2e-stack/parts/`, discovered from the directory and started in file-name order (`10-database.ts`,
  `20-web.ts`, `25-oidc.ts`, and so on), so adding a part edits no shared file (U06). A part's code is
  `test/support/e2e-stack/<name>-part.ts`; the part file is a one-line re-export created with it, never a stub. The parts are the one boot recipe:
  a part returns the env and `*_FILE` paths the engine needs, and the crash harness (U32) boots its child engines from
  the same parts. The web app grows through feature files `web/src/features/NN-<name>.tsx` collected by `registerFeature` (U07) and `stepRenderers` (U37); the interpreter through
  `registerNodeRuntime` (U33); policy through per-module fragments `src/<module>/policy/*.cedar` (U11b); the CLI through
  its command registry (U20), where a unit adding CLI commands edits `src/cli/builtin.ts` in a named task
  (`registry.registerCommand(name, command)`) and two such units in one milestone need a depends_on edge; architecture rules are added as `test/arch/<rule>.ts` with its test (U04's `Violation` with an `ARCH_*` code); the module graph lives in `test/arch/modules.ts` (U04); a unit that needs a new module or
  edge changes it in its red step and says why in its design. A unit that changes what the engine needs at boot, or what
  journeys need seeded, names the part file it adds.
- **Testability:** every requirement has scenarios for success, bad input, absence and dependency failure; time and
  ids are injected (DBOS timers are the stated exception: about 1 s with tolerance-bounded assertions); no sleeps.
  Logic lives in `.ts` modules that the Node test runner can run; `.tsx` stays thin and is proved in the browser.
- **Usability:** every UI unit states keyboard and screen-reader behaviour, empty, loading and error states, uses
  U15's kit and messages, and passes `assert_accessible(page)` in its journey. Every list endpoint uses U14's cursor
  contract; every error code is in U14's registry; every create endpoint honours `Idempotency-Key`.
- **Partition-ready:** tables that architecture §6 partitions are created partitioned, with the partition column in
  their key, plus a DEFAULT partition, by the unit that creates them. U02's `ensurePartitions(ownerPool, clock)` runs
  after `migrate` at boot as the owner role: it finds every partitioned table of schema `ursitoare` from the catalog
  (granularity from the table comment `partition: day|month`) and creates partitions for a window around the clock. Each
  creating unit tests an insert at `fixedClock` dates outside the current month. The app role has privileges on the
  parent only, never on a leaf partition (U03's catalog test). U97 moves rows out of the DEFAULT partition when it
  creates a range partition.
- **Origins:** one validator, `validateOrigin(url, { local })` (U47), checks every tool-server, provider (U63) and
  delegate (U84) origin: https by default; an admin-flagged local origin may use http and RFC 1918, ULA or host-gateway
  addresses; never loopback, link-local or metadata addresses, nor the stack's own service names (broker, vault,
  postgres, keycloak, engine). Fakes are reached by names under the reserved `fake.test` domain: fake-egress maps them
  to loopback upstreams, and the stack's fakes container carries them as network aliases.
- **Capabilities:** a unit that extends a capability another change created writes ADDED requirements only (never
  MODIFIED or REMOVED) and does not contradict the earlier requirements.
- **Journeys seed through fixtures:** every journey uses `fresh_state` and the seed fixtures of `e2e/conftest.py`, never
  inline seeding, so the stack profile (U61b) changes the fixtures, not the journeys.
- **Migrations:** each unit that changes the schema adds one file `src/db/migrations/NNNN_<topic>.sql`. U02 owns
  `0001_base.sql` and U03 `0002_tenancy.sql`; from M1 a unit's version is 10 × its unit number, plus 5 for a `b` suffix and
  6 for `c` (U08 `0080_audit.sql`, U11b `0115_<topic>.sql`). Versions are unique, gaps are allowed, pending files apply in
  ascending order. Only `prepareDatabase` (U02: migrate, then ensurePartitions) applies them: the test global setup, the
  e2e database part, and the one-shot owner job (U59). The engine process never holds the owner credentials.
- **Public repository:** no secret, and no description of an unfixed vulnerability in any dependency, in any spec.

## Unit catalogue

**Cap** is the OpenSpec capability (`openspec/specs/<cap>/`); **Module** is the top-level `src/<module>` directory the
unit owns or adds code to (sub-directories are internal; — for none). **Seed** is the `seed/` subtree the unit ports.
All units start as `planned`.

### M0 Walking skeleton

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U01 | `add-engine-skeleton` | `engine-runtime`, `engine-config` | `core`, `config`, `observability`, `api` | `src/config`, `src/core`, `src/observability`, `src/api`: typed config from env and `*_FILE` secrets (an empty secret file refuses start), the engine key file, a redacting logger, `Clock`, `IdSource`, a no-op `Tracer` port, `buildServer` with the error envelope and request ids, the health-check registry (`/health` stays 200 and `ok` while every registered check passes), graceful shutdown. Replaces the bootstrap `src/main.ts` and `src/health.ts`; keeps `startServer(port, host)` | — | — | — | planned |
| U02 | `add-db-foundation` | `database`, `test-database` | `db` | `src/db`: `pg` pool, forward-only migrations with checksums and an advisory lock, roles `ursitoare_owner` and `ursitoare_app` (not superuser, no `BYPASSRLS`, owns nothing), a `db` health check registered only when a database is configured; `test/support/global-setup.ts` (embedded Postgres 18.4) and `test/support/pg.ts` (`withTestDatabase` with owner and app pools); `ensurePartitions(ownerPool, clock)` (cross-cutting rule); `.sql` migrations ship as source (the engine runs from source) | U01 | — | — | planned |
| U03 | `add-tenancy-foundation` | `tenancy`, `tenancy-catalog` | `tenancy` | `src/tenancy`: `tenant` (with `review_profile`, default `solo`), `TenantContext`, `withTenantTx`, `ensureDefaultTenant`; the global routing pattern (`tenant_route(kind, key_hash)`, SECURITY DEFINER `register_tenant_route` and `resolve_tenant`, `resolveTenantBy(pool, kind, key)`); a catalog test over schema `ursitoare` with a closed allowlist (`tenant`, `schema_migration`, `tenant_route`) and runtime-role assertions; `test/support/tenants.ts`; SECURITY DEFINER `unregister_tenant_route(p_kind, p_key_hash)` for expiring keys; the catalog test also checks that the app role has no privilege on any leaf partition | U02 | 18 (foundation) | — | planned |
| U04 | `add-architecture-fitness` | `architecture-rules`, `architecture-require-forms`, `architecture-tree-blockers` | — | `test/arch/`: the complete Phase-1 module graph in `modules.ts`, copied from the appendix 'Module graph' of this roadmap, import rules, the network rule (outbound APIs only in `src/gateway`, `src/identity` for OIDC and `src/observability` for OTLP), no `seed/` import, no `src`→`test` import, no `console`, `process.env` only in `src/config`, a secret-pattern scan of tracked files | U01 | 6 (foundation) | — | planned |
| U05 | `add-supply-chain-gate` | `supply-chain`, `install-time-code` | — | `test/arch/licences.test.ts`: every installed npm and Python dependency has an allowlisted licence; every `package.json` pins exact versions; `onlyBuiltDependencies` equals the reviewed list | — | 20 (lockfiles) | — | planned |
| U06 | `add-e2e-stack` | `e2e-stack` | — | `test/support/e2e-stack/`: `startE2eStack`, parts discovered from `parts/` in file-name order, each returning the env and `*_FILE` paths the engine needs, embedded Postgres, migrations, the tenant row, throwaway engine key and secret files; a loopback-only control listener (`POST /reset`, `POST /faults`) that the engine never has (arch test); `fresh_state` fixture in `e2e/conftest.py` | U01, U02, U03, U04 | — | — | planned |
| U07 | `add-web-shell` | `web-shell` | `api`, `web` | `web/src/app`: shell with landmarks, `registerFeature` route and nav registry, landing page with engine health, `ApiClient` for `/api/v1`; the engine serves `web/dist` for GET outside `/api` (unknown `/api/*` → 404 envelope) with exact security headers (CSP without `unsafe-inline`/`unsafe-eval` in `script-src`); journey `test_m0_skeleton.py`. **Closing** | U01–U06 | — | — | planned |

### M1 Sign-in and the policy core

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U08 | `add-audit-chain` | `audit` | `audit` | `src/audit`: `audit_event` partitioned by month, gapless `seq` through a per-tenant head row, one `canonicalize()` for writer and verifier, `appendAudit` and `appendAuditCommitted` (own transaction, for refusals), `verifyChain`, head anchors HMAC-signed with the engine key; the app role may only INSERT and SELECT (trigger rejects UPDATE); property test | U03 | — | — | planned |
| U09 | `add-fake-oidc` | `test-fake-oidc` | — | `test/support/fake-oidc/`: discovery, JWKS, accessible login form, code with PKCE, token, userinfo, end-session; organisations A and B; users alice (groups `ursitoare-authors`, `team-finance`), bob (`ursitoare-approvers`, `team-finance`), carol (`ursitoare-admins`), mallory (B; `ursitoare-authors`); clients `ursitoare-engine` and `ursitoare-mcp` (audience); a minting helper for bad tokens (aud, iss, alg, exp, nonce, two organisations); contract suite against a base URL | — | 19 (fixture) | `deploy/keycloak-footprint` | planned |
| U10 | `add-identity-model` | `identity` | `identity` | `src/identity`: `user`, `idp_link`, `tenant_idp` (resolved through route kind `idp`), `resolveTenantForToken(issuer, organizationClaim)` refusing unknown issuers and ambiguous organisations, `upsertUserFromClaims`; two-tenant tests; `idp` routes are registered only by provisioning code on the owner pool, never from a request; route kind `idp` is reserved: `register_tenant_route` refuses it unless the owner role calls it (U03), and this unit provisions through the owner pool | U03 | 18 | — | planned |
| U11 | `add-pdp-cedar` | `policy-engine` | `pdp` | `src/pdp`: port the Cedar engine; `PolicyRequest`, `Decision`, `Permit`; slices over 24 entities are an evaluation error, so deny; strict validation; `policy_set_version`; `policy_decision` partitioned by month; `createPdp`, `Pdp.check` | U03 | 6 (deny on error) | `policy-cedar` | planned |
| U11b | `add-policy-catalogue` | `policy-catalogue` | `pdp` | The Phase-1 action catalogue (§9.2, plus `manage_tenant`) with a typed context per action; the platform layer loaded from code by `@id` (cross-tenant forbid, untrusted-egress forbid covering write, send and pay, agent-consequential forbid) and an empty tenant layer; per-module policy fragments `src/<module>/policy/*.cedar`; `Pdp.allowedActions(principal, actions)` | U11 | 18 | `policy-cedar/policies` | planned |
| U12 | `add-oidc-login` | `identity-authn` | `identity` | `src/identity/oidc`: relying party (code, PKCE, state, nonce), `/auth/oidc/login`, `/callback`, `/logout`; server-side sessions found through route kind `session`; `HttpOnly`, `SameSite=Lax` cookie; CSRF token issued; refusals audited in their own transaction; e2e stack part `parts/25-oidc.ts`; sessions unregistered on logout and expiry through `unregister_tenant_route`; route kind `session` is registered from the app role; the login and callback routes are raw until U13 classifies them | U06, U08, U09, U10 | — | — | planned |
| U13 | `add-api-pep` | `api-authz` | `api` | `src/api`: `defineRoute` with the authentication union (`session`, `bearer(audience)`, `hmac(kind)`, `service_token`, `public(health \| oidc \| static \| well_known)`; unwired kinds refuse), `buildInternalServer`, resource loaders and the list-filter contract, CSRF and Origin enforced on non-GET session routes, 401 and 403 envelopes with the decision id (403s audited), a coverage test over every listener, `GET /api/v1/me` with capabilities | U07, U11b, U12 | 6 | — | planned |
| U14 | `add-api-conventions` | `api-conventions` | `api` | `src/api`: the cursor pagination contract, the error-code registry `error-codes.ts` with a test that every boundary code is registered, `Idempotency-Key` handling, `/api/v1/openapi.json` generated from route schemas with a committed copy and a drift test, a test that SPA routes and API routes never collide | U13 | — | — | planned |
| U15 | `add-web-ui-kit` | `web-kit` | `web` | `web/src/kit`: tokens and theme, capability filtering of U07's nav registry from `/me.capabilities`, Empty, Loading and Error panels using one `messages.ts` (decision id on 403), ConfirmDialog, live-region toasts; `assert_accessible(page)` (axe-core, offline) in `e2e/conftest.py`; adds `assert_accessible(page)` to `e2e/test_m0_skeleton.py` and every later journey | U07, U13 | — | — | planned |
| U15b | `add-web-data-kit` | `web-data-kit` | `web` | `web/src/kit`: DataTable on the cursor contract, Form and Field mapping envelope details, a JSON-Schema form renderer (`SchemaForm`) | U14, U15 | — | — | planned |
| U16 | `add-web-sign-in` | `web-auth` | `web` | Sign-in and sign-out, session expiry, user and tenant in the header, the CSRF header in `ApiClient`; `login(page, user)` in `e2e/conftest.py`; tenant B with mallory is seeded by its part `parts/27-tenant-b.ts`; journey `test_m1_sign_in.py` (tenant A and B isolation, 401 without a session). **Closing** | U08–U15 | — | — | planned |

### M2 Users, roles and the audit log

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U17 | `add-roles-and-memberships` | `identity-rbac` | `identity`, `api` | `role`, `team`, `membership`, `idp_group_map`; default roles at tenant bootstrap (`tenant_admin`, `author`, `approver`, `auditor`); the configured bootstrap admin group (default `ursitoare-admins`) mapped once, audited; token groups become memberships at sign-in; roles and teams as Cedar parents; memberships come from mapped IdP groups; a direct role grant exists only for service accounts (U18) and through the audited break-glass `grant-role` (U20); no self-elevation; e2e part `parts/30-rbac.ts` seeds the group mappings (`ursitoare-authors` → `author`, `ursitoare-approvers` → `approver`, `team-finance` → team `finance`) in tenants A and B | U10, U11b, U12 | 18 | — | planned |
| U18 | `add-admin-api` | `admin-api` | `api`, `identity` | `/api/v1/users`, `/service-accounts`, `/roles`, `/teams`, `/idp-group-map`, `/users/{id}/idp-links` under `manage_users_roles`; an audit event per action; `PUT /api/v1/tenant/review-profile` under `manage_tenant`, audited, returning a warning when a solo tenant has two or more human members | U08, U13, U14, U17 | — | — | planned |
| U19 | `add-audit-api` | `audit-api`, `audit-verification` | `api`, `audit`, `pdp` | `GET /api/v1/audit`, `/audit/verify`, `/policy-decisions` under `read_audit` | U08, U11b, U13, U14, U18 | — | — | planned |
| U20 | `add-admin-cli` | `ops-cli` | `cli`, `config` | `src/cli`: `ursitoare admin` with a command registry: `bootstrap-admin --group`, `grant-role`, `revoke-role`, `verify-audit`, `list-users`; owner-role connection only here; every command audited; the registry also holds top-level commands that need no database (`ursitoare init-secrets`) | U08, U17 | — | — | planned |
| U21 | `add-web-admin` | `web-admin` | `web` | Users, roles, teams, group mappings, the audit log with its verification status; journey `test_m2_admin.py` (carol maps a group; alice sees a 403 page with the decision id). **Closing** | U15–U20 | — | — | planned |

### M3 Flow authoring

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U22 | `add-flow-format-model` | `flow-format` | `authoring` | `src/authoring/format`: format v0 types with the v0.2 fields (`hooks`, `profile`, `skills`, `context`, `expose`), the full `Catalogue` interface (see Shared interfaces), safe YAML parsing (size, depth, alias limits), canonical JSON and `contentHash()`, the `${{ }}` reference parser; `docs/authoring/format.md` | — | — | `format/src` (types, io, canonical, refs) | planned |
| U23 | `add-taint-static` | `taint` | `authoring` | `src/authoring/taint`: the §8.7 algebra (labels, joins; `code` takes the union; `llm.extract` output is `extracted`), static propagation over the graph, `flowCapabilities(flow, catalogue)` (`reads_untrusted`, `reads_private`, `has_send_or_pay`) | U22 | 4 (foundation) | `policy-cedar/src/extractor.ts` | planned |
| U24 | `add-test-catalogue` | `test-catalogue` | — | `test/support/catalogue/`: the 20 mock blocks, RF-1, `rf-1-core` (no delegate; `pay → done`), `rf-1-core-approval`, and `test/support/hook-flows/`; a typed loader implementing `Catalogue`; `rf-1-core-approval` uses U17's default role `approver` (the seed's `finance-approver` is renamed) | U17, U22 | — | `shared/catalogue`, `shared/flows`, `node-hooks/flows` | planned |
| U25 | `add-flow-validator` | `flow-validation` | `authoring`, `cli` | `src/authoring/validate`: port L1–L3 onto `add-taint-static` (the seed's own lattice and its `code` relabelling are dropped), 47 error and 5 warning codes, the diagnostic shape, a generated `docs/authoring/diagnostics.md` with a test that every code is documented, `ursitoare flow validate <file>` | U20, U22, U23, U24 | — | `format/src`, `format/test` | planned |
| U26 | `add-block-registry` | `registry-blocks` | `registry` | `src/registry`: immutable block versions (schemas, `effect`, `data_class`, `untrusted_fields`, `untrusted_result`, `unsafe_to_retry`, an optional `binding`), `RegistryCatalogue`, audited catalogue import, `GET /api/v1/blocks`; `RegistryCatalogue` fills `block` and `role` (from U17's roles) | U03, U08, U13, U14, U17, U25 | — | — | planned |
| U27 | `add-flow-registry` | `flow-registry` | `registry` | `src/registry/flows`: `flow` (owner team) and `flow_version` (content hash per tenant; draft and validated; `author`, `requested_by`); create, validate, versions, reads; `edit_flow` and `read_flow` scoped to the owner team; audit | U08, U13, U14, U17, U25, U26 | — | — | planned |
| U28 | `add-web-flow-editor` | `web-flow-editor` | `web` | Flow list, a CodeMirror 6 YAML editor compatible with the CSP, diagnostics linking to the docs anchors, saving versions; stack part `parts/35-catalogue.ts` seeds the test blocks | U15, U16, U27 | — | — | planned |
| U29 | `add-web-flow-graph` | `web-flow-graph` | `web` | A pure layout function (tested), SVG with an accessible node list, a node detail panel; journey `test_m3_authoring.py`. **Closing** | U22–U28 | — | — | planned |

### M4 Runs, durability and the timeline

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U30 | `add-dbos-runtime` | `durable-runtime` | `durable` | `src/durable`: DBOS 5.3.0 on the same Postgres, constant `applicationVersion`, the `runs` WorkflowQueue, the role DBOS connects as (tested), RLS honoured inside DBOS steps, a guard that only the runtime and run-data repositories touch `dbos.*`; stack part `parts/40-durable.ts` | U02, U03, U04, U06 | — | `core-dbos/src` | planned |
| U31 | `add-envelope-store` | `run-data` | `runs` | `src/runs/store`: `run`, `step_execution` partitioned by day (key includes the day), content-addressed `envelope_payload`, `event` partitioned by month; repositories with tenant checks | U03 | — | — | planned |
| U32 | `add-crash-harness` | `test-crash-harness` | `config` | `test/support/crash/`: `spawnEngine({ faultPoints })` booting child engines from the e2e stack's parts, `kill()`, `restart()`, `withDedicatedCluster()`; a `FaultPoints` port in `src/config` that production config cannot enable (arch test); child engines boot from the e2e stack's `discoverParts()` | U01, U02, U06, U30 | 1, 2 (harness) | `shared/harness` | planned |
| U33 | `add-interpreter-core` | `interpreter` | `interpreter` | `src/interpreter`: the node visit structure of the hooks spike (hook lists empty), `registerNodeRuntime(kind, runtime)` with a conformance kit, kinds `switch`, `wait`, `end` and `block` through `ToolInvoker`, the run's `EffectMode` (`live`, `mock`, `stub`), reference resolution, step records; starts only by registry id and hash | U22, U24, U27, U30, U31 | 1 (part) | `node-hooks/src/interpreter.ts`, `core-dbos/src` | planned |
| U34 | `add-effect-intents` | `idempotency` | `runs` | `src/runs/intents`: run lineage, `idem_key = lineage:node:effect_seq`, `effect_intent` before every consequential call; a kill between intent and done gives one effect | U31, U32, U33 | 2 (RT-8 foundation), 3 | — | planned |
| U35 | `add-mock-test-runs` | `flow-testing` | `api`, `interpreter`, `cli` | `POST /api/v1/flows/{id}/versions/{hash}/test`: mock mode, every effectful node mocked or the test fails, never egresses; `test_flow` scoped to the owner team; `ursitoare flow test <file>` | U13, U14, U20, U27, U33, U34 | — | `shared/harness` | planned |
| U36 | `add-runs-api` | `runs-api` | `api`, `runs` | `GET /api/v1/runs` (filtered by `read_run`), `GET /runs/{id}`, steps, payloads, `POST /runs/{id}/cancel` (`debug_run`); `read_run` scoped to the owner team and the run principal | U13, U14, U31, U33 | — | — | planned |
| U37 | `add-web-run-timeline` | `web-runs` | `web` | Run list and the timeline with a `stepRenderers` registry, inputs and outputs, outcomes, decision links, polling; "Test run" with a mocks editor; journey `test_m4_runs.py`. **Closing** | U29, U30–U36 | — | — | planned |

### M5 Code nodes and hooks

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U38 | `add-code-sandbox` | `sandbox` | `sandbox` | `src/sandbox`: the hardened `WorkerSandbox` (QuickJS-in-Wasm workers with `env: {}`, memory ceilings per bucket, stack clamp, hard kill at timeout + 250 ms, typed non-retryable faults, pool sizing); the escape suite; an arch rule that `src/sandbox` imports no host I/O module other than `node:worker_threads` | U01 | 15 | `sandbox-quickjs` | planned |
| U39 | `add-code-node-runtime` | `node-code` | `runtimes` | `code` nodes inside their DBOS step, pure; sandbox faults not retried; memory and recursion bombs contained; conformance kit | U32, U33, U38 | 15 | — | planned |
| U40 | `add-taint-runtime` | `taint` | `interpreter` | Runtime labels on step records with the static algebra; a property test that static taint includes runtime taint on the fixtures | U23, U33, U39 | 4 (part) | — | planned |
| U41 | `add-hook-checker` | `hooks-static` | `authoring` | Hooks grammar v0.2; `H_SCHEMA`, `H_BLOCK`, `H_ROUTE_TARGET`, `H_ROUTE_HUMAN`, `H_RETRY_SCOPE`, `H_CYCLE`, `H_DOMINANCE`, `W_NO_MATCH`, and `H_ROUTE_EFFECT` (X3, accepted); no `allow_effect_retry` on `pay` | U22, U25 | 21 (static) | `node-hooks/src/check.ts`, `specs/node-hooks-spike-design.md` | planned |
| U42 | `add-hook-runtime` | `hooks-runtime` | `interpreter` | Pure code hooks fused into the node step, the action matrix, `ctx.next` and `ctx.from`, `input_original`, the pure `approvalsOnPath(steps)`; scenarios C1, C2, C6, S13 and S18c on the synthetic hook flows; the escape suite on hook code | U32, U33, U39, U40, U41 | 21 (part), 22 (part), 23 | `node-hooks/src/hooks.ts` | planned |
| U43 | `add-block-hooks` | `hooks-block` | `interpreter` | Block hooks as their own steps through `ToolInvoker` (`phase`, `hookId`, invoke context `kind: hook`), `on_error: continue`, hooks in mock mode | U34, U42 | 21 (part) | `node-hooks` | planned |
| U44 | `add-web-hooks-view` | `web-runs` | `web` | Hooks and hook routes on the graph; hook steps and fused results on the timeline; journey `test_m5_code_hooks.py`. **Closing** | U37, U38–U43 | — | — | planned |

### M6 Egress, tool registry, grants and dry runs

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U45 | `add-fake-egress-proxy` | `test-fake-egress` | — | `test/support/fake-egress/`: broker token issue (service-token auth, TTL), proxy `/<service_uuid>/<path>` (bearer check, credential injection), per-service routing to loopback upstreams, streaming and redirect pass-through, recorded requests, audit-event emission to a configured sink, the vault write endpoint with identities; contract suite against a base URL; routes for names under `fake.test`; a credential-less route | — | 13 (fixture) | `deploy/mintkey-footprint` | planned |
| U45b | `add-fake-tools` | `test-fake-tools` | — | `test/support/fake-tools/`: port `seed/shared/mocks/mock-tools.mjs`: the 20 test-catalogue blocks as loopback handlers behind fake-egress routes (`tools.fake.test`), recorded calls, reset, per-route delay and failure; contract test; e2e part `parts/50-tools.ts` (registers its routes in the fake egress that U46's part started) | U06, U24, U45, U46 | — | `shared/mocks` (mock tools) | planned |
| U46 | `add-gateway-client` | `gateway` | `gateway` | `src/gateway`: `requestToken(permit)` (the TTL is the permit's), never refreshed; `send(permit, request)` refuses unless method, host, path and body digest equal the permit; manual redirects (a 3xx is returned, never followed); `X-Ursitoare-Call`; run and step ids in the trace; startup self-check (empty secret files, or a broker that issues a token to an unauthenticated caller, refuse start); stack part `parts/45-egress.ts` | U01, U06, U11b, U45 | 12 (part), 13 | — | planned |
| U47 | `add-tool-registry` | `tool-registry` | `tools` | `src/tools`: `tool_server` with `validateOrigin` (cross-cutting rule 'Origins'), surface-digest approval (team: approver ≠ registrant; solo: explicit, audited self-approval), approval writes immutable `<server>.<tool>` block versions with their binding, drift disables; a `fixture` adapter that binds the test-catalogue blocks to `add-fake-tools` | U08, U13, U14, U26, U45b | — | — | planned |
| U48 | `add-credentials` | `credentials` | `credentials` | `credential_ref` (egress target, Mintkey service id, pinned target origin; the target stored in Mintkey is the origin only, scheme, host and port, and the gateway sends the full upstream path), write-only `POST /api/v1/credentials` and rotate through the vault endpoint, `manage_credentials`, never logged; the `ServiceResolver` port | U45, U46, U47 | 12 (part) | — | planned |
| U49 | `add-grants-model` | `grants` | `grants` | `src/grants`: `grant`, the compiler to the Cedar tenant layer, `POST /api/v1/policies/validate` and `/deploy` (tenant layer only; a platform `@id` collision fails), node fingerprints, `reconfirmationsFor(oldHash, newHash)`, `/grants` | U11b, U13, U14, U17, U27 | 16 (part) | `policy-cedar/policies` | planned |
| U50 | `add-tool-invocation` | `tool-invocation` | `runtimes` | `src/runtimes/invoke`: PEP `invoke_tool` with the full context (taint, `approvalsOnPath`, fingerprint, `sod_excluded` from the initiator, `kind` node or hook) on the input after pre-hooks, then intent, token and send; result taint per `untrusted_result`; `EffectMode` honoured; the C2 static scan with a committed call-site inventory; request-equals-permit | U04, U33, U34, U35, U40, U42, U43, U46, U48, U49 | 1, 6, 13 | — | planned |
| U51 | `add-dry-runs` | `flow-testing` | `api`, `interpreter` | `POST /api/v1/flows/{id}/versions/{hash}/dry-run`: attended, the caller in the owner team, no `run_as` or trigger; reads live through the invoke path, `write`, `send` and `pay` evaluated, recorded and stubbed; per-node fakes; `dry_run_flow` | U13, U27, U33, U35, U50 | — | — | planned |
| U52 | `add-web-grants` | `web-tools` | `web` | Tool-server and grant administration, re-confirmations, policy validation and deploy, the "Dry run" button; journey `test_m6_grants.py` (denied without a grant; granted, the read reaches the fake upstream; `pay` stubbed with its permit shown). **Closing** | U21, U37, U45–U51 | — | — | planned |

### M7 Tool adapters (F9)

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U53 | `add-http-openapi-tools` | `tool-http` | `tools` | Uploaded (never fetched) OpenAPI documents with remote `$ref` off, operations to tools with an admin-set `effect`, bindings to method and path template, `url_host` from the WHATWG URL parser | U47, U48, U50 | 13 | — | planned |
| U54 | `add-mcp-client` | `tool-mcp` | `tools` | MCP client (2026-07-28 and the older handshake), `tools/list` to a surface digest, tool namespacing with collisions refused, `tools/call` through the gateway, results untrusted; `test/support/fake-mcp/`, its proxy route and e2e part `parts/55-mcp.ts` | U06, U45, U47, U48, U50 | 6 | — | planned |
| U55 | `add-code-block-tools` | `tool-code` | `tools`, `runtimes` | `code_block` tool servers: blocks implemented as pure sandboxed code, surface digest over the source | U38, U39, U47, U50 | — | — | planned |
| U56 | `add-web-tools` | `web-tools` | `web` | Register an MCP URL, an OpenAPI upload or a code block; review and approve the surface with a drift diff; write-only credential entry; journey `test_m7_tools.py` (F9 through a dry run). **Closing** | U52, U53, U54, U55 | — | — | planned |

### M8 Hobbyist stack

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U57 | `add-init-secrets` | `deploy-secrets` | `cli` | `ursitoare init-secrets --dir <path>`: `.env` (mode 0600) and `secrets/*` (engine key, KEK, signing seed, service tokens, Keycloak admin, database and OIDC client secrets, the first user's one-time password), every value non-empty, never overwrites; keys are text of at least 32 characters; registered as a top-level command in U20's registry; the engine key is 64 hex characters | U01, U20 | 12 (part) | `deploy/mintkey-footprint/gen-secrets.sh` | planned |
| U58 | `add-keycloak-realm` | `deploy-keycloak` | — | The realm (organisation, `ursitoare-engine` and `ursitoare-mcp` clients, group mapper emitting plain group names (full path off), as the fake provider does, `ursitoare-admins` holding the first user) rendered from the generated secrets; its init script; a test against the fake OIDC claim contract; the `idp-external` profile | U09, U17, U57 | 19 (part) | `deploy/keycloak-footprint` | planned |
| U59 | `add-hobbyist-compose` | `deploy-compose` | — | The engine image (`URSITOARE_ROLE`; runs from source with `src/db/migrations`; no test support or fakes inside, tested), `deploy/compose.yaml` with exactly six long-running containers, the §4.3 limits, networks with egress only from the proxy, published ports (the Mintkey vault's port is published to no host port); a static test of these rules; `docs/deploy.md` and `docs/operations.md` (backup and restore of KEK, seed, vault file and `.env`; LAN access; TLS; upgrades); a one-shot owner job runs `prepareDatabase` with the owner credentials, then `admin bootstrap-admin` (U20), before the engine starts (the engine never holds the credentials); the engine container sets `URSITOARE_HOST=0.0.0.0` while the host publish stays `127.0.0.1:8080` | U46, U57, U58 | 10 (static) | `deploy/mintkey-footprint` | planned |
| U60 | `add-audit-sink` | `audit-sink` | `api`, `audit` | The internal listener (`buildInternalServer`, `service_token`): `POST /v1/internal/audit/emit` appends broker and proxy events with `origin = mintkey`, 2xx only after commit; it accepts the broker's and the proxy's service tokens, which differ; route kind `mintkey_tenant`; the reconciliation job; e2e part `parts/70-internal.ts` (service token file) | U08, U13, U45, U50 | — | `deploy/mintkey-footprint/audit_sink.py` | planned |
| U61 | `add-stack-overlay` | `e2e-stack` | — | `deploy/compose.e2e.yaml` (a fakes container behind the proxy, network aliases under `fake.test`), a test realm overlay (journey users with their groups, organisation B), `scripts/stack-e2e.sh` (up, reset the engine database never the vault, run, stop) | U45b, U57, U58, U59, U60 | — | — | planned |
| U61b | `add-stack-seeding` | `e2e-stack-seeding` | — | `login` against real Keycloak and the API-driven seed fixtures for the stack profile in `e2e/conftest.py` (the fake profile keeps `fresh_state`); local origins flagged | U16, U56, U61 | — | — | planned |
| U61c | `add-stack-conformance` | `stack-conformance` | — | The fake contract suites run against the real services; `e2e/test_stack_conformance.py` (exits 10 runtime, 12, 19), marked `stack`. **Closing** | U57–U61b | 10, 12, 19 | — | planned |

### M9 LLM nodes

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U62 | `add-fake-llm-provider` | `test-fake-llm` | — | `test/support/fake-llm/`: Anthropic Messages, OpenAI Responses and Chat Completions, Ollama chat; streaming; scripted cassettes; its proxy route, e2e part `parts/65-llm.ts`, and its service in the fakes container of `deploy/compose.e2e.yaml`; contract tests against committed, sanitised transcripts | U06, U45, U61 | 11 (fixture) | `shared/mocks` (mock LLM) | planned |
| U63 | `add-llm-providers` | `llm-providers` | `llm` | `src/llm`: `llm_provider` (kind, pinned origin, region; a credential through `credential_ref`, or an admin-flagged credential-less local Ollama), the `LlmProvider` port, the Anthropic adapter, `invoke_llm` with provider, region and taint, provider-side tools off, streaming through the gateway; provider origins pass `validateOrigin` | U11b, U46, U47, U48, U50, U62 | 11 | — | planned |
| U64 | `add-llm-openai-ollama` | `llm-openai-ollama` | `llm` | OpenAI Responses and Chat Completions adapters, the Ollama adapter, capability profiles per model | U63 | 11 | — | planned |
| U65 | `add-authority-differ` | `authority` | `authority` | `src/authoring/authority`: a pure differ keyed by the diff hash: `widens_*` flags (tools, effects, egress hosts, exposure, `run_as`, provider and region) and the grant re-confirmation list from `reconfirmationsFor` | U27, U41, U49 | 16 (part) | — | planned |
| U66 | `add-call-journal` | `llm-journal` | `llm` | `llm_call` partitioned by month, `call_id = lineage:node:effect_seq:turn:attempt:generation`, reuse only on a matching `request_digest`, a re-issue keeps both attempts, usage recorded per call | U31, U32, U34, U63 | 7 | — | planned |
| U67 | `add-model-profiles` | `node-profiles` | `llm`, `api` | Node profile versions and aliases, model aliases (provider, region, price), strict alias resolution pinned at run start, `edit_profile` with `authority_change` from the differ; a provider or region change of an alias used by a flow takes effect for that flow only after a member of its owner team confirms it (an audited, synchronous API decision; runs keep the old resolution until then); e2e part `parts/66-models.ts` seeds the fake provider, an alias and a profile; `/api/v1/profiles`, `/models`; `RegistryCatalogue.modelProfile` | U13, U26, U33, U63, U65 | 16 (part) | — | planned |
| U68 | `add-llm-node-runtimes` | `node-llm` | `runtimes` | `llm.extract` (tool-less, typed, output `extracted`), `llm.generate`, `llm.decide` (outcomes; an unattended decide needs an abstain outcome), schema retry, budgets from the journal's cost; validator rules; the taint property test extended; conformance kit; cost per call from the journal's usage and the alias price | U33, U40, U63, U66, U67 | 4 (part) | — | planned |
| U69 | `add-trifecta-gate` | `policy-trifecta` | `pdp`, `runtimes` | The trifecta activation forbid in the platform layer (used at publish), the end-to-end proof that `extracted` and `untrusted` arguments reaching `write`, `send` or `pay` are denied when no approval is on the path (U74b proves the approval half); reuses `flowCapabilities` | U11b, U23, U50, U68 | 4, 5 (part) | — | planned |
| U70 | `add-web-llm-views` | `web-runs` | `web` | Provider registration and key entry, profile and alias pages, LLM calls on the timeline (attempts, tokens, cost, taint badges); journey `test_m9_llm.py` (`rf-1-core` dry runs with the fake provider: a clean and an injected invoice are both refused at `pay`, each showing its reason). **Closing** | U37, U52, U62–U69 | — | — | planned |

### M10 Assisted authoring

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U71 | `add-context-sources` | `context-sources` | `registry`, `runtimes` | Approved-fact context sources (`register_context_source`, `read_context`, `/api/v1/context-sources`), assembly for LLM nodes within budget, scopes that never reference model output | U26, U40, U68 | — | — | planned |
| U72 | `add-llm-author` | `authoring-llm` | `assist` | The LLM author drafts YAML for the requesting human (an `act` chain), validator, policy lint and capabilities reported, a repair loop capped at 5 rounds, never activates; `author_flow` | U25, U27, U63, U66, U69 | 17 (part) | — | planned |
| U73 | `add-web-authoring-assist` | `web-authoring` | `web` | "Describe a flow" with repair rounds, context-source administration; journey `test_m10_assist.py`. **Closing** | U28, U29, U71, U72 | — | — | planned |

### M11 Human tasks, review and publishing

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U74 | `add-human-tasks` | `human-tasks` | `tasks` | `src/tasks`: `human_task`, hashed resume tokens (route kind `task_token`, unregistered when closed), deadlines, `on_timeout`, escalation; `POST /api/v1/tasks/{id}/decision` for open tasks only | U13, U14, U32, U33 | 2 (RT-9) | — | planned |
| U74b | `add-approval-nodes` | `approval-nodes` | `tasks`, `runtimes` | `human.approval` and `human.form` bound to an open task; approval step records for `approvalsOnPath` and the approval half of U69's proof; `sod_excluded` for attended runs; explicit, audited solo self-approval; the exit-21 rule "pay above 1,000 needs an approval on the path" through the real invoke path | U42, U50, U69, U74 | 14 (attended), 21 | — | planned |
| U75 | `add-web-task-inbox` | `web-tasks` | `web` | Inbox sorted by deadline, the open-task count in the header, forms from the JSON-Schema renderer, the signed link `/t/{token}` to a confirm page (never a one-click decision), who was notified and how | U15b, U37, U74 | — | — | planned |
| U76 | `add-flow-review` | `flow-review` | `publish` | A review task on an exact hash sets `Flow.reviewed`; `solo` (explicit, audited self-review) and `team` (platform forbid); the review covers `run_as`, re-confirmations and the differ's flags | U27, U49, U65, U74b | 5 (part), 16 (part) | — | planned |
| U77 | `add-flow-publish` | `flow-publish` | `publish`, `api` | Publish with a reviewed `run_as` (a user or a service account the publisher owns), `activate_flow` with the trifecta forbid and confirmed step grants, deprecate, drain; `POST /api/v1/runs` live for published versions (`start_run`, `Idempotency-Key`); a policy revocation reaches a parked run | U18, U36, U49, U69, U76 | 5, 16 | — | planned |
| U78 | `add-triggers` | `triggers` | `triggers` | Webhook triggers (HMAC derived from the engine key, signed timestamp within ±5 min, delivery dedupe, constant-time compare, body limit, payload `untrusted`; route kind `trigger`), schedules, runs as `run_as`; unattended `sod_excluded` (`run_as`, publisher, owner); `manage_triggers`; CLI `pause-triggers` | U20, U30, U77 | 14 (unattended) | — | planned |
| U79 | `add-membership-sync` | `identity-rbac` | `identity` | The sync job for `run_as` and service-account owners; a disabled `run_as` stops its runs at the next check; the sync reads groups through a service account (realm role added in U58's realm by this unit) and fake-oidc gains a user-groups endpoint and user disabling (`test/support/fake-oidc/`) | U09, U17, U58, U77 | — | — | planned |
| U80 | `add-web-publish` | `web-publish` | `web` | Review and publish screens (YAML, graph, capabilities, authority flags, `run_as` picker), the triggers page; journeys `test_m11_publish.py` (F1 on `rf-1-core-approval`: the clean invoice pays after bob's approval, the injected one is refused; the journey switches tenant A to `team` through U18's endpoint) and `test_m11_solo.py` (uses tenant B, solo) | U75–U79 | — | — | planned |
| U81 | `add-web-first-run` | `web-onboarding` | `web`, `templates` | First-run wizard: confirm or switch the review profile (warning when a solo tenant has two or more human members), add the first provider credential, starter templates in `src/templates/` (each validated by a test); journey `test_m11_first_run.py`. **Closing** | U70, U74–U80 | — | — | planned |

### M12 Composition and integrated recovery

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U82 | `add-subflow` | `node-subflow` | `runtimes` | `subflow` at a pinned major version; principal and actor chain inherited; result taint; conformance kit; `RegistryCatalogue.flow` | U33, U40, U42, U77 | 2 (RT-10) | — | planned |
| U83 | `add-foreach` | `node-foreach` | `runtimes` | `foreach` with bounded `max_parallel` and per-item `effect_seq`: N items, N effects, also across a kill | U32, U33, U34, U42 | 2 (RT-8) | — | planned |
| U84 | `add-delegate-n8n` | `node-delegate` | `runtimes`, `api` | `delegate` by webhook through the invoke path; `POST /callbacks/delegate/{correlation_id}` (HMAC derived from the engine key, accepted only while its wait is open, a second callback an audited no-op; route kind `correlation`); result taint; a fake n8n, its proxy route, e2e part `parts/75-n8n.ts` and its service in the fakes container; targets pass `validateOrigin`; `RegistryCatalogue.delegateTarget` | U13, U33, U40, U45, U47, U50, U61 | — | `shared/mocks` (mock n8n) | planned |
| U85 | `add-hooks-integration` | `hooks-runtime` | — | The 37 hook scenarios of the spike on the integrated engine (S16a, S17, S18a and b, S19, C3–C5 included) | U43, U68, U74, U84 | 21, 22 | `node-hooks/tests` | planned |
| U86 | `add-integrated-recovery-suite` | `recovery` | — | RT-0…RT-6 on RF-1 with the fakes; 60 kills of a hooked RF-1 in tests of 10 kills or fewer, one payment each; RT-1 at kill grace 0 with every re-issue journaled | U32, U45b, U66, U83, U84, U85 | 1, 2, 7, 22 | `shared/harness` | planned |
| U87 | `add-web-composition-views` | `web-runs` | `web` | Child-run links, `foreach` item lanes, delegate waits; journey `test_m12_composition.py` (the full RF-1, F7 end to end). **Closing** | U80, U82–U86 | — | — | planned |

### M13 Agents and MCP

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U88 | `add-agent-runtime` | `node-agent` | `runtimes` | `agent`: its own loop, the tool allowlist intersected with grants (others never offered), `max_steps` ≤ 50, budgets, a loop detector, journaled turns, context taint the union of every tool result seen and carried into each `invoke_tool`; resumes after a kill without re-running tool calls | U23, U32, U40, U50, U66, U68, U69 | 2 (RT-7) | — | planned |
| U89 | `add-mcp-server` | `mcp-server` | `mcp` | `/mcp` for published flows whose format field `expose: mcp` is inside the hash (the differ flags `widens_exposure`), `tools/list` filtered by `start_run`, RFC 9728 metadata, bearer tokens with the `ursitoare-mcp` audience, subjects mapped through `idp_link` and unmapped refused, caller arguments `untrusted`; `docs/mcp-clients.md` | U09, U10, U13, U65, U77 | 19 | — | planned |
| U90 | `add-web-agent-views` | `web-runs` | `web` | Agent turns on the timeline, the read-only MCP exposure with a link to edit and review; journey `test_m13_agents_mcp.py`. **Closing** | U87, U88, U89 | — | — | planned |

### M14 Change management, debugging and evals

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U91 | `add-flow-diff` | `flow-diff` | `api`, `authority` | `GET /api/v1/flows/{id}/versions/{a}/diff/{b}`: a structured diff with the differ's flags, hook routes as edges, mutating hooks on effect nodes | U27, U41, U65 | 16 (part) | — | planned |
| U92 | `add-fork-rerun` | `run-debugging` | `runs`, `interpreter` | Fork preview (downstream effects, stub by default, never re-fire), fork with its `fork_preview` record, rerun; `debug_run`; a fork of a paid run pays nothing; fork with hooks (hook scenario F1 of the spike); a live fork only of a run of a published version, under its publish-time grants and `run_as`; forks of test, dry and eval runs always stub | U33, U34, U36, U42, U66 | 3, 7 | — | planned |
| U93 | `add-eval-service` | `eval` | `eval` | Datasets, code graders, k-trial runs as the `eval` principal with effects stubbed, committed baselines, JUnit output, `/api/v1/eval/*`, the profile alias gate; the person-run script for exit 17 | U35, U67, U68 | 17 (harness) | `shared/harness` | planned |
| U94 | `add-web-diff-fork` | `web-diff-fork` | `web` | The diff view with flagged grants and authority, fork preview and confirm | U29, U37, U91, U92 | — | — | planned |
| U95 | `add-web-evals` | `web-evals` | `web` | Eval datasets, runs and results, the alias gate view; journey `test_m14_change.py`. **Closing** | U91–U94 | — | — | planned |

### M15 Release readiness

| U | Change id | Cap | Module | Scope | Depends on | Exit | Seed | Status |
|---|---|---|---|---|---|---|---|---|
| U96 | `add-observability` | `observability` | `observability` | The OTLP exporter behind U01's `Tracer` port, run ids in traces, the §12 metrics on the internal listener | U01, U13, U33, U60, U66 | — | — | planned |
| U97 | `add-retention-partitioning` | `data-retention` | `db`, `cli` | Creating partitions ahead, expiry by dropping them, `pinned` rows exempt, the audit chain verified before archiving; run from the CLI or a job as the owner role | U08, U11b, U20, U31, U66 | — | — | planned |
| U98 | `add-tenant-isolation-sweep` | `tenancy-sweep` | — | Exit 18 in full: every route, repository call and Cedar decision of tenant A returns nothing of tenant B; the platform forbid; a browser journey where mallory deep-links tenant A's objects | U78, U89, U92, U93, U96 | 18 | — | planned |
| U99 | `add-sbom-notice` | `supply-chain` | — | The image SBOM licence check (stack tier) and a generated `NOTICE`; reuses U05's `licence-rules.ts` (`LicenceException`, `LicenceViolation`) | U05, U59 | 20 | — | planned |
| U100 | `add-load-footprint-harness` | `perf-harness` | — | The load profile of exits 9 and 10 as a script with a report, its logic tested on fakes; the run is a person's, on the Linux host. **Closing** | U59, U68, U78, U96–U99 | 9, 10 | — | planned |

## Exit tests → units

| Exit | Units (gates) | Outside L4 |
|---|---|---|
| 1 | U32 (harness), U33, U50, U86 | — |
| 2 | U32 (harness), U34, U74 (RT-9), U82 (RT-10), U83 (RT-8), U86 (RT-1), U88 (RT-7) | — |
| 3 | U34, U92 | — |
| 4 | U23, U40, U68, U69 | — |
| 5 | U69, U76, U77 | — |
| 6 | U04, U11, U13, U50, U54 | — |
| 7 | U66, U86, U92 | — |
| 8 | — (owner decision: out-of-process dedupe) | — |
| 9 | U100 (harness) | person, Linux host, M15 |
| 10 | U59 (static), U61c (runtime count), U100 | person, Linux host, M15 |
| 11 | U62, U63, U64 | stack run at the broker's allowed concurrency (M9+) |
| 12 | U46, U48, U57, U61c | stack run (M8) |
| 13 | U45, U46, U50, U53 | — |
| 14 | U74b (attended), U78 (unattended) | — |
| 15 | U38, U39 | — |
| 16 | U49, U65, U67, U76, U77, U91 | — |
| 17 | U72, U93 (harness) | person with real models (M14), reported |
| 18 | U03, U10, U11b, U17, U98 | — |
| 19 | U09, U58, U61c, U89 | stack run (M8, M13) |
| 20 | U05, U99 | image SBOM in the stack tier (M15) |
| 21 | U41, U42, U43, U74b, U85 | — |
| 22 | U42, U85, U86 | — |
| 23 | U42 | — |

## Shared conventions and interfaces

**Paths.** The REST API lives under `/api/v1` (architecture §11 paths are relative to it). These stay at the root:
`GET /health`, `/auth/oidc/*`, `/.well-known/*`, `POST /hooks/{trigger_id}`, `POST /callbacks/delegate/{id}`, `/mcp`;
the internal listener (port 8090, never published) serves `/v1/internal/audit/emit` and the metrics. Every other GET
path is a web-app route served by the SPA fallback (for example `/flows`, `/runs/{id}`, `/t/{token}`).

Each unit's spec defines its interfaces in full; this table fixes the names so that specs written in parallel agree.

| Interface | Shape (abbreviated) | Owner |
|---|---|---|
| Config | `loadConfig(env, readSecret?): AppConfig`; env `URSITOARE_*`; secrets only from `*_FILE` paths; engine key `URSITOARE_ENGINE_KEY_FILE`; `ConfigError` codes `CONFIG_INVALID`, `CONFIG_SECRET_EMPTY` | U01 |
| Clock, ids, tracing | `Clock { now(): Date }`, `systemClock`, `fixedClock(iso)`; `IdSource { next(prefix): string }` (prefix `_` UUIDv7), `systemIds`, `sequentialIds(seed)`; `Tracer { startSpan(name, attrs?): Span }`, `noopTracer` | U01 |
| Server | `buildServer(deps: ServerDeps): Promise<FastifyInstance>`; `ApiError(status, code, message, details?)`; envelope `{ error: { code, message, details? } }`; `x-request-id`; `registerHealthCheck(name, check)`; `/health` → `{ status, version, checks }` | U01 |
| Database | `createPool(url, opts?): Pool`; `migrate(pool, dir?): Promise<{ applied: string[] }>`; `ensurePartitions(ownerPool, clock)`; `prepareDatabase(ownerPool, clock)` (migrate, then partitions; the only caller of both); `withTestDatabase(): Promise<TestDatabase>` with `ownerPool`, `appPool`, `ownerUrl`, `appUrl`, `close()` | U02 |
| Tenancy | `TenantContext { tenantId; reviewProfile: "solo" \| "team" }`; `withTenantTx(pool, ctx, fn)`; `ensureDefaultTenant(pool, name)`; `resolveTenantBy(pool, kind, key): Promise<TenantContext \| null>`; SQL `ursitoare.register_tenant_route(kind, key_hash)` and `ursitoare.unregister_tenant_route(p_kind, p_key_hash)`; `seedTwoTenants(db)` | U03 |
| Module graph | `test/arch/modules.ts` `MODULES: Record<string, { allowed: string[]; egress?: "tools" \| "oidc" \| "otlp" }>` | U04 |
| e2e stack | `startE2eStack(opts?): Promise<E2eStack>`; `E2eStackPart { name; start(ctx): Promise<PartHandle>; seed?(ctx): Promise<void> }`; `discoverParts(dir?)` loads `parts/NN-<name>.ts` (one-line re-exports of `<name>-part.ts`) in file-name order; `PartHandle { env; close() }`; control listener `POST /reset`, `POST /faults` | U06 |
| Web shell | `registerFeature({ id, path, navLabel?, capability?, element })`; `createApiClient(opts): ApiClient` with `ApiRequestError`; features are files `web/src/features/NN-<name>.tsx`; U07 owns the registry and the pure nav filter; U15 passes `/me` capabilities to it | U07 |
| Audit | `appendAudit(tx, ctx, event): Promise<{ seq: bigint; hash: string }>`; `appendAuditCommitted(pool, ctx, event)`; `verifyChain(pool, ctx)`; `canonicalize(value): string` | U08 |
| Principal | `Principal { tenantId; userId; kind: "human" \| "service"; sessionId?; roles: string[]; teams: string[]; actorChain: string[] }` on `request.principal` | U12 (roles and teams filled by U17) |
| PDP | `createPdp(opts): Promise<Pdp>`; `Pdp.check(req: PolicyRequest): Promise<Decision>`; `Pdp.allowedActions(principal, actions)`; `Decision { decision; decisionId; reasons; errors; policySetVersion; permit?: Permit }`; `Permit { method; host; path; bodyDigest; serviceId; ttlSeconds }` | U11 (engine), U11b (catalogue, `allowedActions`) |
| Routes | `defineRoute(server, { method, url, auth, action?, resource?, schema, errors, handler })`; `auth` is the union of U13 | U13 |
| API conventions | `Cursor` (`limit`, `cursor`, `next_cursor`), `ERROR_CODES`, `withIdempotency(key, fn)` | U14 |
| Web kit | `DataTable`, `Form`, `Field`, `SchemaForm`, `EmptyState`, `LoadingState`, `ErrorPanel`, `ConfirmDialog`, `toast()`; `messages.ts` | U15, U15b |
| Catalogue | `Catalogue { block(ref); modelProfile(ref); role(name); delegateTarget(target, workflow); flow(ref, major): { input; output } \| undefined }` | U22 (interface); filled by U24, U26 (block, role), U67 (modelProfile), U82 (flow), U84 (delegateTarget) |
| Taint | `Taint` labels, `joinTaint(a, b)`, `flowCapabilities(flow, catalogue)` | U23 |
| Node runtimes | `registerNodeRuntime(kind, runtime: NodeRuntime)`; `ToolInvoker { invoke(call: ToolCall, ctx: StepContext): Promise<ToolResult> }`; `ToolCall { tool; args; nodeId; effectSeq; phase?: "pre" \| "post"; hookId? }`; `EffectMode = "live" \| "mock" \| "stub"` | U33 |
| Hooks | `approvalsOnPath(steps): Approval[]` | U42 |
| Gateway | `requestToken(permit)`, `send(permit, request)`; `validateOrigin(url, { local })` (U47); `ServiceResolver { resolve(binding): { serviceId; origin } }` | U46, U48 |
| Grants | `reconfirmationsFor(oldHash, newHash)` | U49 |
| Authority | `diffAuthority(oldVersion, newVersion): AuthorityDiff` (`widens_*` flags) | U65 |
| CLI | `registerCommand(name, command)` under `ursitoare admin`, `ursitoare flow` and top level; a unit adding commands edits `src/cli/builtin.ts` in a named task (`registry.registerCommand(name, command)`), and two such units in one milestone need a depends_on edge | U20 |
| Run data | `RunRepository`, `StepRepository`, `EnvelopeStore` | U31 |
| Crash harness | `spawnEngine(opts)`, `kill()`, `restart()`, `withDedicatedCluster()` | U32 |
| Step context | `StepContext` | U33 |
| Effect intents | `recordIntent`, `completeIntent`, `idemKey(lineage, node, effectSeq)` | U34 |
| Sandbox | `WorkerSandbox.run(code, input, limits)` | U38 |
| LLM | `LlmProvider`, `invokeLlm(request, ctx)` | U63 |
| Human tasks | `createTask`, `decideTask`, `TaskDecision` | U74 |

## Appendix: Module graph

U04 copies this table into `test/arch/modules.ts`. A module is a top-level directory `src/<module>/`; its
sub-directories are internal, and other modules import only its `index.ts`. `src/main.ts` may import any module.

| Module | May import | Egress | Owner units |
|---|---|---|---|
| `core` | — | — | U01 |
| `config` | `core` | — | U01, U20, U32 |
| `observability` | `core`, `config` | `otlp` | U01, U96 |
| `db` | `core`, `config`, `observability` | — | U02, U97 |
| `tenancy` | `core`, `db` | — | U03 |
| `audit` | `core`, `db`, `tenancy`, `observability` | — | U08, U19, U60 |
| `identity` | `core`, `config`, `db`, `tenancy`, `audit`, `observability` | `oidc` | U10, U12, U17, U18, U79 |
| `pdp` | `core`, `db`, `tenancy`, `observability` | — | U11, U11b, U19, U69 |
| `authoring` | `core` | — | U22, U23, U25, U41 |
| `authority` | `core`, `authoring`, `grants` | — | U65, U91 |
| `registry` | `core`, `db`, `tenancy`, `audit`, `authoring`, `pdp`, `identity` | — | U26, U27, U71 |
| `grants` | `core`, `db`, `tenancy`, `audit`, `pdp`, `registry`, `authoring` | — | U49 |
| `durable` | `core`, `config`, `db`, `observability` | — | U30 |
| `runs` | `core`, `db`, `tenancy`, `durable` | — | U31, U34, U36, U92 |
| `sandbox` | `core`, `config` | — | U38 |
| `gateway` | `core`, `config`, `observability`, `pdp` | `tools` | U46 |
| `tools` | `core`, `db`, `tenancy`, `audit`, `registry`, `gateway`, `pdp` | — | U47, U53, U54, U55 |
| `credentials` | `core`, `db`, `tenancy`, `audit`, `gateway`, `tools` | — | U48 |
| `llm` | `core`, `db`, `tenancy`, `gateway`, `pdp`, `credentials`, `registry`, `tools`, `observability` | — | U63, U64, U66, U67 |
| `interpreter` | `core`, `durable`, `runs`, `registry`, `authoring`, `pdp`, `observability`, `sandbox` | — | U33, U35, U40, U42, U43, U51, U92 |
| `runtimes` | `core`, `interpreter`, `runs`, `registry`, `grants`, `pdp`, `gateway`, `sandbox`, `llm`, `tools`, `credentials`, `authoring`, `tasks`, `observability` | — | U39, U50, U55, U68, U69, U71, U74b, U82, U83, U84, U88 |
| `tasks` | `core`, `db`, `tenancy`, `audit`, `durable`, `runs`, `pdp` | — | U74, U74b |
| `publish` | `core`, `db`, `tenancy`, `audit`, `registry`, `grants`, `authority`, `tasks`, `pdp`, `runs`, `durable`, `identity` | — | U76, U77 |
| `triggers` | `core`, `db`, `tenancy`, `audit`, `durable`, `runs`, `registry`, `pdp`, `publish` | — | U78 |
| `assist` | `core`, `authoring`, `llm`, `registry`, `pdp`, `observability` | — | U72 |
| `eval` | `core`, `db`, `tenancy`, `durable`, `interpreter`, `runs`, `registry` | — | U93 |
| `mcp` | `core`, `identity`, `pdp`, `registry`, `runs`, `interpreter`, `publish` | — | U89 |
| `templates` | `authoring` | — | U81 |
| `api` | every module except `sandbox`, `runtimes` and `cli` | — | U01, U07, U13, U14, U17, U18, U19, U35, U36, U51, U60, U67, U77, U84, U91 |
| `cli` | every module `api` may import, plus `db` owner access | — | U20, U25, U35, U57, U97 |

## Deferred to Phase 2 (architecture §13)

The editable canvas; rewind, re-fire, run-to-run diff and replay regression; A2A and Gemini; evals beyond code
graders; shadow and canary rollout; skill import and the context assembler beyond approved facts; the Director and the
in-run advisor; Slack, Teams and email renderers; `ui.generate`; the runner and gVisor profile; SCIM and horizontal
workers; optimizers; MCP Registry import; several tenants per deployment; the combined Mintkey image; the optional
TypeScript authoring surface (`seed/format-ts`).

## Open items that touch the plan

| Item | Affects | Default until decided |
|---|---|---|
| Licence text (ADR-15, owner with counsel) | `LICENSE`, U99 `NOTICE` | `LICENSE` reserves all rights |
| GitHub owner and repository name | `l4 setup github`, the hand-off | Decided: `ciprianiacobescu/ursitoare`, public |
| Exit test 8: an out-of-process dedupe for the at-least-once window (architecture §14 #4) | U86's RT-1 claim | RT-1 asserts that every re-issue is journaled with both attempts (exit 7), not that the call ran once |
| Broker concurrency in the hobbyist stack | Exit 11 at concurrency 16, U100 | Stack runs use the broker's allowed concurrency |
| Attended dry runs reach live reads and LLM calls of unreviewed versions; effects are always stubbed | U51 and the M6, M7 and M9 journeys | Adopted (orchestrator default; conservative): no real effect before publish |
| Webhook bodies and MCP caller arguments are `untrusted` unless a reviewed trigger marks fields trusted | U78, U89 | Adopted (orchestrator default) |
| `x-api-key` inbound on the broker for gateway-style providers | U63 | Adapters rely on the proxy's credential injection |
| Licences allowlisted beyond ADR-15's wording: BlueOak-1.0.0 (minimatch), PSF-2.0, MPL-2.0 (lightningcss, a Vite build-time tool; nothing MPL ships in the engine image) | U05 | Allowed; owner or counsel to confirm |
| How a new TypeScript symbol exists at red (`docs/decisions/0002`) | every unit's execution, not its spec | Decided: scaffold per milestone now, L4 change later |
| No unit writes audit head anchors: `anchorHead` has no caller, so `verifyChain` checks only anchor rows that exist | U19, U20, U21 (verification status) | Verification covers only the hash chain, and says so (`anchorsVerified: 0`), until a unit writes anchors |
| Disabling a user suspends, not ends, open sessions: add-oidc-login revokes one session at a time and `resolveSession` gives null while the user is not active | U18, U21 | Disable suspends open sessions and enable restores them; a per-user session revocation is needed |
| add-api-conventions' frozen test `src/api/error-codes.test.ts::C-96e47324 The registry` checks exactly its entries | every unit that adds an error code (U18 first) | Each such unit names that test in a task and changes it |
