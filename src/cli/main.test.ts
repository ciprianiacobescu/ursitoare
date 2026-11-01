import assert from "node:assert/strict";
import { test } from "node:test";

import type { Env } from "../config/index.ts";
import { createCommandRegistry } from "./registry.ts";
import type { CommandRegistry } from "./registry.ts";
import { cliMain } from "./main.ts";
import { createDefaultRegistry } from "./builtin.ts";
import { registerAdminCommands } from "./admin/index.ts";
import type { CliOutput } from "./output.ts";

interface Captured {
  output: CliOutput;
  text(): string;
}

function capture(): Captured {
  let buffer = "";
  return {
    output: {
      write(text: string): void {
        buffer += text;
      },
    },
    text(): string {
      return buffer;
    },
  };
}

const ADMIN_COMMANDS = [
  "admin bootstrap-admin",
  "admin grant-role",
  "admin list-users",
  "admin revoke-role",
  "admin verify-audit",
];

const emptyEnv: Env = {};

test("C-2687097e cliMain prints help for the default registry", async () => {
  const stdout = capture();
  const stderr = capture();
  const code = await cliMain(["help"], {
    env: emptyEnv,
    stdout: stdout.output,
    stderr: stderr.output,
  }).then((value) => value, (error: unknown) => error);
  assert.equal(code, 0, "help resolves to the success exit code");
  assert.equal(stderr.text(), "", "help writes nothing on stderr");
  const lines = stdout.text().split("\n");
  for (const name of ADMIN_COMMANDS) {
    assert.ok(
      lines.some((line) => line.startsWith(name)),
      `the help listing holds a line for ${name}`,
    );
  }
});

test("C-2687097e cliMain refuses a command that needs the owner configuration", async () => {
  const stdout = capture();
  const stderr = capture();
  const code = await cliMain(["admin", "list-users"], {
    env: emptyEnv,
    stdout: stdout.output,
    stderr: stderr.output,
  }).then((value) => value, (error: unknown) => error);
  assert.equal(code, 1, "an owner command without the owner variables exits 1");
  assert.equal(stdout.text(), "", "nothing is printed on stdout");
  assert.ok(
    stderr.text().startsWith("CLI_OWNER_REQUIRED: "),
    "stderr names the missing owner configuration",
  );
});

test("C-2687097e cliMain refuses an unknown command", async () => {
  const stdout = capture();
  const stderr = capture();
  const code = await cliMain(["nope"], {
    env: emptyEnv,
    stdout: stdout.output,
    stderr: stderr.output,
  }).then((value) => value, (error: unknown) => error);
  assert.equal(code, 2, "an unknown command exits 2");
  assert.equal(stdout.text(), "", "nothing is printed on stdout");
  assert.equal(
    stderr.text(),
    "CLI_UNKNOWN_COMMAND: unknown command; run with --help to list the commands\n",
  );
});

test("C-2687097e registerAdminCommands and createDefaultRegistry list the five admin commands", () => {
  const registry = createCommandRegistry();
  assert.doesNotThrow(() => {
    registerAdminCommands(registry);
  }, "registerAdminCommands registers the admin commands");
  assert.deepEqual(
    registry.list().map((entry) => entry.name),
    ADMIN_COMMANDS,
    "a fresh registry holds exactly the five admin commands",
  );

  let defaultRegistry: CommandRegistry | undefined;
  assert.doesNotThrow(() => {
    defaultRegistry = createDefaultRegistry();
  }, "createDefaultRegistry returns the default registry");
  assert.ok(defaultRegistry !== undefined, "createDefaultRegistry returns a registry");
  assert.deepEqual(
    defaultRegistry.list().map((entry) => entry.name),
    [...ADMIN_COMMANDS, "flow validate"],
    "the default registry holds the five admin commands and flow validate",
  );
});
