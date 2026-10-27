import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { AppConfig } from "./config/index.ts";
import type { Database } from "./db/index.ts";
import type { RunningServer } from "./main.ts";
import { main } from "./main.ts";
import type { LogDestination } from "./observability/index.ts";

assert.equal(typeof main, "function");

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

function recordingDatabase(): { database: Database; closeCount(): number } {
  let closes = 0;
  return {
    database: {
      appPool: {} as Database["appPool"],
      close: async (): Promise<void> => {
        closes += 1;
      },
    },
    closeCount: () => closes,
  };
}

test("C-ea25f674 main runs configureServer before listening and serves its hook", async () => {
  const { destination } = capture();
  const signals = new EventEmitter();
  const exits: number[] = [];
  const listeningAtConfigure: boolean[] = [];
  let running: RunningServer | null = null;

  try {
    running = await main({
      loadConfig: () => appConfig({ host: "127.0.0.1", port: 0 }),
      destination,
      signals,
      exit: (code) => {
        exits.push(code);
      },
      openDatabase: async () => recordingDatabase().database,
      configureServer: (server) => {
        listeningAtConfigure.push(server.server.listening);
        server.addHook("onRequest", async (_request, reply) => {
          reply.header("x-seam", "1");
        });
      },
    });

    assert.ok(running !== null, "main resolves a running server");
    assert.deepEqual(listeningAtConfigure, [false], "the hook ran before listen");

    const response = await fetch(`${running.url}/health`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-seam"), "1");
    assert.deepEqual(exits, []);
  } finally {
    await running?.close().catch(() => undefined);
  }
});

test("C-7778e3c9 main treats a throwing configureServer as a startup failure without the message", async () => {
  const cases: { thrown: Error; code: string }[] = [
    { thrown: Object.assign(new Error("hook failed"), { code: "E_HOOK" }), code: "E_HOOK" },
    { thrown: new Error("hook failed"), code: "SERVER_HOOK_FAILED" },
  ];

  for (const { thrown, code } of cases) {
    const { destination, lines } = capture();
    const exits: number[] = [];
    const { database, closeCount } = recordingDatabase();
    let configuredServer: FastifyInstance | undefined;

    const result = await main({
      loadConfig: () => appConfig({ host: "127.0.0.1", port: 0 }),
      destination,
      signals: new EventEmitter(),
      exit: (exitCode) => {
        exits.push(exitCode);
      },
      openDatabase: async () => database,
      configureServer: (server) => {
        configuredServer = server;
        throw thrown;
      },
    });

    if (result !== null) {
      await result.close().catch(() => undefined);
    }

    assert.ok(result === null, `main resolves null for ${code}`);
    assert.deepEqual(exits, [1], "exit is called once with 1");
    assert.ok(configuredServer !== undefined, "the hook ran");

    const fatal = fatalLines(lines);
    assert.equal(fatal.length, 1, "exactly one fatal line is written");
    const line = fatal[0];
    assert.ok(line !== undefined, "the fatal line was written");
    assert.equal(line["code"], code);
    assert.equal(line["msg"], "startup failed");
    assert.equal(closeCount(), 1, "the database was closed once");
    assert.equal(
      lines.some((entry) => entry.includes("hook failed")),
      false,
      "the error text never reaches a log",
    );
    assert.equal(configuredServer.server.listening, false, "no port is open");
    assert.equal(
      logged(lines).some((entry) => entry["msg"] === "ursitoare listening"),
      false,
      "no listening line was written",
    );
  }
});
