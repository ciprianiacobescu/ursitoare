## 1. The process environment

- [ ] 1.1 Write `src/config/environment.test.ts` first (scenario "The process environment"; the test sets and deletes `process.env.URSITOARE_CLI_PROBE` itself), then implement `readProcessEnv` in `src/config/environment.ts` (`{ ...process.env }`, a copy) and re-export it from `src/config/index.ts`, implementing requirement "The entry point and the default registry run the CLI from the process"

## 2. The command registry

- [ ] 2.1 Write `src/cli/registry.test.ts` first (scenarios "Register, find, list" and "Refusals"; commands are plain objects `{ summary, options: {}, database: false, run }`; refusals compared by `code`), then implement `CliError` and `CliErrorCode` in `src/cli/errors.ts` and `createCommandRegistry` in `src/cli/registry.ts` (decision 1: name patterns, reserved words, duplicate and `help` option refusal, `find` on one or two words, `list` sorted by code point), exporting every public symbol of `src/cli/*.ts` from `src/cli/index.ts`, implementing requirement "The command registry holds named commands in three namespaces"

## 3. The dispatcher

- [ ] 3.1 Write `src/cli/run.test.ts` first (a harness of capture writers and a registry with `admin demo` and `solo`, every command with `database: false`; scenarios "Help", "Flags and the exit code", "Unknown commands and bad arguments" and "A failing command"), then implement `runCli` in `src/cli/run.ts` for database-free commands (decisions 2 and 3: help, `parseArgs`, required options, exit codes, the error mapping with `CLI_INTERNAL`), implementing requirement "The dispatcher parses arguments and reports through exit codes"

## 4. The owner connection

- [ ] 4.1 Write `src/cli/owner.test.ts` first (`withTestDatabase()`, the harness of design.md § Test plan with `connectOwner` spies; scenarios "Top-level command beside a broken configuration", "Opened, used, closed" and "Refusals"; the unreachable database is a spy whose pool `query` rejects), then implement `src/cli/owner.ts` (decision 5: default `createPool` with `max: 4`, the `session_user` check against `ROLE_OWNER`, one `close` in a `finally`) and the `database: true` branch of `runCli` in `src/cli/run.ts` (lazy `loadConfig`, `CLI_CONFIG_INVALID`, `CLI_OWNER_REQUIRED`), implementing requirement "Only a database command connects, and only as the owner role"

## 5. The owner-endpoint rule

- [ ] 5.1 Write `test/arch/owner-endpoint.test.ts` first (scenarios "Offending and allowed files" and "The repository": `checkOwnerEndpoint(snapshotOf({...}))` compared with `assert.deepEqual` to the three violations, and `checkOwnerEndpoint(readSnapshot())` to `[]`, through a helper that returns `"THROWN"` on a throw, as `test/arch/network.test.ts` does), then implement `checkOwnerEndpoint` in `test/arch/owner-endpoint.ts` (decision 14; TypeScript AST as in `test/arch/control-routes.ts`; modules `cli`, `config`, `db` and test files skipped; `sortViolations`), implementing requirement "Only src/cli, src/config and src/db read the owner endpoint"

## 6. Admin commands

- [ ] 6.1 Write `src/cli/tenant.test.ts` first (`withTestDatabase()` with no tenant, then one inserted by the owner, then `seedTwoTenants(db)`; scenario "Tenant selection", rejections compared by `code` after `.then((v) => v, (e: unknown) => e)`), then implement `resolveCliTenant` in `src/cli/tenant.ts` (decision 6), implementing requirement "Every admin command runs in one tenant and is audited"
- [ ] 6.2 Write `src/cli/admin/define.test.ts` first (`withTestDatabase()`, `seedTwoTenants(db)`; the demo spec appends `demo.touched` with `appendAudit`; scenarios "Success is audited with the effect", "A refusal or failure rolls back and is audited", "The audit store fails" (a `connectOwner` wrapper over `db.ownerPool` whose clients reject statements containing `ursitoare.audit_head`) and "No tenant, and option clashes"), then implement `defineAdminCommand`, `AdminCall`, `AdminResult` and `AdminSpec` in `src/cli/admin/define.ts` (decisions 7 and 8: operator, tenant, one `withTenantTx`, the event, refusal and failure events in their own transaction, `CLI_AUDIT_FAILED`, output after commit, `--json`), implementing requirement "Every admin command runs in one tenant and is audited"

## 7. The four commands

- [ ] 7.1 Write `src/cli/admin/bootstrap-admin.test.ts` first (`provisionTenantIdp` for both tenants, a second issuer for `CLI_ISSUER_REQUIRED`; scenarios "Once, and the configured default" and "Issuer and input refusals"), then implement `bootstrapAdminCommand` in `src/cli/admin/bootstrap-admin.ts` with `defineAdminCommand("admin bootstrap-admin", ...)` (decision 9), implementing requirement "admin bootstrap-admin maps the first admin group"
- [ ] 7.2 Write `src/cli/admin/grant-role.test.ts` first (alice from `upsertUserFromClaims` in `tenant_a`, bob in `tenant_b`; scenarios "Grant to a human, twice, as JSON" and "Refusals and isolation"), then implement `grantRoleCommand` in `src/cli/admin/grant-role.ts` (decision 10), implementing requirement "admin grant-role is the audited break-glass grant"
- [ ] 7.3 Write `src/cli/admin/verify-audit.test.ts` first (events from `appendAuditCommitted`, an anchor from `anchorHead` with `{ reveal: () => "ab".repeat(32) }`, a `tamper` helper copied from `src/audit/verify.test.ts`; scenarios "An intact chain, with anchors", "A broken chain" and "Without the engine key"), then implement `verifyAuditCommand` in `src/cli/admin/verify-audit.ts` (decision 11), implementing requirement "admin verify-audit checks the hash chain and its anchors"
- [ ] 7.4 Write `src/cli/admin/list-users.test.ts` first (alice with the hostile name, bob, a service account from `createServiceAccount`, mallory in `tenant_b`, roles from `grantRole`, the team by owner inserts inside `withTenantTx(db.ownerPool, a, ...)`: `INSERT INTO ursitoare.team (tenant_id, team_id)` for `finance`, then `INSERT INTO ursitoare.membership (tenant_id, membership_id, user_id, team_id, source, source_issuer)` with `source` `idp_claim`, a non-empty issuer, `granted_by` unset and a `membership_id` of `mem_1`; scenarios "Pages, memberships, hostile names" and "Empty and bad flags"), then implement `listUsersCommand` in `src/cli/admin/list-users.ts` and `safeText` in `src/cli/output.ts` (decision 12), implementing requirement "admin list-users shows the tenant's users"

## 8. The entry point

- [ ] 8.1 Write `src/cli/main.test.ts` first (scenario "The default registry through cliMain"), then implement `registerAdminCommands` in `src/cli/admin/index.ts`, `createDefaultRegistry` in `src/cli/builtin.ts` (calls `registerAdminCommands`; the one list later units extend) and `cliMain` with the entry guard in `src/cli/main.ts` (decision 13), implementing requirement "The entry point and the default registry run the CLI from the process"
