// flow test creates its pool after validation and closes it on every exit path (rows P1 to P7, N1 to N5, C1 to C3 of test-plan.md).
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../../core/index.ts";
import { createWorkerSandbox } from "../../sandbox/index.ts";
import type { SandboxResult, WorkerSandbox, WorkerSandboxOptions } from "../../sandbox/index.ts";
import { TEST_CATALOGUE_PATH } from "../../../test/support/catalogue/document.ts";
import { CODE_PAY_TEXT } from "../../../test/support/code-pay.ts";
import { PAY_ONCE_INPUT, payOnceVersion } from "../../../test/support/crash/pay-once.ts";
import { cliMain } from "../main.ts";
import type { CliOutput } from "../output.ts";
import { createCommandRegistry } from "../registry.ts";
import { createFlowTestCommand } from "./test.ts";

assert.equal(typeof createFlowTestCommand, "function");

const OK_STDOUT =
  "0 lookup block completed\n1 normalize code completed\n2 pay block completed\n3 done end completed\nCOMPLETED done\n";
const FAULT_STDOUT =
  "0 lookup block completed\n1 normalize code failed\nFAILED INTERPRETER_CODE_FAILED normalize\n";
const INTERNAL = "CLI_INTERNAL: command failed\n";

const MOCKS = {
  lookup: [{ output: { vendor_id: "v1", status: "active" } }],
  pay: [{ output: { payment_id: "pay-1", status: "paid" } }],
};
const INPUT = '{"vendor":"Acme","invoice":"inv-1","amount":1234.567,"currency":"eur"}';
const INPUT_NUL = '{"vendor":"Acme\\u0000","invoice":"inv-1","amount":120,"currency":"eur"}';

const FAULT: SandboxResult = {
  ok: false,
  fault: { code: "runtime_error", message: "boom-secret" },
  stats: { ms: 0, memBytes: 0 },
};

interface Over {
  run?: () => Promise<SandboxResult>;
  close?: () => Promise<void> | void;
  throwOnCreate?: Error;
}

interface Pools {
  events: string[];
  args: WorkerSandboxOptions[];
  reals: WorkerSandbox[];
  createSandbox: (opts: WorkerSandboxOptions) => WorkerSandbox;
}

function pools(events: string[], over: Over = {}): Pools {
  const state: Pools = {
    events,
    args: [],
    reals: [],
    createSandbox(opts: WorkerSandboxOptions): WorkerSandbox {
      state.args.push(opts);
      events.push("create");
      if (over.throwOnCreate !== undefined) {
        throw over.throwOnCreate;
      }
      const real = over.run === undefined ? createWorkerSandbox(opts) : undefined;
      if (real !== undefined) {
        state.reals.push(real);
      }
      return {
        size: 1,
        respawns: 0,
        async run(code, input, limits, options): Promise<SandboxResult> {
          events.push("run");
          return real !== undefined
            ? real.run(code, input, limits, options)
            : (over.run as () => Promise<SandboxResult>)();
        },
        close(): Promise<void> {
          events.push("close");
          if (real === undefined) {
            if (over.close !== undefined) {
              const done = over.close();
              return done === undefined ? Promise.resolve() : done;
            }
            return Promise.resolve();
          }
          return real.close().then(() => over.close?.());
        },
      };
    },
  };
  return state;
}

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

async function exec(
  argv: readonly string[],
  state: Pools,
  throwingStdout = false,
): Promise<Run> {
  let out = "";
  let err = "";
  const stdout: CliOutput = {
    write(text: string): void {
      state.events.push("write");
      if (throwingStdout) {
        throw new Error("EPIPE secret");
      }
      out += text;
    },
  };
  const stderr: CliOutput = {
    write(text: string): void {
      state.events.push("errwrite");
      err += text;
    },
  };
  const registry = createCommandRegistry();
  let command;
  assert.doesNotThrow(() => {
    command = createFlowTestCommand({ createSandbox: state.createSandbox });
  }, "createFlowTestCommand builds a command");
  assert.ok(command !== undefined, "createFlowTestCommand answered a command");
  registry.registerCommand("flow test", command);
  let exit: number | undefined;
  await assert.doesNotReject(async () => {
    exit = await cliMain(["flow", "test", ...argv], {
      env: {},
      registry,
      stdout,
      stderr,
      ids: sequentialIds(0),
      clock: fixedClock("2026-11-13T09:00:00.000Z"),
    });
  }, "cliMain resolves an exit code");
  assert.ok(exit !== undefined, "cliMain answered an exit code");
  return { code: exit, stdout: out, stderr: err };
}

async function withDir(body: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "flow-test-pool-"));
  try {
    await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function put(dir: string, name: string, text: string): Promise<string> {
  const path = join(dir, name);
  await writeFile(path, text, "utf8");
  return path;
}

async function closeReals(state: Pools): Promise<void> {
  for (const real of state.reals) {
    await real.close();
  }
}

function count(events: readonly string[], name: string): number {
  return events.filter((event) => event === name).length;
}

test("C-4012f2ad the pool is created after validation and closed once on every exit path", async () => {
  await withDir(async (dir) => {
    const file = await put(dir, "code-pay.yaml", CODE_PAY_TEXT);
    const onceFile = await put(dir, "flow.json", JSON.stringify(payOnceVersion().flow));
    const mocks = await put(dir, "mocks.json", JSON.stringify(MOCKS));
    const empty = await put(dir, "mocks-empty.json", "{}");
    const bad = await put(dir, "mocks-bad.json", "{");
    const input = await put(dir, "input.json", INPUT);
    const short = await put(dir, "input-short.json", '{"vendor":"Acme"}');
    const nul = await put(dir, "input-nul.json", INPUT_NUL);
    const arr = await put(dir, "input-arr.json", "[]");
    const onceInput = await put(dir, "input-once.json", JSON.stringify(PAY_ONCE_INPUT));
    const base = (f: string, m: string, i: string): string[] => [
      "--file",
      f,
      "--mocks",
      m,
      "--input",
      i,
      "--catalogue",
      TEST_CATALOGUE_PATH,
    ];

    const all: Pools[] = [];
    const row = (over?: Over): Pools => {
      const state = pools([], over);
      all.push(state);
      return state;
    };
    try {
      const p1 = row();
      const r1 = await exec(base(file, mocks, input), p1);
      assert.deepEqual(p1.events, ["create", "run", "write", "close"]);
      assert.equal(r1.code, 0);
      assert.equal(r1.stdout, OK_STDOUT);

      const p2 = row({ run: async () => FAULT });
      const r2 = await exec(base(file, mocks, input), p2);
      assert.deepEqual(p2.events, ["create", "run", "write", "close"]);
      assert.equal(r2.code, 1);
      assert.equal(r2.stdout, FAULT_STDOUT);

      const p3 = row();
      const r3 = await exec(base(file, mocks, short), p3);
      assert.deepEqual(p3.events, ["create", "write", "close"]);
      assert.equal(r3.code, 1);
      assert.equal(r3.stdout, "FAILED INTERPRETER_INPUT_INVALID -\n  path: /\n  keyword: required\n");

      const p4 = row();
      const r4 = await exec(base(file, mocks, nul), p4);
      assert.deepEqual(p4.events, ["create", "close", "errwrite"]);
      assert.equal(r4.code, 1);
      assert.equal(r4.stdout, "");
      assert.equal(r4.stderr, INTERNAL);

      const p5 = row();
      const r5 = await exec(base(file, mocks, input), p5, true);
      assert.deepEqual(p5.events, ["create", "run", "write", "close", "errwrite"]);
      assert.equal(r5.code, 1);
      assert.equal(r5.stderr, INTERNAL);
      assert.equal(r5.stderr.includes("EPIPE"), false);

      const p6 = row({ throwOnCreate: new Error("no pool") });
      const r6 = await exec(base(file, mocks, input), p6);
      assert.deepEqual(p6.events, ["create", "errwrite"]);
      assert.equal(r6.code, 1);
      assert.equal(r6.stdout, "");
      assert.equal(r6.stderr, INTERNAL);

      const p7 = row();
      const r7 = await exec(base(onceFile, mocks, onceInput), p7);
      assert.deepEqual(p7.events, ["create", "write", "close"]);
      assert.equal(r7.code, 0);
      assert.equal(
        r7.stdout,
        "0 lookup block completed\n1 route switch completed active\n2 pay block completed\n3 done end completed\nCOMPLETED done\n",
      );

      const n1 = row();
      const rn1 = await exec(
        ["--file", file, "--mocks", mocks, "--input", input],
        n1,
      );
      assert.deepEqual(n1.events, ["write"]);
      assert.equal(rn1.code, 1);
      assert.ok(rn1.stdout.startsWith(`INVALID ${file}: 2 error(s)\n`));

      const n2 = row();
      const rn2 = await exec(base(file, empty, input), n2);
      assert.deepEqual(n2.events, ["write"]);
      assert.equal(rn2.code, 1);
      assert.equal(
        rn2.stdout,
        "MOCKS 2 problem(s)\n  lookup missing: no mock entry\n  pay missing: no mock entry\n",
      );

      const n3 = row();
      const rn3 = await exec(base(file, mocks, arr), n3);
      assert.deepEqual(n3.events, ["errwrite"]);
      assert.equal(rn3.code, 2);
      assert.equal(rn3.stderr, "CLI_USAGE: --input must be a JSON object\n");

      const n4 = row();
      const rn4 = await exec(base(file, bad, input), n4);
      assert.deepEqual(n4.events, ["errwrite"]);
      assert.equal(rn4.code, 2);
      assert.equal(rn4.stderr, "CLI_USAGE: --mocks is not valid JSON\n");

      const n5 = row();
      const rn5 = await exec(["--help"], n5);
      assert.equal(count(n5.events, "create"), 0);
      assert.equal(count(n5.events, "run"), 0);
      assert.equal(count(n5.events, "close"), 0);
      assert.equal(rn5.code, 0);
      assert.ok(rn5.stdout.startsWith("usage: node src/cli/main.ts flow test"));

      for (const state of all) {
        for (const arg of state.args) {
          assert.deepEqual(arg, { size: 1 });
        }
      }
      for (const state of [p1, p2, p3, p4, p5, p6, p7]) {
        assert.equal(state.args.length, 1);
      }
      for (const state of [n1, n2, n3, n4, n5]) {
        assert.equal(state.args.length, 0);
      }
    } finally {
      for (const state of all) {
        await closeReals(state);
      }
    }
  });
});

test("C-00e31a66 a failing close changes nothing", async () => {
  await withDir(async (dir) => {
    const file = await put(dir, "code-pay.yaml", CODE_PAY_TEXT);
    const mocks = await put(dir, "mocks.json", JSON.stringify(MOCKS));
    const input = await put(dir, "input.json", INPUT);
    const nul = await put(dir, "input-nul.json", INPUT_NUL);
    const base = (i: string): string[] => [
      "--file",
      file,
      "--mocks",
      mocks,
      "--input",
      i,
      "--catalogue",
      TEST_CATALOGUE_PATH,
    ];

    const c1 = pools([], {
      close: async () => {
        throw new Error("close-secret");
      },
    });
    const c2 = pools([], {
      run: async () => FAULT,
      close: () => {
        throw new Error("close-secret");
      },
    });
    const c3 = pools([], {
      close: async () => {
        throw new Error("close-secret");
      },
    });
    try {
      const r1 = await exec(base(input), c1);
      assert.equal(r1.code, 0);
      assert.equal(r1.stdout, OK_STDOUT);
      assert.equal(r1.stderr, "");
      assert.equal(count(c1.events, "close"), 1);

      const r2 = await exec(base(input), c2);
      assert.equal(r2.code, 1);
      assert.equal(r2.stdout, FAULT_STDOUT);
      assert.equal(r2.stderr, "");
      assert.equal(count(c2.events, "close"), 1);

      const r3 = await exec(base(nul), c3);
      assert.equal(r3.code, 1);
      assert.equal(r3.stdout, "");
      assert.equal(r3.stderr, INTERNAL);
      assert.equal(count(c3.events, "close"), 1);

      for (const r of [r1, r2, r3]) {
        assert.equal((r.stdout + r.stderr).includes("close-secret"), false);
      }
    } finally {
      for (const state of [c1, c2, c3]) {
        await closeReals(state);
      }
    }
  });
});
