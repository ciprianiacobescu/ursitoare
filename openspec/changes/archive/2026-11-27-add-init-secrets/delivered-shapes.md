# Delivered shapes taken by add-init-secrets

Declarations from main@31968a29 (`file:line`; `…` elides unused members), each read in the file named. Every unit named in `proposal.md` § Impact is merged and archived; none is in this plan.

```ts
// src/cli (U20)
cli/registry.ts:8-12   interface CliOption { type: "string" | "boolean"; summary: string; required?: boolean }
cli/registry.ts:19-27  interface CliCall { args: Readonly<Record<string, string | boolean>>; env: Env; stdout: CliOutput; stderr: CliOutput; clock: Clock; ids: IdSource; owner: OwnerAccess | null }
cli/registry.ts:29-35  interface CliCommand { summary: string; details?: string; options: Readonly<Record<string, CliOption>>; database: boolean; run(call: CliCall): Promise<number> }
cli/registry.ts:37-41  interface CommandRegistry { registerCommand(name: string, command: CliCommand): void; find(words): …; list(): { name: string; command: CliCommand }[] }
cli/registry.ts:43-63  a name is one word /^[a-z][a-z0-9-]{0,31}$/ (not admin, flow, help) or `admin <word>` or `flow <word>`; `init-secrets` is a valid top-level name; list() sorts by name (admin …, flow test, flow validate, then init-secrets)
cli/registry.ts:65     createCommandRegistry(): CommandRegistry
cli/output.ts:1-3      interface CliOutput { write(text: string): void }          cli/output.ts:5 CLI_PROGRAM = "node src/cli/main.ts"
cli/errors.ts:3-18     type CliErrorCode = "CLI_USAGE" | "CLI_UNKNOWN_COMMAND" | "CLI_INVALID_COMMAND" | "CLI_CONFIG_INVALID" | "CLI_OWNER_REQUIRED" | … | "CLI_AUDIT_FAILED" | "CLI_INTERNAL"   (no secrets code yet)
cli/errors.ts:20-27    class CliError extends Error { readonly code: CliErrorCode; constructor(code: CliErrorCode, message: string) }
cli/run.ts:26          KNOWN_CODE = /^(CLI|RBAC|IDENTITY|AUDIT|TENANT)_[A-Z0-9_]+$/
cli/run.ts:91-104      report(error, stderr): a ConfigError prints `CLI_CONFIG_INVALID: <message>`, exit 1; an error whose `code` matches KNOWN_CODE prints `<code>: <message>`, exit 2 for CLI_USAGE and CLI_UNKNOWN_COMMAND, else 1; any other error prints `CLI_INTERNAL: command failed`, exit 1
cli/run.ts:44-59       writeUsage prints `usage: node src/cli/main.ts <name> <flags>`, the summary, `details` lines, then `  <flag>  <summary>` per option; a flag is `--name <string>` for a string option, in brackets unless `required`
cli/run.ts:35-42       writeList prints `<name>  <summary>` per registry entry
cli/run.ts:138-141     a missing required option throws CliError("CLI_USAGE", `missing required option --<name>`)
cli/run.ts:143-177     a command with database false is called with owner null and never loads the configuration (the database branch alone calls loadConfig)
cli/run.ts:180-186     runCli(argv, deps) maps every throw of dispatch through report
cli/main.ts:17-30      cliMain(argv: readonly string[], deps: Partial<CliDeps> = {}): Promise<number>   // registry defaults to createDefaultRegistry(), env to readProcessEnv(); CliDeps (run.ts:15) holds env, stdout, stderr, registry, clock?, ids?, readSecret?, connectOwner?
cli/builtin.ts:6-11    createDefaultRegistry(): CommandRegistry   // registerAdminCommands(registry); registerFlowCommands(registry); return registry
cli/admin/index.ts:8-14 registerAdminCommands registers the five `admin` names: bootstrap-admin, grant-role, list-users, revoke-role, verify-audit
cli/flow/index.ts:8-11 registerFlowCommands registers `flow test`, `flow validate`
cli/main.test.ts:31-37,92-113          ADMIN_COMMANDS; test `C-2687097e registerAdminCommands and createDefaultRegistry list the five admin commands`; its last deepEqual is `[...ADMIN_COMMANDS, "flow test", "flow validate"]`
cli/flow/test-registry.test.ts:13-21   ADMIN_COMMANDS; ALL_COMMANDS = [...ADMIN_COMMANDS, "flow test", "flow validate"] (:21); test `C-2687097e cliMain help lists the seven default commands in order` (:44-71: one help line per command, in order, `lines.length` equal to ALL_COMMANDS.length) and `C-2687097e fresh registries list the admin flow and default commands` (:73-104: its default-registry deepEqual is ALL_COMMANDS)
// src/config (U01)
config/secret.ts:34-38 stripOneTrailingNewline: one `\r\n` or one `\n` is removed
config/secret.ts:40-53 readSecretValue(variable, path, readSecret): Secret   // a read that throws, or a value that is empty after the strip and trim, is ConfigError CONFIG_SECRET_EMPTY; Secret.reveal() gives the text
config/config.ts:149-151 isHexKey: /^[0-9a-fA-F]{64,}$/     config/config.ts:158-167 readEngineKey: URSITOARE_ENGINE_KEY_FILE read through readSecretValue, hex of 64 or more characters or base64 of 32 or more bytes, else CONFIG_INVALID
config/config.ts:212-247 loadConfig(env: Env, readSecret = defaultReadSecret (readFileSync utf8, :45)): AppConfig   // refuseSecretShapedVariables (:134-147) refuses an URSITOARE_ variable ending in PASSWORD, SECRET, TOKEN or KEY unless it ends in _FILE; engineKey: Secret | null; database { app, owner }: DatabaseEndpoint { url, password: Secret | null }; oidc?; egress?
config/oidc.ts:19,85-106 URSITOARE_OIDC_CLIENT_SECRET_FILE read with readSecretValue; needs URSITOARE_OIDC_ISSUER, the engine key and URSITOARE_DATABASE_URL; OidcConfig { issuer, clientId, clientSecret: Secret }
config/egress.ts:38,83-87 TOKEN_PATTERN /^[\x21-\x7e]{1,4096}$/ on a token file's text; :20-33 URSITOARE_EGRESS_BROKER_URL, _PROXY_URL, _BROKER_TOKEN_FILE, _VAULT_URL, _VAULT_IDENTITY, _VAULT_TOKEN_FILE (the vault three together); EgressConfig { brokerUrl, proxyUrl, brokerToken: Secret, agentId, vault: { url, identity, token: Secret } | null }
config/index.ts        exports loadConfig, readProcessEnv (environment.ts:3-5: a copy of process.env), Secret, ConfigError
```
