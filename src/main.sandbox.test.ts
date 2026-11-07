import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { availableParallelism } from "node:os";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { AppConfig, DatabaseEndpoint } from "./config/index.ts";
import type { Database } from "./db/index.ts";
import type { DurableRuntime } from "./durable/index.ts";
import type { InterpreterDeps } from "./interpreter/index.ts";
import type { RunningServer } from "./main.ts";
import { main } from "./main.ts";
import type { LogDestination } from "./observability/index.ts";
import { poolSize, SandboxError } from "./sandbox/index.ts";
import type {
  SandboxResult,
  WorkerSandbox,
  WorkerSandboxOptions,
} from "./sandbox/index.ts";
import { isTestFile, readSnapshot } from "../test/arch/sources.ts";

assert.equal(typeof main, "function");

const ENDPOINT: DatabaseEndpoint = {
  url: "postgres://ursitoare_app@127.0.0.1:5432/ursitoare",
  password: null,
};

// The leak marker is built from parts so no whole credential-shaped value sits in this file.
const LEAK = "pool " + "secret-" + "token-" + "123";

function appConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    role: "all",
    host: "127.0.0.1",
    port: 0,
    logLevel: "warn",
    publicBaseUrl: "https://ursitoare.example.com",
    webDist: null,
    shutdownDrainMs: 10000,
    engineKey: null,
    database: { app: null, owner: null },
    ...overrides,
  };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolveFn: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolveFn = resolve;
  });
  return {
    promise,
    resolve(value: T): void {
      assert.ok(resolveFn !== undefined, "the deferred was initialised");
      resolveFn(value);
    },
  };
}

function fatalLines(lines: readonly string[]): Record<string, unknown>[] {
  return lines
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((line) => line["level"] === 60);
}

function warnLines(lines: readonly string[]): Record<string, unknown>[] {
  return lines
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((line) => line["level"] === 40);
}

function fakeSandbox(records: string[], close?: () => Promise<void>): WorkerSandbox {
  return {
    size: 1,
    respawns: 0,
    async run(): Promise<SandboxResult> {
      return { ok: true, value: {}, stats: { ms: 0, memBytes: 0 } };
    },
    async close(): Promise<void> {
      records.push("sandbox.close");
      if (close !== undefined) {
        await close();
      }
    },
  };
}

function fakeRuntime(records: string[], shutdown?: () => Promise<void>): DurableRuntime {
  return {
    applicationVersion: "ursitoare-1",
    async enqueue(): Promise<void> {},
    async status(): Promise<null> {
      return null;
    },
    async cancel(): Promise<void> {},
    async shutdown(): Promise<void> {
      records.push("durable.shutdown");
      if (shutdown !== undefined) {
        await shutdown();
      }
    },
  };
}

interface Scenario {
  role: AppConfig["role"];
  app: DatabaseEndpoint | null;
  lines: string[];
  records: string[];
  sandboxCalls: (WorkerSandboxOptions | undefined)[];
  launchCalls: number;
  exits: number[];
  captured: { deps: InterpreterDeps | null };
}

function scenario(role: AppConfig["role"], app: DatabaseEndpoint | null): Scenario {
  return {
    role,
    app,
    lines: [],
    records: [],
    sandboxCalls: [],
    launchCalls: 0,
    exits: [],
    captured: { deps: null },
  };
}

interface Behaviour {
  signals?: EventEmitter;
  onExit?: (code: number) => void;
  createSandbox?: (options?: WorkerSandboxOptions) => WorkerSandbox;
  launch?: () => Promise<DurableRuntime>;
  close?: () => Promise<void>;
  shutdown?: () => Promise<void>;
  bind?: (deps: InterpreterDeps) => void;
  configureServer?: (server: FastifyInstance) => void | Promise<void>;
}

interface Harness {
  deps: {
    loadConfig: () => AppConfig;
    destination: LogDestination;
    signals: EventEmitter;
    exit: (code: number) => void;
    openDatabase: () => Promise<Database>;
    registerRunWorkflow: () => void;
    bindInterpreter: (deps: InterpreterDeps) => void;
    launchDurable: () => Promise<DurableRuntime>;
    createSandbox: (options?: WorkerSandboxOptions) => WorkerSandbox;
    configureServer?: (server: FastifyInstance) => void | Promise<void>;
  };
  sandbox: WorkerSandbox;
  runtime: DurableRuntime;
}

function harnessOf(s: Scenario, behaviour: Behaviour = {}): Harness {
  const signals = behaviour.signals ?? new EventEmitter();
  const sandbox = fakeSandbox(s.records, behaviour.close);
  const runtime = fakeRuntime(s.records, behaviour.shutdown);
  const deps: Harness["deps"] = {
    loadConfig: () =>
      appConfig({ role: s.role, database: { app: s.app, owner: null } }),
    destination: {
      write(line: string): void {
        s.lines.push(line);
      },
    },
    signals,
    exit: (code: number): void => {
      s.exits.push(code);
      behaviour.onExit?.(code);
    },
    openDatabase: async (): Promise<Database> => ({
      appPool: {} as Database["appPool"],
      close: async (): Promise<void> => {
        s.records.push("database.close");
      },
    }),
    registerRunWorkflow: (): void => undefined,
    bindInterpreter: (bound: InterpreterDeps): void => {
      s.captured.deps = bound;
      behaviour.bind?.(bound);
    },
    launchDurable: async (): Promise<DurableRuntime> => {
      s.launchCalls += 1;
      if (behaviour.launch !== undefined) {
        return behaviour.launch();
      }
      return runtime;
    },
    createSandbox: (options?: WorkerSandboxOptions): WorkerSandbox => {
      s.sandboxCalls.push(options);
      if (behaviour.createSandbox !== undefined) {
        return behaviour.createSandbox(options);
      }
      return sandbox;
    },
    ...(behaviour.configureServer === undefined
      ? {}
      : { configureServer: behaviour.configureServer }),
  };
  return { deps, sandbox, runtime };
}

async function stop(running: RunningServer, signals: EventEmitter, exited: Promise<number>): Promise<number> {
  signals.emit("SIGTERM");
  return exited;
}

async function settle(
  s: Scenario,
  harness: Harness,
  signals: EventEmitter,
  exited: Promise<number>,
): Promise<RunningServer | null> {
  const running = await main(harness.deps);
  if (running !== null) {
    await stop(running, signals, exited);
  }
  return running;
}

test("C-d4cc366e main creates one pool for all and worker and closes it between durable and database", async () => {
  for (const role of ["all", "worker"] as const) {
    const s = scenario(role, ENDPOINT);
    const signals = new EventEmitter();
    const exited = deferred<number>();
    const harness = harnessOf(s, {
      signals,
      onExit: (code) => exited.resolve(code),
    });

    const running = await main(harness.deps);
    assert.ok(running !== null, `main starts for role ${role}`);
    assert.equal(await stop(running, signals, exited.promise), 0, `main exits 0 for ${role}`);

    assert.deepEqual(
      s.sandboxCalls,
      [{ size: poolSize(availableParallelism()) }],
      `the pool is created once with the computed size for ${role}`,
    );
    assert.ok(s.captured.deps !== null, "bindInterpreter captured its argument");
    assert.equal(s.captured.deps.sandbox, harness.sandbox, "the captured deps hold the pool");
    assert.deepEqual(
      s.records,
      ["durable.shutdown", "sandbox.close", "database.close"],
      "the pool closes after the runtime and before the database",
    );
    assert.deepEqual(s.exits, [0]);
  }

  for (const [role, app] of [
    ["api", ENDPOINT],
    ["sandbox", ENDPOINT],
    ["all", null],
  ] as const) {
    const s = scenario(role, app);
    const signals = new EventEmitter();
    const exited = deferred<number>();
    const harness = harnessOf(s, {
      signals,
      onExit: (code) => exited.resolve(code),
    });

    const running = await main(harness.deps);
    assert.ok(running !== null, `main starts for role ${role}`);
    assert.equal(await stop(running, signals, exited.promise), 0, `main exits 0 for ${role}`);

    assert.deepEqual(s.sandboxCalls, [], `no pool is created for ${role}`);
    assert.deepEqual(s.records, ["database.close"], "the database still closes");
    assert.deepEqual(s.exits, [0]);
  }

  const offenders = readSnapshot().files.filter(
    (file) =>
      file.path.startsWith("src/") &&
      !isTestFile(file.path) &&
      file.path !== "src/main.ts" &&
      !file.path.startsWith("src/sandbox/") &&
      file.text.includes("createWorkerSandbox("),
  );
  assert.deepEqual(
    offenders.map((file) => file.path),
    [],
    "no module beside main and the sandbox creates a pool",
  );
});

test("C-d4cc366e a launch failure closes the pool before the database and reports STARTUP_FAILED", async () => {
  const s = scenario("all", ENDPOINT);
  const signals = new EventEmitter();
  const exited = deferred<number>();
  const harness = harnessOf(s, {
    signals,
    onExit: (code) => exited.resolve(code),
    launch: async () => {
      throw new Error("boom");
    },
  });

  const running = await settle(s, harness, signals, exited.promise);
  assert.ok(running === null, "a failed launch resolves null");
  assert.deepEqual(s.exits, [1], "the failed start exits 1");
  const fatal = fatalLines(s.lines);
  assert.equal(fatal.length, 1, "one fatal line is written");
  assert.equal(fatal[0]?.["code"], "STARTUP_FAILED", "the launch failure is reported");
  assert.deepEqual(
    s.records,
    ["sandbox.close", "database.close"],
    "the pool closes before the database",
  );
});

test("C-d4cc366e a createSandbox failure closes only the database and reports SANDBOX_INVALID", async () => {
  const s = scenario("all", ENDPOINT);
  const signals = new EventEmitter();
  const exited = deferred<number>();
  const harness = harnessOf(s, {
    signals,
    onExit: (code) => exited.resolve(code),
    createSandbox: () => {
      throw new SandboxError("SANDBOX_INVALID", "bad size", { option: "size" });
    },
  });

  const running = await settle(s, harness, signals, exited.promise);
  assert.ok(running === null, "a failed pool start resolves null");
  assert.deepEqual(s.exits, [1], "the failed start exits 1");
  assert.equal(s.launchCalls, 0, "the runtime never launches");
  assert.deepEqual(s.sandboxCalls, [{ size: poolSize(availableParallelism()) }]);
  assert.deepEqual(s.records, ["database.close"], "only the database closes");
  const fatal = fatalLines(s.lines);
  assert.equal(fatal.length, 1, "one fatal line is written");
  assert.equal(fatal[0]?.["code"], "SANDBOX_INVALID", "the pool failure is reported");
});

test("C-d4cc366e a bind failure closes the pool before the database and reports BIND_FAILED", async () => {
  const s = scenario("all", ENDPOINT);
  const signals = new EventEmitter();
  const exited = deferred<number>();
  const harness = harnessOf(s, {
    signals,
    onExit: (code) => exited.resolve(code),
    bind: () => {
      throw Object.assign(new Error("bind failed"), { code: "BIND_FAILED" });
    },
  });

  const running = await settle(s, harness, signals, exited.promise);
  assert.ok(running === null, "a failed bind resolves null");
  assert.deepEqual(s.exits, [1], "the failed start exits 1");
  assert.deepEqual(s.sandboxCalls, [{ size: poolSize(availableParallelism()) }]);
  assert.equal(s.launchCalls, 0, "the runtime never launches");
  assert.deepEqual(
    s.records,
    ["sandbox.close", "database.close"],
    "the pool closes before the database",
  );
  const fatal = fatalLines(s.lines);
  assert.equal(fatal.length, 1, "one fatal line is written");
  assert.equal(fatal[0]?.["code"], "BIND_FAILED", "the bind failure is reported");
  assert.equal(
    warnLines(s.lines).some((line) => line["msg"] === "sandbox.close failed"),
    false,
    "a clean pool close writes no warning",
  );
});

test("C-d4cc366e a rejecting sandbox close warns once without the secret and keeps exit zero", async () => {
  const s = scenario("all", ENDPOINT);
  const signals = new EventEmitter();
  const exited = deferred<number>();
  const harness = harnessOf(s, {
    signals,
    onExit: (code) => exited.resolve(code),
    close: async () => {
      throw new Error(LEAK);
    },
  });

  const running = await main(harness.deps);
  assert.ok(running !== null, "main starts");
  assert.equal(await stop(running, signals, exited.promise), 0, "the close failure does not change the exit");
  assert.deepEqual(
    s.records,
    ["durable.shutdown", "sandbox.close", "database.close"],
    "every close still runs after the rejecting pool close",
  );
  assert.deepEqual(s.exits, [0]);

  const warnings = warnLines(s.lines).filter((line) => line["msg"] === "sandbox.close failed");
  assert.equal(warnings.length, 1, "the rejecting close is warned about once");
  assert.equal(warnings[0]?.["err"], undefined, "the warning carries no error");
  assert.equal(
    s.lines.some((line) => line.includes(LEAK)),
    false,
    "no captured line holds the error text",
  );
});

test("C-d4cc366e a rejecting durable shutdown stays silent and still closes the pool and database", async () => {
  const s = scenario("all", ENDPOINT);
  const signals = new EventEmitter();
  const exited = deferred<number>();
  const harness = harnessOf(s, {
    signals,
    onExit: (code) => exited.resolve(code),
    shutdown: async () => {
      throw new Error("down");
    },
  });

  const running = await main(harness.deps);
  assert.ok(running !== null, "main starts");
  assert.equal(await stop(running, signals, exited.promise), 0, "the shutdown failure does not change the exit");
  assert.deepEqual(
    s.records,
    ["durable.shutdown", "sandbox.close", "database.close"],
    "the pool and database still close",
  );
  assert.deepEqual(s.exits, [0]);
  assert.equal(
    warnLines(s.lines).some((line) => line["msg"] === "sandbox.close failed"),
    false,
    "the durable shutdown failure writes no pool warning",
  );
});

test("C-d4cc366e a start failure wins over a rejecting pool close and reports the original code", async () => {
  const s = scenario("all", ENDPOINT);
  const signals = new EventEmitter();
  const exited = deferred<number>();
  const harness = harnessOf(s, {
    signals,
    onExit: (code) => exited.resolve(code),
    bind: () => {
      throw Object.assign(new Error("bind failed"), { code: "BIND_FAILED" });
    },
    close: async () => {
      throw Object.assign(new Error(LEAK), { code: "CLOSE_FAILED" });
    },
  });

  const running = await settle(s, harness, signals, exited.promise);
  assert.ok(running === null, "the failed start resolves null");
  assert.deepEqual(s.exits, [1], "the failed start exits 1");
  assert.deepEqual(
    s.records,
    ["sandbox.close", "database.close"],
    "the pool and database still close",
  );
  const fatal = fatalLines(s.lines);
  assert.equal(fatal.length, 1, "one fatal line is written");
  assert.equal(fatal[0]?.["code"], "BIND_FAILED", "the original failure is reported");
  const warnings = warnLines(s.lines).filter((line) => line["msg"] === "sandbox.close failed");
  assert.equal(warnings.length, 1, "the rejecting close is warned about once");
  assert.equal(
    s.lines.some((line) => line.includes(LEAK)),
    false,
    "no captured line holds the error text",
  );
});

test("C-d4cc366e a duplicate run route fails the guarded start after closing the pool", async () => {
  const s = scenario("all", ENDPOINT);
  const signals = new EventEmitter();
  const exited = deferred<number>();
  const harness = harnessOf(s, {
    signals,
    onExit: (code) => exited.resolve(code),
    configureServer: (server) => {
      server.get("/api/v1/runs", async () => ({ runs: [] }));
    },
  });

  let running: RunningServer | null = null;
  await assert.doesNotReject(async () => {
    running = await main(harness.deps);
  }, "main resolves when the run route is duplicated");
  assert.ok(running === null, "the duplicate route fails the start");
  assert.deepEqual(s.exits, [1], "the failed start exits 1");
  assert.deepEqual(
    s.records,
    ["durable.shutdown", "sandbox.close", "database.close"],
    "the started runtime and the pool close before the database",
  );
  const fatal = fatalLines(s.lines);
  assert.equal(fatal.length, 1, "one fatal line is written");
  assert.equal(fatal[0]?.["code"], "FST_ERR_DUPLICATED_ROUTE", "the duplicate route is reported");
});
