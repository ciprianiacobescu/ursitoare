## Why

M2 gives the engine roles, teams, group mappings, an admin API and an audit API, but an administrator reaches them only with raw HTTP or the command line. This change adds the screens and closes M2 with a browser journey.

Observable result: carol (`tenant_admin`) sees "Users", "Roles and teams", "Group mappings" and "Audit log" in the navigation; alice (role `author`) sees none. Carol lists people with their roles and teams and disables or enables one (a disable asks first and suspends their open sessions), creates and deletes teams, maps an identity provider group to one role or team, removes a mapping after a confirmation that states what its members lose, and reads the audit log newest first, filtered by event type, under a status that says "Audit chain verified" (and whether signed head anchors were matched) or "Audit chain broken" at an event number. Alice, opening `/admin/users` by address, gets a "Not allowed" panel with the decision id, which carol finds in her audit log. Every control has a name, every table a caption, loading, empty and error states are shown, and `assert_accessible(page)` passes.

## What Changes

- `web/src/admin/`: the logic (`shared`, `pages`, `messages`, `users`, `teams`, `mappings`, `audit`) with Node tests, four thin pages and `admin.css`; feature files `web/src/features/60-admin-users.tsx` to `63-admin-audit.tsx`, collected by the existing glob.
- `test/journeys/`: the logic run against the real engine of the e2e stack. `e2e/test_m2_admin.py`: the browser journey.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded: the four feature files (created with their page, never stubs: a stub feature would break the registry), `admin.css`, the tests and the journey. No existing file changes, no dependency is added, `e2e/conftest.py` is untouched.
- **Depends on:** `add-web-ui-kit`, `add-web-data-kit`, `add-web-sign-in` (web names), `add-admin-api` and `add-audit-api` (the routes), `add-roles-and-memberships` (roles, the e2e seed, carol's `tenant_admin`) and `add-admin-cli` (ordering only); beyond the roadmap row, `add-api-pep` (`/me`, the 403 envelope, `authz.denied`), `add-api-conventions` (the list contract), `add-oidc-login` (sign-in helpers of the Node journey) and the merged `add-web-shell` and `add-e2e-stack`.
- **Files implemented** (stubs): the `.ts` and `.tsx` files named under Interfaces given and `test/journeys/session.ts`. **Created:** `web/src/admin/admin.css`, the four feature files, `test/journeys/m2-admin.test.ts`, `e2e/test_m2_admin.py` and a `*.test.ts` beside each logic file. **Changed:** none.
- **Migrations, tables, endpoints, env vars, error codes, audit events:** none. No e2e part: the journey uses the seeds of `parts/30-rbac.ts` and `login`, `users`, `assert_accessible` of `e2e/conftest.py`.

**Interfaces given** (paths under `web/src/admin/` unless in full; members of the types: design.md § Interfaces)

- `shared.ts`: `ConfirmSpec`; `Check<T>`; `Api<K extends keyof ApiClient>`
- `pages.ts`: `AdminPage`; `ADMIN_PAGES: readonly AdminPage[]`; `AdminTables`; `ADMIN_TABLES: AdminTables`; `FeatureLiterals`; `featureLiterals(source: string): FeatureLiterals | null`
- `messages.ts`: `ADMIN_MESSAGES: StringMap`; `registerAdminMessages(): void`; `adminErrorMessage(error: unknown): string`
- `users.ts`: `AccountRow`; `AccountAction`; `AccountCells`; `parseAccount(raw: unknown): AccountRow | null`; `accountCells(account: AccountRow): AccountCells`; `accountAction(account: AccountRow, selfId: string | null): AccountAction`; `patchAccountState(client: Api<"patch">, userId: string, state: AccountRow["state"]): Promise<AccountRow>`
- `teams.ts`: `parseNamed(raw: unknown, key: "roleId" | "teamId"): string | null`; `checkTeamId(text: string): Check<string>`; `deleteTeamConfirm(teamId: string): ConfirmSpec`; `postTeam(client: Api<"post">, teamId: string, key: string): Promise<string>`; `removeTeamById(client: Api<"delete">, teamId: string): Promise<void>`
- `mappings.ts`: `MappingRow`; `GrantOption`; `MappingBody`; `MappingCells`; `parseGroupMapping(raw: unknown): MappingRow | null`; `mappingCells(m: MappingRow): MappingCells`; `grantOptions(roles: readonly string[], teams: readonly string[]): GrantOption[]`; `defaultIssuer(rows: readonly MappingRow[]): string`; `mappingRequest(input: { issuer: string; group: string; grant: string }, options: readonly GrantOption[]): { ok: true; body: MappingBody } | { ok: false; errors: FormErrors }`; `setMapping(client: Api<"put">, body: MappingBody): Promise<MappingRow>`; `removeMappingConfirm(m: MappingRow): ConfirmSpec`; `removeMapping(client: Api<"delete">, m: Pick<MappingRow, "issuer" | "group">): Promise<void>`; `loadAllItems<T>(fetchPage: FetchPage<T>): Promise<T[]>`; `ISSUER_HINT: string`
- `audit.ts`: `AuditEvent`; `AuditCells`; `Verification`; `VerificationState`; `VerificationView`; `parseAuditEvent(raw: unknown): AuditEvent | null`; `auditCells(e: AuditEvent): AuditCells`; `parseEventTypeFilter(text: string): Check<string | null>`; `auditFetcher(client: Api<"get">, eventType: string | null): FetchPage<AuditEvent>`; `parseVerification(raw: unknown): Verification | null`; `verificationView(state: VerificationState): VerificationView`; `loadVerification(client: Api<"get">, signal?: AbortSignal): Promise<Verification>`
- `UsersPage.tsx`, `TeamsPage.tsx`, `MappingsPage.tsx`, `AuditPage.tsx`: `UsersPage(): ReactNode` and likewise for the others; `admin.css`
- `web/src/features/60-admin-users.tsx`, `61-admin-roles-teams.tsx`, `62-admin-group-mappings.tsx`, `63-admin-audit.tsx`: `feature: FeatureSpec` each (never a stub)
- `test/journeys/session.ts`: `TestSession`; `signInAs(stack: Pick<E2eStack, "url" | "handles">, username: string): Promise<TestSession>`; `sessionClient(stack: Pick<E2eStack, "url">, session: TestSession): ApiClient`. `e2e/test_m2_admin.py`: the journey

**Interfaces taken:**

- From `add-web-shell` (merged): `ApiRequestError`; `ApiClient` (`get`, `post`, `put`, `patch`, `delete`); `createApiClient`; `FeatureSpec`; `createFeatureRegistry`.
- From `add-e2e-stack` (merged): `E2eStack`; `startE2eStack`; the fixture `fresh_state`.
- From `add-web-ui-kit`: `messageFor(code: string): string`; `registerMessages(messages: StringMap): void`; `StringMap`; `FALLBACK_MESSAGE: string`; `errorPanelModel(error: unknown): ErrorPanelModel`; `ErrorPanel`; `ConfirmDialog`; `LoadingState`; `toast`; `parseTokens(css: string): StringMap`; `findRawColours(css: string): SourceHit[]`; `findInlineStyleUse(source: string): SourceHit[]`; `assert_accessible(page)`.
- From `add-web-data-kit`: `DataTable`; `DataTableSpec`; `dataTableModel(spec: DataTableSpec): DataTableModel`; `createCursorList<T>(fetchPage: FetchPage<T>, opts?: CursorListOptions): CursorList<T>`; `FetchPage<T>`; `cursorPageFetcher<T>(client: Pick<ApiClient, "get">, path: string, opts: { parseItem: (raw: unknown) => T | null; query?: Readonly<Record<string, QueryValue>> }): FetchPage<T>`; `Form`; `Field`; `FormErrors`; `mapEnvelopeErrors(error: unknown, fields: readonly string[]): FormErrors`.
- From `add-web-sign-in`: `browserSession: BrowserSession` (its client adds the CSRF header and sends a dead session to `/sign-in?error=SESSION_ENDED`); `useSession`; the fixture `users`; `login(page, user, path="/sign-in")`.
- From `add-admin-api` (HTTP under `/api/v1`, `session`, `manage_users_roles`): `GET /users`, `PATCH /users/{userId}`, `GET /roles`, `GET /teams`, `POST /teams`, `DELETE /teams/{teamId}`, `GET /idp-group-map`, `PUT /idp-group-map`, `DELETE /idp-group-map`; the wire shapes `Account` (with `roles`, `teams`, `localRoles`) and `GroupMapping` (the web types `AccountRow` and `MappingRow` are this unit's); the codes `ALREADY_EXISTS`, `IN_USE`, `ELEVATION_REFUSED`, `UNKNOWN_ISSUER`, `OPERATION_REFUSED` and `ENGINE_KEY_REQUIRED`.
- From `add-audit-api` (HTTP, `session`, `read_audit`): `GET /audit` (filter `event_type`; `AuditEventRecord`), `GET /audit/verify` (`AuditVerification`, with `anchorsChecked` and `anchorsVerified`).
- From `add-roles-and-memberships`: `rbacPart` (the seeds of `parts/30-rbac.ts`); `RBAC_SEED_TEAM`; `RBAC_SEED_MAPPINGS`.
- From `add-oidc-login`: `completeFakeLogin`; `oidcApi`; `SESSION_COOKIE`.
- From `add-api-pep` (HTTP): `GET /api/v1/me`; the 403 envelope with a decision id; the event `authz.denied`. From `add-api-conventions` (wire): lists answer `{ items, next_cursor }`; creates honour `Idempotency-Key`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@9dbc21e, checked line by line).

## Out of scope

Service accounts and their roles, IdP links, the review-profile switch, creating or deleting people, `/policy-decisions`, other audit filters, exporting the log, and any server change. The first admin is bootstrapped by `add-admin-cli`.
