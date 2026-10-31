import assert from "node:assert/strict";
import { test } from "node:test";

import { CliError } from "./errors.ts";
import type { CliOutput } from "./output.ts";
import type { CliCommand, CliOption, CommandRegistry } from "./registry.ts";
import { createCommandRegistry } from "./registry.ts";
import type { CliDeps } from "./run.ts";
import { runCli } from "./run.ts";

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

function deps(registry: CommandRegistry, stdout: Captured, stderr: Captured): CliDeps {
  return {
    env: {},
    stdout: stdout.output,
    stderr: stderr.output,
    registry,
  };
}

function command(
  summary: string,
  options: Readonly<Record<string, CliOption>>,
  run: CliCommand["run"],
  details?: string,
): CliCommand {
  const base: CliCommand = { summary, options, database: false, run };
  return details === undefined ? base : { ...base, details };
}

test("C-e063087b help lists commands and prints command usage", async () => {
  const registry = createCommandRegistry();
  let calls = 0;
  const run: CliCommand["run"] = async () => {
    calls += 1;
    return 0;
  };

  registry.registerCommand(
    "admin demo",
    command(
      "Demo command",
      { name: { type: "string", summary: "Who to greet", required: true } },
      run,
      "Needs an identity provider.",
    ),
  );
  registry.registerCommand("solo", command("Solo command", {}, run));

  for (const argv of [[], ["help"], ["--help"]]) {
    const stdout = capture();
    const stderr = capture();
    const code = await runCli(argv, deps(registry, stdout, stderr)).then(
      (value) => value,
      (error: unknown) => error,
    );
    assert.equal(code, 0);
    assert.match(stdout.text(), /admin demo\s+Demo command/);
    assert.match(stdout.text(), /solo\s+Solo command/);
    assert.equal(stderr.text(), "");
  }

  const groupStdout = capture();
  const groupStderr = capture();
  const groupCode = await runCli(["admin"], deps(registry, groupStdout, groupStderr)).then(
    (value) => value,
    (error: unknown) => error,
  );
  assert.equal(groupCode, 0);
  assert.match(groupStdout.text(), /admin demo\s+Demo command/);
  assert.doesNotMatch(groupStdout.text(), /solo\s+Solo command/);
  assert.equal(groupStderr.text(), "");

  const usageStdout = capture();
  const usageStderr = capture();
  const usageCode = await runCli(
    ["admin", "demo", "--help"],
    deps(registry, usageStdout, usageStderr),
  ).then(
    (value) => value,
    (error: unknown) => error,
  );
  assert.equal(usageCode, 0);
  const lines = usageStdout.text().split("\n");
  assert.equal(lines[0], "usage: node src/cli/main.ts admin demo --name <string>");
  assert.ok(lines.some((line) => line.includes("Demo command")), "prints the summary");
  assert.ok(
    lines.some((line) => line.includes("Needs an identity provider.")),
    "prints the details",
  );
  assert.ok(lines.some((line) => line.includes("Who to greet")), "prints the option summary");
  assert.equal(usageStderr.text(), "");
  assert.equal(calls, 0);
});

test("C-accc72ab parses flags and resolves to the command exit code", async () => {
  const registry = createCommandRegistry();
  const seen: Array<Readonly<Record<string, string | boolean>>> = [];
  registry.registerCommand(
    "admin demo",
    command(
      "Demo command",
      {
        name: { type: "string", summary: "Name" },
        flag: { type: "boolean", summary: "Flag" },
      },
      async (call) => {
        seen.push({ ...call.args });
        return 7;
      },
    ),
  );

  const firstStdout = capture();
  const firstStderr = capture();
  const first = await runCli(
    ["admin", "demo", "--name=abc", "--flag"],
    deps(registry, firstStdout, firstStderr),
  ).then(
    (value) => value,
    (error: unknown) => error,
  );
  assert.equal(first, 7);

  const secondStdout = capture();
  const secondStderr = capture();
  const second = await runCli(
    ["admin", "demo", "--name", "x"],
    deps(registry, secondStdout, secondStderr),
  ).then(
    (value) => value,
    (error: unknown) => error,
  );
  assert.equal(second, 7);

  assert.deepEqual(seen, [{ name: "abc", flag: true }, { name: "x" }]);
  assert.equal(firstStderr.text(), "");
  assert.equal(secondStderr.text(), "");
});

test("C-ac3bd6d8 unknown commands and bad arguments exit 2 without running", async () => {
  const registry = createCommandRegistry();
  let calls = 0;
  registry.registerCommand(
    "admin demo",
    command(
      "Demo command",
      { name: { type: "string", summary: "Name", required: true } },
      async () => {
        calls += 1;
        return 0;
      },
    ),
  );

  const cases: ReadonlyArray<readonly [string[], string]> = [
    [
      ["nope"],
      "CLI_UNKNOWN_COMMAND: unknown command; run with --help to list the commands\n",
    ],
    [
      ["admin", "nope"],
      "CLI_UNKNOWN_COMMAND: unknown command; run with --help to list the commands\n",
    ],
    [["admin", "demo"], "CLI_USAGE: missing required option --name\n"],
    [["admin", "demo", "--name"], "CLI_USAGE: invalid arguments; run with --help\n"],
    [
      ["admin", "demo", "--name", "a", "--bogus"],
      "CLI_USAGE: invalid arguments; run with --help\n",
    ],
    [["admin", "demo", "--name", "a", "extra"], "CLI_USAGE: invalid arguments; run with --help\n"],
  ];

  for (const [argv, message] of cases) {
    const stdout = capture();
    const stderr = capture();
    const code = await runCli(argv, deps(registry, stdout, stderr)).then(
      (value) => value,
      (error: unknown) => error,
    );
    assert.equal(code, 2);
    assert.equal(stdout.text(), "");
    assert.equal(stderr.text(), message);
  }

  assert.equal(calls, 0);
});

test("C-82fdd5fe a failing command prints its code and maps unknown errors", async () => {
  const registry = createCommandRegistry();
  registry.registerCommand(
    "no-tenant",
    command("No tenant", {}, async () => {
      throw new CliError("CLI_NO_TENANT", "no tenant exists");
    }),
  );
  registry.registerCommand(
    "bad-usage",
    command("Bad usage", {}, async () => {
      throw new CliError("CLI_USAGE", "bad value");
    }),
  );
  registry.registerCommand(
    "internal",
    command("Internal", {}, async () => {
      throw new Error("password pw-secret-xyz refused");
    }),
  );

  const expected: ReadonlyArray<readonly [string, number, string]> = [
    ["no-tenant", 1, "CLI_NO_TENANT: no tenant exists\n"],
    ["bad-usage", 2, "CLI_USAGE: bad value\n"],
    ["internal", 1, "CLI_INTERNAL: command failed\n"],
  ];

  for (const [name, exitCode, message] of expected) {
    const stdout = capture();
    const stderr = capture();
    const code = await runCli([name], deps(registry, stdout, stderr)).then(
      (value) => value,
      (error: unknown) => error,
    );
    assert.equal(code, exitCode);
    assert.equal(stdout.text(), "");
    assert.equal(stderr.text(), message);
    assert.doesNotMatch(stderr.text(), /pw-secret-xyz/);
  }
});
