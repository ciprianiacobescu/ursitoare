## Purpose

`ursitoare init-secrets --dir <path>` writes every secret a first `docker compose up` needs: the engine key, the Mintkey key files and service tokens, the database and Keycloak passwords, the OIDC client secret and the first user's one-time password, each in the format of the process that reads it, plus a small `.env` of Keycloak's values. It creates, never overwrites, and prints no secret.

## ADDED Requirements

### Requirement: planSecrets names fifteen secret files and a .env, in one fixed order
`planSecrets(dir, random, opts?)` SHALL read nothing and write nothing. It SHALL answer `{ dirs, files, firstUser }`: `dirs` is `[<dir>/secrets]`; `files` holds one entry `{ path, bytes, mode: 0o600 }` per `SECRET_FILES` entry under `<dir>/secrets`, in the order of `SECRET_FILES`, then `<dir>/.env`; `firstUser` is `opts.firstUser` or `owner`. It SHALL call `random(32)` once per `SECRET_FILES` entry, in that order, and nowhere else. `SECRET_FILES` is, as `name` (`format`): readers (the environment variables that point at the file):
- `engine_key` (`hex64`): `URSITOARE_ENGINE_KEY_FILE`
- `kek` (`raw32`): `MINTKEY_VAULT_KEK_FILE`
- `signing_seed` (`raw32`): `MINTKEY_BROKER_SIGNING_KEY_FILE`
- `mk_issue_token` (`hex64`): `URSITOARE_EGRESS_BROKER_TOKEN_FILE`, `MINTKEY_MCP_SERVICE_TOKEN_FILE`
- `mk_proxy_token` (`hex64`): `MINTKEY_PROXY_SERVICE_TOKEN_FILE`, `URSITOARE_AUDIT_SINK_PROXY_TOKEN_FILE`
- `mk_broker_token` (`hex64`): `MINTKEY_BROKER_SERVICE_TOKEN_FILE`, `URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE`
- `mk_vault_proxy_token` (`hex64`): `MINTKEY_VAULT_PROXY_TOKEN_FILE`
- `mk_vault_writer_token` (`hex64`): `MINTKEY_VAULT_ADMIN_TOKEN_FILE`, `URSITOARE_EGRESS_VAULT_TOKEN_FILE`
- `db_superuser_password` (`hex64`): `POSTGRES_PASSWORD_FILE`, `URSITOARE_DATABASE_ADMIN_PASSWORD_FILE`
- `db_owner_password` (`hex64`): `URSITOARE_DATABASE_OWNER_PASSWORD_FILE`
- `db_app_password` (`hex64`): `URSITOARE_DATABASE_PASSWORD_FILE`
- `db_keycloak_password` (`hex64`): none
- `oidc_client_secret` (`hex64`): `URSITOARE_OIDC_CLIENT_SECRET_FILE`
- `keycloak_admin_password` (`hex64`): none
- `first_user_password` (`hex64`): none

#### Scenario: The plan lists the files, the modes and the random calls
- **WHEN** `planSecrets("/deploy", random)` runs with `random` the seeded source of `test-plan.md` § Fixtures, which records each argument
- **THEN** `dirs` is `["/deploy/secrets"]`; `files` has 16 entries whose `path` values are `/deploy/secrets/` followed by the 15 names above in that order, then `/deploy/.env`; every `mode` is `0o600`; `firstUser` is `"owner"`; `SECRET_FILES` deep-equals the 15 entries above (`readers` as listed, `[]` for the three with none); `random` was called 15 times, each with `32`

### Requirement: Every value is non-empty and in the format of its reader
A `hex64` file SHALL hold 64 lowercase hexadecimal characters of 32 random bytes and one `\n` (65 bytes). A `raw32` file SHALL hold exactly the 32 random bytes: no newline, no encoding, no PEM (the formats the vault and the broker read; proved on the stack, `test-plan.md` § STACK-ONLY). No two files SHALL hold the same value, and no `bytes` SHALL share memory with the `random` answer. A `random` answer whose length is not 32 SHALL fail the plan with `CLI_INTERNAL` and the message `random source returned the wrong length`; a throwing `random` SHALL propagate.

#### Scenario: Formats, distinct values and a reused buffer
- **WHEN** `planSecrets("/deploy", random)` runs with the seeded source (call `k` answers the SHA-256 digest of `init-secrets-test:<k>`), then again with a `random` that fills one `Uint8Array(32)` with the byte `k` on call `k` and returns that same array every time
- **THEN** in the first plan `engine_key` holds the text `0143a4cf6a918e393114230e1a80b18f085e6768f5ffa4d4c6f99a090ad13679` and `\n` (65 bytes), `kek` is the 32 bytes of hex `6299f5dc6b9df9ba41c4176c6371835da7e25df67154b8fe8e84e4516e431674` (32 bytes, last byte not `0x0a`), `signing_seed` the 32 bytes of hex `1d26225e0ddc8b63bfb3d6bf5a6c3ab0def58b7c92db59a063107e9e9d327215`, and the other twelve `hex64` files match `/^[0-9a-f]{64}\n$/` with the text of digest `k` (`test-plan.md` § Fixtures); the 15 values are pairwise different; in the second plan the 15 files are still pairwise different, file `k` holding 32 bytes of value `k` (as hex text for a `hex64` file) after `random` has run 15 times

#### Scenario: A short or throwing random source
- **WHEN** `planSecrets("/d", random)` runs with `random` answering 31 bytes, then 33 bytes, then throwing `new Error("entropy-secret")`
- **THEN** the first two throw a `CliError` with code `CLI_INTERNAL` and message `random source returned the wrong length`; the third throws that same error object, so `cliMain` prints `CLI_INTERNAL: command failed` and no text of it

### Requirement: The .env holds only Keycloak's six values
The `.env` entry SHALL hold exactly six lines `KEY=value\n`, in the order of `ENV_KEYS`: `KC_DB_PASSWORD`, `KC_BOOTSTRAP_ADMIN_USERNAME`, `KC_BOOTSTRAP_ADMIN_PASSWORD`, `KC_URSITOARE_CLIENT_SECRET`, `KC_URSITOARE_FIRST_USER`, `KC_URSITOARE_FIRST_PASSWORD`. The values SHALL be the text (without the newline) of `db_keycloak_password`, the fixed text `admin`, the text of `keycloak_admin_password`, of `oidc_client_secret`, `firstUser`, and the text of `first_user_password`. No key SHALL start with `URSITOARE_`. `firstUser` SHALL match `^[a-z][a-z0-9._-]{0,63}$`; any other value SHALL fail the plan with `CLI_USAGE` and the message `--first-user must match ^[a-z][a-z0-9._-]{0,63}$` before `random` is called.

#### Scenario: The six keys, the first user and a refused name
- **WHEN** `planSecrets("/deploy", random)` runs with the seeded source and no `opts`, then with `{ firstUser: "ana.m" }`; then `planSecrets("/d", random)` runs with `firstUser` `Bob`, `1a`, 65 times `a`, `""`, `a b`, `ana@x` and `"owner\nKC_BOOTSTRAP_ADMIN_USERNAME=evil"`
- **THEN** the `.env` text of the first is the six lines of `test-plan.md` § The .env (422 bytes, `KC_URSITOARE_FIRST_USER=owner`), the second plan's only different line is `KC_URSITOARE_FIRST_USER=ana.m` and its `firstUser` is `ana.m`; `ENV_KEYS` deep-equals the six keys in order; the values of lines 1, 3, 4 and 6 equal the text of files 12, 14, 13 and 15 of the plan; each of the seven bad names throws a `CliError` with code `CLI_USAGE` and that message, and `random` was called 0 times

### Requirement: writeSecrets never overwrites and removes what it wrote when a write fails
`writeSecrets(plan, fs)` SHALL first call `fs.exists` on every planned path in plan order and, when any exists, throw `CLI_SECRETS_EXIST` with the message `refusing to overwrite ` plus the existing paths in plan order joined by `, `, calling neither `mkdir` nor `writeNew`. Otherwise it SHALL call `fs.mkdir(dir, 0o700)` for each plan dir, then `fs.writeNew(path, bytes, 0o600)` for each file in plan order, and answer `{ written }`, the paths in plan order. A `writeNew` failure SHALL remove, with `fs.remove`, the failing path and then the paths already written, newest first, and then throw `CLI_SECRETS_FAILED` with the message `could not write <path>`; a `writeNew` failure with code `EEXIST` SHALL leave the clashing path alone and throw `CLI_SECRETS_EXIST` with the message `refusing to overwrite <path>`. A `remove` that fails SHALL not stop the others and SHALL add `; could not remove <paths>` (plan order of removal) to the message. A failing `exists` or `mkdir` SHALL throw `CLI_SECRETS_FAILED` with `could not check <path>` or `could not create <dir>`. When the failure has a `code` of capital letters, digits and underscores, ` (<code>)` follows the path (the `could not remove` part names paths only, never a code); no other text of the failure is used.

#### Scenario: Existing files stop the run before any write
- **WHEN** `writeSecrets` gets the plan of `planSecrets("/deploy", random)` and a fake `fs` (`test-plan.md` § The fake fs) in which `/deploy/secrets/kek` and `/deploy/.env` exist, then a fake `fs` with no file
- **THEN** the first throws `CLI_SECRETS_EXIST` with the message `refusing to overwrite /deploy/secrets/kek, /deploy/.env`, its `calls` hold 16 `exists` and no other call, and both files keep their content; the second answers `written` equal to the 16 paths of the plan with `calls` the 16 `exists`, `mkdir /deploy/secrets 448`, 15 `writeNew <path> 384 <length>` (lengths 65, 32, 32, then 65 twelve times) and `writeNew /deploy/.env 384 422`

#### Scenario: A failing dependency leaves nothing behind
- **WHEN** `writeSecrets` runs with the fake `fs` failing: `writeNew` of `mk_proxy_token` with code `ENOSPC`; the same with an error without a code and `remove` of `signing_seed` failing with code `EIO`; `writeNew` of `mk_proxy_token` with code `EEXIST`; `mkdir` with code `EACCES`; `exists` of `engine_key` with code `EACCES`; `writeNew` of `/deploy/.env` with code `EDQUOT`; each failure is `Object.assign(new Error("disk-secret"), { code })`
- **THEN** the first throws `CLI_SECRETS_FAILED` `could not write /deploy/secrets/mk_proxy_token (ENOSPC)` after `remove` of `mk_proxy_token`, `mk_issue_token`, `signing_seed`, `kek`, `engine_key` in that order; the second `could not write /deploy/secrets/mk_proxy_token; could not remove /deploy/secrets/signing_seed` with the other four removals still made; the third `CLI_SECRETS_EXIST` `refusing to overwrite /deploy/secrets/mk_proxy_token` after `remove` of `mk_issue_token`, `signing_seed`, `kek`, `engine_key` and none of `mk_proxy_token`; the fourth `could not create /deploy/secrets (EACCES)` with no `writeNew`; the fifth `could not check /deploy/secrets/engine_key (EACCES)` with one `exists` call and no `mkdir`; the sixth `could not write /deploy/.env (EDQUOT)` after 16 removals, `/deploy/.env` first; no message holds `disk-secret`

### Requirement: The command writes real files the engine can read
`createInitSecretsCommand(deps?)` SHALL build `init-secrets` with `database` `false`: it SHALL plan with `deps.random` (default `crypto.randomBytes`), write through `deps.fs` (default `nodeInitSecretsFs`, over `node:fs/promises`: `exists` is `lstat`, true on any entry including a dangling symlink and false only on `ENOENT`; `mkdir` is recursive; `writeNew` opens with flag `wx` and the given mode; `remove` ignores a missing path), create `<dir>/secrets` with mode 0700 and every file with mode 0600, and never follow or overwrite an existing entry. The text files SHALL be read by the engine's own loaders (`loadConfig`): `engine_key` as the engine key, `oidc_client_secret`, `mk_issue_token`, `mk_vault_writer_token`, `db_app_password` and `db_owner_password` through their `_FILE` variables.

#### Scenario: Real files, modes, a second run and a bad directory
- **WHEN** `cliMain(["init-secrets", "--dir", D])` runs with `env` `{}`, a registry holding `createInitSecretsCommand({ random })` with the seeded source and `D` a path two levels below an existing temp directory; then the same again; then with `D` holding `secrets/kek` (`keep`) and a symlink `.env` to a missing path; then with `--dir` `<a regular file>/x`
- **THEN** the first exits 0 with empty stderr; `D/secrets` has mode `0o700`, each of the 16 files `0o600`, `engine_key` is 65 bytes, `kek` and `signing_seed` 32, `.env` 422; the second exits 1 with empty stdout and stderr `CLI_SECRETS_EXIST: refusing to overwrite ` plus the 16 paths under `D` in plan order joined by `, ` and `\n`, and every file keeps its bytes; the third exits 1 with stderr `CLI_SECRETS_EXIST: refusing to overwrite <D>/secrets/kek, <D>/.env\n`, `secrets` still lists only `kek` (`keep`) and the symlink is untouched; the fourth exits 1 with stderr `CLI_SECRETS_FAILED: could not check <file>/x/secrets/engine_key (ENOTDIR)\n`

#### Scenario: The engine reads what was written
- **WHEN** the command writes `D` with the seeded source and `loadConfig` gets the 13 variables of `test-plan.md` § Disk (the engine key, both database passwords, the OIDC client secret, the broker token and the vault token as `_FILE` variables pointing at the file of the same role in `D/secrets`, with the database, issuer, broker, proxy and vault URLs); and `loadConfig` also gets the six `.env` lines of `D` parsed as `KEY=value`
- **THEN** the first call returns a config whose `engineKey`, `oidc.clientSecret`, `egress.brokerToken`, `egress.vault.token`, `database.app.password` and `database.owner.password` reveal the text of `engine_key`, `oidc_client_secret`, `mk_issue_token`, `mk_vault_writer_token`, `db_app_password` and `db_owner_password` (digests 1, 13, 4, 8, 11 and 10); the second returns without throwing, with `engineKey` `null` and no `oidc`, `egress` or database password

### Requirement: The default filesystem refuses an existing entry and removes what it made
`nodeInitSecretsFs` SHALL be an `InitSecretsFs` over `node:fs/promises`: `writeNew` rejects with the system's `EEXIST` for any existing entry and leaves it unchanged, and `remove` of a missing path resolves.

#### Scenario: The default fs on a real directory
- **WHEN** on a fresh temp directory `T`, `nodeInitSecretsFs` runs `exists(T/a)`, `mkdir(T/s, 0o700)`, `exists(T/s)`, `writeNew(T/s/f, [1, 2, 3], 0o600)`, `writeNew(T/s/f, [9], 0o600)`, `exists(T/l)` for a symlink `T/l` to a missing target, `remove(T/s/f)` and `remove(T/s/f)`; then `writeSecrets(planSecrets(T/d, random), fs)` runs with the seeded source and an `fs` that is `nodeInitSecretsFs` except that `writeNew` of `T/d/secrets/mk_proxy_token` rejects `Object.assign(new Error("x"), { code: "ENOSPC" })`
- **THEN** `exists` answers `false`, `true` and `true` in that order; `T/s/f` holds the bytes 1, 2, 3 with mode `0o600` after the first `writeNew`; the second `writeNew` rejects with `code` `EEXIST` and the file still holds 1, 2, 3; the first `remove` resolves and the file is gone, the second resolves; `writeSecrets` throws `CLI_SECRETS_FAILED` with the message `could not write <T>/d/secrets/mk_proxy_token (ENOSPC)`, and `T/d/secrets` lists no file

### Requirement: No secret reaches the output
The command SHALL print, on success, one line `wrote <path relative to --dir>` per file in plan order and a last line `first user <name>; the one-time password is in secrets/first_user_password`, and nothing on stderr. No line of stdout or stderr, on any path, SHALL hold the text of a secret: not a `hex64` value, not the hex or base64 of a `raw32` value, not a line of the `.env`.

#### Scenario: The output names files and never values
- **WHEN** `cliMain(["init-secrets", "--dir", D])` runs with the seeded source and a real temp `D`; then with `--first-user ana.m`; then with a fake `fs` failing `writeNew` of `mk_proxy_token` with `ENOSPC`; then with `D` already filled; then with a `random` throwing `new Error("entropy-secret")`
- **THEN** the first exits 0 with empty stderr and stdout the 16 lines `wrote secrets/engine_key`, ..., `wrote secrets/first_user_password`, `wrote .env` (names in plan order) and `first user owner; the one-time password is in secrets/first_user_password`; the second ends with `first user ana.m; the one-time password is in secrets/first_user_password`; in all five runs no stdout or stderr holds any of the 15 hex texts of `test-plan.md` § Fixtures, the base64 of digests 2 and 3, a `.env` line or `entropy-secret`; the last exits 1 with stderr `CLI_INTERNAL: command failed\n` and no file written

### Requirement: Usage errors touch nothing
`--dir` SHALL be required and non-empty; `--first-user` SHALL match its pattern. A usage error SHALL exit 2 before any filesystem or random call. The command SHALL not load the configuration, so an invalid engine environment does not change its result. `--help` SHALL print the usage text and write nothing.

#### Scenario: Missing and bad options, the environment and help
- **WHEN** `cliMain` runs `["init-secrets"]`; `["init-secrets", "--dir", ""]`; `["init-secrets", "--dir", D, "--first-user", "Bob"]`; `["init-secrets", "--dir", D, "--first-user", "a"]` and `["init-secrets", "--dir", D, "--first-user", "ana.m-x_y1"]` with `env` `{ URSITOARE_PORT: "abc" }`, the first three with a spy `fs` and a spy `random` that record every call and the last two with the seeded `random` and a real empty temp `D`; then `["init-secrets", "--help"]`
- **THEN** the first three exit 2 with empty stdout and stderr `CLI_USAGE: missing required option --dir\n`, `CLI_USAGE: --dir must name a directory\n` and `CLI_USAGE: --first-user must match ^[a-z][a-z0-9._-]{0,63}$\n`, and the spy saw no call; the next two exit 0 (the first-user lines end `first user a;` and `first user ana.m-x_y1;`); `--help` exits 0 with empty stderr and stdout exactly `usage: node src/cli/main.ts init-secrets --dir <string> [--first-user <string>]\nwrite the first-run secrets and the .env file\n  --dir <string>  directory that receives .env and secrets/\n  [--first-user <string>]  name of the first user, default owner\n`, no file written; `initSecretsCommand.database` is `false` and has the same `summary` and `options` as `createInitSecretsCommand()`
