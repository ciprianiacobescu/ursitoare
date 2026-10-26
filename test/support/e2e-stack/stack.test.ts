import assert from "node:assert/strict";
import fs from "node:fs";
import { createConnection, createServer } from "node:net";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import type { E2eStackPart, PartContext } from "./part.ts";
import { startE2eStack } from "./stack.ts";

assert.equal(typeof startE2eStack, "function");

type Outcome<T> = { value: T } | { error: string };

type Capture<T> =
  | { ok: true; value: T }
  | { ok: false; name: string; code: string | undefined; details: Record<string, unknown> };

// Turns any throw (including the stubs') into data, so the test fails on its assertion.
async function attemptAsync<T>(call: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { value: await call() };
  } catch (error) {
    return { error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}

async function capture<T>(call: () => Promise<T>): Promise<Capture<T>> {
  try {
    return { ok: true, value: await call() };
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    const details = (error as { details?: unknown } | null)?.details;
    return {
      ok: false,
      name: error instanceof Error ? error.name : "non-error",
      code: typeof code === "string" ? code : undefined,
      details:
        typeof details === "object" && details !== null ? (details as Record<string, unknown>) : {},
    };
  }
}

function failure(result: Capture<unknown>): Record<string, unknown> {
  if (result.ok) {
    return { ok: true };
  }
  return { ok: false, name: result.name, code: result.code, details: result.details };
}

const tempRoots: string[] = [];

function tempRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-stack-test-"));
  tempRoots.push(dir);
  return dir;
}

after(() => {
  for (const dir of tempRoots) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // The stack may already have removed its own directory.
    }
  }
});

function stackDirs(root: string): string[] {
  try {
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("ursitoare-e2e-"))
      .map((entry) => path.join(root, entry.name));
  } catch {
    return [];
  }
}

function freePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close(() => {
          reject(new Error("could not reserve a loopback port"));
        });
        return;
      }
      const port = (address as AddressInfo).port;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

async function busyPort(): Promise<{ port: number; close(): Promise<void> }> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address !== null && typeof address !== "string", "the blocker bound a port");
  return {
    port: (address as AddressInfo).port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      }),
  };
}

function connectionRefused(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      socket.destroy();
      resolve(error.code === "ECONNREFUSED");
    });
  });
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
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

interface Recorder {
  starts: string[];
  seeds: string[];
  closes: string[];
  startContexts: Map<string, PartContext>;
  seedContexts: Map<string, PartContext>;
}

function recorder(): Recorder {
  return {
    starts: [],
    seeds: [],
    closes: [],
    startContexts: new Map<string, PartContext>(),
    seedContexts: new Map<string, PartContext>(),
  };
}

interface FakeOptions {
  env?: Readonly<Record<string, string>>;
  onStart?: (ctx: PartContext) => Promise<void>;
  onSeed?: (ctx: PartContext) => Promise<void>;
  onClose?: () => Promise<void>;
  withSeed?: boolean;
}

function fakePart(name: string, log: Recorder, options: FakeOptions = {}): E2eStackPart {
  const part: E2eStackPart = {
    name,
    async start(ctx: PartContext) {
      log.starts.push(`start:${name}`);
      log.startContexts.set(name, ctx);
      if (options.onStart !== undefined) {
        await options.onStart(ctx);
      }
      return {
        env: options.env ?? {},
        close: async (): Promise<void> => {
          log.closes.push(`close:${name}`);
          if (options.onClose !== undefined) {
            await options.onClose();
          }
        },
      };
    },
  };

  if (options.withSeed !== false) {
    part.seed = async (ctx: PartContext): Promise<void> => {
      log.seeds.push(`seed:${name}`);
      log.seedContexts.set(name, ctx);
      if (options.onSeed !== undefined) {
        await options.onSeed(ctx);
      }
    };
  }

  return part;
}

function countSeeds(log: Recorder, name: string): number {
  return log.seeds.filter((entry) => entry === `seed:${name}`).length;
}

test("C-97ff4a40 the stack starts parts in order, seeds them, merges env and serves health", async () => {
  const outcome = await attemptAsync(async () => {
    const root = tempRoot();
    const log = recorder();
    const p1 = fakePart("p1", log, { env: { E2E_X: "1" } });
    const p2 = fakePart("p2", log);
    const stack = await startE2eStack({ port: 0, controlPort: 0, dataDir: root, parts: [p1, p2] });
    try {
      const url = new URL(stack.url);
      const control = new URL(stack.controlUrl);
      const p1Start = log.startContexts.get("p1");
      const p2Seed = log.seedContexts.get("p2");
      const env = p2Seed?.env ?? {};
      const stackKeys = Object.keys(env)
        .filter((key) => key.startsWith("URSITOARE_"))
        .sort();
      const dirs = stackDirs(root);
      const stackDir = dirs[0];
      const keyFile = env["URSITOARE_ENGINE_KEY_FILE"];
      const health = await fetch(`${stack.url}/health`);
      const body = (await health.json()) as { status: string; checks: Record<string, string> };

      return {
        calls: [...log.starts, ...log.seeds],
        stackKeys,
        e2e: env["E2E_X"],
        role: env["URSITOARE_ROLE"],
        host: env["URSITOARE_HOST"],
        logLevel: env["URSITOARE_LOG_LEVEL"],
        drain: env["URSITOARE_SHUTDOWN_DRAIN_MS"],
        envPortMatchesUrl: Number(env["URSITOARE_PORT"]) === Number(url.port),
        publicMatchesUrl: env["URSITOARE_PUBLIC_BASE_URL"] === stack.url,
        engineKeyFile: typeof keyFile === "string" && fs.existsSync(keyFile),
        url: { protocol: url.protocol, hostname: url.hostname, nonzero: Number(url.port) > 0 },
        control: {
          protocol: control.protocol,
          hostname: control.hostname,
          nonzero: Number(control.port) > 0,
        },
        portsDiffer: url.port !== control.port,
        health: { status: health.status, bodyStatus: body.status, checks: body.checks },
        directories: {
          count: dirs.length,
          p1Exists: p1Start !== undefined && fs.existsSync(p1Start.dataDir),
          p1Inside:
            p1Start !== undefined &&
            stackDir !== undefined &&
            p1Start.dataDir.startsWith(`${stackDir}${path.sep}`),
        },
      };
    } finally {
      await stack.close().catch(() => undefined);
    }
  });

  assert.deepEqual(outcome, {
    value: {
      calls: ["start:p1", "start:p2", "seed:p1", "seed:p2"],
      stackKeys: [
        "URSITOARE_ENGINE_KEY_FILE",
        "URSITOARE_HOST",
        "URSITOARE_LOG_LEVEL",
        "URSITOARE_PORT",
        "URSITOARE_PUBLIC_BASE_URL",
        "URSITOARE_ROLE",
        "URSITOARE_SHUTDOWN_DRAIN_MS",
      ],
      e2e: "1",
      role: "all",
      host: "127.0.0.1",
      logLevel: "info",
      drain: "2000",
      envPortMatchesUrl: true,
      publicMatchesUrl: true,
      engineKeyFile: true,
      url: { protocol: "http:", hostname: "127.0.0.1", nonzero: true },
      control: { protocol: "http:", hostname: "127.0.0.1", nonzero: true },
      portsDiffer: true,
      health: { status: 200, bodyStatus: "ok", checks: {} },
      directories: { count: 1, p1Exists: true, p1Inside: true },
    },
  });
});

test("C-90ece4c0 close closes the parts in reverse once, is repeatable and removes the stack directory", async () => {
  const outcome = await attemptAsync(async () => {
    const root = tempRoot();
    const log = recorder();
    const stack = await startE2eStack({
      port: 0,
      controlPort: 0,
      dataDir: root,
      parts: [fakePart("p1", log), fakePart("p2", log)],
    });
    const enginePort = Number(new URL(stack.url).port);
    const controlPort = Number(new URL(stack.controlUrl).port);
    const first = stack.close();
    const second = stack.close();
    const settled = await Promise.allSettled([first, second]);
    return {
      closeCalls: log.closes,
      statuses: settled.map((entry) => entry.status),
      engineRefused: await connectionRefused(enginePort),
      controlRefused: await connectionRefused(controlPort),
      leftovers: stackDirs(root).length,
    };
  });

  assert.deepEqual(outcome, {
    value: {
      closeCalls: ["close:p2", "close:p1"],
      statuses: ["fulfilled", "fulfilled"],
      engineRefused: true,
      controlRefused: true,
      leftovers: 0,
    },
  });
});

test("C-a6eea79b close waits for a reset whose seed is still blocked", async () => {
  const outcome = await attemptAsync(async () => {
    const root = tempRoot();
    const log = recorder();
    const started = deferred<undefined>();
    const gate = deferred<undefined>();
    let seedRuns = 0;
    let seedFinished = false;
    const p1 = fakePart("p1", log, {
      onSeed: async (): Promise<void> => {
        seedRuns += 1;
        if (seedRuns === 2) {
          started.resolve(undefined);
          await gate.promise;
          seedFinished = true;
        }
      },
    });
    const stack = await startE2eStack({
      port: 0,
      controlPort: 0,
      dataDir: root,
      parts: [p1, fakePart("p2", log)],
    });
    const enginePort = Number(new URL(stack.url).port);
    const controlPort = Number(new URL(stack.controlUrl).port);
    const reset = fetch(`${stack.controlUrl}/reset`, { method: "POST" }).then(
      (response) => `status:${response.status}`,
      () => "dropped",
    );

    await started.promise;
    const closing = stack.close();
    gate.resolve(undefined);
    await closing;
    const resetResult = await reset;

    return {
      resetSettled: resetResult === "status:204" || resetResult === "dropped",
      seedRuns,
      seedFinished,
      closeCalls: log.closes,
      engineRefused: await connectionRefused(enginePort),
      controlRefused: await connectionRefused(controlPort),
    };
  });

  assert.deepEqual(outcome, {
    value: {
      resetSettled: true,
      seedRuns: 2,
      seedFinished: true,
      closeCalls: ["close:p2", "close:p1"],
      engineRefused: true,
      controlRefused: true,
    },
  });
});

test("C-a6eea79b a rejected part close rejects every close with STACK_CLOSE_FAILED and closes once", async () => {
  const outcome = await attemptAsync(async () => {
    const root = tempRoot();
    const log = recorder();
    const p1 = fakePart("p1", log, {
      onClose: async (): Promise<void> => {
        throw new Error("close failed");
      },
    });
    const stack = await startE2eStack({
      port: 0,
      controlPort: 0,
      dataDir: root,
      parts: [p1, fakePart("p2", log)],
    });
    const first = await capture(() => stack.close());
    const second = await capture(() => stack.close());
    return {
      first: failure(first),
      second: failure(second),
      closes: log.closes,
      p1Closes: log.closes.filter((entry) => entry === "close:p1").length,
    };
  });

  const expected = {
    ok: false,
    name: "E2eStackError",
    code: "STACK_CLOSE_FAILED",
    details: { parts: ["p1"] },
  };

  assert.deepEqual(outcome, {
    value: {
      first: expected,
      second: expected,
      closes: ["close:p2", "close:p1"],
      p1Closes: 1,
    },
  });
});

test("C-a4f37787 a failing part start or first-start seed closes the started parts and opens no port", async () => {
  const outcome = await attemptAsync(async () => {
    async function failingCase(kind: "start" | "seed"): Promise<Record<string, unknown>> {
      const root = tempRoot();
      const log = recorder();
      const enginePort = await freePort();
      const controlPort = await freePort();
      const p1 = fakePart("p1", log);
      const p2 = fakePart(
        "p2",
        log,
        kind === "start"
          ? {
              onStart: async (): Promise<void> => {
                throw new Error("start failed");
              },
            }
          : {
              onSeed: async (): Promise<void> => {
                throw new Error("seed failed");
              },
            },
      );
      const result = await capture(() =>
        startE2eStack({ port: enginePort, controlPort, dataDir: root, parts: [p1, p2] }),
      );
      return {
        code: result.ok ? "resolved" : result.code,
        details: result.ok ? {} : result.details,
        starts: log.starts,
        seeds: log.seeds,
        closes: log.closes,
        engineRefused: await connectionRefused(enginePort),
        controlRefused: await connectionRefused(controlPort),
      };
    }

    return { start: await failingCase("start"), seed: await failingCase("seed") };
  });

  assert.deepEqual(outcome, {
    value: {
      start: {
        code: "STACK_PART_FAILED",
        details: { part: "p2" },
        starts: ["start:p1", "start:p2"],
        seeds: [],
        closes: ["close:p1"],
        engineRefused: true,
        controlRefused: true,
      },
      seed: {
        code: "STACK_PART_FAILED",
        details: { part: "p2" },
        starts: ["start:p1", "start:p2"],
        seeds: ["seed:p1", "seed:p2"],
        closes: ["close:p2", "close:p1"],
        engineRefused: true,
        controlRefused: true,
      },
    },
  });
});

test("C-a4f37787 a part env that collides with a stack key or another part rejects STACK_ENV_CONFLICT", async () => {
  const outcome = await attemptAsync(async () => {
    async function conflictCase(
      parts: (log: Recorder) => readonly E2eStackPart[],
    ): Promise<Record<string, unknown>> {
      const root = tempRoot();
      const log = recorder();
      const enginePort = await freePort();
      const controlPort = await freePort();
      const result = await capture(() =>
        startE2eStack({ port: enginePort, controlPort, dataDir: root, parts: parts(log) }),
      );
      return {
        code: result.ok ? "resolved" : result.code,
        details: result.ok ? {} : result.details,
        closes: log.closes,
        engineRefused: await connectionRefused(enginePort),
        controlRefused: await connectionRefused(controlPort),
      };
    }

    const reserved = await conflictCase((log) => [
      fakePart("p1", log, { env: { URSITOARE_PORT: "1234" } }),
    ]);
    const duplicate = await conflictCase((log) => [
      fakePart("p1", log, { env: { E2E_SHARED: "1" } }),
      fakePart("p2", log, { env: { E2E_SHARED: "2" } }),
    ]);
    return { reserved, duplicate };
  });

  assert.deepEqual(outcome, {
    value: {
      reserved: {
        code: "STACK_ENV_CONFLICT",
        details: { key: "URSITOARE_PORT" },
        closes: ["close:p1"],
        engineRefused: true,
        controlRefused: true,
      },
      duplicate: {
        code: "STACK_ENV_CONFLICT",
        details: { key: "E2E_SHARED" },
        closes: ["close:p2", "close:p1"],
        engineRefused: true,
        controlRefused: true,
      },
    },
  });
});

test("C-66ec4c4e invalid options reject before any part starts", async () => {
  const outcome = await attemptAsync(async () => {
    const root = tempRoot();
    const log = recorder();
    const calls = [
      () =>
        startE2eStack({
          port: 70000,
          controlPort: 0,
          dataDir: root,
          parts: [fakePart("p1", log)],
        }),
      () =>
        startE2eStack({
          port: 5000,
          controlPort: 5000,
          dataDir: root,
          parts: [fakePart("p1", log)],
        }),
      () =>
        startE2eStack({
          port: 0,
          controlPort: 0,
          dataDir: path.join(root, "missing"),
          parts: [fakePart("p1", log)],
        }),
    ];
    const codes: (string | undefined)[] = [];
    for (const call of calls) {
      const result = await capture(call);
      codes.push(result.ok ? "resolved" : result.code);
    }
    return { codes, starts: log.starts };
  });

  assert.deepEqual(outcome, {
    value: {
      codes: ["STACK_OPTIONS_INVALID", "STACK_OPTIONS_INVALID", "STACK_OPTIONS_INVALID"],
      starts: [],
    },
  });
});

test("C-66ec4c4e a busy engine port rejects STACK_ENGINE_FAILED with the fatal EADDRINUSE line", async () => {
  const outcome = await attemptAsync(async () => {
    const blocker = await busyPort();
    try {
      const root = tempRoot();
      const log = recorder();
      const controlPort = await freePort();
      const result = await capture(() =>
        startE2eStack({
          port: blocker.port,
          controlPort,
          dataDir: root,
          parts: [fakePart("p1", log), fakePart("p2", log)],
        }),
      );
      const details = result.ok ? {} : result.details;
      const fatal = typeof details["fatal"] === "string" ? details["fatal"] : "";
      return {
        code: result.ok ? "resolved" : result.code,
        exitCode: details["exitCode"],
        fatalHasEaddrInUse: fatal.includes("EADDRINUSE"),
        starts: log.starts,
        closes: log.closes,
        controlRefused: await connectionRefused(controlPort),
      };
    } finally {
      await blocker.close();
    }
  });

  assert.deepEqual(outcome, {
    value: {
      code: "STACK_ENGINE_FAILED",
      exitCode: 1,
      fatalHasEaddrInUse: true,
      starts: ["start:p1", "start:p2"],
      closes: ["close:p2", "close:p1"],
      controlRefused: true,
    },
  });
});

test("C-20bba381 resets re-run seeds serially and answer 500 for a rejecting seed before recovering", async () => {
  const outcome = await attemptAsync(async () => {
    const root = tempRoot();
    const log = recorder();
    let active = 0;
    let maxActive = 0;
    let failP2 = false;
    const track = async (partName: string): Promise<void> => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      try {
        await new Promise<void>((resolve) => setImmediate(resolve));
        if (partName === "p2" && failP2) {
          throw new Error("seed failed");
        }
      } finally {
        active -= 1;
      }
    };
    const stack = await startE2eStack({
      port: 0,
      controlPort: 0,
      dataDir: root,
      parts: [
        fakePart("p1", log, { onSeed: () => track("p1") }),
        fakePart("p2", log, { onSeed: () => track("p2") }),
      ],
    });
    try {
      const afterStart = { p1: countSeeds(log, "p1"), p2: countSeeds(log, "p2") };
      const reset = (): Promise<Response> =>
        fetch(`${stack.controlUrl}/reset`, { method: "POST" });
      const [first, second] = await Promise.all([reset(), reset()]);
      const afterTwo = { p1: countSeeds(log, "p1"), p2: countSeeds(log, "p2") };
      const maxAfterTwo = maxActive;

      failP2 = true;
      const failing = await reset();
      const failingBody = (await failing.json()) as {
        error?: { code?: string; details?: { part?: string } };
      };
      failP2 = false;
      const recovered = await reset();

      return {
        firstStatus: first.status,
        secondStatus: second.status,
        afterStart,
        afterTwo,
        maxAfterTwo,
        failing: {
          status: failing.status,
          code: failingBody.error?.code,
          part: failingBody.error?.details?.part,
        },
        recovered: recovered.status,
      };
    } finally {
      await stack.close().catch(() => undefined);
    }
  });

  assert.deepEqual(outcome, {
    value: {
      firstStatus: 204,
      secondStatus: 204,
      afterStart: { p1: 1, p2: 1 },
      afterTwo: { p1: 3, p2: 3 },
      maxAfterTwo: 1,
      failing: { status: 500, code: "STACK_RESET_FAILED", part: "p2" },
      recovered: 204,
    },
  });
});

test("C-346ddf48 a fault posted to the control listener fails the engine route until it is deleted", async () => {
  const outcome = await attemptAsync(async () => {
    const root = tempRoot();
    const log = recorder();
    const stack = await startE2eStack({
      port: 0,
      controlPort: 0,
      dataDir: root,
      parts: [fakePart("p1", log)],
    });
    try {
      const posted = await fetch(`${stack.controlUrl}/faults`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: "GET", url: "/health", status: 503 }),
      });
      const faulted = await fetch(`${stack.url}/health`);
      const faultedBody = (await faulted.json()) as { error?: { code?: string } };
      const requestId = faulted.headers.get("x-request-id");
      const other = await fetch(`${stack.url}/api/v1/nope`);
      const otherBody = (await other.json()) as { error?: { code?: string } };
      const deleted = await fetch(`${stack.controlUrl}/faults`, { method: "DELETE" });
      const healthy = await fetch(`${stack.url}/health`);

      return {
        postStatus: posted.status,
        faulted: {
          status: faulted.status,
          code: faultedBody.error?.code,
          hasRequestId: typeof requestId === "string" && requestId.length > 0,
        },
        other: { status: other.status, code: otherBody.error?.code },
        deleteStatus: deleted.status,
        healthy: healthy.status,
      };
    } finally {
      await stack.close().catch(() => undefined);
    }
  });

  assert.deepEqual(outcome, {
    value: {
      postStatus: 204,
      faulted: { status: 503, code: "FAULT_INJECTED", hasRequestId: true },
      other: { status: 404, code: "NOT_FOUND" },
      deleteStatus: 204,
      healthy: 200,
    },
  });
});
