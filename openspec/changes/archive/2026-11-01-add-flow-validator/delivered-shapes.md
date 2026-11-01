# Delivered shapes taken by add-flow-validator

The names taken from merged code (`add-admin-cli`, U20: merged, not yet archived), copied from main@3142c5f with `file:line`; the code is the truth. Names from `add-flow-format-model`, `add-taint-static` and `add-test-catalogue` (not merged) are restated in proposal.md.

```ts
// src/cli/registry.ts, lines 8-12, 19-27, 29-35, 37-41
export interface CliOption { type: "string" | "boolean"; summary: string; required?: boolean; }
export interface CliCall { args: Readonly<Record<string, string | boolean>>; env: Env; stdout: CliOutput; stderr: CliOutput; clock: Clock; ids: IdSource; owner: OwnerAccess | null; }
export interface CliCommand { summary: string; details?: string; options: Readonly<Record<string, CliOption>>; database: boolean; run(call: CliCall): Promise<number>; }
export interface CommandRegistry {
  registerCommand(name: string, command: CliCommand): void;
  find(words: readonly string[]): { name: string; command: CliCommand; rest: string[] } | null;
  list(): { name: string; command: CliCommand }[];
}
// src/cli/output.ts, lines 1-3, 23, 32
export interface CliOutput { write(text: string): void; }
export function safeText(text: string): string
export function safeJson(value: unknown): string
// src/cli/errors.ts, line 20
export class CliError extends Error { readonly code: CliErrorCode; constructor(code: CliErrorCode, message: string) }   // CliErrorCode includes "CLI_USAGE"
// src/cli/builtin.ts, lines 5-9
export function createDefaultRegistry(): CommandRegistry {
  const registry = createCommandRegistry();
  registerAdminCommands(registry);
  return registry;
}
// src/cli/main.ts, line 17
export async function cliMain(argv: readonly string[], deps: Partial<CliDeps> = {}): Promise<number>
// src/cli/run.ts, lines 15-24
export interface CliDeps { env: Env; stdout: CliOutput; stderr: CliOutput; registry: CommandRegistry; clock?: Clock; ids?: IdSource; readSecret?: SecretReader; connectOwner?: (e: DatabaseEndpoint) => OwnerConnection; }
```

## Facts from the merged code

- The runner accepts no positional argument, so the file is an option, `--file <path>`. `src/cli/run.ts:73`: `allowPositionals: false,` (inside `parseArgs({ args: [...rest], options, strict: true, allowPositionals: false })`; a parse failure becomes `CliError("CLI_USAGE", "invalid arguments; run with --help")`).
- A missing required option is a usage error. `src/cli/run.ts:138-140`: ``if (option.required === true && values[optionName] === undefined) { throw new CliError("CLI_USAGE", `missing required option --${optionName}`); }``.
- Only codes with these prefixes are printed as themselves; any other thrown error prints `CLI_INTERNAL: command failed` and exits 1. `src/cli/run.ts:26`: `const KNOWN_CODE = /^(CLI|RBAC|IDENTITY|AUDIT|TENANT)_[A-Z0-9_]+$/;`. `src/cli/run.ts:101-103`: ``const message = error instanceof Error ? error.message : "command failed"; stderr.write(`${code}: ${message}\n`); return code === "CLI_USAGE" || code === "CLI_UNKNOWN_COMMAND" ? 2 : 1;``. So a thrown `CLI_USAGE` prints `CLI_USAGE: <message>` and exits 2.
- A command with `database: false` runs with no configuration and no owner. `src/cli/run.ts:176`: `owner: null,` (in the `return command.run({...})` that follows the `if (command.database)` branch).
- The name `flow validate` is accepted, an option named `help` is refused. `src/cli/registry.ts:56`: `return (group === "admin" || group === "flow") && WORD.test(word);`; `src/cli/registry.ts:73`: `Object.hasOwn(command.options, "help")` (a registration error).
- An existing test pins the default registry to the five admin commands and must change. `src/cli/main.test.ts:92`: `test("C-2687097e registerAdminCommands and createDefaultRegistry list the five admin commands", () => {`; `src/cli/main.test.ts:108-111`: `assert.deepEqual(defaultRegistry.list().map((entry) => entry.name), ADMIN_COMMANDS, "the default registry holds exactly the five admin commands",);`. `list()` sorts by name, so `flow validate` follows the admin names.
