## Context

`ursitoare init-secrets` is the first top-level command of the CLI (`createCommandRegistry` already accepts the name, `delivered-shapes.md`). It runs with `database: false`, so the dispatcher never loads the configuration for it: it runs on a bare machine, or in the engine image through `docker run --rm -v "$PWD/deploy:/out" <image> node src/cli/main.ts init-secrets --dir /out`, before any service exists. It makes the files that later units mount: the compose file (U59) mounts each `secrets/<name>` at `/run/secrets/<name>`, the realm template and compose environment read `.env` for Keycloak, and the owner job reads the two `*_SINK_*` token files. Every text file is read by a `_FILE` reader that strips one trailing newline (`config/secret.ts:34-38`; Mintkey trims `\r\n`); the two key files are read raw.

## Decisions

1. **Plan, write, command.** `planSecrets` is pure (it takes `random`, returns bytes), `writeSecrets` is the only function that touches the filesystem and does so through `InitSecretsFs`, and `createInitSecretsCommand` joins them. So the formats and the `.env` are tested without a disk, the never-overwrite and rollback rules with a fake `fs` that records every call, and the modes with real files in a temp directory. `nodeInitSecretsFs` is exported so its four methods can be tested directly: `exists` is `lstat` (a dangling symlink counts as present), `writeNew` opens with the flag `wx` (the system refuses an existing entry, a symlink included), `remove` is `rm` with `force`.
2. **One draw of 32 bytes per file.** `random(32)` is called once per `SECRET_FILES` entry, in order. A `hex64` file is the lowercase hex of those bytes plus `\n` (64 characters; the engine key rule is 64 or more hex, `config/config.ts:149-151`; the token rule is 1 to 4096 visible ASCII characters, `config/egress.ts:38`). A `raw32` file is a copy of the bytes. The hex text is computed at once, and the raw bytes are copied, so a source that reuses one buffer cannot make two files equal.
3. **Mintkey's formats.** The vault's KEK file and the broker's signing seed are exactly 32 bytes with nothing added; a trailing newline would make the KEK 33 bytes and the vault would refuse it (UNVERIFIED below). The tokens are hex text with one newline, as the engine's own files are; Mintkey trims `\r\n` from a `_FILE` value.
4. **`.env` is Keycloak's and only Keycloak's.** Six lines: the database password, the bootstrap admin user and password, the client secret, the first user's name and one-time password. The same text is in the matching secret file, so one value serves the engine (through a file) and Keycloak (through its environment). The first user's password is in `secrets/first_user_password` and in `.env`, both 0600, and in no printed line. The Mintkey tokens stay out of `.env`; the compose file passes them through `_FILE`.
5. **Creation only.** Every planned path is checked first (all 16, so the message can name every clash); one existing entry stops the run before `mkdir`. A race between the check and a write ends in `EEXIST` from `wx`: the clashing path is not removed (it is not ours) and the run reports `CLI_SECRETS_EXIST`. There is no `--force`: rotating a secret in use is an operation (`docs/operations.md`, U59), not a flag.
6. **Rollback.** After a failed write the run removes the failing path (a partial file may exist) and then the paths it wrote, newest first, ignoring a failing `remove` but naming it. `secrets/` is left in place (it may have been there before). A message uses the path and, when the failure has an upper-case `code`, that code; never the failure's own text.
7. **`--first-user` is validated in `planSecrets`.** The name goes into `.env`, so the pattern `^[a-z][a-z0-9._-]{0,63}$` is enforced where the line is built (a newline in the name would inject a `.env` line); the command passes the value through, and `random` is not called for a refused name. `--dir ""` is refused by the command (`CLI_USAGE`, exit 2) before the plan.
8. **Registration.** `src/cli/builtin.ts` registers `init-secrets` after `registerFlowCommands`; `list()` sorts, so the default registry lists eight names, `init-secrets` after `flow validate`. `add-tenant-bootstrap` adds five names after this unit and restates the same requirement.

## Interfaces

Given, equal to `proposal.md`. Taken: `delivered-shapes.md`.

```ts
// src/cli/init-secrets.ts
export type SecretFormat = "hex64" | "raw32";
export interface SecretFileSpec { name: string; format: SecretFormat; readers: readonly string[] }
export const SECRET_FILES: readonly SecretFileSpec[];   // 15 entries in the order of specs/deploy-secrets
export const ENV_KEYS: readonly string[];   // the six .env keys in order
export interface PlannedFile { path: string; bytes: Uint8Array; mode: 0o600 }
export interface SecretPlan { dirs: readonly string[]; files: readonly PlannedFile[]; firstUser: string }
export function planSecrets(dir: string, random: (n: number) => Uint8Array, opts?: { firstUser?: string }): SecretPlan;
export interface InitSecretsFs { exists(path: string): Promise<boolean>; mkdir(path: string, mode: number): Promise<void>; writeNew(path: string, bytes: Uint8Array, mode: number): Promise<void>; remove(path: string): Promise<void> }
export const nodeInitSecretsFs: InitSecretsFs;   // default of InitSecretsDeps.fs
export function writeSecrets(plan: SecretPlan, fs: InitSecretsFs): Promise<{ written: string[] }>;
export interface InitSecretsDeps { random?: (n: number) => Uint8Array; fs?: InitSecretsFs }   // defaults: crypto.randomBytes, nodeInitSecretsFs
export function createInitSecretsCommand(deps?: InitSecretsDeps): CliCommand;
export const initSecretsCommand: CliCommand;   // createInitSecretsCommand()
```

Red tests import these names from `src/cli/init-secrets.ts`, never from `src/cli/index.ts`; `cliMain` comes from `src/cli/main.ts`, `createCommandRegistry` from `src/cli/registry.ts`, `loadConfig` from `src/config/index.ts`. `CliCommand` is the type of `delivered-shapes.md`. The command's texts are fixed: summary `write the first-run secrets and the .env file`; options `dir` (string, required, summary `directory that receives .env and secrets/`) and `first-user` (string, summary `name of the first user, default owner`); no `details`. Error messages are those of the spec; `CLI_SECRETS_EXIST` and `CLI_SECRETS_FAILED` are `CliErrorCode` members.

## Failure cases

| Case | Result |
|---|---|
| `--dir` missing or empty, `--first-user` refused | exit 2 `CLI_USAGE`; no `random`, no `fs` call (scenario "Missing and bad options") |
| `random` throws, or answers other than 32 bytes | the throw reaches `runCli` (`CLI_INTERNAL: command failed`, exit 1) or `CLI_INTERNAL: random source returned the wrong length`; nothing is written |
| a planned file exists, a dangling symlink included | exit 1 `CLI_SECRETS_EXIST` naming the paths; `mkdir` and `writeNew` never called; every entry unchanged |
| `exists` rejects (`ENOTDIR` under a regular file, `EACCES`) | exit 1 `CLI_SECRETS_FAILED: could not check <path> (<code>)`; nothing written |
| `mkdir` rejects | exit 1 `could not create <dir> (<code>)`; nothing written |
| `writeNew` rejects mid-run | files of this run removed, `CLI_SECRETS_FAILED: could not write <path> (<code>)` |
| `writeNew` answers `EEXIST` after the check | files of this run removed, the clashing entry kept, `CLI_SECRETS_EXIST` |
| `remove` rejects during a rollback | the other removals still run; the message ends `; could not remove <paths>` |
| stdout throws after the files exist | not handled here: the files stay and `runCli` reports the error |

## UNVERIFIED (Keycloak and Mintkey are not run by any gate)

Read from a Mintkey source checkout (commit not matched to the pin) and not run: the vault's key-file loader reads the file raw and requires exactly 32 bytes (`apps/vault-adapter/internal/kek/loader.go:46-48`); the broker's key loader takes a raw 32-byte seed or a PEM of one (`apps/broker/internal/keyloader/loader.go:55-69`); Mintkey's `_FILE` reader returns the file's text without trailing `\r` and `\n` characters (`packages/go/svcid/fromenv.go:14-28`); a 64-character hex string is accepted as a service token by the broker, proxy and vault; and Keycloak takes its database password, bootstrap admin, client secret and first user from the environment names of `ENV_KEYS`. Each is proved only by the delegate's stack run (`test-plan.md` § STACK-ONLY); no scenario states one as a fact. Probed here with scratch code on main's `loadConfig` and Node 24: the engine accepts the produced `URSITOARE_*_FILE` set; `wx` refuses a dangling symlink; `lstat` under a regular file gives `ENOTDIR`; recursive `mkdir` with mode 0700 gives 0700 to every directory it creates.

## Risks

- Compose file secrets keep host ownership and mode: a container running as `node` (uid 1000) reads a 0600 file only when the host user is uid 1000 or the file sharing maps ownership (Docker Desktop on a Mac does). The Linux case is not verified; `docs/deploy.md` (U59) states it.
- Running the command against an existing vault volume with new files would make every stored credential unreadable. "Never overwrites" is the guard in this unit; `docs/operations.md` (U59) repeats it.
