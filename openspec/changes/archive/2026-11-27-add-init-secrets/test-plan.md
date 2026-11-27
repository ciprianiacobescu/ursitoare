# Test plan: add-init-secrets

Every value below was produced by running a prototype of `src/cli/init-secrets.ts` (from `design.md`) in a scratch copy of main@31968a29 (Node 24.22.2, real `loadConfig`, real temp files, a fake `fs`). Nothing was run against Docker, Keycloak or Mintkey.

## Test files and ids

| File | Tests (name starts with) | Scenario |
|---|---|---|
| `src/cli/init-secrets-plan.test.ts` | `C-cf700a7d the plan lists the files, the modes and the random calls`, `C-70d304da formats, distinct values and a reused buffer`, `C-8fdd6e46 a short or throwing random source`, `C-5810ee63 the six keys, the first user and a refused name` | the four of the first three requirements |
| `src/cli/init-secrets-write.test.ts` | `C-424f4b02 existing files stop the run before any write`, `C-9590654a a failing dependency leaves nothing behind` | the two of `writeSecrets` |
| `src/cli/init-secrets-disk.test.ts` | `C-87e40c14 real files, modes, a second run and a bad directory`, `C-b583a50f the engine reads what was written`, `C-7212b6ab the default fs on a real directory` | the three on real files |
| `src/cli/init-secrets-command.test.ts` | `C-3c0b021a the output names files and never values`, `C-5b7f452d missing and bad options, the environment and help` | the two of the command |
| `src/cli/init-secrets-registry.test.ts` | `C-2687097e the default registry lists init-secrets and runs it` (new test of the MODIFIED scenario) | "The default registry through cliMain" |

The three frozen tests of `proposal.md` § Impact change in place (names kept): in `main.test.ts` the last `deepEqual` list becomes `[...ADMIN_COMMANDS, "flow test", "flow validate", "init-secrets"]`, and in `test-registry.test.ts` `ALL_COMMANDS` gains `"init-secrets"` (it feeds both tests; the help test counts eight lines and the line `init-secrets` at index 7). Both fail at red (`init-secrets` is not registered) and pass after task 4.1. The scenario "The process environment" (`C-54587b81`) keeps its test, untouched.

Every test file starts with `assert.equal(typeof planSecrets, "function")` (the registry file with `typeof createDefaultRegistry`), wraps every stub call so a throwing stub fails by assertion (sync: `try`/`catch` returning the error; async: `p.then((v) => v, (e: unknown) => e)`), reads an error's code as `(e as { code?: unknown }).code` (so red does not depend on the two new `CliErrorCode` members), removes its temp directories in `finally`, and has no `.`, `[` or `::` in a test name. Temp directories are `mkdtemp(join(tmpdir(), "init-secrets-"))`; nothing under `deploy/` or any `.env*` of the repository is read or written.

## Fixtures

**`seeded()`** returns a `random` pushing each requested `n` to `asked`; the first call is call 1 (`k` is incremented before use), so call `k` (1 to 15) answers `createHash("sha256").update("init-secrets-test:" + k).digest().subarray(0, n)`. File `i` of `SECRET_FILES` (1-based) gets digest `i`:

| i | name | digest `i` (hex) |
|---|---|---|
| 1 | `engine_key` | `0143a4cf6a918e393114230e1a80b18f085e6768f5ffa4d4c6f99a090ad13679` |
| 2 | `kek` | `6299f5dc6b9df9ba41c4176c6371835da7e25df67154b8fe8e84e4516e431674` (base64 `Ypn13Gud+bpBxBdsY3GDXafiXfZxVLj+joTkUW5DFnQ=`) |
| 3 | `signing_seed` | `1d26225e0ddc8b63bfb3d6bf5a6c3ab0def58b7c92db59a063107e9e9d327215` (base64 `HSYiXg3ci2O/s9a/Wmw6sN71i3yS21mgYxB+np0ychU=`; contains the byte `0x0d`, so a "raw" file with a CR survives as it is) |
| 4 | `mk_issue_token` | `3ca9e6a1c3171fc3a7edd4411ad9bde8ec6c268bce69cf6473bab1eb461625e5` |
| 5 | `mk_proxy_token` | `a8a9e9cbb938671fc9f315de170e2e3b450628b1e6e2ab9203f15650a23b8e8f` |
| 6 | `mk_broker_token` | `7a6fed7f407d94cdd6912bc5d55f0e2d8e9f22f84930c67067ea837b62960963` |
| 7 | `mk_vault_proxy_token` | `b5dd8504b34888f7026ef4e29f19f07fc9b237d647424a38853866cb45189347` |
| 8 | `mk_vault_writer_token` | `3daac319395faf2a9b459136d929b8cf048c1dfb9924817b53c751d3c907719a` |
| 9 | `db_superuser_password` | `16c5bcbc97a47575308d0d7e3c595236e652ce78faf17e87035ec48884e2bfee` |
| 10 | `db_owner_password` | `ffbdf5028298f3ab97cfbdf71bb877ead547241b5248627029027fe40c0ee178` |
| 11 | `db_app_password` | `ab87e9f9c6b9d08942a7f9677c72398e33f79fbeca9df34a6e2dbe6cb93cbf41` |
| 12 | `db_keycloak_password` | `0809d4dc4cc7254988ae0133ab4161bb531cf91842039f401c5d737b88b5cf63` |
| 13 | `oidc_client_secret` | `53d5ebd5c06dd0e4bafb8fa4e5ceb352f5c0bd9e7b723e52ed61bbf5bc1b688b` |
| 14 | `keycloak_admin_password` | `1606a199ffab91b3aab87beec8148653f81383ebae9ab87b744ffff937e6f525` |
| 15 | `first_user_password` | `8c5fdd4649613a39ad0daa3420a1d9105833b22b7f97fc1890dcb3763508e40c` |

A `hex64` file holds the hex plus `\n`; `kek` and `signing_seed` hold the 32 digest bytes. The test recomputes the digests with `createHash`; this table lets a reader check them.

**The `.env`** of `planSecrets("/deploy", seeded())` is exactly (422 bytes, each line ending `\n`):

```
KC_DB_PASSWORD=0809d4dc4cc7254988ae0133ab4161bb531cf91842039f401c5d737b88b5cf63
KC_BOOTSTRAP_ADMIN_USERNAME=admin
KC_BOOTSTRAP_ADMIN_PASSWORD=1606a199ffab91b3aab87beec8148653f81383ebae9ab87b744ffff937e6f525
KC_URSITOARE_CLIENT_SECRET=53d5ebd5c06dd0e4bafb8fa4e5ceb352f5c0bd9e7b723e52ed61bbf5bc1b688b
KC_URSITOARE_FIRST_USER=owner
KC_URSITOARE_FIRST_PASSWORD=8c5fdd4649613a39ad0daa3420a1d9105833b22b7f97fc1890dcb3763508e40c
```

With `{ firstUser: "ana.m" }` the fifth line is `KC_URSITOARE_FIRST_USER=ana.m` (422 bytes, the same length as with `owner`); the others are the same.

**The reused buffer:** `one = new Uint8Array(32)`; `random` does `one.fill(k)` (k from 1) and returns `one`. File `k` holds 32 bytes of value `k`; a `hex64` file holds that value as two hex digits repeated 32 times, plus `\n` (file 10 is `0a` repeated 32 times).

**The fake fs** `memoryFs({ existing, fail })` returns `{ fs, calls }`: `calls` takes one string per call, `exists <path>`, `mkdir <path> <mode>`, `writeNew <path> <mode> <length>` and `remove <path>` (modes in decimal: 448 and 384). `existing` is a set (`writeNew` adds, `remove` deletes); `fail` maps a call string without its length (`writeNew /deploy/secrets/mk_proxy_token`) to an error thrown after the call is recorded. An error is `Object.assign(new Error("disk-secret"), { code })`.

**`capture()`** collects `write` calls into one string for stdout and one for stderr. **`leaks(text)`** is true when `text` holds any of the 15 hex texts above, the two base64 values, or any line of a `.env`; the tests assert `false` on stdout, stderr and thrown messages.

## Rows the specs do not spell out

**Plan.** Paths of `planSecrets("/deploy", seeded())`: `/deploy/secrets/` + each name of the table in order, then `/deploy/.env`; `asked` is fifteen `32`; `files[0].bytes` is the 65 bytes of `0143a4cf…3679\n`, `files[1].bytes` and `files[2].bytes` are 32 bytes. The reused-buffer plan: `files[0]` is `01` repeated 32 times plus `\n`, `files[1]` is 32 bytes of `2`, `files[14]` is `0f` repeated 32 times plus `\n`. Refused first users, in this order: `Bob`, `1a`, `"a".repeat(65)`, the empty string, `a b`, `ana@x`, `"owner\nKC_BOOTSTRAP_ADMIN_USERNAME=evil"`; `asked` stays empty.

**writeSecrets.** The success `calls` after the 16 `exists`: `mkdir /deploy/secrets 448`; `writeNew /deploy/secrets/engine_key 384 65`; `… kek 384 32`; `… signing_seed 384 32`; nine more `… 384 65` in table order up to `first_user_password`; `writeNew /deploy/.env 384 422`. Failing rows: E1 existing `kek` and `.env` (no call after the 16 `exists`); W1 `ENOSPC` on `mk_proxy_token` (`mkdir`, five `writeNew`, then `remove` of `mk_proxy_token`, `mk_issue_token`, `signing_seed`, `kek`, `engine_key`); W2 W1 with no code and `remove` of `signing_seed` failing `EIO` (the same removals, recorded); W3 `EEXIST` on `mk_proxy_token` (the four removals without `mk_proxy_token`); M1 `mkdir` `EACCES` (`mkdir` only); X1 `exists` of `engine_key` `EACCES` (that one `exists` is the only call); W4 `EDQUOT` on `.env` (16 `writeNew`, then 16 `remove`, `.env` first). No message holds `disk-secret`.

**Disk.** `D = join(base, "a", "b", "deploy")`. Run 1 uses `cliMain([...], { env: {}, registry, stdout, stderr })` with a registry holding `createInitSecretsCommand({ random: seeded() })`; `kek` equals the digest-2 bytes. Run 3: `D3/secrets/kek` holds `keep`, `D3/.env` is a symlink to `/nonexistent-target`; afterwards `readdir(D3/secrets)` is `["kek"]` and `lstat(D3/.env)` is still a symlink. Run 4: `--dir <plain>/x` with `<plain>` a regular file. The engine row sets these 13 variables, each `_FILE` at `join(D, "secrets", <name>)`: `URSITOARE_ENGINE_KEY_FILE` (`engine_key`), `URSITOARE_DATABASE_URL` `postgres://ursitoare_app@postgres:5432/ursitoare`, `URSITOARE_DATABASE_PASSWORD_FILE` (`db_app_password`), `URSITOARE_DATABASE_OWNER_URL` `postgres://ursitoare_owner@postgres:5432/ursitoare`, `URSITOARE_DATABASE_OWNER_PASSWORD_FILE` (`db_owner_password`), `URSITOARE_OIDC_ISSUER` `http://localhost:8180/realms/ursitoare`, `URSITOARE_OIDC_CLIENT_SECRET_FILE` (`oidc_client_secret`), `URSITOARE_EGRESS_BROKER_URL` `http://mintkey-broker:8083`, `URSITOARE_EGRESS_PROXY_URL` `http://mintkey-proxy:8086`, `URSITOARE_EGRESS_BROKER_TOKEN_FILE` (`mk_issue_token`), `URSITOARE_EGRESS_VAULT_URL` `http://mintkey-vault:8084`, `URSITOARE_EGRESS_VAULT_IDENTITY` `svcid_ursitoare`, `URSITOARE_EGRESS_VAULT_TOKEN_FILE` (`mk_vault_writer_token`); it compares `.reveal()` with the hex of digests 1, 13, 4, 8, 11, 10; the `.env` row splits each line at the first `=` and gets `engineKey` `null`, no `oidc` or `egress`, `database` `{ app: null, owner: null }`. The default-fs row uses a symlink `T/l → T/missing` and the wrapper `{ ...nodeInitSecretsFs, writeNew }` whose `writeNew` rejects for `join(T, "d/secrets/mk_proxy_token")` and delegates otherwise; afterwards `T/d/secrets` exists and `readdir` of it is `[]`.

**Command.** Run 1 stdout: `wrote secrets/<name>\n` for each name of the table in order, `wrote .env\n`, then `first user owner; the one-time password is in secrets/first_user_password\n` (17 lines). Run 3 (fake fs, `--dir /deploy`): stderr `CLI_SECRETS_FAILED: could not write /deploy/secrets/mk_proxy_token (ENOSPC)\n`. Run 4 stderr starts `CLI_SECRETS_EXIST: refusing to overwrite `. Run 5 (`random` throws, fake fs): `calls` is empty. `leaks(stdout + stderr)` is `false` in all five. Usage rows use `env` `{ URSITOARE_PORT: "abc" }`; `--first-user a` and `ana.m-x_y1` end with `first user a; …` and `first user ana.m-x_y1; …`.

**Registry.** `cliMain(["help"], { env: {}, stdout, stderr })` with no `registry`: 8 lines in `list()` order, line 6 `flow test  run a flow offline against mocks`, line 8 `init-secrets  write the first-run secrets and the .env file`. `["init-secrets", "--dir", D]` with `D = join(mkdtemp, "deploy")` and the real `randomBytes`: 17 stdout lines, `D/.env` is `0o600` with six lines starting with the keys of `ENV_KEYS`, and the 15 secret files exist. `["init-secrets"]`: stdout `""`, stderr `CLI_USAGE: missing required option --dir\n`.

## STACK-ONLY

The Node tests prove the files' bytes, modes and names. That a real process accepts them is proved only by the delegate's stack run, through steps that later units add under `scripts/stack-e2e.d/` (names fixed by those units; no gate runs them, and no task of this unit lists these criteria):

| Criterion | Step | What the step asserts |
|---|---|---|
| The vault starts with `secrets/kek` and the broker with `secrets/signing_seed`; the broker, proxy and vault accept `mk_issue_token`, `mk_proxy_token`, `mk_vault_proxy_token` and `mk_vault_writer_token` | `30-proxy-smoke.sh` (`add-stack-overlay`) | `proxySmoke` answers `ok`: the vault admin put with the writer token succeeds, the broker issues a token to the issue token, the proxy calls the origin and the echo saw the injected header |
| `mk_broker_token` and `mk_proxy_token` are the tokens the broker and proxy present to the audit sink | `60-conformance.sh` (`add-stack-conformance`) | `test_mintkey_events_reach_the_sink`: one `token.issued` with `origin` `mintkey` is listed in the tenant |
| `oidc_client_secret` and `KC_URSITOARE_CLIENT_SECRET` hold the same value | `40-contracts.sh` (`add-stack-conformance`) | every `oidc` row of `contracts.json` is `ok`, the token endpoint accepting the client secret read from `secrets/oidc_client_secret` |
| `keycloak_admin_password` and `KC_BOOTSTRAP_ADMIN_PASSWORD` hold the same value | `10-overlay.sh` (`add-stack-realm-reset`) | the step prints `overlay: applied <n>`, the admin API having accepted the bootstrap admin |
