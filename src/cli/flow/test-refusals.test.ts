import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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

function nonEmptyLines(text: string): string[] {
  return text.split("\n").filter((line) => line !== "");
}

test("C-37b71ce3 flow test reports invalid flows mock problems and refused inputs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "flow-test-refusals-"));
  try {
    const file = join(dir, "flow.json");
    const input = join(dir, "input.json");
    const mocks = join(dir, "mocks.json");
    const emptyMocks = join(dir, "empty-mocks.json");
    const schemaMocks = join(dir, "schema-mocks.json");
    const unsanitisedMocks = join(dir, "unsanitised-mocks.json");
    const shortInput = join(dir, "short-input.json");
    const nulInput = join(dir, "nul-input.json");

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
    await writeFile(emptyMocks, "{}", "utf8");
    await writeFile(
      schemaMocks,
      JSON.stringify({
        lookup: [{ output: { status: "active" } }],
        pay: [{ output: PAY_ONCE_PAID_OUTPUT }],
      }),
      "utf8",
    );
    await writeFile(
      unsanitisedMocks,
      JSON.stringify({
        lookup: [{ output: { vendor_id: "v1", status: "active" } }],
        pay: [{ output: PAY_ONCE_PAID_OUTPUT }],
        "gho\u001bst\u202e": [],
      }),
      "utf8",
    );
    await writeFile(shortInput, JSON.stringify({ vendor: "Acme" }), "utf8");
    await writeFile(
      nulInput,
      '{"vendor":"Acme\\u0000","invoice":"inv-1","amount":120}',
      "utf8",
    );

    const noCatalogue = await run([
      "flow",
      "test",
      "--file",
      file,
      "--mocks",
      mocks,
      "--input",
      input,
    ]);
    assert.equal(noCatalogue.code, 1, "an invalid flow exits 1");
    assert.equal(noCatalogue.stderr, "", "an invalid flow writes nothing on stderr");
    const noCatalogueLines = nonEmptyLines(noCatalogue.stdout);
    assert.ok(
      noCatalogueLines[0]?.startsWith(`INVALID ${file}: `),
      "the first line names the invalid flow",
    );
    assert.ok(noCatalogueLines[0]?.endsWith("error(s)"), "the first line counts the errors");
    assert.equal(
      noCatalogueLines[noCatalogueLines.length - 1],
      "  hint: no --catalogue given, so every block is unknown",
      "the last line explains the missing catalogue",
    );

    const missingMocks = await run([
      "flow",
      "test",
      "--file",
      file,
      "--mocks",
      emptyMocks,
      "--input",
      input,
      "--catalogue",
      TEST_CATALOGUE_PATH,
    ]);
    assert.equal(missingMocks.code, 1, "missing mocks exit 1");
    assert.equal(missingMocks.stderr, "", "missing mocks write nothing on stderr");
    assert.equal(
      missingMocks.stdout,
      "MOCKS 2 problem(s)\n  lookup missing: no mock entry\n  pay missing: no mock entry\n",
      "the missing mock entries are listed",
    );

    const schemaMismatch = await run([
      "flow",
      "test",
      "--file",
      file,
      "--mocks",
      schemaMocks,
      "--input",
      input,
      "--catalogue",
      TEST_CATALOGUE_PATH,
    ]);
    assert.equal(schemaMismatch.code, 1, "a mock the output schema refuses exits 1");
    assert.equal(schemaMismatch.stderr, "", "a schema mismatch writes nothing on stderr");
    assert.equal(
      schemaMismatch.stdout,
      "MOCKS 1 problem(s)\n  lookup[0] schema: / required\n",
      "the schema problem is listed",
    );

    const shortInputRun = await run([
      "flow",
      "test",
      "--file",
      file,
      "--mocks",
      mocks,
      "--input",
      shortInput,
      "--catalogue",
      TEST_CATALOGUE_PATH,
    ]);
    assert.equal(shortInputRun.code, 1, "an input the flow refuses exits 1");
    assert.equal(shortInputRun.stderr, "", "a refused input writes nothing on stderr");
    assert.ok(
      shortInputRun.stdout.startsWith("FAILED INTERPRETER_INPUT_INVALID -\n"),
      "the refused input prints its interpreter code",
    );
    assert.ok(
      shortInputRun.stdout.includes("  path: /\n"),
      "the error details name the failing path",
    );
    assert.ok(
      shortInputRun.stdout.includes("  keyword: required\n"),
      "the error details name the failing keyword",
    );

    const unsanitised = await run([
      "flow",
      "test",
      "--file",
      file,
      "--mocks",
      unsanitisedMocks,
      "--input",
      input,
      "--catalogue",
      TEST_CATALOGUE_PATH,
    ]);
    assert.equal(unsanitised.code, 1, "an unknown mock node exits 1");
    assert.equal(unsanitised.stderr, "", "an unknown mock node writes nothing on stderr");
    assert.equal(
      unsanitised.stdout,
      "MOCKS 1 problem(s)\n  gho?st? unknown_node: no such node\n",
      "the unsafe characters in the mock key are replaced",
    );

    const nulRun = await run([
      "flow",
      "test",
      "--file",
      file,
      "--mocks",
      mocks,
      "--input",
      nulInput,
      "--catalogue",
      TEST_CATALOGUE_PATH,
    ]);
    assert.equal(nulRun.code, 1, "an internal failure exits 1");
    assert.equal(nulRun.stdout, "", "an internal failure prints nothing on stdout");
    assert.equal(
      nulRun.stderr,
      "CLI_INTERNAL: command failed\n",
      "an internal failure prints only the internal message",
    );
    assert.equal(nulRun.stderr.includes("invalid run data"), false, "the error text is hidden");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
