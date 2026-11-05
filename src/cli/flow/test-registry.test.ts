import assert from "node:assert/strict";
import { test } from "node:test";

import type { Env } from "../../config/index.ts";
import { registerAdminCommands } from "../admin/index.ts";
import { createDefaultRegistry } from "../builtin.ts";
import { cliMain } from "../main.ts";
import type { CliOutput } from "../output.ts";
import { createCommandRegistry } from "../registry.ts";
import type { CommandRegistry } from "../registry.ts";
import { registerFlowCommands } from "./index.ts";

const ADMIN_COMMANDS = [
  "admin bootstrap-admin",
  "admin grant-role",
  "admin list-users",
  "admin revoke-role",
  "admin verify-audit",
];

const ALL_COMMANDS = [...ADMIN_COMMANDS, "flow test", "flow validate"];

const emptyEnv: Env = {};

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

test("C-2687097e cliMain help lists the seven default commands in order", async () => {
  const stdout = capture();
  const stderr = capture();

  let code: number | undefined;
  await assert.doesNotReject(async () => {
    code = await cliMain(["help"], {
      env: emptyEnv,
      stdout: stdout.output,
      stderr: stderr.output,
    });
  }, "cliMain lists the default registry");
  assert.equal(code, 0, "help resolves to the success exit code");
  assert.equal(stderr.text(), "", "help writes nothing on stderr");

  const lines = stdout.text().split("\n").filter((line) => line !== "");
  assert.equal(lines.length, ALL_COMMANDS.length, "help prints one line per command");
  for (const [index, name] of ALL_COMMANDS.entries()) {
    assert.ok(
      lines[index]?.startsWith(name),
      `help prints ${name} at position ${index}`,
    );
  }
  assert.ok(
    lines.includes("flow test  run a flow offline against mocks"),
    "the flow test line carries its summary",
  );
});

test("C-2687097e fresh registries list the admin flow and default commands", () => {
  const adminRegistry = createCommandRegistry();
  assert.doesNotThrow(() => {
    registerAdminCommands(adminRegistry);
  }, "registerAdminCommands registers the admin commands");
  assert.deepEqual(
    adminRegistry.list().map((entry) => entry.name),
    ADMIN_COMMANDS,
    "a fresh registry holds exactly the five admin commands",
  );

  const flowRegistry = createCommandRegistry();
  assert.doesNotThrow(() => {
    registerFlowCommands(flowRegistry);
  }, "registerFlowCommands registers the flow commands");
  assert.deepEqual(
    flowRegistry.list().map((entry) => entry.name),
    ["flow test", "flow validate"],
    "a fresh registry holds exactly flow test and flow validate",
  );

  let defaultRegistry: CommandRegistry | undefined;
  assert.doesNotThrow(() => {
    defaultRegistry = createDefaultRegistry();
  }, "createDefaultRegistry returns the default registry");
  assert.ok(defaultRegistry !== undefined, "createDefaultRegistry returns a registry");
  assert.deepEqual(
    defaultRegistry.list().map((entry) => entry.name),
    ALL_COMMANDS,
    "the default registry holds the seven commands and no other",
  );
});
