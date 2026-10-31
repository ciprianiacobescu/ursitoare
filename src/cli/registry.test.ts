import assert from "node:assert/strict";
import { test } from "node:test";

import { createCommandRegistry } from "./registry.ts";
import type { CliCommand } from "./registry.ts";

function command(summary: string): CliCommand {
  return {
    summary,
    options: {},
    database: false,
    run: async () => 0,
  };
}

test("C-c6f59b36 register find and list named commands", () => {
  assert.doesNotThrow(() => {
    const registry = createCommandRegistry();
    const flowValidate = command("Validate a flow");
    const adminGrant = command("Grant a role");
    const initSecrets = command("Initialise secrets");

    registry.registerCommand("flow validate", flowValidate);
    registry.registerCommand("admin grant-role", adminGrant);
    registry.registerCommand("init-secrets", initSecrets);

    assert.deepEqual(registry.find(["admin", "grant-role", "--user", "u1"]), {
      name: "admin grant-role",
      command: adminGrant,
      rest: ["--user", "u1"],
    });
    assert.deepEqual(registry.find(["init-secrets", "--dir", "/x"]), {
      name: "init-secrets",
      command: initSecrets,
      rest: ["--dir", "/x"],
    });
    assert.equal(registry.find(["flow"]), null);
    assert.equal(registry.find(["admin", "nope"]), null);
    assert.equal(registry.find([]), null);
    assert.deepEqual(
      registry.list().map((entry) => entry.name),
      ["admin grant-role", "flow validate", "init-secrets"],
    );
  }, "the command registry registers finds and lists named commands");
});

test("C-9658e772 refusals reject invalid duplicate and help names", () => {
  assert.doesNotThrow(() => {
    const registry = createCommandRegistry();

    for (const bad of ["Admin x", "admin", "flow", "help", "admin a b", "x_y", ""]) {
      assert.throws(() => registry.registerCommand(bad, command("Bad")), {
        code: "CLI_INVALID_COMMAND",
      });
    }

    registry.registerCommand("admin grant-role", command("Grant a role"));
    assert.throws(
      () => registry.registerCommand("admin grant-role", command("Duplicate")),
      { code: "CLI_INVALID_COMMAND" },
    );

    const withHelp: CliCommand = {
      summary: "Uses a reserved option",
      options: { help: { type: "boolean", summary: "Reserved" } },
      database: false,
      run: async () => 0,
    };
    assert.throws(() => registry.registerCommand("admin other", withHelp), {
      code: "CLI_INVALID_COMMAND",
    });

    assert.deepEqual(
      registry.list().map((entry) => entry.name),
      ["admin grant-role"],
    );
  }, "the command registry refuses invalid duplicate and reserved names");
});
