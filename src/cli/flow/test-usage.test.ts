import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, symlinkSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { sequentialIds } from "../../core/index.ts";
import { TEST_CATALOGUE_PATH } from "../../../test/support/catalogue/document.ts";
import {
  PAY_ONCE_INPUT,
  PAY_ONCE_PAID_OUTPUT,
  payOnceVersion,
} from "../../../test/support/crash/pay-once.ts";
import { cliMain } from "../main.ts";
import type { CliOutput } from "../output.ts";
import { createCommandRegistry } from "../registry.ts";
import { flowTestCommand } from "./test.ts";

assert.equal(typeof flowTestCommand.run, "function");

const HELP_TEXT =
  "usage: node src/cli/main.ts flow test --file <string> --mocks <string> [--input <string>] [--catalogue <string>] [--json]\n" +
  "run a flow offline against mocks\n" +
  "  --file <string>  flow file to test\n" +
  "  --mocks <string>  mocks JSON file\n" +
  "  [--input <string>]  input JSON file, default {}\n" +
  "  [--catalogue <string>]  catalogue JSON file\n" +
  "  [--json]  print the result as JSON\n";

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

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

async function run(argv: readonly string[]): Promise<Run> {
  const stdout = capture();
  const stderr = capture();
  const registry = createCommandRegistry();
  registry.registerCommand("flow test", flowTestCommand);

  let code: number | undefined;
  await assert.doesNotReject(async () => {
    code = await cliMain(argv, {
      env: {},
      registry,
      stdout: stdout.output,
      stderr: stderr.output,
      ids: sequentialIds(0),
    });
  }, "cliMain resolves an exit code");
  assert.ok(code !== undefined, "cliMain answered an exit code");
  return { code, stdout: stdout.text(), stderr: stderr.text() };
}

async function usageError(argv: readonly string[], message: string): Promise<void> {
  const result = await run(argv);
  assert.equal(result.code, 2, `exit 2 for ${message}`);
  assert.equal(result.stdout, "", `no stdout for ${message}`);
  assert.equal(result.stderr, `CLI_USAGE: ${message}\n`, `stderr for ${message}`);
}

test("C-635240e3 flow test reports usage errors and prints help", async () => {
  const dir = mkdtempSync(join(tmpdir(), "flow-test-usage-"));
  try {
    const file = join(dir, "flow.json");
    const input = join(dir, "input.json");
    const mocks = join(dir, "mocks.json");
    const badJson = join(dir, "bad.json");
    const badCatalogue = join(dir, "bad-catalogue.json");
    const oversized = join(dir, "oversized.json");
    const loop = join(dir, "loop");
    const unreadable = join(dir, "unreadable.json");
    const fifo = join(dir, "fifo.json");
    const missing = join(dir, "missing.json");

    await writeFile(file, JSON.stringify(payOnceVersion().flow), "utf8");
    await writeFile(input, JSON.stringify(PAY_ONCE_INPUT), "utf8");
    await writeFile(
      mocks,
      JSON.stringify({
        lookup: [{ output: { vendor_id: "v1", status: "active" } }],
        pay: [{ output: PAY_ONCE_PAID_OUTPUT }],
      }),
      "utf8",
    );
    await writeFile(badJson, "{", "utf8");
    await writeFile(badCatalogue, "{", "utf8");
    await writeFile(oversized, "x".repeat(1_048_577), "utf8");
    await writeFile(unreadable, JSON.stringify(payOnceVersion().flow), "utf8");
    chmodSync(unreadable, 0o000);
    symlinkSync("loop", loop);
    execFileSync("mkfifo", [fifo]);

    await usageError(
      ["flow", "test", "--file", file, "--catalogue", TEST_CATALOGUE_PATH],
      "missing required option --mocks",
    );
    await usageError(
      ["flow", "test", "--file", file, "--mocks", missing, "--catalogue", TEST_CATALOGUE_PATH],
      "cannot read --mocks (ENOENT)",
    );
    await usageError(
      ["flow", "test", "--file", missing, "--mocks", mocks, "--catalogue", TEST_CATALOGUE_PATH],
      "cannot read --file (ENOENT)",
    );
    await usageError(
      ["flow", "test", "--file", file, "--mocks", badJson, "--catalogue", TEST_CATALOGUE_PATH],
      "--mocks is not valid JSON",
    );
    await usageError(
      [
        "flow",
        "test",
        "--file",
        file,
        "--mocks",
        mocks,
        "--input",
        badJson,
        "--catalogue",
        TEST_CATALOGUE_PATH,
      ],
      "--input is not valid JSON",
    );
    await usageError(
      [
        "flow",
        "test",
        "--file",
        file,
        "--mocks",
        mocks,
        "--input",
        missing,
        "--catalogue",
        TEST_CATALOGUE_PATH,
      ],
      "cannot read --input (ENOENT)",
    );
    await usageError(
      ["flow", "test", "--file", file, "--mocks", dir, "--catalogue", TEST_CATALOGUE_PATH],
      "cannot read --mocks (not a regular file)",
    );
    await usageError(
      [
        "flow",
        "test",
        "--file",
        file,
        "--mocks",
        mocks,
        "--input",
        "/dev/null",
        "--catalogue",
        TEST_CATALOGUE_PATH,
      ],
      "cannot read --input (not a regular file)",
    );
    await usageError(
      ["flow", "test", "--file", fifo, "--mocks", mocks, "--catalogue", TEST_CATALOGUE_PATH],
      "cannot read --file (not a regular file)",
    );
    await usageError(
      ["flow", "test", "--file", loop, "--mocks", mocks, "--catalogue", TEST_CATALOGUE_PATH],
      "cannot read --file (ELOOP)",
    );
    await usageError(
      ["flow", "test", "--file", unreadable, "--mocks", mocks, "--catalogue", TEST_CATALOGUE_PATH],
      "cannot read --file (EACCES)",
    );
    await usageError(
      ["flow", "test", "--file", oversized, "--mocks", mocks, "--catalogue", TEST_CATALOGUE_PATH],
      "cannot read --file (too large)",
    );
    await usageError(
      ["flow", "test", "--file", file, "--mocks", mocks, "--catalogue", badCatalogue],
      "catalogue: invalid JSON",
    );
    await usageError(
      ["flow", "test", "--file", file, "--mocks", mocks, "--catalogue", missing],
      "cannot read --catalogue (ENOENT)",
    );

    const arrayInput = join(dir, "array-input.json");
    await writeFile(arrayInput, "[]", "utf8");
    await usageError(
      [
        "flow",
        "test",
        "--file",
        file,
        "--mocks",
        mocks,
        "--input",
        arrayInput,
        "--catalogue",
        TEST_CATALOGUE_PATH,
      ],
      "--input must be a JSON object",
    );

    const help = await run(["flow", "test", "--help"]);
    assert.equal(help.code, 0, "help exits 0");
    assert.equal(help.stderr, "", "help writes nothing on stderr");
    assert.equal(help.stdout, HELP_TEXT, "help prints the usage, summary and options");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
