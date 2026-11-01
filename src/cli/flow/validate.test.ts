import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { parseFlowText } from "../../authoring/index.ts";
import { cliMain } from "../main.ts";
import type { CliOutput } from "../output.ts";

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
  const code = await cliMain(argv, {
    env: {},
    stdout: stdout.output,
    stderr: stderr.output,
  });
  return { code, stdout: stdout.text(), stderr: stderr.text() };
}

const RF1 = fileURLToPath(
  new URL("../../../test/support/catalogue/flows/rf-1-invoice-intake.yaml", import.meta.url),
);
const CATALOGUE = fileURLToPath(
  new URL("../../../test/support/catalogue/blocks.v0.json", import.meta.url),
);
const INVALID_CASE = fileURLToPath(
  new URL(
    "../../../test/support/flow-cases/invalid/l3-taint-raw-fetch-into-mail-body.yaml",
    import.meta.url,
  ),
);

interface JsonVerdict {
  file: string;
  ok: boolean;
  errors: unknown[];
  warnings: unknown[];
  layers_run: string[];
}

test("C-a95014a0 flow validate prints an OK verdict and a JSON verdict", async () => {
  const text = await run(["flow", "validate", "--file", RF1, "--catalogue", CATALOGUE]);
  assert.equal(text.code, 0, "a valid flow exits 0");
  assert.equal(text.stderr, "", "nothing is printed on stderr");
  const lines = text.stdout.split("\n");
  assert.equal(
    lines[0],
    `OK ${RF1} (layers run: L1 L2 L3) 0 error(s), 1 warning(s)`,
    "the first line is the verdict",
  );
  assert.ok(
    lines.some((line) => line.startsWith("  warning L3 W_LETHAL_TRIFECTA /nodes: ")),
    "the warning is printed as a warning line",
  );

  const json = await run([
    "flow",
    "validate",
    "--file",
    RF1,
    "--catalogue",
    CATALOGUE,
    "--json",
  ]);
  assert.equal(json.code, 0, "the JSON run exits 0");
  assert.equal(json.stderr, "", "nothing is printed on stderr");
  const output = json.stdout.split("\n").filter((line) => line !== "");
  assert.equal(output.length, 1, "the JSON run prints one line");
  const verdict = JSON.parse(output[0] ?? "") as JsonVerdict;
  assert.equal(verdict.file, RF1);
  assert.equal(verdict.ok, true);
  assert.deepEqual(verdict.errors, []);
  assert.equal(verdict.warnings.length, 1);
  assert.deepEqual(verdict.layers_run, ["L1", "L2", "L3"]);
});

test("C-a95014a0 flow validate prints an INVALID verdict and escapes control bytes", async () => {
  const invalid = await run([
    "flow",
    "validate",
    "--file",
    INVALID_CASE,
    "--catalogue",
    CATALOGUE,
  ]);
  assert.equal(invalid.code, 1, "an invalid flow exits 1");
  assert.equal(invalid.stderr, "", "nothing is printed on stderr");
  assert.ok(invalid.stdout.startsWith("INVALID "), "the first line is the invalid verdict");
  assert.ok(invalid.stdout.includes("1 error(s)"), "the verdict counts the error");
  assert.ok(
    invalid.stdout
      .split("\n")
      .some((line) =>
        line.startsWith("  L3 L3_TAINT_TO_CONSEQUENTIAL /nodes/send/with/body [send]: "),
      ),
    "the error is printed with its layer, code, path and node",
  );

  const source = await readFile(RF1, "utf8");
  const parsed = parseFlowText(source, "yaml");
  assert.equal(parsed.ok, true, "RF-1 parses");
  const doc = parsed.ok ? parsed.doc : undefined;
  const escapedJson = JSON.stringify(doc)
    .replaceAll('"pay"', '"pay\\u001b[31m"')
    .replaceAll("nodes.pay.", "nodes.pay\\u001b[31m.");
  const dir = await mkdtemp(join(tmpdir(), "flow-validate-"));
  try {
    const file = join(dir, "escaped.json");
    await writeFile(file, escapedJson, "utf8");

    const escaped = await run(["flow", "validate", "--file", file, "--catalogue", CATALOGUE]);
    assert.equal(escaped.code, 1, "the escaped flow is invalid");
    assert.equal(escaped.stderr, "", "nothing is printed on stderr");
    for (const character of escaped.stdout) {
      const codePoint = character.codePointAt(0) ?? 0;
      assert.ok(
        codePoint >= 0x20 || character === "\n",
        "stdout holds no byte below 0x20 other than a newline",
      );
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-0aa97fa7 flow validate usage errors exit 2 and listings mention the command", async () => {
  const dir = await mkdtemp(join(tmpdir(), "flow-validate-usage-"));
  try {
    const directory = join(dir, "a-directory");
    await mkdir(directory);
    const large = join(dir, "large.yaml");
    await writeFile(large, "x".repeat(1_048_577), "utf8");
    const badCatalogue = join(dir, "bad-catalogue.json");
    await writeFile(badCatalogue, '{"blocks":{"a\u001b@1":{"effect":"x"}}}', "utf8");

    const cases: ReadonlyArray<readonly [string[], string]> = [
      [["flow", "validate"], "CLI_USAGE: missing required option --file\n"],
      [
        ["flow", "validate", "--file", join(dir, "missing.yaml")],
        "CLI_USAGE: cannot read --file (ENOENT)\n",
      ],
      [["flow", "validate", RF1], "CLI_USAGE: invalid arguments; run with --help\n"],
      [["flow", "validate", "--file", directory], "CLI_USAGE: cannot read --file (EISDIR)\n"],
      [["flow", "validate", "--file", large], "CLI_USAGE: cannot read --file (too large)\n"],
      [
        ["flow", "validate", "--file", RF1, "--catalogue", join(dir, "missing.json")],
        "CLI_USAGE: cannot read --catalogue (ENOENT)\n",
      ],
    ];

    for (const [argv, message] of cases) {
      const result = await run(argv);
      assert.equal(result.code, 2, `the run ${argv.join(" ")} exits 2`);
      assert.equal(result.stdout, "", "a usage error writes nothing on stdout");
      assert.equal(result.stderr, message, `the run ${argv.join(" ")} prints its usage message`);
    }

    const bad = await run([
      "flow",
      "validate",
      "--file",
      RF1,
      "--catalogue",
      badCatalogue,
    ]);
    assert.equal(bad.code, 2, "a malformed catalogue exits 2");
    assert.equal(bad.stdout, "", "a malformed catalogue writes nothing on stdout");
    assert.ok(
      bad.stderr.startsWith(
        "CLI_USAGE: --catalogue is not a usable catalogue file: /blocks/a?@1/effect: ",
      ),
      "the malformed catalogue line names the safe pointer and reason",
    );

    const emptyCatalogue = await run(["flow", "validate", "--file", RF1]);
    assert.equal(emptyCatalogue.code, 1, "a flow without a catalogue is invalid");
    assert.equal(emptyCatalogue.stderr, "", "nothing is printed on stderr");
    assert.ok(
      emptyCatalogue.stdout
        .split("\n")
        .some((line) => line.includes("L2_UNKNOWN_BLOCK")),
      "an empty catalogue reports every block as unknown",
    );

    const group = await run(["flow"]);
    assert.equal(group.code, 0, "the flow group exits 0");
    assert.ok(
      group.stdout.split("\n").some((line) => line.startsWith("flow validate")),
      "the flow group lists flow validate",
    );
    assert.equal(group.stderr, "", "the flow group writes nothing on stderr");

    const help = await run(["help"]);
    assert.equal(help.code, 0, "help exits 0");
    const helpLines = help.stdout.split("\n");
    assert.ok(
      helpLines.some((line) => line.startsWith("flow validate")),
      "help lists flow validate",
    );
    for (const name of [
      "admin bootstrap-admin",
      "admin grant-role",
      "admin list-users",
      "admin revoke-role",
      "admin verify-audit",
    ]) {
      assert.ok(
        helpLines.some((line) => line.startsWith(name)),
        `help lists ${name}`,
      );
    }
    assert.equal(help.stderr, "", "help writes nothing on stderr");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
