// flow test runs code nodes and code hooks in a sandbox pool (rows A1 to A3, H1 to H3, F1 to F3 of test-plan.md).
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../../core/index.ts";
import { createWorkerSandbox } from "../../sandbox/index.ts";
import type {
  SandboxJson,
  SandboxLimits,
  SandboxOptions,
  SandboxResult,
  WorkerSandbox,
  WorkerSandboxOptions,
} from "../../sandbox/index.ts";
import { TEST_CATALOGUE_PATH } from "../../../test/support/catalogue/document.ts";
import { CODE_PAY_TEXT } from "../../../test/support/code-pay.ts";
import { readHookRunText } from "../../../test/support/hook-runs/index.ts";
import { cliMain } from "../main.ts";
import type { CliOutput } from "../output.ts";
import { createCommandRegistry } from "../registry.ts";
import type { CliCommand } from "../registry.ts";
import { FLOW_TEST_POOL, createFlowTestCommand, flowTestCommand } from "./test.ts";

assert.equal(typeof createFlowTestCommand, "function");

const OK_STDOUT =
  "0 lookup block completed\n1 normalize code completed\n2 pay block completed\n3 done end completed\nCOMPLETED done\n";
const FAULT_STDOUT =
  "0 lookup block completed\n1 normalize code failed\nFAILED INTERPRETER_CODE_FAILED normalize\n";

const MOCKS = {
  lookup: [{ output: { vendor_id: "v1", status: "active" } }],
  pay: [{ output: { payment_id: "pay-1", status: "paid" } }],
};
const MOCKS_BLOCKED = {
  lookup: [{ output: { vendor_id: "v2", status: "blocked" } }],
  pay: MOCKS.pay,
};
const INPUT = { vendor: "Acme", invoice: "inv-1", amount: 1234.567, currency: "eur" };
const INPUT_HOOK = { vendor: " Acme ", amount: 120, currency: "eur" };

interface RunCall {
  code: string;
  input: SandboxJson;
  limits: SandboxLimits;
  options: SandboxOptions;
}

interface Recorder {
  createSandbox: (opts: WorkerSandboxOptions) => WorkerSandbox;
  args: WorkerSandboxOptions[];
  runs: RunCall[];
  calls: SandboxResult[];
  pools: WorkerSandbox[];
}

// Wraps the real pool, recording every run; `over.run` replaces the real run so no worker starts.
function recorder(over?: { run?: () => Promise<SandboxResult> }): Recorder {
  const rec: Recorder = {
    args: [],
    runs: [],
    calls: [],
    pools: [],
    createSandbox(opts: WorkerSandboxOptions): WorkerSandbox {
      rec.args.push(opts);
      const real = createWorkerSandbox(opts);
      rec.pools.push(real);
      return {
        get size(): number {
          return real.size;
        },
        get respawns(): number {
          return real.respawns;
        },
        async run(code, input, limits, options): Promise<SandboxResult> {
          rec.runs.push({ code, input, limits, options });
          const result =
            over?.run === undefined ? await real.run(code, input, limits, options) : await over.run();
          rec.calls.push(result);
          return result;
        },
        close(): Promise<void> {
          return real.close();
        },
      };
    },
  };
  return rec;
}

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

function capture(): { output: CliOutput; text(): string } {
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

async function exec(command: CliCommand, argv: readonly string[]): Promise<Run> {
  const stdout = capture();
  const stderr = capture();
  const registry = createCommandRegistry();
  registry.registerCommand("flow test", command);
  let exit: number | undefined;
  await assert.doesNotReject(async () => {
    exit = await cliMain(["flow", "test", ...argv], {
      env: {},
      registry,
      stdout: stdout.output,
      stderr: stderr.output,
      ids: sequentialIds(0),
      clock: fixedClock("2026-11-13T09:00:00.000Z"),
    });
  }, "cliMain resolves an exit code");
  assert.ok(exit !== undefined, "cliMain answered an exit code");
  return { code: exit, stdout: stdout.text(), stderr: stderr.text() };
}

function commandWith(rec: Recorder): CliCommand {
  let command: CliCommand | undefined;
  assert.doesNotThrow(() => {
    command = createFlowTestCommand({ createSandbox: rec.createSandbox });
  }, "createFlowTestCommand builds a command");
  assert.ok(command !== undefined, "createFlowTestCommand answered a command");
  return command;
}

async function closeAll(rec: Recorder): Promise<void> {
  for (const pool of rec.pools) {
    await pool.close();
  }
}

interface Files {
  dir: string;
  flow(name: string, text: string): Promise<string>;
  json(name: string, value: unknown): Promise<string>;
}

async function withFiles(body: (files: Files) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "flow-test-sandbox-"));
  try {
    await body({
      dir,
      async flow(name, text) {
        const path = join(dir, name);
        await writeFile(path, text, "utf8");
        return path;
      },
      async json(name, value) {
        const path = join(dir, name);
        await writeFile(path, JSON.stringify(value), "utf8");
        return path;
      },
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const LIMITS = { timeoutMs: 1000, memoryBytes: 33554432, maxStackBytes: 262144, maxOutputBytes: 1048576 };

test("C-f20e390d a code node completes in the pool", async () => {
  await withFiles(async (files) => {
    const file = await files.flow("code-pay.yaml", CODE_PAY_TEXT);
    const mocks = await files.json("mocks.json", MOCKS);
    const input = await files.json("input.json", INPUT);
    const argv = ["--file", file, "--mocks", mocks, "--input", input, "--catalogue", TEST_CATALOGUE_PATH];

    const rec = recorder();
    try {
      const first = await exec(commandWith(rec), argv);
      assert.equal(first.stderr, "");
      assert.equal(first.stdout, OK_STDOUT);
      assert.equal(first.code, 0);
      assert.deepEqual(rec.args, [{ size: 1 }]);
      assert.equal(Object.isFrozen(FLOW_TEST_POOL), true);
      assert.deepEqual(FLOW_TEST_POOL, { size: 1 });
      assert.equal(rec.runs.length, 1);
      assert.deepEqual(rec.runs[0]?.input, { amount: 1234.567, currency: "eur" });
      assert.deepEqual(rec.runs[0]?.limits, LIMITS);
      assert.deepEqual(rec.runs[0]?.options, {
        seed: "run_00000000-0000-7000-8000-000000000000:normalize:1",
        nowIso: "2026-11-13T09:00:00.000Z",
        binding: "input",
        result: "object",
      });
      const result = rec.calls[0];
      assert.ok(result !== undefined && result.ok, "the pool answered ok");
      assert.deepEqual(result.value, { amount: 1234.57, currency: "EUR", is_large: true });

      const json = await exec(commandWith(rec), [...argv, "--json"]);
      assert.equal(json.code, 0);
      assert.equal(json.stdout.split("\n").length, 2);
      const step = (seq: number, nodeId: string, kind: string): object => ({
        seq,
        nodeId,
        kind,
        state: "completed",
        outcome: null,
        error: null,
      });
      assert.deepEqual(JSON.parse(json.stdout), {
        state: "completed",
        terminalNode: "done",
        error: null,
        output: { payment_id: "pay-1" },
        steps: [
          step(0, "lookup", "block"),
          step(1, "normalize", "code"),
          step(2, "pay", "block"),
          step(3, "done", "end"),
        ],
      });

      const byDefault = await exec(flowTestCommand, argv);
      assert.equal(byDefault.code, 0);
      assert.equal(byDefault.stdout, OK_STDOUT);

      assert.equal(flowTestCommand.database, false);
      const made = createFlowTestCommand();
      assert.equal(made.summary, flowTestCommand.summary);
      assert.deepEqual(made.options, flowTestCommand.options);
      assert.equal(made.database, flowTestCommand.database);
    } finally {
      await closeAll(rec);
    }
  });
});

test("C-8191a905 a code hook runs in the pool", async () => {
  await withFiles(async (files) => {
    const mutate = await files.flow("mutate.yaml", readHookRunText("mutate"));
    const fail = await files.flow("fail.yaml", readHookRunText("fail"));
    const mocks = await files.json("mocks.json", MOCKS);
    const blocked = await files.json("mocks-blocked.json", MOCKS_BLOCKED);
    const input = await files.json("input.json", INPUT_HOOK);
    const args = (file: string, m: string): string[] => [
      "--file",
      file,
      "--mocks",
      m,
      "--input",
      input,
      "--catalogue",
      TEST_CATALOGUE_PATH,
    ];

    const rec = recorder();
    try {
      const first = await exec(commandWith(rec), args(mutate, mocks));
      assert.equal(first.stdout, OK_STDOUT);
      assert.equal(first.code, 0);
      assert.deepEqual(
        rec.calls.map((call) => (call.ok ? call.value : null)),
        [
          { action: "continue", input: { vendor_name: "Acme" } },
          { amount: 120, currency: "eur" },
          { action: "continue", output: { amount: 120, currency: "EUR" } },
        ],
      );

      const before = rec.calls.length;
      const second = await exec(commandWith(rec), args(fail, blocked));
      assert.equal(second.stdout, "0 lookup block failed\nFAILED HOOK_FAILED lookup\n");
      assert.equal(second.code, 1);
      assert.deepEqual(
        rec.calls.slice(before).map((call) => (call.ok ? call.value : null)),
        [{ action: "fail", reason: "vendor blocked" }],
      );

      const mid = rec.calls.length;
      const third = await exec(commandWith(rec), args(fail, mocks));
      assert.equal(third.stdout, OK_STDOUT);
      assert.equal(third.code, 0);
      assert.equal(rec.calls.length - mid, 2);
    } finally {
      await closeAll(rec);
    }
  });
});

test("C-8726b0c4 a sandbox fault fails the node and prints only its code", async () => {
  await withFiles(async (files) => {
    const boom = CODE_PAY_TEXT.replace(
      "Math.round(input.amount * 100) / 100",
      "input.missing.value",
    );
    assert.notEqual(boom, CODE_PAY_TEXT);
    const boomFile = await files.flow("boom.yaml", boom);
    const file = await files.flow("code-pay.yaml", CODE_PAY_TEXT);
    const mocks = await files.json("mocks.json", MOCKS);
    const input = await files.json("input.json", INPUT);
    const args = (f: string): string[] => [
      "--file",
      f,
      "--mocks",
      mocks,
      "--input",
      input,
      "--catalogue",
      TEST_CATALOGUE_PATH,
    ];

    const real = recorder();
    const faulted = recorder({
      run: async () => ({
        ok: false,
        fault: { code: "runtime_error", message: "boom-secret" },
        stats: { ms: 0, memBytes: 0 },
      }),
    });
    const rejected = recorder({
      run: async () => {
        throw new Error("pool-secret");
      },
    });
    try {
      const f1 = await exec(commandWith(real), args(boomFile));
      const f2 = await exec(commandWith(faulted), args(file));
      const f3 = await exec(commandWith(rejected), args(file));
      for (const row of [f1, f2, f3]) {
        assert.equal(row.code, 1);
        assert.equal(row.stderr, "");
        assert.equal(row.stdout, FAULT_STDOUT);
        assert.equal((row.stdout + row.stderr).includes("boom-secret"), false);
        assert.equal((row.stdout + row.stderr).includes("pool-secret"), false);
      }
      const result = real.calls[0];
      assert.ok(result !== undefined && !result.ok, "the real pool refused BOOM");
      assert.equal(result.fault.code, "runtime_error");
    } finally {
      await closeAll(real);
      await closeAll(faulted);
      await closeAll(rejected);
    }
  });
});
