# ops-cli Specification

## Purpose
The break-glass command line: audited `admin` commands run as the database owner on one tenant.

## Requirements

### Requirement: The command registry holds named commands
A `CommandRegistry` SHALL hold commands named by one word, `admin <word>` or `flow <word>`, find them from leading words, list them sorted, and refuse an invalid or duplicate name with `CLI_INVALID_COMMAND`.

#### Scenario: Register, find, list
- **WHEN** a new registry gets `flow validate`, `admin grant-role` and `init-secrets`, then `find(["admin", "grant-role", "--user", "u1"])`, `find(["init-secrets", "--dir", "/x"])`, `find(["flow"])`, `find(["admin", "nope"])`, `find([])`, `list()`
- **THEN** the finds give `{ name: "admin grant-role", command, rest: ["--user", "u1"] }`, `{ name: "init-secrets", command, rest: ["--dir", "/x"] }` and `null` three times; `list()` gives `["admin grant-role", "flow validate", "init-secrets"]`

#### Scenario: Refusals
- **WHEN** `registerCommand` gets the names `Admin x`, `admin`, `flow`, `help`, `admin a b`, `x_y` and `""`, then `admin grant-role` twice, and a command whose `options` hold one named `help`
- **THEN** the seven bad names, the duplicate and the `help` option each throw `CLI_INVALID_COMMAND`, and `list()` holds only the first `admin grant-role`

### Requirement: The dispatcher parses arguments and exits with a code
`runCli` SHALL parse flags strictly, print help, resolve to the exit code `run` returns, and answer an unknown command or bad argument with exit code 2 and one stderr line `CODE: message`.

#### Scenario: Help
- **WHEN** a registry holds `admin demo` (summary `Demo command`, details `Needs an identity provider.`, required string option `name` with summary `Who to greet`) and `solo` (summary `Solo command`), and `runCli` gets `[]`, `["help"]`, `["--help"]`, `["admin"]` and `["admin", "demo", "--help"]`
- **THEN** all five resolve to 0, `run` uncalled; the first three print lines matching `/admin demo\s+Demo command/` and `/solo\s+Solo command/`, `["admin"]` the first; the last prints `usage: node src/cli/main.ts admin demo --name <string>` first (`CLI_PROGRAM`), then lines holding `Demo command`, `Needs an identity provider.` and `Who to greet`

#### Scenario: Flags and the exit code
- **WHEN** `admin demo` (options `name` string and `flag` boolean, `run` returns 7) gets `["admin", "demo", "--name=abc", "--flag"]`, then `["admin", "demo", "--name", "x"]`
- **THEN** `run` receives `args` `{ name: "abc", flag: true }` then `{ name: "x" }`; both resolve 7

#### Scenario: Unknown commands and bad arguments
- **WHEN** `runCli` gets `["nope"]`, `["admin", "nope"]`, `["admin", "demo"]` (required `name` missing), `["admin", "demo", "--name"]`, `["admin", "demo", "--name", "a", "--bogus"]` and `["admin", "demo", "--name", "a", "extra"]`
- **THEN** each resolves to 2, `run` not called, stdout empty; stderr is `CLI_UNKNOWN_COMMAND: unknown command; run with --help to list the commands` for the first two, `CLI_USAGE: missing required option --name` for the third and `CLI_USAGE: invalid arguments; run with --help` for the rest

#### Scenario: A failing command
- **WHEN** `run` throws `new CliError("CLI_NO_TENANT", "no tenant exists")`, `new CliError("CLI_USAGE", "bad value")`, `new Error("password pw-secret-xyz refused")`
- **THEN** exit 1, 2, 1 with stderr `CLI_NO_TENANT: no tenant exists`, `CLI_USAGE: bad value` and `CLI_INTERNAL: command failed`

### Requirement: Only a database command connects, as the owner role
`runCli` SHALL open, for a `database: true` command only, one connection from `config.database.owner`, check it is `ursitoare_owner`, and close it once after `run`; it SHALL refuse a missing endpoint, a bad configuration, an unreachable database and another role, naming no secret.

#### Scenario: Opened, used, closed
- **WHEN** `env` holds the owner variables of design § Test plan, `connectOwner` is a spy returning `{ pool: db.ownerPool, close }`, and `probe` prints the result of `SELECT session_user`, then a second `probe` throws
- **THEN** the first resolves to 0 with stdout `ursitoare_owner\n`, the spy got `db.ownerEndpoint.url` and `close` ran once; the second exits 1, `close` has run twice

#### Scenario: A top-level command skips the configuration
- **WHEN** `selftest` (`database` false, prints `hello`) and `admin probe` (`database` true) are registered, `env` is `{ URSITOARE_PORT: "abc" }`, `connectOwner` is a spy, and `runCli` gets `["selftest"]`, then `["admin", "probe"]`
- **THEN** the first resolves to 0 with stdout `hello\n`, `run` saw `owner` `null`, the spy is uncalled; the second resolves to 1 with stderr `CLI_CONFIG_INVALID: URSITOARE_PORT: must be an integer from 1 to 65535`

#### Scenario: Refusals
- **WHEN** `probe` runs with no `URSITOARE_DATABASE_OWNER_URL`; with the password file answered as `""`; with the owner variables set to the app role's endpoint; with a spy whose pool `query` rejects `new Error("connect ECONNREFUSED pw-secret-xyz")`
- **THEN** each exits 1 with stderr `CLI_OWNER_REQUIRED: set URSITOARE_DATABASE_OWNER_URL and URSITOARE_DATABASE_OWNER_PASSWORD_FILE for this command`, `CLI_CONFIG_INVALID: URSITOARE_DATABASE_OWNER_PASSWORD_FILE: file is missing, unreadable or empty`, `CLI_OWNER_ROLE_INVALID: the owner variables must name the ursitoare_owner role` and `CLI_DATABASE_UNAVAILABLE: the database is unreachable with the owner credentials`; `run` never ran, the spy ran (closed once) only for the last two, no output holds `pw-secret-xyz` or `ECONNREFUSED`

### Requirement: Only cli, config and db read the owner endpoint
`checkOwnerEndpoint` SHALL report `ARCH_OWNER_ENDPOINT` for a non-test file under `src/` outside `cli`, `config` and `db` that reads the owner database endpoint in a form of design Decision 14.

#### Scenario: Offending and allowed files
- **WHEN** `checkOwnerEndpoint(snapshotOf(files))` gets the six forms of design Decision 14, one per file in `src/api` (`a.ts`, `i.ts`), `src/runs` (`b.ts`, `j.ts`) and `src/tools` (`c.ts`, `k.ts`); the first three again in `src/cli/d.ts`, `src/config/e.ts`, `src/db/f.ts` and `src/api/g.test.ts`; and `src/api/h.ts` with `const o = other.owner; const a = config.database.app;`
- **THEN** the result is six violations in the order above, each `{ code: "ARCH_OWNER_ENDPOINT", file, line: 1, message: "the owner database endpoint is read only in src/cli, src/config and src/db" }`

#### Scenario: The repository
- **WHEN** `checkOwnerEndpoint(readSnapshot())` runs
- **THEN** it returns `[]`

### Requirement: An admin command runs in one tenant and is audited
`defineAdminCommand` SHALL run an admin command and one `cli.command_run` event in one `withTenantTx` for the chosen tenant (`--tenant`, or the only one) and operator (`--operator`, else `USER`, else `cli`), audit a refusal or failure in a transaction of its own, and print only after the commit; `--json` output writes U+007F to U+009F, U+2028, U+2029, U+202A to U+202E and U+2066 to U+2069 as `\uXXXX`.

#### Scenario: Tenant selection
- **WHEN** `resolveCliTenant(db.ownerPool, undefined)` runs with no tenant, with only `tenant_a`, and after `seedTwoTenants(db)`; and with `tenant_b`, `ghost` and `bad id!` requested
- **THEN** the results are rejection `CLI_NO_TENANT`, `{ tenantId: "tenant_a", reviewProfile: "solo" }`, rejection `CLI_TENANT_REQUIRED`, `{ tenantId: "tenant_b", reviewProfile: "solo" }`, rejection `CLI_TENANT_UNKNOWN` (`no tenant has that id`) and `CLI_USAGE` (`--tenant is not a valid tenant id`)

#### Scenario: Success is audited with its effect
- **WHEN** `admin demo`, from `defineAdminCommand("admin demo", spec)` whose `run` appends `demo.touched` and returns `{ lines: ["touched"], data: { touched: true, n: "a\u202eb\u009c" }, audit: { count: 1 } }`, runs with `--tenant tenant_a --operator ci`, with `USER` `alice`, with neither, and with `--json`
- **THEN** every run exits 0; stdout is `touched\n` three times, then `{"touched":true,"n":"a\\u202eb\\u009c"}\n` (`JSON.parse` restores `data`); per run `tenant_a`'s chain holds `demo.touched` then `cli.command_run`, actor `{ kind: "system", id: "operator:ci" }` (then `operator:alice`, `operator:cli`, `operator:cli`), target `{ kind: "tenant", id: "tenant_a" }`, payload `{ command: "admin demo", outcome: "ok", count: 1 }`; `tenant_b` has no event

#### Scenario: A refusal or failure rolls back, audited
- **WHEN** the demo `run` appends `demo.touched` and throws `new CliError("CLI_NO_IDP", "no identity provider")`, and in a second run `new Error("boom")`
- **THEN** both exit 1, stdout empty, stderr `CLI_NO_IDP: no identity provider` then `CLI_INTERNAL: command failed`; the chain has no `demo.touched` and two `cli.command_run` events with payloads `{ command: "admin demo", outcome: "refused", code: "CLI_NO_IDP" }` and `{ command: "admin demo", outcome: "failed", code: "CLI_INTERNAL" }`

#### Scenario: The audit store fails
- **WHEN** the owner pool rejects every statement that mentions `ursitoare.audit_head` with `new Error("audit head down")` (no `code`), and the demo `run` writes no event and returns `{ lines: ["ok"], data: {}, audit: {} }`
- **THEN** exit 1, stdout empty, stderr `CLI_INTERNAL: command failed` then `CLI_AUDIT_FAILED: audit event could not be written`, `tenant_a`'s chain empty

#### Scenario: No tenant, and option clashes
- **WHEN** both tenants exist and `admin demo` runs without `--tenant`; and `defineAdminCommand` gets a spec with an option named `tenant`, then `operator`, then `json`
- **THEN** the run exits 1, stderr `CLI_TENANT_REQUIRED: several tenants exist; pass --tenant <id>`, both chains stay empty; each `defineAdminCommand` call throws `CLI_INVALID_COMMAND`

### Requirement: admin bootstrap-admin maps the first admin group
`admin bootstrap-admin` SHALL map the bootstrap admin group to `tenant_admin` through `mapBootstrapAdminGroup`, change nothing when a group already maps to it, and state its prerequisite and effect in `--help`.

#### Scenario: Once, and the configured default
- **WHEN** both tenants have an identity provider at issuer `https://idp.example/realms/ursitoare`, and `--tenant tenant_a --operator ops` runs, then with `--group other-admins`, then `--tenant tenant_b` with `URSITOARE_BOOTSTRAP_ADMIN_GROUP` `corp-admins` in `env`, then `--help`
- **THEN** all exit 0; stdout is `mapped ursitoare-admins to tenant_admin\nmembers of ursitoare-admins get tenant_admin at their next sign-in\n`, `already mapped: tenant_admin has a group; nothing changed\n`, the same two lines for `corp-admins`, and for `--help` the lines `Prerequisite: the tenant's identity provider is provisioned.` and `Effect: members of the group get tenant_admin at their next sign-in.`; `tenant_a` lists only `ursitoare-admins`; its chain is `identity.bootstrap_admin_mapped` (actor `operator:ops`), a `cli.command_run` with payload `{ command: "admin bootstrap-admin", outcome: "ok", group: "ursitoare-admins", issuer, result: "mapped" }`, then one with `group: "other-admins"`, `result: "already_mapped"`

#### Scenario: Issuer and input refusals
- **WHEN** it runs with `--issuer https://other.example`; for a tenant with no identity provider; for one with two, no `--issuer`; with `--group ""`; with `URSITOARE_BOOTSTRAP_ADMIN_GROUP` of 256 characters; with `--operator "bad name!"`
- **THEN** exit and stderr: 1 `RBAC_UNKNOWN_ISSUER: `, 1 `CLI_NO_IDP: the tenant has no identity provider; provision one first`, 1 `CLI_ISSUER_REQUIRED: the tenant has several identity providers; pass --issuer <url>`, 2 `CLI_USAGE: --group is not a valid group name`, 1 `CLI_CONFIG_INVALID: URSITOARE_BOOTSTRAP_ADMIN_GROUP: is not a valid group name` and 2 `CLI_USAGE: --operator is not a valid operator name`; the first five leave an event `outcome: "refused"` with that code; nothing is mapped

### Requirement: admin grant-role and revoke-role change a direct grant
`admin grant-role` and `admin revoke-role` (`--user`, `--role`) SHALL call `grantRole` or `revokeRole` as the operator, print the outcome (exit 0 in all four cases), and leave every refusal as its `RBAC_*` code.

#### Scenario: Grant to a human, twice, as JSON
- **WHEN** `grant-role --tenant tenant_a --user <alice> --role tenant_admin --operator ops` runs twice for alice of `tenant_a`, then with `--json`
- **THEN** all exit 0; stdout `granted tenant_admin to <alice>\n`, `already held: tenant_admin for <alice>\n` and `{"result":"exists","userId":"<alice>","roleId":"tenant_admin"}\n`; `loadMemberships` gives `{ roles: ["tenant_admin"], teams: [] }`; the chain holds one `identity.role_granted` (actor `operator:ops`, payload `{ roleId: "tenant_admin", via: "operator" }`) and three `cli.command_run` events with payload `{ command: "admin grant-role", outcome: "ok", userId, roleId, result }`, `result` `granted`, `exists`, `exists`

#### Scenario: Revoke twice, and an identity-provider role
- **WHEN** alice of `tenant_a` holds `tenant_admin` as a direct grant and `author` only through a group mapping (`idp_claim`), and `revoke-role` (same flags) runs, then with `--json`, then with `--role author`
- **THEN** all exit 0; stdout `revoked tenant_admin from <alice>\n`, `{"result":"absent","userId":"<alice>","roleId":"tenant_admin"}\n` and `not held: author for <alice>\n`; `loadMemberships` gives `{ roles: ["author"], teams: [] }`; the chain holds one `identity.role_revoked` (actor `operator:ops`) and three `cli.command_run` events with payload `{ command: "admin revoke-role", outcome: "ok", userId, roleId, result }`, `result` `revoked`, `absent`, `absent`

#### Scenario: Refusals and isolation
- **WHEN** each command runs with user `usr_ghost` (role `author`); role `Bad Role` (user alice); no `--user`; no `--role`; and bob of `tenant_b`, who holds `author`, with `--tenant tenant_a --role author`; and `grant-role` with role `ghost`
- **THEN** exit and stderr: 1 `RBAC_NOT_FOUND: `, 1 `RBAC_INVALID: `, 2 `CLI_USAGE: missing required option --user`, 2 `CLI_USAGE: missing required option --role`, 1 `RBAC_NOT_FOUND: ` (and `ghost`); the `RBAC_*` runs leave an event `outcome: "refused"` with that code; bob still holds `author`

### Requirement: admin verify-audit checks the chain and counts anchors
`admin verify-audit` SHALL call `verifyChain` with the engine key (none under `--no-anchors`), count the tenant's anchor rows, print the verdict and the count, exit 0 for an intact chain and 3 for a broken one, and append its event afterwards.

#### Scenario: An intact chain, with and without anchors
- **WHEN** `tenant_a` holds 3 events and one head anchor signed with the engine key of design § Test plan (`env` names its file), and `verify-audit` runs twice, with `--json`, and for `tenant_b` (no event, no anchor)
- **THEN** all exit 0; stdout `chain ok: 3 events checked\nanchors: 1 checked\n`, `chain ok: 4 events checked\nanchors: 1 checked\n`, `{"ok":true,"checked":5,"firstBadSeq":null,"reason":null,"anchorsChecked":true,"anchorsVerified":1}\n` and `chain ok: 0 events checked\nanchors: none recorded yet\n`; the first event after a check has payload `{ command: "admin verify-audit", outcome: "ok", ok: true, checked: 3, anchorsChecked: true, anchorsVerified: 1, firstBadSeq: null, reason: null }`; `tenant_b`'s has `anchorsChecked: false`, `anchorsVerified: 0`

#### Scenario: A broken chain
- **WHEN** seq 2 of `tenant_a`'s 3 events is tampered as `tamper` does in `src/audit/verify.test.ts`, and `verify-audit` runs twice with the engine key
- **THEN** both exit 3, stdout `chain broken at seq 2: hash\nchecked: 1\n`, and append an event with `ok: false`, `firstBadSeq: "2"`, `reason: "hash"`, `anchorsVerified: 0`

#### Scenario: Without the engine key
- **WHEN** `env` has no `URSITOARE_ENGINE_KEY_FILE`, `tenant_a` has 3 events, and `verify-audit` runs, then with `--no-anchors`
- **THEN** the first exits 1 with stderr `CLI_ENGINE_KEY_REQUIRED: set URSITOARE_ENGINE_KEY_FILE, or pass --no-anchors to check hashes only` and an event `outcome: "refused"`; the second exits 0 with stdout `chain ok: 4 events checked\nanchors: not checked\n` and `anchorsVerified: 0` in its event

### Requirement: admin list-users shows the tenant's users
`admin list-users` SHALL print one tab-separated line per user in `user_id` order (id, kind, state, roles, teams, display name with control characters as `?`), at most `--limit` (default 50) after `--after`, plus `next: <user_id>` when more remain; `--json` prints `{ users, next }`.

#### Scenario: Pages, memberships, hostile names
- **WHEN** `tenant_a` has alice (name `"Eve\u001b[2Jx\ty\u202e"`, role `author`, team `finance`), bob and a service account owned by alice, `tenant_b` has mallory, and `list-users` runs with no flag, `--limit 2`, `--limit 2 --after <second id>`, and `--json`
- **THEN** the first prints the three users by id, alice's line ending `\tauthor\tfinance\tEve?[2Jx?y?`, bob's with empty role and team columns; the second two lines and `next: <second id>`; the third the last user; the fourth one JSON line `{ users, next: null }` whose users hold `email`, `ownerUserId`, `roles`, `teams` and alice's raw name after `JSON.parse`, the text holding the escapes `\\u001b`, `\\u202e` and neither raw character; mallory never appears

#### Scenario: Empty and bad flags
- **WHEN** `list-users` runs for a tenant with no user, with `--limit abc`, with `--limit 0` and with `--after "bad id!"`
- **THEN** exit 0 with stdout `no users\n` (event `outcome: "ok"`, `count: 0`), then 2 with stderr `CLI_USAGE: --limit must be an integer from 1 to 200` twice and `CLI_USAGE: --after is not a valid user id` (events `outcome: "refused"`, `code: "CLI_USAGE"`)

### Requirement: The entry point runs the default registry
`cliMain` SHALL run `runCli` with `createDefaultRegistry()`, `readProcessEnv()` and the process streams unless overridden; `src/cli/main.ts` run as the entry script SHALL set `process.exitCode` from it.

#### Scenario: The default registry through cliMain
- **WHEN** `cliMain` gets `["help"]`, `["admin", "list-users"]` and `["nope"]`, with `env` `{}`
- **THEN** they resolve to 0, 1 and 2; the first prints a line for each of the five admin commands, the second a `CLI_OWNER_REQUIRED: ` line on stderr; `registerAdminCommands` on a fresh registry lists exactly `admin bootstrap-admin`, `admin grant-role`, `admin list-users`, `admin revoke-role` and `admin verify-audit`, as does `createDefaultRegistry().list()`

#### Scenario: The process environment
- **WHEN** a test sets `process.env.URSITOARE_CLI_PROBE` to `x`, calls `readProcessEnv()`, sets that key on the result to `y`, reads `process.env.URSITOARE_CLI_PROBE` and deletes it
- **THEN** the result first held `"x"`; `process.env` still holds `"x"`
