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
`cliMain` SHALL run `runCli` with `createDefaultRegistry()`, `readProcessEnv()` and the process streams unless overridden; `src/cli/main.ts` run as the entry script SHALL set `process.exitCode` from it. `createDefaultRegistry()` SHALL register the five `admin` commands, `flow test`, `flow validate`, the top-level `init-secrets` and the top-level `db-roles`, `db-prepare`, `tenant-create`, `tenant-idp` and `tenant-sink`, and no other.

#### Scenario: The default registry through cliMain
- **WHEN** `cliMain` gets `["help"]`, `["admin", "list-users"]`, `["nope"]` and `["init-secrets"]`, with `env` `{}`; then `["init-secrets", "--dir", D]` with `D` a path inside an empty temp directory
- **THEN** they resolve to 0, 1, 2, 2 and 0; the first prints thirteen lines, one for each command `createDefaultRegistry()` registers, in the order of `list()`: `admin bootstrap-admin`, `admin grant-role`, `admin list-users`, `admin revoke-role`, `admin verify-audit`, `db-prepare`, `db-roles`, `flow test`, `flow validate`, `init-secrets`, `tenant-create`, `tenant-idp` and `tenant-sink`, the `db-prepare` line being `db-prepare  apply the schema migrations and the durable-execution schema`, the `db-roles` line `db-roles  create the engine database and the two database roles`, the `flow test` line `flow test  run a flow offline against mocks`, the `init-secrets` line `init-secrets  write the first-run secrets and the .env file`, the `tenant-create` line `tenant-create  create a tenant with its review profile`, the `tenant-idp` line `tenant-idp  register a tenant's identity provider` and the `tenant-sink` line `tenant-sink  bind the audit sink tokens to a tenant`; the second a `CLI_OWNER_REQUIRED: ` line on stderr; the fourth stderr `CLI_USAGE: missing required option --dir\n` with empty stdout; the fifth prints 17 lines (16 `wrote …` lines, then `first user owner; the one-time password is in secrets/first_user_password`) with empty stderr, and `D/.env` is a file of mode `0o600` with six lines; `registerAdminCommands` on a fresh registry lists exactly the five admin names, `registerFlowCommands` on a fresh registry lists exactly `flow test` and `flow validate`, and `createDefaultRegistry().list()` holds the thirteen names above and no other

#### Scenario: The process environment
- **WHEN** a test sets `process.env.URSITOARE_CLI_PROBE` to `x`, calls `readProcessEnv()`, sets that key on the result to `y`, reads `process.env.URSITOARE_CLI_PROBE` and deletes it
- **THEN** the result first held `"x"`; `process.env` still holds `"x"`

### Requirement: flow test runs a flow offline against mocks
`ursitoare flow test --file <path> --mocks <path>` SHALL validate the flow, check the mocks, run the flow in mode `mock` on an in-memory store without a database, print one line per step and a final `COMPLETED <terminal node>` or `FAILED <code> <node>`, and exit 0 for a completed run and 1 for a failed run, an invalid flow or a mock problem.

#### Scenario: A completed and a failed mock run
- **WHEN** `FILE` holds `JSON.stringify(payOnceVersion().flow)` as `flow.json`, `CAT` is `TEST_CATALOGUE_PATH`, and `cliMain(["flow", "test", "--file", FILE, "--mocks", M, "--input", I, "--catalogue", CAT], { env: {}, registry, ... })` runs with `MOCKS` (and again with `--json`), with `lookup` answering `{ vendor_id: "v2", status: "blocked" }`, with `pay: [{ error: { code: "E_DOWN", message: "secret-text" } }]`, and, with `FILE0` holding `JSON.stringify(FLOW0)` (the same flow with `inputs` `{ type: "object" }`, `lookup.with` `{ vendor_name: "Acme" }` and `pay.with` `{ vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: 120, currency: "EUR", reference: "inv-1" }`, so it requires no input), `MOCKS` and no `--input`, with `pay` answering `{ payment_id: "p\u001b\u202e1", status: "paid" }` and `--json`, while `globalThis.fetch` is a recorder
- **THEN** the first exits 0 with empty stderr and stdout `0 lookup block completed\n1 route switch completed active\n2 pay block completed\n3 done end completed\nCOMPLETED done\n`; the `--json` run prints one line whose parse equals `{ state: "completed", terminalNode: "done", error: null, output: { payment_id: "pay-1" }, steps }` with the four steps as `{ seq, nodeId, kind, state, outcome, error }`; the second exits 1 with stdout `0 lookup block completed\n1 route switch completed default\n2 rejected end failed\nFAILED FLOW_FAILED rejected\n`; the third exits 1 with last lines `2 pay block failed` and `FAILED INTERPRETER_TOOL_FAILED pay`, and neither `secret-text` nor `E_DOWN` in stdout or stderr; the `FILE0` run exits 0 with empty stderr and the same stdout as the first run (`{}` is the default input); the sanitised run exits 0 and prints one line holding `"output":{"payment_id":"p\u001b\u202e1"}` with the two escapes written as text (a backslash, `u` and four hex digits) and neither the ESC character nor U+202E raw, while `JSON.parse` of the line gives back `payment_id` `"p" + ESC + U+202E + "1"`; the recorder saw no call, and `flowTestCommand.database` is `false`

#### Scenario: Invalid flow, mock problems, a schema-refused input and an internal failure
- **WHEN** `flow test` runs with the same `FILE` and `MOCKS` but no `--catalogue`; with `--catalogue CAT` and mocks `{}`; with mocks `{ lookup: [{ output: { status: "active" } }], pay: [{ output: PAID }] }`; with `--input` holding `{"vendor":"Acme"}`; with mocks `MOCKS` plus the key `"gho\u001bst\u202e"` holding `[]` (the key holds ESC and U+202E after parsing); and with `--input` holding the text `{"vendor":"Acme\u0000","invoice":"inv-1","amount":120}` (a string with U+0000, which the memory store refuses with `RunDataError`)
- **THEN** each exits 1; the first five print on stdout: a first line beginning `INVALID <FILE>: ` and ending `error(s)` and a last line `  hint: no --catalogue given, so every block is unknown`, then `MOCKS 2 problem(s)\n  lookup missing: no mock entry\n  pay missing: no mock entry\n`, then `MOCKS 1 problem(s)\n  lookup[0] schema: / required\n`, then `FAILED INTERPRETER_INPUT_INVALID -\n` and one `  <key>: <value>` line per entry of the error's `details`, among them `  path: /\n` and `  keyword: required\n`; no run is started for the first three and the fifth; the fifth prints, with ESC and U+202E each replaced by `?`, `MOCKS 1 problem(s)\n  gho?st? unknown_node: no such node\n`; the sixth exits 1 with empty stdout and stderr exactly `CLI_INTERNAL: command failed\n`, the error text appearing nowhere

#### Scenario: Usage errors and help
- **WHEN** `flow test` runs with no `--mocks`; with a `--mocks` path that does not exist; with a `--file` path that does not exist; with a mocks file holding `{`; with an `--input` file holding `[]`; with an `--input` file holding `{`; with an `--input` path that does not exist; with a directory as `--mocks`; with `/dev/null` as `--input`; with a FIFO as `--file`; with a `--file` that is a symlink loop; with a `--file` that is a regular file of mode 0o000; with a `--file` of 1,048,577 bytes; with a `--catalogue` file holding `{` and with a `--catalogue` path that does not exist; and with `--help`
- **THEN** the first fifteen exit 2 with stdout empty and stderr `CLI_USAGE: missing required option --mocks`, `CLI_USAGE: cannot read --mocks (ENOENT)`, `CLI_USAGE: cannot read --file (ENOENT)`, `CLI_USAGE: --mocks is not valid JSON`, `CLI_USAGE: --input must be a JSON object`, `CLI_USAGE: --input is not valid JSON`, `CLI_USAGE: cannot read --input (ENOENT)`, `CLI_USAGE: cannot read --mocks (not a regular file)`, `CLI_USAGE: cannot read --input (not a regular file)`, `CLI_USAGE: cannot read --file (not a regular file)`, `CLI_USAGE: cannot read --file (ELOOP)`, `CLI_USAGE: cannot read --file (EACCES)`, `CLI_USAGE: cannot read --file (too large)`, `CLI_USAGE: catalogue: invalid JSON` and `CLI_USAGE: cannot read --catalogue (ENOENT)`; `--help` exits 0 with empty stderr and exactly the output the existing renderer gives (`usage:` line, summary, option lines): `usage: node src/cli/main.ts flow test --file <string> --mocks <string> [--input <string>] [--catalogue <string>] [--json]\nrun a flow offline against mocks\n  --file <string>  flow file to test\n  --mocks <string>  mocks JSON file\n  [--input <string>]  input JSON file, default {}\n  [--catalogue <string>]  catalogue JSON file\n  [--json]  print the result as JSON\n`

### Requirement: flow test runs code nodes and code hooks in a sandbox pool
`createFlowTestCommand` SHALL build the `flow test` command so that its run gives `InterpreterDeps.sandbox` a pool made with `FLOW_TEST_POOL` (`{ size: 1 }`) by `deps.createSandbox` (default `createWorkerSandbox`), so a `code` node and a `code` hook run in the pool; a sandbox fault or a rejecting `run` SHALL print `FAILED INTERPRETER_CODE_FAILED <node>` and none of the fault's text, and the exit code stays 1.

#### Scenario: A code node completes in the pool
- **WHEN** `FILE` holds `CODE_PAY_TEXT` (lookup block, `normalize` code node, pay block, end), `CAT` is `TEST_CATALOGUE_PATH`, `M` holds `lookup` answering `{ vendor_id: "v1", status: "active" }` and `pay` answering `{ payment_id: "pay-1", status: "paid" }`, `I` holds `{"vendor":"Acme","invoice":"inv-1","amount":1234.567,"currency":"eur"}`, and `cliMain(["flow", "test", "--file", FILE, "--mocks", M, "--input", I, "--catalogue", CAT], …)` runs with `ids` `sequentialIds(0)`, `clock` `fixedClock("2026-11-13T09:00:00.000Z")` and a registry holding `createFlowTestCommand({ createSandbox })`, where `createSandbox` records its argument and returns a recording wrapper of `createWorkerSandbox(argument)`; then the same with `--json`; then the same first argv with the default `flowTestCommand`
- **THEN** the first run exits 0 with empty stderr and stdout `0 lookup block completed\n1 normalize code completed\n2 pay block completed\n3 done end completed\nCOMPLETED done\n`; `createSandbox` got one argument deep-equal to `{ size: 1 }` (and `FLOW_TEST_POOL` is frozen with that value); the pool saw one `run`, with `input` `{ amount: 1234.567, currency: "eur" }`, `limits` `{ timeoutMs: 1000, memoryBytes: 33554432, maxStackBytes: 262144, maxOutputBytes: 1048576 }`, `options` `{ seed: "run_00000000-0000-7000-8000-000000000000:normalize:1", nowIso: "2026-11-13T09:00:00.000Z", binding: "input", result: "object" }`, and its result is `ok` with `value` `{ amount: 1234.57, currency: "EUR", is_large: true }`; the `--json` run prints one line whose parse equals `{ state: "completed", terminalNode: "done", error: null, output: { payment_id: "pay-1" }, steps }` with four steps `lookup` (`block`), `normalize` (`code`), `pay` (`block`), `done` (`end`), each `state` `"completed"`, `outcome` and `error` `null`; the default `flowTestCommand` exits 0 with the same stdout as the first run (on main it exits 1 with `0 lookup block completed\n1 normalize code failed\nFAILED INTERPRETER_NO_SANDBOX normalize\n`); `flowTestCommand.database` is `false` and `createFlowTestCommand()` has the same `summary`, `options` and `database` as `flowTestCommand`

#### Scenario: A code hook runs in the pool
- **WHEN** the `mutate` hook-run flow (a `pre` code hook on `lookup`, the `normalize` code node with a `post` code hook, a pay block) runs with `M`, `--input` `{"vendor":" Acme ","amount":120,"currency":"eur"}` and the recording pool of the scenario above; then the `fail` hook-run flow (a `post` code hook on `lookup` returning `fail` for status `blocked`) runs with `--input` the same and mocks whose `lookup` answers `{ vendor_id: "v2", status: "blocked" }`; then `fail` again with `M`
- **THEN** the first exits 0 with stdout `0 lookup block completed\n1 normalize code completed\n2 pay block completed\n3 done end completed\nCOMPLETED done\n`, and the pool saw three `run` calls whose results are `ok` with `value`, in order, `{ action: "continue", input: { vendor_name: "Acme" } }`, `{ amount: 120, currency: "eur" }` and `{ action: "continue", output: { amount: 120, currency: "EUR" } }`; the second exits 1 with stdout `0 lookup block failed\nFAILED HOOK_FAILED lookup\n` and one `run` whose value is `{ action: "fail", reason: "vendor blocked" }`; the third exits 0 with the stdout above and two `run` calls (on main the first two print exactly `FAILED INTERPRETER_NO_SANDBOX lookup\n` and exit 1)

#### Scenario: A sandbox fault fails the node and prints only its code
- **WHEN** `flow test` runs `CODE_PAY_TEXT` with `Math.round(input.amount * 100) / 100` replaced by `input.missing.value` (`BOOM`) and the recording pool of real workers; then `CODE_PAY_TEXT` with a `createSandbox` whose pool answers `run` with `{ ok: false, fault: { code: "runtime_error", message: "boom-secret" }, stats: { ms: 0, memBytes: 0 } }`; then with a pool whose `run` rejects `new Error("pool-secret")`
- **THEN** all three exit 1 with empty stderr and stdout `0 lookup block completed\n1 normalize code failed\nFAILED INTERPRETER_CODE_FAILED normalize\n`; the real pool's result for `BOOM` is not `ok` and its `fault.code` is `runtime_error`; neither `boom-secret` nor `pool-secret` appears in stdout or stderr

### Requirement: flow test creates its pool after validation and closes it on every exit path
The `flow test` run SHALL call `deps.createSandbox` once, after the flow validated, the mocks passed `checkMocks` and the input parsed, and never before; it SHALL close that pool exactly once, after the output is written, whether the run completed, failed, was refused by `startRun` or threw; a `close` that rejects or throws SHALL change neither the output, the exit code nor the error.

#### Scenario: Created after validation and closed once on every exit path
- **WHEN** `flow test` runs the rows of `test-plan.md` § Pool rows with an `events` list that records `create` (the `createSandbox` call), `run` (a pool `run`), `close` (a pool `close`), `write` (a stdout write) and `errwrite` (a stderr write): P1 a completed code run; P2 a pool answering a fault; P3 `--input` `{"vendor":"Acme"}`; P4 `--input` `{"vendor":"Acme\u0000","invoice":"inv-1","amount":120,"currency":"eur"}`; P5 a stdout whose `write` throws `new Error("EPIPE secret")`; P6 a `createSandbox` that records `create` and throws `new Error("no pool")`; P7 a flow without a code node (`pay-once`, input `{"vendor":"Acme","invoice":"inv-1","amount":120}`); and N1 no `--catalogue`; N2 mocks `{}`; N3 `--input` holding `[]`; N4 mocks holding `{`; N5 `--help`
- **THEN** the events are P1 `create`, `run`, `write`, `close` (exit 0); P2 the same (exit 1, stdout `0 lookup block completed\n1 normalize code failed\nFAILED INTERPRETER_CODE_FAILED normalize\n`); P3 `create`, `write`, `close` (exit 1, stdout `FAILED INTERPRETER_INPUT_INVALID -\n  path: /\n  keyword: required\n`); P4 `create`, `close`, `errwrite` (exit 1, stdout empty, stderr `CLI_INTERNAL: command failed\n`); P5 `create`, `run`, `write`, `close`, `errwrite` (exit 1, stderr `CLI_INTERNAL: command failed\n`, no `EPIPE` in it); P6 `create`, `errwrite` (exit 1, stdout empty, stderr `CLI_INTERNAL: command failed\n`, no pool and so no `close`); P7 `create`, `write`, `close` (exit 0, stdout `0 lookup block completed\n1 route switch completed active\n2 pay block completed\n3 done end completed\nCOMPLETED done\n`, no `run`: a pool with no code to run is still created once and closed once); every other row has `createSandbox` called zero times and no `run` or `close` event: N1 exit 1 with stdout starting `INVALID <FILE>: 2 error(s)\n`, N2 exit 1 with stdout `MOCKS 2 problem(s)\n  lookup missing: no mock entry\n  pay missing: no mock entry\n`, N3 exit 2 with stderr `CLI_USAGE: --input must be a JSON object\n`, N4 exit 2 with stderr `CLI_USAGE: --mocks is not valid JSON\n`, N5 exit 0 with stdout starting `usage: node src/cli/main.ts flow test`; the argument of every `createSandbox` call is deep-equal to `{ size: 1 }`

#### Scenario: A failing close changes nothing
- **WHEN** `flow test` runs P1 with a pool whose `close` closes the real pool and then rejects `new Error("close-secret")`; then P2 with a pool whose `close` is a plain function that throws `new Error("close-secret")`; then P4 with the rejecting `close`
- **THEN** the first exits 0 with the stdout of P1 and empty stderr; the second exits 1 with the stdout of P2 and empty stderr; the third exits 1 with empty stdout and stderr `CLI_INTERNAL: command failed\n`; `close` ran once in each, and `close-secret` appears in no stdout or stderr

### Requirement: The module graph lets the CLI import the sandbox
`checkModuleGraph` SHALL accept an import of `src/sandbox/index.ts` from a file under `src/cli/`, keep refusing it from a file under `src/api/`, and keep refusing every other module the graph does not list for `cli`.

#### Scenario: The CLI may import the sandbox and the API may not
- **WHEN** `checkModuleGraph(snapshotOf(files))` gets `src/cli/flow/test.ts` with `import { createWorkerSandbox } from "../../sandbox/index.ts";` on line 1, `src/api/a.ts` with `import type { T } from "../sandbox/index.ts";` on line 4 (after three empty lines), `src/cli/flow/x.ts` with `import { r } from "../../runtimes/index.ts";` on line 2 (after one empty line) and `src/cli/flow/y.ts` with `import { p } from "../../sandbox/pool.ts";` on line 1; then with the first file alone; then `checkModuleGraph(readSnapshot())`
- **THEN** the first call returns three violations in this order: `src/api/a.ts:4` `ARCH_MODULE_EDGE` with message `api may not import sandbox; allowed: ` followed by `MODULES.api.allowed.join(", ")` and ` (test/arch/modules.ts)`, `src/cli/flow/x.ts:2` `ARCH_MODULE_EDGE` with message `cli may not import runtimes; allowed: ` followed by `MODULES.cli.allowed.join(", ")` and ` (test/arch/modules.ts)`, and `src/cli/flow/y.ts:1` `ARCH_DEEP_IMPORT` with message `import sandbox through src/sandbox/index.ts`; the second returns `[]`; the third returns `[]`, and `collectImports` of `src/cli/flow/test.ts` in that snapshot includes a ref with specifier `../../sandbox/index.ts` and `typeOnly` false

### Requirement: The admin database endpoint is read from a variable and a file
`loadAdminDatabase(env, readSecret?)` SHALL return the `DatabaseEndpoint` named by `URSITOARE_DATABASE_ADMIN_URL` (a postgres URL with a host, no password and one database name) and `URSITOARE_DATABASE_ADMIN_PASSWORD_FILE`, and refuse anything else with a `ConfigError` that names the variable and holds neither URL nor password; `isDatabaseUrl` SHALL be exported from `src/config/config.ts`.

#### Scenario: Valid and refused admin settings
- **WHEN** `loadAdminDatabase` runs with `URSITOARE_DATABASE_ADMIN_URL` `postgres://postgres@db.internal:5432/ursitoare`, `URSITOARE_DATABASE_ADMIN_PASSWORD_FILE` `/run/secrets/db_superuser_password` and a reader that returns `pw-admin\n`; then with the URL unset; with `postgres://postgres:pw-in-url@db.internal/ursitoare`; with `postgres://postgres@db.internal`; with a database name of 64 `d` characters (and then of 63); with the file variable unset; with a reader that throws; with a reader that returns `\n`; and `isDatabaseUrl` runs on the valid URL, on one with a password and on `mysql://x/y`
- **THEN** the first returns `url` `postgres://postgres@db.internal:5432/ursitoare` and a `password` whose `reveal()` is `pw-admin`, and `JSON.stringify` of the result holds `[REDACTED]` and not `pw-admin`; every refusal is a `ConfigError` whose message is `<variable>: <reason>`: the unset URL `CONFIG_INVALID`, `URSITOARE_DATABASE_ADMIN_URL: must be set`; the URL with a password `CONFIG_INVALID`, `URSITOARE_DATABASE_ADMIN_URL: must be a postgres or postgresql URL with a host, no password and only sslmode disable or verify-full` (no `pw-in-url` in it); the URLs without a name and with 64 characters `CONFIG_INVALID`, `URSITOARE_DATABASE_ADMIN_URL: must name one database: up to 63 letters, digits, underscores or hyphens, not starting with a digit or hyphen` (63 characters are accepted); the unset file variable `CONFIG_INVALID`, `URSITOARE_DATABASE_ADMIN_PASSWORD_FILE: must be set`; the throwing and the empty reader `CONFIG_SECRET_EMPTY`, `URSITOARE_DATABASE_ADMIN_PASSWORD_FILE: file is missing, unreadable or empty`; `isDatabaseUrl` answers `true`, `false`, `false`

### Requirement: db-roles creates the engine database and both roles
`db-roles` SHALL be a `database: false` command that, once `URSITOARE_DATABASE_ADMIN_URL`, `URSITOARE_DATABASE_ADMIN_PASSWORD_FILE`, `URSITOARE_DATABASE_OWNER_PASSWORD_FILE` and `URSITOARE_DATABASE_PASSWORD_FILE` are set, connect as the admin user to the `postgres` database of that server, create the database the URL names when it is missing, run `ensureRoles` on it with the two password files, print `database: created|present` and `roles: created <names>|updated`, exit 0 on every repeat, and print no password and no URL.

#### Scenario: A fresh cluster, a repeat and a dropped database
- **WHEN** on a fresh embedded cluster `runCli(["db-roles"])` runs with the admin URL `postgres://postgres@127.0.0.1:<port>/ursitoare`, three password files (admin, owner `OW`, app `AP`); then again; then with the owner file holding `OW2`; then after the superuser dropped `ursitoare` with `WITH (FORCE)`
- **THEN** run 1 exits 0 with stdout `database: created\nroles: created ursitoare_owner ursitoare_app\n` and empty stderr, `pg_database` holds `ursitoare`, both roles can log in (`rolsuper` false) with `OW` and `AP`, and `ursitoare_owner` has `CREATE` on it; run 2 prints `database: present\nroles: updated\n`; run 3 prints the same and the owner role then refuses `OW` (SQLSTATE `28P01`) and accepts `OW2`; run 4 exits 0 with stdout `database: created\nroles: updated\n` and `ursitoare_owner` connects to the new database with `OW2`; no output holds the admin password, `OW`, `OW2` or `AP`

#### Scenario: Missing settings and an unreachable server
- **WHEN** `db-roles` runs on a fresh cluster where one valid `db-roles` has run, with, in turn: each of the four variables unset; the URL `postgres://postgres:pw-in-url@127.0.0.1:<port>/ursitoare`; the URL `postgres://postgres@127.0.0.1:<port>`; a missing admin password file; an admin password file holding `wrong-pw`; a URL whose port has no listener (`freePort()`); and an app password file holding `pw` and U+00E9
- **THEN** every run exits 1; the unset variables give, with empty stdout, `CLI_DATABASE_ADMIN_REQUIRED: set <VARIABLE> for this command` (the first unset one in the order URL, admin file, owner file, app file); the next three give `CLI_CONFIG_INVALID: URSITOARE_DATABASE_ADMIN_URL: must be a postgres or postgresql URL with a host, no password and only sslmode disable or verify-full`, `CLI_CONFIG_INVALID: URSITOARE_DATABASE_ADMIN_URL: must name one database: up to 63 letters, digits, underscores or hyphens, not starting with a digit or hyphen` and `CLI_CONFIG_INVALID: URSITOARE_DATABASE_ADMIN_PASSWORD_FILE: file is missing, unreadable or empty`; the wrong password and the dead port give `CLI_DATABASE_UNAVAILABLE: the database is unreachable with the admin credentials`; the last prints stdout `database: present\n` and stderr `CLI_ROLES_FAILED: could not bootstrap the database roles (DB_INVALID)\n`; no stderr holds `pw-in-url` or `wrong-pw`

### Requirement: db-prepare applies the schema and the durable schema
`db-prepare` SHALL be a `database: true` command that runs `prepareDatabase` with the run's clock and then `prepareDurable` on the owner URL with its password, print `migrations: <n> applied; partitions: <m>; dbos: ready`, apply nothing on a repeat, and turn any `DB_*`, `MIGRATION_*` or `DURABLE_*` failure into `CLI_PREPARE_FAILED` that names only the original code.

#### Scenario: Apply, repeat and a failing step
- **WHEN** `runCli(["db-prepare"])` runs with `clock` `fixedClock("2026-11-25T10:00:00.000Z")` on a database made from `template0` (roles present, no schema) with the owner URL and `connectOwner` returning the owner pool; then again; then after `UPDATE ursitoare.schema_migration SET checksum = repeat('0', 64) WHERE version = 1`; then on another such database where the superuser first created the schema `dbos`; and `prepareDatabase` runs with the same clock on a third such database to give the references `N` (applied) and `M` (partitions)
- **THEN** the first exits 0 with stdout `migrations: <N> applied; partitions: <M>; dbos: ready\n` and empty stderr (at main@31968a29 `N` is 22 and `M` is 166), the ledger holds `N` rows and the `dbos` schema exists; the second exits 0 with stdout `migrations: 0 applied; partitions: 0; dbos: ready\n`; the third exits 1 with empty stdout and stderr `CLI_PREPARE_FAILED: database preparation failed (MIGRATION_CHECKSUM_MISMATCH)\n`; the fourth exits 1 with empty stdout and stderr `CLI_PREPARE_FAILED: database preparation failed (DURABLE_UNAVAILABLE)\n`

### Requirement: tenant-create creates a tenant by name
`tenant-create --name <name> [--review-profile solo|team]` SHALL be a `database: true` command that calls `ensureTenant` with the run's `ids` and `clock` (profile `solo` by default) and print one line `tenant <id> "<name>" created` or `tenant <id> "<name>" unchanged` (the name through `safeText`; the id is the second whitespace-separated field), and SHALL refuse an unknown profile with `CLI_USAGE`.

#### Scenario: Create, repeat, conflict and bad input
- **WHEN** on a migrated database `runCli` with `ids` `sequentialIds(0)` and `clock` `fixedClock("2026-11-25T10:00:00.000Z")` runs `tenant-create --name "E2E tenant"` twice; `--name "Team Co" --review-profile team`; `--name "Team Co"`; `--name "Other" --review-profile gold`; `--name " x"`; the name `A "q"` followed by a newline, `B` and U+202E; and no `--name`
- **THEN** the exits and outputs are: 0 `tenant ten_00000000-0000-7000-8000-000000000000 "E2E tenant" created\n`, then 0 with `unchanged` in place of `created`; 0 `tenant ten_00000000-0000-7000-8000-000000000001 "Team Co" created\n`; 1 with stderr `TENANT_PROFILE_CONFLICT: the tenant exists with another review profile\n`; 2 with `CLI_USAGE: --review-profile must be solo or team\n`; 1 with `TENANT_INVALID: invalid tenant name\n`; 0 `tenant ten_00000000-0000-7000-8000-000000000002 "A "q"?B?" created\n`; 2 with `CLI_USAGE: missing required option --name\n`; the table holds the three tenants with `review_profile` `solo`, `team`, `solo`, the first with `created_at` `2026-11-25T10:00:00.000Z`, and no row for `Other` or ` x`

### Requirement: A setup command names its tenant
`resolveSetupTenant(pool, args)` SHALL resolve `--tenant <id>` or `--tenant-name <name>` to a tenant, refuse both together with `CLI_USAGE`, and with neither behave as `resolveCliTenant` does.

#### Scenario: By id, by name and ambiguous
- **WHEN** `resolveSetupTenant(db.ownerPool, args)` runs on a database with no tenant, with `args` `{}`; after `ten_one` "One" exists, with `{}`; after `tenant_a` "Tenant A" and `tenant_b` "Tenant B" exist, with `{}`, `{ tenant: "tenant_b" }`, `{ "tenant-name": "Tenant B" }`, `{ tenant: "tenant_b", "tenant-name": "Tenant B" }`, `{ "tenant-name": "Nobody" }`, `{ tenant: "nobody" }`, `{ tenant: "bad id" }` and `{ "tenant-name": " Tenant B" }`
- **THEN** the results are, in order: `CliError` `CLI_NO_TENANT` (`no tenant exists`); `{ tenantId: "ten_one", reviewProfile: "solo" }`; `CLI_TENANT_REQUIRED` (`several tenants exist; pass --tenant <id>`); `{ tenantId: "tenant_b", reviewProfile: "solo" }` twice; `CLI_USAGE` (`pass --tenant or --tenant-name, not both`); `CLI_TENANT_UNKNOWN` (`no tenant has that name`); `CLI_TENANT_UNKNOWN` (`no tenant has that id`); `CLI_USAGE` (`--tenant is not a valid tenant id`); and `TenancyError` `TENANT_INVALID` (`invalid tenant name`)

### Requirement: tenant-idp registers an identity provider by tenant name
`tenant-idp [--tenant <id> | --tenant-name <name>] --issuer <url> --organization <alias>` SHALL be a `database: true` command that resolves its tenant with `resolveSetupTenant`, calls `provisionTenantIdp` with the run's clock and prints `idp <issuer> <organization> → <tenant id>` (issuer and organization through `safeText`), on a repeat too.

#### Scenario: Register, repeat and taken
- **WHEN** on a database with `tenant_a` "Tenant A", `tenant_b` "Tenant B" and `tenant_c` "Tenant C", `tenant-idp` runs with `--tenant-name "Tenant A" --issuer a` followed by a newline and `b`, with `--organization o`; with `--tenant-name "Tenant A" --issuer https://idp.example/realms/ursitoare --organization org-a` twice; with `--tenant tenant_b` and the same issuer and organization; with `--tenant-name "Tenant B"`, the same issuer and `--organization org-b`; with neither tenant option and with `--tenant-name Nobody` (each with the same issuer and `--organization org-c`); and with `--tenant-name "Tenant A"` and no `--issuer`
- **THEN** the exits and stderr or stdout are: 1 `IDENTITY_INVALID: invalid identity input\n`; 0 `idp https://idp.example/realms/ursitoare org-a → tenant_a\n` twice; 1 `IDENTITY_IDP_TAKEN: identity provider already routed\n`; 0 `idp https://idp.example/realms/ursitoare org-b → tenant_b\n`; 1 `CLI_TENANT_REQUIRED: several tenants exist; pass --tenant <id>\n`; 1 `CLI_TENANT_UNKNOWN: no tenant has that name\n`; 2 `CLI_USAGE: missing required option --issuer\n`; read in a tenant transaction, `tenant_idp` holds exactly `(tenant_a, https://idp.example/realms/ursitoare, org-a)` and `(tenant_b, https://idp.example/realms/ursitoare, org-b)`, and the table of routes holds one `idp` route for each of the two tenants

### Requirement: tenant-sink binds the sink tokens by tenant name
`tenant-sink [--tenant <id> | --tenant-name <name>]` SHALL be a `database: true` command that reads the files named by `URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE` and `URSITOARE_AUDIT_SINK_PROXY_TOKEN_FILE` before it resolves the tenant, binds the two tokens with `bindSinkTokens`, prints `sink tokens: broker <created|exists>, proxy <created|exists> → <tenant id>` and no token.

#### Scenario: Bind, repeat, taken and refused tokens
- **WHEN** on a database with `tenant_a` "Tenant A" and `tenant_b` "Tenant B", token files hold `BT` (64 `b` characters and a newline) and `PT` (64 `c` characters and a newline), `tenant-sink` runs with `--tenant-name "Tenant A"` twice; with `--tenant-name "Tenant B"`; with both files holding `BT`; with the broker variable unset; and with the proxy file missing
- **THEN** the exits and outputs are: 0 `sink tokens: broker created, proxy created → tenant_a\n`; 0 `sink tokens: broker exists, proxy exists → tenant_a\n`; 1 `CLI_SINK_TAKEN: a sink token is already bound to another tenant\n`; 1 `CLI_SINK_TOKENS_EQUAL: the two sink tokens must differ\n`; 1 `CLI_CONFIG_INVALID: URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE: must be set\n`; 1 `CLI_CONFIG_INVALID: URSITOARE_AUDIT_SINK_PROXY_TOKEN_FILE: file is missing, unreadable or empty\n`; the table of routes holds exactly one `mintkey_sink_broker` and one `mintkey_sink_proxy` row, both for `tenant_a`, with `key_hash` equal to `hashRouteKey(BT)` and `hashRouteKey(PT)`; `resolveTenantBy` on the app pool gives `tenant_a` for `("mintkey_sink_broker", BT)` and `("mintkey_sink_proxy", PT)` and `null` for `("mintkey_sink_proxy", BT)`; no stdout, stderr or row holds `BT` or `PT` as text

### Requirement: The setup commands bootstrap a fresh stack in five steps
`db-roles`, `db-prepare`, `tenant-create`, `tenant-idp` and `tenant-sink`, then `admin bootstrap-admin --tenant <id>` (the id `tenant-create` printed), SHALL ready a fresh cluster for the first sign-in whatever other tenants exist, and SHALL succeed again unchanged on a second run.

#### Scenario: Five steps twice with two other tenants present
- **WHEN** on a fresh embedded cluster `runCli` with the default registry, `ids` `sequentialIds(0)`, `clock` `fixedClock("2026-11-25T10:00:00.000Z")` and the variables of `test-plan.md` § Chain environment runs `db-roles`, `db-prepare`; an owner-pool statement inserts `tenant_a` "Tenant A" and `tenant_b` "Tenant B"; then `tenant-create --name "E2E tenant"`, `tenant-idp --tenant-name "E2E tenant" --issuer ISS --organization org-a`, `tenant-sink --tenant-name "E2E tenant"` and `admin bootstrap-admin --tenant <id of the tenant-create line> --issuer ISS --operator owner-job`, `ISS` being `http://localhost:8180/realms/ursitoare`; then the same six again
- **THEN** all twelve exit 0 with empty stderr; with `T` `ten_00000000-0000-7000-8000-000000000000` the stdouts of the first pass are `database: created\nroles: created ursitoare_owner ursitoare_app\n`; `migrations: <N> applied; partitions: <M>; dbos: ready\n` (`N` and `M` as in "Apply, repeat and a failing step"); `tenant T "E2E tenant" created\n`; `idp ISS org-a → T\n`; `sink tokens: broker created, proxy created → T\n`; `mapped ursitoare-admins to tenant_admin\nmembers of ursitoare-admins get tenant_admin at their next sign-in\n`; those of the second pass `database: present\nroles: updated\n`; `migrations: 0 applied; partitions: 0; dbos: ready\n`; the tenant line with `unchanged`; the same `idp` line; `sink tokens: broker exists, proxy exists → T\n`; `already mapped: tenant_admin has a group; nothing changed\n`; the cluster holds three tenants and one `idp`, `mintkey_sink_broker` and `mintkey_sink_proxy` route each, all for `T`
