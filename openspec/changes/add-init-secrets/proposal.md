## Why

The first `docker compose up` needs about twenty values that no one should type: an engine key, two key files that Mintkey reads as raw bytes, five service tokens, four database passwords, a Keycloak admin password, an OIDC client secret and the first user's one-time password. Today there is no command that makes them, so a hobbyist copies example values or hand-rolls a script that overwrites on a re-run or writes a key file in the wrong encoding.

Observable result: `ursitoare init-secrets --dir deploy` (or `node src/cli/main.ts init-secrets --dir /out` in the engine image) creates `deploy/secrets/` (mode 0700) with 15 files (mode 0600) and `deploy/.env` (mode 0600), prints `wrote secrets/engine_key` ... `wrote .env` and `first user owner; the one-time password is in secrets/first_user_password`, and exits 0. The engine key and every token and password are 64 lowercase hex characters and a newline; `kek` and `signing_seed` are exactly 32 raw random bytes. `.env` holds only Keycloak's six values; the first user's password is in a 0600 file and in no printed line. A second run exits 1 with `CLI_SECRETS_EXIST: refusing to overwrite <paths>` and changes nothing; a write that fails removes what the run wrote.

Batch `m8-stack` (U56d, U56e, U57, U59a, U58b, U58, U60, U59, U61, U61d, U61b, U61c in plan order; closing unit `add-stack-conformance`, test `e2e/test_stack_conformance.py`) delivers M8: `docker compose up` runs the six-container hobbyist stack, and every journey so far passes against real Keycloak and Mintkey. This unit's part: one command that writes every secret file and the Keycloak `.env` in the formats their readers need. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the milestone's outcome is proved by the delegate's stack runs, not by a gate.

## What Changes

New: `src/cli/init-secrets.ts` and five test files (`test-plan.md` § Test files and ids). Edited: `src/cli/builtin.ts` (one `registerCommand` line), `src/cli/errors.ts` (two codes), and three frozen tests (below). The MODIFIED registry requirement ("The entry point runs the default registry") gets one new test, `C-2687097e the default registry lists init-secrets and runs it` in `src/cli/init-secrets-registry.test.ts`, which a later unit changes in place too. Capabilities: `deploy-secrets` (new) and `ops-cli` (one requirement MODIFIED, whole, scenario names kept; this unit is the first of two owners of it, `add-tenant-bootstrap` restates it after this one). No migration, route, part, API or interpreter error code, dependency, web change, `docs/` edit or `.gitignore` edit (`.env`, `.env.*`, `deploy/secrets/` and `secrets/` are already ignored). Tests write only to temp directories; none reads `deploy/` or any `.env*` of the repository.

## Impact

- **Scaffold:** Signature stubs for the interfaces below are on the base branch (`docs/decisions/0002`) in `src/cli/init-secrets.ts`: `SECRET_FILES` and `ENV_KEYS` empty, `planSecrets`, `writeSecrets` and `createInitSecretsCommand` throwing `not implemented`, `nodeInitSecretsFs` an object whose four methods reject `not implemented`, `initSecretsCommand` a command with empty `options` and `summary` and a `run` that rejects `not implemented`. Not scaffolded: the line `registry.registerCommand("init-secrets", initSecretsCommand)` in `src/cli/builtin.ts` (task 4.1); the members `"CLI_SECRETS_EXIST"` and `"CLI_SECRETS_FAILED"` of `CliErrorCode` in `src/cli/errors.ts` (task 2.1; tests read `error.code` as a string, so red does not depend on them); and the edits of the three frozen tests below.
- **Depends on:** U01 `add-engine-skeleton`, U20 `add-admin-cli`: merged and archived, none in this plan, so `delivered-shapes.md` restates what is used. No other M8 unit edits `src/cli/init-secrets.ts`; U59a, which runs after this unit in the plan, adds five `CliErrorCode` members to `src/cli/errors.ts` and edits `src/cli/builtin.ts` and the three frozen tests again.
- **Changed (in place, names kept):** `src/cli/main.test.ts::C-2687097e registerAdminCommands and createDefaultRegistry list the five admin commands` (its default-registry list gains `init-secrets`), `src/cli/flow/test-registry.test.ts::C-2687097e cliMain help lists the seven default commands in order` (eight lines; the name keeps the word "seven") and `src/cli/flow/test-registry.test.ts::C-2687097e fresh registries list the admin flow and default commands` (`ALL_COMMANDS` gains `init-secrets`). These hold unedited: `main.test.ts::C-2687097e cliMain prints help for the default registry` (it checks only the admin lines), the refusal and unknown-command tests, `src/cli/registry.test.ts` (its `init-secrets` rows use a registry of their own), `src/cli/run.test.ts` and `src/cli/owner.test.ts`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@31968a29, checked line by line).

**Interfaces given** (exact shapes in `design.md` § Interfaces)

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

**Interfaces taken:** the names of `delivered-shapes.md`.

## Out of scope

`docs/deploy.md` and `docs/operations.md` (U59 writes the sentences on uid 1000, on never running `init-secrets` against an existing vault volume and on rotation), the compose file that mounts the files, the realm template that reads the `.env` values, the owner job that reads the two sink token files, and any rotation or `--force` flag (the command only creates). The `roadmap.md` rows for U57 (six `.env` keys, the Mintkey formats) are edited by the orchestrator with the specs.
