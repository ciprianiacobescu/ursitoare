import type pg from "pg";

import type { AppConfig, Env } from "../config/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import { CliError } from "./errors.ts";
import type { CliOutput } from "./output.ts";

export interface CliOption {
  type: "string" | "boolean";
  summary: string;
  required?: boolean;
}

export interface OwnerAccess {
  pool: pg.Pool;
  config: AppConfig;
}

export interface CliCall {
  args: Readonly<Record<string, string | boolean>>;
  env: Env;
  stdout: CliOutput;
  stderr: CliOutput;
  clock: Clock;
  ids: IdSource;
  owner: OwnerAccess | null;
}

export interface CliCommand {
  summary: string;
  details?: string;
  options: Readonly<Record<string, CliOption>>;
  database: boolean;
  run(call: CliCall): Promise<number>;
}

export interface CommandRegistry {
  registerCommand(name: string, command: CliCommand): void;
  find(words: readonly string[]): { name: string; command: CliCommand; rest: string[] } | null;
  list(): { name: string; command: CliCommand }[];
}

const WORD = /^[a-z][a-z0-9-]{0,31}$/;
const RESERVED = new Set(["admin", "flow", "help"]);

function isCommandName(name: string): boolean {
  if (WORD.test(name)) {
    return !RESERVED.has(name);
  }
  const space = name.indexOf(" ");
  if (space === -1) {
    return false;
  }
  const group = name.slice(0, space);
  const word = name.slice(space + 1);
  return (group === "admin" || group === "flow") && WORD.test(word);
}

function byName(a: { name: string }, b: { name: string }): number {
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
}

export function createCommandRegistry(): CommandRegistry {
  const commands = new Map<string, CliCommand>();

  return {
    registerCommand(name: string, command: CliCommand): void {
      if (
        !isCommandName(name) ||
        commands.has(name) ||
        Object.hasOwn(command.options, "help")
      ) {
        throw new CliError("CLI_INVALID_COMMAND", "invalid command name or options");
      }
      commands.set(name, command);
    },

    find(words: readonly string[]): { name: string; command: CliCommand; rest: string[] } | null {
      if (words.length === 0) {
        return null;
      }
      const first = words[0];
      const grouped = first === "admin" || first === "flow";
      const length = grouped ? 2 : 1;
      if (words.length < length) {
        return null;
      }
      const name = words.slice(0, length).join(" ");
      const command = commands.get(name);
      if (command === undefined) {
        return null;
      }
      return { name, command, rest: words.slice(length) };
    },

    list(): { name: string; command: CliCommand }[] {
      return [...commands.entries()]
        .map(([name, command]) => ({ name, command }))
        .sort(byName);
    },
  };
}
