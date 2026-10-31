import { parseArgs } from "node:util";

import type pg from "pg";

import type { DatabaseEndpoint, Env, SecretReader } from "../config/index.ts";
import { systemClock, systemIds } from "../core/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import { CliError } from "./errors.ts";
import { CLI_PROGRAM } from "./output.ts";
import type { CliOutput } from "./output.ts";
import type { CliCommand, CliOption, CommandRegistry } from "./registry.ts";

export interface OwnerConnection {
  pool: pg.Pool;
  close(): Promise<void>;
}

export interface CliDeps {
  env: Env;
  stdout: CliOutput;
  stderr: CliOutput;
  registry: CommandRegistry;
  clock?: Clock;
  ids?: IdSource;
  readSecret?: SecretReader;
  connectOwner?: (e: DatabaseEndpoint) => OwnerConnection;
}

const KNOWN_CODE = /^(CLI|RBAC|IDENTITY|AUDIT|TENANT)_[A-Z0-9_]+$/;
const UNKNOWN_COMMAND = "unknown command; run with --help to list the commands";
const INVALID_ARGUMENTS = "invalid arguments; run with --help";

function formatOption(name: string, option: CliOption): string {
  const flag = option.type === "string" ? `--${name} <string>` : `--${name}`;
  return option.required === true ? flag : `[${flag}]`;
}

function writeList(
  entries: readonly { name: string; command: CliCommand }[],
  stdout: CliOutput,
): void {
  for (const entry of entries) {
    stdout.write(`${entry.name}  ${entry.command.summary}\n`);
  }
}

function writeUsage(name: string, command: CliCommand, stdout: CliOutput): void {
  const parts = [`usage: ${CLI_PROGRAM} ${name}`];
  for (const [optionName, option] of Object.entries(command.options)) {
    parts.push(formatOption(optionName, option));
  }
  stdout.write(`${parts.join(" ")}\n`);
  stdout.write(`${command.summary}\n`);
  if (command.details !== undefined) {
    for (const line of command.details.split("\n")) {
      stdout.write(`${line}\n`);
    }
  }
  for (const [optionName, option] of Object.entries(command.options)) {
    stdout.write(`  ${formatOption(optionName, option)}  ${option.summary}\n`);
  }
}

function parseValues(rest: readonly string[], command: CliCommand): Record<string, string | boolean> {
  const options: Record<string, { type: "string" | "boolean" }> = {};
  for (const [optionName, option] of Object.entries(command.options)) {
    options[optionName] = { type: option.type };
  }
  options.help = { type: "boolean" };

  try {
    const parsed = parseArgs({
      args: [...rest],
      options,
      strict: true,
      allowPositionals: false,
    });
    return parsed.values as Record<string, string | boolean>;
  } catch {
    throw new CliError("CLI_USAGE", INVALID_ARGUMENTS);
  }
}

function knownCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && KNOWN_CODE.test(code)) {
      return code;
    }
  }
  return null;
}

function report(error: unknown, stderr: CliOutput): number {
  const code = knownCode(error);
  if (code === null) {
    stderr.write("CLI_INTERNAL: command failed\n");
    return 1;
  }
  const message = error instanceof Error ? error.message : "command failed";
  stderr.write(`${code}: ${message}\n`);
  return code === "CLI_USAGE" || code === "CLI_UNKNOWN_COMMAND" ? 2 : 1;
}

async function dispatch(argv: readonly string[], deps: CliDeps): Promise<number> {
  const first = argv[0];
  if (first === undefined || first === "help" || first === "--help" || first === "-h") {
    writeList(deps.registry.list(), deps.stdout);
    return 0;
  }

  if ((first === "admin" || first === "flow") && argv.length === 1) {
    const group = deps.registry
      .list()
      .filter((entry) => entry.name.startsWith(`${first} `));
    if (group.length === 0) {
      throw new CliError("CLI_UNKNOWN_COMMAND", UNKNOWN_COMMAND);
    }
    writeList(group, deps.stdout);
    return 0;
  }

  const found = deps.registry.find(argv);
  if (found === null) {
    throw new CliError("CLI_UNKNOWN_COMMAND", UNKNOWN_COMMAND);
  }

  const { name, command, rest } = found;
  const values = parseValues(rest, command);

  if (values.help === true) {
    writeUsage(name, command, deps.stdout);
    return 0;
  }

  for (const [optionName, option] of Object.entries(command.options)) {
    if (option.required === true && values[optionName] === undefined) {
      throw new CliError("CLI_USAGE", `missing required option --${optionName}`);
    }
  }

  if (command.database) {
    throw new Error("not implemented");
  }

  return command.run({
    args: values,
    env: deps.env,
    stdout: deps.stdout,
    stderr: deps.stderr,
    clock: deps.clock ?? systemClock,
    ids: deps.ids ?? systemIds,
    owner: null,
  });
}

export async function runCli(argv: readonly string[], deps: CliDeps): Promise<number> {
  try {
    return await dispatch(argv, deps);
  } catch (error) {
    return report(error, deps.stderr);
  }
}
