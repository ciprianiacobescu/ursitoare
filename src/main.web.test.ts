import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createConnection, createServer } from "node:net";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { loadConfig } from "./config/index.ts";
import type { Database } from "./db/index.ts";
import type { MainDeps, RunningServer } from "./main.ts";
import { main } from "./main.ts";
import type { LogDestination } from "./observability/index.ts";

assert.equal(typeof main, "function");

const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'";
const INDEX_HTML = "<!doctype html>\n<html><body><div id=\"root\"></div></body></html>\n";
const WEB_NOT_BUILT_MESSAGE = "web app is not built; run pnpm run build or set URSITOARE_WEB_DIST";

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

function assertSecurityHeaders(headers: Headers): void {
  assert.equal(headers.get("content-security-policy"), CONTENT_SECURITY_POLICY);
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.equal(headers.get("referrer-policy"), "no-referrer");
  assert.equal(headers.get("x-frame-options"), "DENY");
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

async function freeLoopbackPort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  assert.ok(address !== null && typeof address === "object", "the probe bound a port");
  const port = (address as AddressInfo).port;
  await new Promise<void>((resolve, reject) => {
    probe.close((error) => (error === undefined ? resolve() : reject(error)));
  });
  return port;
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

function errorCodeOf(body: string): unknown {
  const parsed: unknown = JSON.parse(body);
  assert.ok(typeof parsed === "object" && parsed !== null, "the body is a JSON object");
  const error = (parsed as { error?: unknown }).error;
  assert.ok(typeof error === "object" && error !== null, "the body has an error object");
  return (error as { code?: unknown }).code;
}

test("C-8182ad8f main serves a configured web build, health and the JSON 404", async () => {
  const root = await mkdtemp(join(tmpdir(), "ursitoare-main-web-"));
  const distDir = join(root, "dist");
  await mkdir(distDir, { recursive: true });
  await writeFile(join(distDir, "index.html"), INDEX_HTML, "utf8");

  const { destination } = capture();
  const exits: number[] = [];
  let running: RunningServer | null = null;

  try {
    running = await resolveMain({
      loadConfig: () => ({ ...loadConfig({ URSITOARE_WEB_DIST: distDir }), port: 0 }),
      destination,
      signals: new EventEmitter(),
      exit: (code) => {
        exits.push(code);
      },
      openDatabase: async () => null,
    });

    assert.ok(running !== null, "main resolves a running server");

    const home = await fetch(`${running.url}/`);
    assert.equal(home.status, 200, "GET / answers the configured build");
    assert.equal(await home.text(), INDEX_HTML, "GET / answers the index bytes");
    assertSecurityHeaders(home.headers);

    const health = await fetch(`${running.url}/health`);
    assert.equal(health.status, 200);
    const healthBody = (await health.json()) as { status?: unknown };
    assert.equal(healthBody.status, "ok");
    assertSecurityHeaders(health.headers);

    const missing = await fetch(`${running.url}/api/v1/x`);
    assert.equal(missing.status, 404);
    assert.equal(errorCodeOf(await missing.text()), "NOT_FOUND");
    assert.deepEqual(exits, []);
  } finally {
    await running?.close().catch(() => undefined);
    await rm(root, { recursive: true, force: true });
  }
});

test("C-1b33755d main warns once for an unbuilt directory and serves health", async () => {
  const root = await mkdtemp(join(tmpdir(), "ursitoare-main-unbuilt-"));
  const emptyDir = join(root, "empty");
  const builtDir = join(root, "built");
  await mkdir(emptyDir, { recursive: true });
  await mkdir(builtDir, { recursive: true });
  await writeFile(join(builtDir, "index.html"), INDEX_HTML, "utf8");

  try {
    const unbuilt = capture();
    let running: RunningServer | null = null;
    try {
      running = await resolveMain({
        loadConfig: () => ({ ...loadConfig({ URSITOARE_WEB_DIST: emptyDir }), port: 0 }),
        destination: unbuilt.destination,
        signals: new EventEmitter(),
        exit: () => undefined,
        openDatabase: async () => null,
      });

      assert.ok(running !== null, "main still starts without a build");

      const warnings = logged(unbuilt.lines).filter((line) => line["code"] === "WEB_NOT_BUILT");
      assert.equal(warnings.length, 1, "exactly one WEB_NOT_BUILT warning is logged");
      const warning = warnings[0];
      assert.ok(warning !== undefined, "the warning line was written");
      assert.equal(warning["msg"], WEB_NOT_BUILT_MESSAGE);
      assert.equal(
        JSON.stringify(warning).includes(emptyDir),
        false,
        "the warning holds no directory path",
      );
      assert.equal(
        unbuilt.lines.some((line) => line.includes(emptyDir)),
        false,
        "no log line holds the web directory path",
      );

      const home = await fetch(`${running.url}/`);
      assert.equal(home.status, 503);
      const homeBody = await home.text();
      assert.equal(errorCodeOf(homeBody), "WEB_NOT_BUILT");
      assert.equal(homeBody.includes(emptyDir), false, "the body holds no directory path");

      const health = await fetch(`${running.url}/health`);
      assert.equal(health.status, 200, "health is unaffected by the missing build");
      const healthBody = (await health.json()) as { status?: unknown };
      assert.equal(healthBody.status, "ok");
    } finally {
      await running?.close().catch(() => undefined);
    }

    const built = capture();
    let builtRunning: RunningServer | null = null;
    try {
      builtRunning = await resolveMain({
        loadConfig: () => ({ ...loadConfig({ URSITOARE_WEB_DIST: builtDir }), port: 0 }),
        destination: built.destination,
        signals: new EventEmitter(),
        exit: () => undefined,
        openDatabase: async () => null,
      });

      assert.ok(builtRunning !== null, "main starts with a built directory");
      const home = await fetch(`${builtRunning.url}/`);
      assert.equal(home.status, 200);
      assert.equal(await home.text(), INDEX_HTML);
      assert.equal(
        logged(built.lines).some((line) => line["code"] === "WEB_NOT_BUILT"),
        false,
        "a built directory logs no WEB_NOT_BUILT line",
      );
    } finally {
      await builtRunning?.close().catch(() => undefined);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("C-2c3a693b main fails startup for an invalid web directory and closes the database once", async () => {
  const port = await freeLoopbackPort();
  const { destination, lines } = capture();
  const exits: number[] = [];
  const { database, closeCount } = recordingDatabase();
  let running: RunningServer | null = null;

  try {
    running = await resolveMain({
      loadConfig: () => ({ ...loadConfig({ URSITOARE_WEB_DIST: "a\u0000b" }), port }),
      destination,
      signals: new EventEmitter(),
      exit: (code) => {
        exits.push(code);
      },
      openDatabase: async () => database,
    });

    assert.equal(running === null, true, "main resolves null for an invalid web directory");
    assert.deepEqual(exits, [1], "exit is called once with 1");

    const fatal = fatalLines(lines);
    assert.equal(fatal.length, 1, "exactly one fatal line is written");
    const line = fatal[0];
    assert.ok(line !== undefined, "the fatal line was written");
    assert.equal(line["code"], "WEB_DIST_INVALID");
    assert.equal(line["msg"], "startup failed");
    assert.equal(
      JSON.stringify(line).includes("a\u0000b"),
      false,
      "the fatal line holds no directory path",
    );
    assert.equal(closeCount(), 1, "the database was closed once");
    assert.equal(
      logged(lines).some((entry) => entry["msg"] === "ursitoare listening"),
      false,
      "no listening line was written",
    );
    assert.equal(await connectionRefused(port), true, "no port is open");
  } finally {
    await running?.close().catch(() => undefined);
  }
});
