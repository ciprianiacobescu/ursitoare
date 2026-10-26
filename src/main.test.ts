import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { AddressInfo } from "node:net";
import { createConnection, createServer } from "node:net";
import { test } from "node:test";

import type { AppConfig } from "./config/index.ts";
import { ConfigError } from "./config/index.ts";
import type { MainDeps, RunningServer } from "./main.ts";
import { VERSION, main, startServer } from "./main.ts";
import type { LogDestination } from "./observability/index.ts";

function capture(): { destination: LogDestination; lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    destination: {
      write(line: string): void {
        lines.push(line);
      },
    },
  };
}

function parse(line: string | undefined): Record<string, unknown> {
  assert.ok(line !== undefined, "a log line was written");
  return JSON.parse(line) as Record<string, unknown>;
}

function logged(lines: readonly string[]): Record<string, unknown>[] {
  return lines.map((line) => parse(line));
}

function fatalLines(lines: readonly string[]): Record<string, unknown>[] {
  return logged(lines).filter((line) => line["level"] === 60);
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

function appConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    role: "all",
    host: "127.0.0.1",
    port: 0,
    logLevel: "info",
    publicBaseUrl: "https://ursitoare.example.com",
    webDist: null,
    shutdownDrainMs: 10000,
    engineKey: null,
    database: { app: null, owner: null },
    ...overrides,
  };
}

async function busyLoopbackPort(): Promise<{ port: number; close(): Promise<void> }> {
  const blocker = createServer();
  await new Promise<void>((resolve, reject) => {
    blocker.once("error", reject);
    blocker.listen(0, "127.0.0.1", resolve);
  });
  const address = blocker.address();
  assert.ok(address !== null && typeof address === "object", "the blocker bound a port");
  return {
    port: (address as AddressInfo).port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        blocker.close((error) => (error === undefined ? resolve() : reject(error)));
      }),
  };
}

async function resolveMain(deps: Partial<MainDeps>): Promise<RunningServer | null> {
  const results: (RunningServer | null)[] = [];
  await assert.doesNotReject(async () => {
    results.push(await main(deps));
  }, "main must resolve");
  const result = results[0];
  assert.ok(result !== undefined, "main resolved a value");
  return result;
}

test("C-6912835f startServer serves health on the bound loopback port and closes", async () => {
  const sigtermBefore = process.listenerCount("SIGTERM");
  const sigintBefore = process.listenerCount("SIGINT");

  const running = await startServer(0, "127.0.0.1");
  try {
    const match = /^http:\/\/127\.0\.0\.1:(\d+)$/.exec(running.url);
    assert.ok(match !== null, `the url is loopback with the bound port, got ${running.url}`);
    const portText = match[1];
    assert.ok(portText !== undefined, "the url carries the port");
    const port = Number(portText);

    assert.equal(typeof VERSION, "string");

    const response = await fetch(`${running.url}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ok",
      version: VERSION,
      checks: {},
    });

    assert.equal(process.listenerCount("SIGTERM"), sigtermBefore);
    assert.equal(process.listenerCount("SIGINT"), sigintBefore);

    await running.close();

    assert.equal(await connectionRefused(port), true, "a new connection is refused after close");
  } finally {
    await running.close().catch(() => undefined);
  }
});

test("C-c7407753 main starts a port-0 server and stops on SIGTERM", async () => {
  const { destination, lines } = capture();
  const signals = new EventEmitter();
  const exits: number[] = [];
  const exited = deferred<number>();
  let running: RunningServer | null = null;

  try {
    running = await resolveMain({
      loadConfig: () =>
        appConfig({ host: "127.0.0.1", port: 0, publicBaseUrl: "https://ursitoare.example.com" }),
      destination,
      signals,
      exit: (code) => {
        exits.push(code);
        exited.resolve(code);
      },
    });

    assert.ok(running !== null, "main resolves a running server");
    const match = /^http:\/\/127\.0\.0\.1:(\d+)$/.exec(running.url);
    assert.ok(match !== null, `the url is loopback with the bound port, got ${running.url}`);
    const portText = match[1];
    assert.ok(portText !== undefined, "the url carries the port");
    const port = Number(portText);

    const response = await fetch(`${running.url}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ok",
      version: VERSION,
      checks: {},
    });

    signals.emit("SIGTERM");
    assert.equal(await exited.promise, 0);
    assert.deepEqual(exits, [0]);

    const listening = logged(lines).find((line) => line["msg"] === "ursitoare listening");
    assert.ok(listening !== undefined, "the listening line was written");
    assert.equal(listening["host"], "127.0.0.1");
    assert.equal(listening["port"], port);
    assert.equal(listening["url"], running.url);
  } finally {
    await running?.close().catch(() => undefined);
  }
});

test("C-c7407753 main listens on the configured host and reports it", async () => {
  const { destination, lines } = capture();
  const signals = new EventEmitter();
  const exits: number[] = [];
  let running: RunningServer | null = null;

  try {
    running = await resolveMain({
      loadConfig: () => appConfig({ host: "0.0.0.0", port: 0 }),
      destination,
      signals,
      exit: (code) => {
        exits.push(code);
      },
    });

    assert.ok(running !== null, "main resolves a running server");
    const match = /^http:\/\/0\.0\.0\.0:(\d+)$/.exec(running.url);
    assert.ok(match !== null, `the url keeps the configured host, got ${running.url}`);
    const portText = match[1];
    assert.ok(portText !== undefined, "the url carries the port");
    const port = Number(portText);

    const listening = logged(lines).find((line) => line["msg"] === "ursitoare listening");
    assert.ok(listening !== undefined, "the listening line was written");
    assert.equal(listening["host"], "0.0.0.0");
    assert.equal(listening["port"], port);
    assert.equal(listening["url"], running.url);
    assert.deepEqual(exits, []);
  } finally {
    await running?.close().catch(() => undefined);
  }
});

test("C-469d7fec main writes one fatal line for an empty secret file", async () => {
  const { destination, lines } = capture();
  const exits: number[] = [];

  const result = await resolveMain({
    loadConfig: () => {
      throw new ConfigError("CONFIG_SECRET_EMPTY", "URSITOARE_ENGINE_KEY_FILE", "file is empty");
    },
    destination,
    signals: new EventEmitter(),
    exit: (code) => {
      exits.push(code);
    },
  });

  assert.equal(result, null);
  assert.deepEqual(exits, [1]);

  const fatal = fatalLines(lines);
  assert.equal(fatal.length, 1, "exactly one fatal line is written");
  const line = fatal[0];
  assert.ok(line !== undefined, "the fatal line was written");
  assert.equal(line["code"], "CONFIG_SECRET_EMPTY");
  assert.equal(line["variable"], "URSITOARE_ENGINE_KEY_FILE");
  assert.equal(line["msg"], "startup failed: URSITOARE_ENGINE_KEY_FILE: file is empty");
  assert.equal(
    logged(lines).some((entry) => entry["msg"] === "ursitoare listening"),
    false,
    "no port was opened",
  );
});

test("C-469d7fec main writes one fatal line without the error text for an unknown failure", async () => {
  const { destination, lines } = capture();
  const exits: number[] = [];

  const result = await resolveMain({
    loadConfig: () => {
      throw new Error("boom");
    },
    destination,
    signals: new EventEmitter(),
    exit: (code) => {
      exits.push(code);
    },
  });

  assert.equal(result, null);
  assert.deepEqual(exits, [1]);

  const fatal = fatalLines(lines);
  assert.equal(fatal.length, 1, "exactly one fatal line is written");
  const line = fatal[0];
  assert.ok(line !== undefined, "the fatal line was written");
  assert.equal(line["code"], "STARTUP_FAILED");
  assert.equal(line["msg"], "startup failed");
  assert.equal(
    lines.some((entry) => entry.includes("boom")),
    false,
    "the error text never reaches a log",
  );
});

test("C-469d7fec main reports EADDRINUSE for a busy port at info and silent", async () => {
  const blocker = await busyLoopbackPort();
  try {
    for (const logLevel of ["info", "silent"] as const) {
      const { destination, lines } = capture();
      const exits: number[] = [];

      const result = await resolveMain({
        loadConfig: () => appConfig({ host: "127.0.0.1", port: blocker.port, logLevel }),
        destination,
        signals: new EventEmitter(),
        exit: (code) => {
          exits.push(code);
        },
      });

      assert.equal(result, null);
      assert.deepEqual(exits, [1]);

      const fatal = fatalLines(lines);
      assert.equal(fatal.length, 1, `exactly one fatal line is written at ${logLevel}`);
      const line = fatal[0];
      assert.ok(line !== undefined, `the fatal line was written at ${logLevel}`);
      assert.equal(line["code"], "EADDRINUSE");
      assert.equal(line["host"], "127.0.0.1");
      assert.equal(line["port"], blocker.port);
    }
  } finally {
    await blocker.close();
  }
});
