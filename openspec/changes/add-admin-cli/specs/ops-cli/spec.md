## Purpose

The break-glass command line: `ursitoare admin` commands act as the database owner on one tenant at a time, all audited, and a registry lets other units add commands.

## ADDED Requirements

### Requirement: The command registry holds named commands in three namespaces
A `CommandRegistry` SHALL hold a command under a one-word name (top level) or a two-word name `admin <word>` or `flow <word>`, find a command from the leading words of an argument list, list commands sorted by name, and refuse an invalid or duplicate name with `CLI_INVALID_COMMAND`.

#### Scenario: Register, find, list
- **WHEN** `createCommandRegistry()` gets `registerCommand` for `flow validate`, `admin grant-role` and `init-secrets`, then `find(["admin", "grant-role", "--user", "u1"])`, `find(["init-secrets", "--dir", "/x"])`, `find(["flow"])`, `find(["admin", "nope"])`, `find([])`, `list()`
- **THEN** the finds return `{ name: "admin grant-role", command, rest: ["--user", "u1"] }`, `{ name: "init-secrets", command, rest: ["--dir", "/x"] }`, then `null` three times; `list()` names are `["admin grant-role", "flow validate", "init-secrets"]`

#### Scenario: Refusals
- **WHEN** `registerCommand` gets the names `Admin x`, `admin`, `flow`, `help`, `admin a b`, `x_y` and `""`, then `admin grant-role` twice, and a command whose `options` hold one named `help`
- **THEN** each of the seven bad names, the duplicate and the `help` option throws code `CLI_INVALID_COMMAND`, and `list()` holds only the first `admin grant-role`

### Requirement: The dispatcher parses arguments and reports through exit codes
`runCli` SHALL resolve the command from `argv`, parse its flags strictly against its options plus `--help`, resolve to the exit code `run` returns, print help for no command, `help`, `--help`, a group name and `--help` after a command, and answer an unknown command or bad argument with one line `CODE: message` on stderr and exit code 2.

#### Scenario: Help
- **WHEN** a registry holds `admin demo` (summary `Demo command`, option `name`, a required string, summary `Who to greet`) and `solo` (summary `Solo command`), and `runCli` gets `[]`, `["help"]`, `["--help"]`, `["admin"]` and `["admin", "demo", "--help"]`
- **THEN** all five resolve to 0 and `run` is never called; the first three print lines matching `/admin demo\s+Demo command/` and `/solo\s+Solo command/`; `["admin"]` prints the first only; the last prints a first line starting `usage: ursitoare admin demo --name <string>` and lines holding `Demo command` and `Who to greet`

#### Scenario: Flags and the exit code
- **WHEN** `admin demo` (options `name` string and `flag` boolean, `run` returns 7) gets `["admin", "demo", "--name=abc", "--flag"]`, then `["admin", "demo", "--name", "x"]`
- **THEN** `run` receives `args` `{ name: "abc", flag: true }` then `{ name: "x" }`, and both runs resolve 7

#### Scenario: Unknown commands and bad arguments
- **WHEN** `runCli` gets `["nope"]`, `["admin", "nope"]`, `["admin", "demo"]` (required `name` missing), `["admin", "demo", "--name"]`, `["admin", "demo", "--name", "a", "--bogus"]` and `["admin", "demo", "--name", "a", "extra"]`
- **THEN** each resolves to 2 with empty stdout and `run` not called; stderr is one line starting `CLI_UNKNOWN_COMMAND: ` for the first two and `CLI_USAGE: ` for the rest

#### Scenario: A failing command
- **WHEN** `run` throws `new CliError("CLI_NO_TENANT", "no tenant exists")`, `new CliError("CLI_USAGE", "bad value")`, then `new Error("password pw-secret-xyz refused")`
- **THEN** the exits are 1, 2 and 1, with stderr `CLI_NO_TENANT: no tenant exists\n`, `CLI_USAGE: bad value\n` and exactly `CLI_INTERNAL: command failed\n`

### Requirement: Only a database command connects, and only as the owner role
`runCli` SHALL run a command whose `database` is `false` with `owner` `null`, without calling `loadConfig` or `connectOwner`; for one whose `database` is `true` it SHALL load the configuration, open one connection from `config.database.owner`, check that its `session_user` is `ursitoare_owner`, pass it as `owner`, and close it once after `run` returns or throws; it SHALL refuse a missing endpoint, an invalid configuration, an unreachable database and another role, naming no secret.

#### Scenario: Opened, used, closed
- **WHEN** `env` holds `URSITOARE_DATABASE_OWNER_URL` (`db.ownerEndpoint.url`) and `URSITOARE_DATABASE_OWNER_PASSWORD_FILE` `/run/owner-pw`, `readSecret` answers that path with the owner password, `connectOwner` is a spy returning `{ pool: db.ownerPool, close }`, and `probe` prints `SELECT session_user` run on `owner.pool`, then a second `probe` throws
- **THEN** the first resolves to 0 with stdout `ursitoare_owner\n`, the spy got an endpoint with `db.ownerEndpoint.url` and `close` ran once; the throwing one exits 1 and `close` has run twice in all

#### Scenario: Top-level command beside a broken configuration
- **WHEN** `selftest` (`database` false, prints `hello`) and `admin probe` (`database` true) are registered, `env` is `{ URSITOARE_PORT: "abc" }`, `connectOwner` is a spy, and `runCli` gets `["selftest"]`, then `["admin", "probe"]`
- **THEN** the first resolves to 0 with stdout `hello\n`, `run` saw `owner` `null` and the spy was not called; the second resolves to 1 with stderr `CLI_CONFIG_INVALID: URSITOARE_PORT: must be an integer from 1 to 65535\n`

#### Scenario: Refusals
- **WHEN** `probe` runs with no `URSITOARE_DATABASE_OWNER_URL`; with the password file answered as `""`; with the owner variables set to `db.appEndpoint.url` and the app password; with a spy whose pool `query` rejects `new Error("connect ECONNREFUSED pw-secret-xyz")`
- **THEN** each exits 1 with stderr starting `CLI_OWNER_REQUIRED: `, `CLI_CONFIG_INVALID: URSITOARE_DATABASE_OWNER_PASSWORD_FILE`, `CLI_OWNER_ROLE_INVALID: ` and `CLI_DATABASE_UNAVAILABLE: `; `run` never ran, the spy was not called for the first two, `close` ran once for each of the last two, and no output holds `pw-secret-xyz` or `ECONNREFUSED`

### Requirement: Only src/cli, src/config and src/db read the owner endpoint
`checkOwnerEndpoint` SHALL report `ARCH_OWNER_ENDPOINT` for every non-test file under `src/` outside the modules `cli`, `config` and `db` that reads a `.database.owner` member, destructures `owner` from a `.database` expression, or holds a string literal containing `DATABASE_OWNER`.

#### Scenario: Offending and allowed files
- **WHEN** `checkOwnerEndpoint(snapshotOf(files))` gets `src/api/a.ts` with `const o = config.database.owner;`, `src/runs/b.ts` with `const { owner } = config.database;`, `src/tools/c.ts` with `const v = "URSITOARE_DATABASE_OWNER_URL";`, those lines again in `src/cli/d.ts`, `src/config/e.ts`, `src/db/f.ts` and `src/api/g.test.ts`, and `src/api/h.ts` with `const o = other.owner; const a = config.database.app;`
- **THEN** the result is three violations, for `src/api/a.ts`, `src/runs/b.ts` and `src/tools/c.ts` in that order, each `{ code: "ARCH_OWNER_ENDPOINT", file, line: 1, message: "the owner database endpoint is read only in src/cli, src/config and src/db" }`

#### Scenario: The repository
- **WHEN** `checkOwnerEndpoint(readSnapshot())` runs
- **THEN** it returns `[]`

### Requirement: Every admin command runs in one tenant and is audited
`defineAdminCommand` SHALL build a database command that resolves one tenant (`--tenant`, or the only one) and the operator (`--operator`, else `USER`, else `cli`), runs the spec and one `cli.command_run` event in one `withTenantTx`, records a refusal or failure in its own transaction, and prints the result after the commit (lines, or one JSON line with `--json`).

#### Scenario: Tenant selection
- **WHEN** `resolveCliTenant(db.ownerPool, undefined)` runs with no tenant, with only `tenant_a`, and after `seedTwoTenants(db)`; and with `tenant_b`, `ghost` and `bad id!` requested
- **THEN** the results are rejection `CLI_NO_TENANT`, `{ tenantId: "tenant_a", reviewProfile: "solo" }`, rejection `CLI_TENANT_REQUIRED`, `{ tenantId: "tenant_b", reviewProfile: "solo" }`, rejection `CLI_TENANT_UNKNOWN`, rejection `CLI_USAGE`

#### Scenario: Success is audited with the effect
- **WHEN** `admin demo`, from `defineAdminCommand("admin demo", spec)` whose `run` appends `demo.touched` through `appendAudit(call.tx, ...)` and returns `{ lines: ["touched"], data: { touched: true }, audit: { count: 1 } }`, runs with `--tenant tenant_a --operator ci`, with `USER` `alice` in `env`, with neither, and with `--json`
- **THEN** every run exits 0; stdout is `touched\n` three times, then `{"touched":true}\n`; per run the chain of `tenant_a` holds `demo.touched` then `cli.command_run`, with actor `{ kind: "system", id: "operator:ci" }` (then `operator:alice`, `operator:cli`, `operator:cli`), target `{ kind: "tenant", id: "tenant_a" }` and payload `{ command: "admin demo", outcome: "ok", count: 1 }`; `tenant_b` has no event

#### Scenario: A refusal or failure rolls back and is audited
- **WHEN** the demo `run` appends `demo.touched` and throws `new CliError("CLI_NO_IDP", "no identity provider")`, and in a second run `new Error("boom")`
- **THEN** both exit 1 with empty stdout and stderr `CLI_NO_IDP: no identity provider\n` then `CLI_INTERNAL: command failed\n`; the chain has no `demo.touched` and two `cli.command_run` events with payloads `{ command: "admin demo", outcome: "refused", code: "CLI_NO_IDP" }` and `{ command: "admin demo", outcome: "failed", code: "CLI_INTERNAL" }`

#### Scenario: The audit store fails
- **WHEN** the owner pool is wrapped to reject every statement that mentions `ursitoare.audit_head`, and the demo `run` succeeds
- **THEN** the exit is 1, stdout is empty, stderr holds `CLI_INTERNAL: command failed` and a line starting `CLI_AUDIT_FAILED: `, and the chain of `tenant_a` is empty

#### Scenario: No tenant, and option clashes
- **WHEN** both tenants exist and `admin demo` runs without `--tenant`; and `defineAdminCommand("admin x", spec)` gets a spec with an option named `tenant`, then `operator`, then `json`
- **THEN** the run exits 1 with `CLI_TENANT_REQUIRED: ` and both chains stay empty; each `defineAdminCommand` call throws `CLI_INVALID_COMMAND`

### Requirement: admin bootstrap-admin maps the first admin group
`ursitoare admin bootstrap-admin` SHALL call `mapBootstrapAdminGroup` for the chosen tenant with the issuer of its only identity provider (or `--issuer`), the group `--group` (default `bootstrapAdminGroup(env)`) and the operator, and change nothing when a group already maps to `tenant_admin`.

#### Scenario: Once, and the configured default
- **WHEN** `provisionTenantIdp` routes `tenant_a` (`org-a`) and `tenant_b` (`org-b`) at issuer `https://idp.example/realms/ursitoare`, and `--tenant tenant_a --operator ops` runs, then the same with `--group other-admins`, then `--tenant tenant_b` with `URSITOARE_BOOTSTRAP_ADMIN_GROUP` `corp-admins` in `env`
- **THEN** all exit 0 with stdout `mapped ursitoare-admins to tenant_admin\n`, `already mapped: tenant_admin has a group; nothing changed\n` and `mapped corp-admins to tenant_admin\n`; `listGroupMappings` lists only `ursitoare-admins` for `tenant_a`; its chain is `identity.bootstrap_admin_mapped` (actor `operator:ops`), a `cli.command_run` with payload `{ command: "admin bootstrap-admin", outcome: "ok", group: "ursitoare-admins", issuer, result: "mapped" }` (`issuer` as above), then one with `group: "other-admins"` and `result: "already_mapped"`

#### Scenario: Issuer and input refusals
- **WHEN** it runs with `--issuer https://other.example`; for a tenant with no identity provider; for one with two and no `--issuer`; with `--group ""`; with `URSITOARE_BOOTSTRAP_ADMIN_GROUP` of 256 characters; with `--operator "bad name!"`
- **THEN** the exits and prefixes are 1 `RBAC_UNKNOWN_ISSUER: `, 1 `CLI_NO_IDP: `, 1 `CLI_ISSUER_REQUIRED: `, 1 `RBAC_INVALID: ` twice and 2 `CLI_USAGE: `; the first five leave an event `outcome: "refused"` with that code; no mapping is added

### Requirement: admin grant-role is the audited break-glass grant
`ursitoare admin grant-role --user <id> --role <role>` SHALL call `grantRole` with the actor `{ kind: "operator", name }` for the chosen tenant, print `granted` or `already held`, and leave every refusal of `grantRole` as its `RBAC_*` code.

#### Scenario: Grant to a human, twice, as JSON
- **WHEN** alice (from `upsertUserFromClaims`) exists in `tenant_a` and `--tenant tenant_a --user <alice> --role tenant_admin --operator ops` runs twice, then with `--json`
- **THEN** all exit 0 with stdout `granted tenant_admin to <alice>\n`, `already held: tenant_admin for <alice>\n` and `{"result":"exists","userId":"<alice>","roleId":"tenant_admin"}\n`; `loadMemberships` gives `{ roles: ["tenant_admin"], teams: [] }`; the chain holds one `identity.role_granted` (actor `operator:ops`, payload `{ roleId: "tenant_admin", via: "operator" }`) and three `cli.command_run` events with payload `{ command: "admin grant-role", outcome: "ok", userId: <alice>, roleId: "tenant_admin", result }`, `result` `granted`, `exists`, `exists`

#### Scenario: Refusals and isolation
- **WHEN** it runs with user `usr_ghost`; role `Bad Role`; role `ghost`; no `--role`; and bob, a user of `tenant_b`, with `--tenant tenant_a`
- **THEN** the exits and prefixes are 1 `RBAC_NOT_FOUND: `, 1 `RBAC_INVALID: `, 1 `RBAC_NOT_FOUND: `, 2 `CLI_USAGE: `, 1 `RBAC_NOT_FOUND: `; all but the fourth leave an event `outcome: "refused"`; bob holds no role

### Requirement: admin verify-audit checks the hash chain and its anchors
`ursitoare admin verify-audit` SHALL call `verifyChain` for the chosen tenant with the configured engine key (without anchors only when `--no-anchors` is given), print the verdict, exit 0 for an intact chain and 3 for a broken one, and append its own event afterwards.

#### Scenario: An intact chain, with anchors
- **WHEN** `tenant_a` holds 3 events from `appendAuditCommitted` and an anchor from `anchorHead` with the key `"ab".repeat(32)`, `env` holds `URSITOARE_ENGINE_KEY_FILE` `/run/engine-key` answered with that key, and `verify-audit` runs twice, with `--json`, and for `tenant_b` (no events)
- **THEN** all exit 0 with stdout `chain ok: 3 events checked\nanchors: checked\n`, `chain ok: 4 events checked\nanchors: checked\n`, `{"ok":true,"checked":5,"firstBadSeq":null,"reason":null,"anchorsChecked":true}\n` and `chain ok: 0 events checked\nanchors: checked\n`; the first event after a check has payload `{ command: "admin verify-audit", outcome: "ok", ok: true, checked: 3, anchorsChecked: true, firstBadSeq: null, reason: null }`

#### Scenario: A broken chain
- **WHEN** the owner switches `audit_event_append_only` off, changes the payload of seq 2 of `tenant_a`'s 3 events, switches it on, and `verify-audit` runs twice
- **THEN** both exit 3 with stdout `chain broken at seq 2: hash\nchecked: 1\n` and append an event whose payload has `ok: false`, `firstBadSeq: "2"`, `reason: "hash"`

#### Scenario: Without the engine key
- **WHEN** `env` has no `URSITOARE_ENGINE_KEY_FILE`, `tenant_a` has 3 events, and `verify-audit` runs, then with `--no-anchors`
- **THEN** the first exits 1 with `CLI_ENGINE_KEY_REQUIRED: ` and an event `outcome: "refused"`; the second exits 0 with stdout `chain ok: 4 events checked\nanchors: not checked\n` and `anchorsChecked: false` in its event

### Requirement: admin list-users shows the tenant's users
`ursitoare admin list-users` SHALL print one tab-separated line per user of the chosen tenant in `user_id` order (id, kind, state, roles, teams, display name with control characters replaced by `?`), at most `--limit` (default 50) after `--after`, and `next: <user_id>` when more remain; `--json` prints `{ users, next }`.

#### Scenario: Pages, memberships, hostile names
- **WHEN** `tenant_a` has alice (name `"Eve\u001b[2Jx\ty"`, role `author` from `grantRole`, team `finance` by owner insert), bob and a service account owned by alice, `tenant_b` has mallory, and `list-users` runs with no flag, `--limit 2`, `--limit 2 --after <second id>`, and `--json --limit 1`
- **THEN** the first prints the three users sorted by id, alice's line ending `\tauthor\tfinance\tEve?[2Jx?y`, bob's with empty role and team columns, no `next:` line; the second prints two lines and `next: <second id>`; the third the last user; the fourth one JSON line `{ users, next }` whose user holds `email`, `ownerUserId`, `roles`, `teams` and the raw name; mallory never appears

#### Scenario: Empty and bad flags
- **WHEN** `list-users` runs for a tenant with no user, with `--limit abc`, with `--limit 0` and with `--after "bad id!"`
- **THEN** the exits are 0 with stdout `no users\n` (event `outcome: "ok"`, `count: 0`), then 2 `CLI_USAGE: ` three times (events `outcome: "refused"`, `code: "CLI_USAGE"`)

### Requirement: The entry point and the default registry run the CLI from the process
`cliMain` SHALL run `runCli` with `createDefaultRegistry()`, `readProcessEnv()` and the process streams unless overridden; `src/cli/main.ts` run as the entry script SHALL set `process.exitCode` from it.

#### Scenario: The default registry through cliMain
- **WHEN** `cliMain(["help"], { env: {}, stdout, stderr })`, `cliMain(["admin", "list-users"], ...)` and `cliMain(["nope"], ...)` run
- **THEN** they resolve to 0, 1 and 2; the first prints lines for `admin bootstrap-admin`, `admin grant-role`, `admin list-users` and `admin verify-audit`, the second writes `CLI_OWNER_REQUIRED: ` to stderr; `registerAdminCommands` on a fresh registry lists exactly those four, and `createDefaultRegistry().list()` includes them

#### Scenario: The process environment
- **WHEN** a test sets `process.env.URSITOARE_CLI_PROBE` to `x`, calls `readProcessEnv()`, sets that key on the result to `y`, then reads `process.env.URSITOARE_CLI_PROBE` and deletes it
- **THEN** the result first held `"x"` and `process.env` still holds `"x"`
