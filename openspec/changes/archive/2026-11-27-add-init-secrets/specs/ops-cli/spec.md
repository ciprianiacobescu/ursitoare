## MODIFIED Requirements

### Requirement: The entry point runs the default registry
`cliMain` SHALL run `runCli` with `createDefaultRegistry()`, `readProcessEnv()` and the process streams unless overridden; `src/cli/main.ts` run as the entry script SHALL set `process.exitCode` from it. `createDefaultRegistry()` SHALL register the five `admin` commands, `flow test`, `flow validate` and the top-level `init-secrets`, and no other.

#### Scenario: The default registry through cliMain
- **WHEN** `cliMain` gets `["help"]`, `["admin", "list-users"]`, `["nope"]` and `["init-secrets"]`, with `env` `{}`; then `["init-secrets", "--dir", D]` with `D` a path inside an empty temp directory
- **THEN** they resolve to 0, 1, 2, 2 and 0; the first prints a line for each command `createDefaultRegistry()` registers, in the order of `list()`: `admin bootstrap-admin`, `admin grant-role`, `admin list-users`, `admin revoke-role`, `admin verify-audit`, `flow test`, `flow validate` and `init-secrets`, the `flow test` line being `flow test  run a flow offline against mocks` and the `init-secrets` line `init-secrets  write the first-run secrets and the .env file`; the second a `CLI_OWNER_REQUIRED: ` line on stderr; the fourth stderr `CLI_USAGE: missing required option --dir\n` with empty stdout; the fifth prints 17 lines (16 `wrote …` lines, then `first user owner; the one-time password is in secrets/first_user_password`) with empty stderr, and `D/.env` is a file of mode `0o600` with six lines; `registerAdminCommands` on a fresh registry lists exactly the five admin names, `registerFlowCommands` on a fresh registry lists exactly `flow test` and `flow validate`, and `createDefaultRegistry().list()` holds the eight names above and no other

#### Scenario: The process environment
- **WHEN** a test sets `process.env.URSITOARE_CLI_PROBE` to `x`, calls `readProcessEnv()`, sets that key on the result to `y`, reads `process.env.URSITOARE_CLI_PROBE` and deletes it
- **THEN** the result first held `"x"`; `process.env` still holds `"x"`
