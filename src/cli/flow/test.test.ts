import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import type { Flow } from "../../authoring/index.ts";
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

const FIRST_STDOUT =
  "0 lookup block completed\n1 route switch completed active\n2 pay block completed\n3 done end completed\nCOMPLETED done\n";

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

function flow0Of(): Flow {
  const flow = payOnceVersion().flow;
  const lookup = flow.nodes["lookup"];
  const pay = flow.nodes["pay"];
  assert.ok(lookup !== undefined && lookup.kind === "block", "the fixture has a lookup block");
  assert.ok(pay !== undefined && pay.kind === "block", "the fixture has a pay block");
  return {
    ...flow,
    inputs: { type: "object" },
    nodes: {
      ...flow.nodes,
      lookup: { ...lookup, with: { vendor_name: "Acme" } },
      pay: {
        ...pay,
        with: {
          vendor_id: "${{ nodes.lookup.output.vendor_id }}",
          amount: 120,
          currency: "EUR",
          reference: "inv-1",
        },
      },
    },
  };
}

test("C-03192026 flow test completes and fails mock runs offline", async () => {
  const dir = await mkdtemp(join(tmpdir(), "flow-test-"));
  const originalFetch = globalThis.fetch;
  const fetchCalls: unknown[][] = [];
  globalThis.fetch = ((...args: unknown[]) => {
    fetchCalls.push(args);
    throw new Error("unexpected fetch");
  }) as unknown as typeof fetch;

  try {
    const file = join(dir, "flow.json");
    const file0 = join(dir, "flow0.json");
    const input = join(dir, "input.json");
    const mocks = join(dir, "mocks.json");
    const blockedMocks = join(dir, "blocked-mocks.json");
    const errorMocks = join(dir, "error-mocks.json");
    const sanitisedMocks = join(dir, "sanitised-mocks.json");

    await writeFile(file, JSON.stringify(payOnceVersion().flow), "utf8");
    await writeFile(file0, JSON.stringify(flow0Of()), "utf8");
    await writeFile(input, JSON.stringify(PAY_ONCE_INPUT), "utf8");
    await writeFile(
      mocks,
      JSON.stringify({
        lookup: [{ output: { vendor_id: "v1", status: "active" } }],
        pay: [{ output: PAY_ONCE_PAID_OUTPUT }],
      }),
      "utf8",
    );
    await writeFile(
      blockedMocks,
      JSON.stringify({
        lookup: [{ output: { vendor_id: "v2", status: "blocked" } }],
        pay: [{ output: PAY_ONCE_PAID_OUTPUT }],
      }),
      "utf8",
    );
    await writeFile(
      errorMocks,
      JSON.stringify({
        lookup: [{ output: { vendor_id: "v1", status: "active" } }],
        pay: [{ error: { code: "E_DOWN", message: "secret-text" } }],
      }),
      "utf8",
    );
    await writeFile(
      sanitisedMocks,
      JSON.stringify({
        lookup: [{ output: { vendor_id: "v1", status: "active" } }],
        pay: [{ output: { payment_id: "p\u001b\u202e1", status: "paid" } }],
      }),
      "utf8",
    );

    const base = [
      "flow",
      "test",
      "--file",
      file,
      "--mocks",
      mocks,
      "--input",
      input,
      "--catalogue",
      TEST_CATALOGUE_PATH,
    ];

    const first = await run(base);
    assert.equal(first.code, 0, "the completed run exits 0");
    assert.equal(first.stderr, "", "the completed run writes nothing on stderr");
    assert.equal(first.stdout, FIRST_STDOUT, "the completed run prints one line per step");

    const jsonRun = await run([...base, "--json"]);
    assert.equal(jsonRun.code, 0, "the JSON run exits 0");
    assert.equal(jsonRun.stderr, "", "the JSON run writes nothing on stderr");
    const jsonLines = jsonRun.stdout.split("\n").filter((line) => line !== "");
    assert.equal(jsonLines.length, 1, "the JSON run prints one line");
    assert.deepEqual(JSON.parse(jsonLines[0] ?? ""), {
      state: "completed",
      terminalNode: "done",
      error: null,
      output: { payment_id: "pay-1" },
      steps: [
        {
          seq: 0,
          nodeId: "lookup",
          kind: "block",
          state: "completed",
          outcome: null,
          error: null,
        },
        {
          seq: 1,
          nodeId: "route",
          kind: "switch",
          state: "completed",
          outcome: "active",
          error: null,
        },
        {
          seq: 2,
          nodeId: "pay",
          kind: "block",
          state: "completed",
          outcome: null,
          error: null,
        },
        {
          seq: 3,
          nodeId: "done",
          kind: "end",
          state: "completed",
          outcome: null,
          error: null,
        },
      ],
    });

    const blocked = await run([
      "flow",
      "test",
      "--file",
      file,
      "--mocks",
      blockedMocks,
      "--input",
      input,
      "--catalogue",
      TEST_CATALOGUE_PATH,
    ]);
    assert.equal(blocked.code, 1, "the blocked run exits 1");
    assert.equal(blocked.stderr, "", "the blocked run writes nothing on stderr");
    assert.equal(
      blocked.stdout,
      "0 lookup block completed\n1 route switch completed default\n2 rejected end failed\nFAILED FLOW_FAILED rejected\n",
      "the blocked run takes the default branch and fails",
    );

    const payFailure = await run([
      "flow",
      "test",
      "--file",
      file,
      "--mocks",
      errorMocks,
      "--input",
      input,
      "--catalogue",
      TEST_CATALOGUE_PATH,
    ]);
    assert.equal(payFailure.code, 1, "the error entry run exits 1");
    const failureLines = payFailure.stdout.split("\n").filter((line) => line !== "");
    assert.equal(failureLines[failureLines.length - 2], "2 pay block failed");
    assert.equal(failureLines[failureLines.length - 1], "FAILED INTERPRETER_TOOL_FAILED pay");
    assert.equal(payFailure.stdout.includes("secret-text"), false, "the mock message is not printed");
    assert.equal(payFailure.stdout.includes("E_DOWN"), false, "the mock code is not printed");
    assert.equal(payFailure.stderr.includes("secret-text"), false, "stderr holds no mock message");
    assert.equal(payFailure.stderr.includes("E_DOWN"), false, "stderr holds no mock code");

    const noInput = await run([
      "flow",
      "test",
      "--file",
      file0,
      "--mocks",
      mocks,
      "--catalogue",
      TEST_CATALOGUE_PATH,
    ]);
    assert.equal(noInput.code, 0, "the flow without required inputs exits 0");
    assert.equal(noInput.stderr, "", "the flow without required inputs writes nothing on stderr");
    assert.equal(noInput.stdout, FIRST_STDOUT, "an absent input defaults to an empty object");

    const sanitised = await run([
      "flow",
      "test",
      "--file",
      file0,
      "--mocks",
      sanitisedMocks,
      "--catalogue",
      TEST_CATALOGUE_PATH,
      "--json",
    ]);
    assert.equal(sanitised.code, 0, "the sanitised run exits 0");
    assert.equal(sanitised.stderr, "", "the sanitised run writes nothing on stderr");
    const sanitisedLines = sanitised.stdout.split("\n").filter((line) => line !== "");
    assert.equal(sanitisedLines.length, 1, "the sanitised run prints one line");
    const sanitisedLine = sanitisedLines[0] ?? "";
    assert.ok(
      sanitisedLine.includes('"output":{"payment_id":"p\\u001b\\u202e1"}'),
      "the escapes are written as text",
    );
    assert.equal(sanitisedLine.includes("\u001b"), false, "no raw ESC is printed");
    assert.equal(sanitisedLine.includes("\u202e"), false, "no raw U+202E is printed");
    const sanitisedJson = JSON.parse(sanitisedLine) as {
      output?: { payment_id?: string };
    };
    assert.equal(
      sanitisedJson.output?.payment_id,
      "p\u001b\u202e1",
      "parsing the line restores the original payment id",
    );

    assert.deepEqual(fetchCalls, [], "the command made no outbound call");
    assert.equal(flowTestCommand.database, false, "the command needs no database");
  } finally {
    globalThis.fetch = originalFetch;
    await rm(dir, { recursive: true, force: true });
  }
});
