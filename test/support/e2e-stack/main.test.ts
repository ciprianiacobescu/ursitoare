import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import type { Dirent } from "node:fs";
import { createConnection, createServer } from "node:net";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

const MAIN = path.join(import.meta.dirname, "main.ts");

const tempRoots: string[] = [];

function tempRoot(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "e2e-stack-main-test-"));
  tempRoots.push(dir);
  return dir;
}

after(() => {
  for (const dir of tempRoots) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // The stack or the cluster may already have removed its own directory.
    }
  }
});

interface Workspace {
  root: string;
  dataDir: string;
  tmpDir: string;
}

function workspace(): Workspace {
  const root = tempRoot();
  const dataDir = path.join(root, "data");
  const tmpDir = path.join(root, "tmp");
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(tmpDir, { recursive: true });
  return { root, dataDir, tmpDir };
}

function entries(dir: string): string[] {
  try {
    return readdirSync(dir).sort();
  } catch {
    return [];
  }
}

function safeEntries(dir: string): Dirent[] {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function stackDirs(root: string): string[] {
  return safeEntries(root)
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("ursitoare-e2e-"))
    .map((entry) => path.join(root, entry.name));
}

function filesNamed(root: string, name: string): string[] {
  const found: string[] = [];
  if (!existsSync(root)) {
    return found;
  }
  const walk = (dir: string): void => {
    for (const entry of safeEntries(dir)) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === name) {
        found.push(full);
      }
    }
  };
  walk(root);
  return found;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

interface RunResult {
  code: number | null;
  signal: NodeJS.Signals | null;
}

interface Run {
  stdout(): string;
  stderr(): string;
  firstLine(): Promise<string>;
  exited: Promise<RunResult>;
  hasExited(): boolean;
  stop(): Promise<void>;
}

const INDEPENDENT_ENV = new Set([
  "E2E_PORT",
  "E2E_CONTROL_PORT",
  "E2E_DATA_DIR",
  "E2E_STACK_LOG",
  "E2E_PROFILE",
]);

function childEnv(overrides: Readonly<Record<string, string>>): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !INDEPENDENT_ENV.has(key)) {
      env[key] = value;
    }
  }
  env["E2E_STACK_LOG"] = "0";
  return { ...env, ...overrides };
}

function spawnMain(overrides: Readonly<Record<string, string>>): Run {
  const child = spawn(process.execPath, [MAIN], {
    env: childEnv(overrides),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let allStdout = "";
  let allStderr = "";
  let lineBuffer = "";
  let firstLineResolve: ((line: string) => void) | undefined;
  const firstLinePromise = new Promise<string>((resolve) => {
    firstLineResolve = resolve;
  });

  let exitResult: RunResult | undefined;
  const exited = new Promise<RunResult>((resolve) => {
    child.once("close", (code, signal) => {
      exitResult = { code, signal };
      resolve(exitResult);
    });
  });

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    allStdout += chunk;
    lineBuffer += chunk;
    let index = lineBuffer.indexOf("\n");
    while (index !== -1) {
      const line = lineBuffer.slice(0, index);
      lineBuffer = lineBuffer.slice(index + 1);
      if (firstLineResolve !== undefined) {
        const resolve = firstLineResolve;
        firstLineResolve = undefined;
        resolve(line);
      }
      index = lineBuffer.indexOf("\n");
    }
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    allStderr += chunk;
  });

  return {
    stdout: (): string => allStdout,
    stderr: (): string => allStderr,
    firstLine: (): Promise<string> => firstLinePromise,
    exited,
    hasExited: (): boolean => exitResult !== undefined,
    async stop(): Promise<void> {
      if (exitResult === undefined) {
        child.kill("SIGTERM");
      }
      await withTimeout(exited, 60_000, "the process did not exit after SIGTERM");
    },
  };
}

type DirectoryOutcome =
  | { kind: "directory"; dir: string }
  | { kind: "line"; line: string }
  | { kind: "exit"; code: number | null }
  | { kind: "timeout" };

async function waitForStackDir(root: string, run: Run, timeoutMs: number): Promise<DirectoryOutcome> {
  let line: string | undefined;
  void run.firstLine().then(
    (value) => {
      line = value;
    },
    () => undefined,
  );

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const first = stackDirs(root)[0];
    if (first !== undefined) {
      return { kind: "directory", dir: first };
    }
    if (run.hasExited()) {
      return { kind: "exit", code: (await run.exited).code };
    }
    if (line !== undefined) {
      return { kind: "line", line };
    }
    await delay(20);
  }
  return { kind: "timeout" };
}

async function freePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close(() => reject(new Error("could not reserve a loopback port")));
        return;
      }
      const port = (address as AddressInfo).port;
      server.close((error) => (error === undefined ? resolve(port) : reject(error)));
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

test("C-23b4de23 the process prints one ready line, serves the database health and stops on SIGTERM", async () => {
  const { dataDir, tmpDir } = workspace();
  const port = await freePort();
  const controlPort = await freePort();
  const run = spawnMain({
    E2E_PORT: String(port),
    E2E_CONTROL_PORT: String(controlPort),
    E2E_DATA_DIR: dataDir,
    TMPDIR: tmpDir,
  });

  try {
    const expected = `e2e stack ready on http://127.0.0.1:${port} control http://127.0.0.1:${controlPort}`;
    const firstLine = await withTimeout(
      run.firstLine(),
      90_000,
      "the first stdout line did not arrive within 90 s",
    );
    assert.equal(firstLine, expected, "the first stdout line is the ready line");

    const health = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await health.json()) as {
      status?: string;
      checks?: Record<string, string>;
    };
    assert.equal(health.status, 200, "the served engine health answers 200");
    assert.equal(body.status, "ok", "the served engine health reports ok");
    assert.equal(body.checks?.["db"], "ok", "the served engine health checks the database");

    await run.stop();
    const exit = await run.exited;
    assert.deepEqual(exit, { code: 0, signal: null }, "SIGTERM exits the process with code 0");
    assert.equal(run.stdout(), `${expected}\n`, "stdout holds only the ready line and a newline");
    assert.deepEqual(entries(dataDir), [], "E2E_DATA_DIR is empty after the close");
    assert.deepEqual(filesNamed(tmpDir, "postmaster.pid"), [], "no postmaster.pid remains");
    assert.deepEqual(filesNamed(tmpDir, "PG_VERSION"), [], "no cluster directory remains");
  } finally {
    await run.stop().catch(() => undefined);
  }
});

test("C-23b4de23 the process starts on the default ports 39080 and 39081", async () => {
  const { dataDir, tmpDir } = workspace();
  const run = spawnMain({ E2E_DATA_DIR: dataDir, TMPDIR: tmpDir });

  try {
    const firstLine = await withTimeout(
      run.firstLine(),
      90_000,
      "the default-port ready line did not arrive within 90 s",
    );
    assert.equal(
      firstLine,
      "e2e stack ready on http://127.0.0.1:39080 control http://127.0.0.1:39081",
      "the ready line names the default engine and control ports",
    );
    await run.stop();
    const exit = await run.exited;
    assert.equal(exit.code, 0, "SIGTERM exits the default-port process with code 0");
  } finally {
    await run.stop().catch(() => undefined);
  }
});

test("C-5f32b081 a signal during the start closes the stack without a ready line", async () => {
  const { dataDir, tmpDir } = workspace();
  const port = await freePort();
  const controlPort = await freePort();
  const run = spawnMain({
    E2E_PORT: String(port),
    E2E_CONTROL_PORT: String(controlPort),
    E2E_DATA_DIR: dataDir,
    TMPDIR: tmpDir,
  });

  try {
    const outcome = await waitForStackDir(dataDir, run, 90_000);
    assert.equal(
      outcome.kind,
      "directory",
      `a ursitoare-e2e-* directory appears while the process starts (got ${JSON.stringify(outcome)})`,
    );

    await run.stop();
    const exit = await run.exited;
    assert.deepEqual(exit, { code: 0, signal: null }, "SIGTERM during the start exits with code 0");
    assert.equal(run.stdout(), "", "no ready line is printed when the signal came during the start");
    assert.deepEqual(entries(dataDir), [], "E2E_DATA_DIR is empty after the interrupted start");
    assert.deepEqual(filesNamed(tmpDir, "postmaster.pid"), [], "no postmaster.pid remains");
    assert.deepEqual(filesNamed(tmpDir, "PG_VERSION"), [], "no cluster directory remains");
  } finally {
    await run.stop().catch(() => undefined);
  }
});

test("C-4e750e4e a bad E2E_PORT and a busy engine port exit 1 with the failure line", async () => {
  const invalid = workspace();
  const invalidControlPort = await freePort();
  const invalidRun = spawnMain({
    E2E_PORT: "abc",
    E2E_CONTROL_PORT: String(invalidControlPort),
    E2E_DATA_DIR: invalid.dataDir,
    TMPDIR: invalid.tmpDir,
  });

  try {
    const exit = await withTimeout(
      invalidRun.exited,
      30_000,
      "the invalid-port process did not exit",
    );
    assert.equal(exit.code, 1, "a non-numeric E2E_PORT exits with code 1");
    const stderr = invalidRun.stderr();
    assert.match(stderr, /^e2e stack failed: /, "stderr starts with the failure line");
    assert.match(stderr, /E2E_PORT/, "the failure line names E2E_PORT");
    assert.deepEqual(entries(invalid.dataDir), [], "E2E_DATA_DIR is empty");
    assert.deepEqual(filesNamed(invalid.tmpDir, "postmaster.pid"), [], "no postmaster.pid remains");
    assert.deepEqual(filesNamed(invalid.tmpDir, "PG_VERSION"), [], "no cluster directory remains");
    assert.equal(
      await connectionRefused(invalidControlPort),
      true,
      "the control port was never left listening",
    );
  } finally {
    await invalidRun.stop().catch(() => undefined);
  }

  const blocker = await busyPort();
  const busy = workspace();
  const busyControlPort = await freePort();
  const busyRun = spawnMain({
    E2E_PORT: String(blocker.port),
    E2E_CONTROL_PORT: String(busyControlPort),
    E2E_DATA_DIR: busy.dataDir,
    TMPDIR: busy.tmpDir,
  });

  try {
    const exit = await withTimeout(
      busyRun.exited,
      90_000,
      "the busy-port process did not exit",
    );
    assert.equal(exit.code, 1, "a busy engine port exits with code 1");
    const stderr = busyRun.stderr();
    assert.match(stderr, /^e2e stack failed: /, "stderr starts with the failure line");
    assert.match(stderr, /STACK_ENGINE_FAILED/, "the failure line carries STACK_ENGINE_FAILED");
    assert.match(stderr, /EADDRINUSE/, "the failure line carries EADDRINUSE");
    assert.deepEqual(entries(busy.dataDir), [], "E2E_DATA_DIR is empty");
    assert.deepEqual(filesNamed(busy.tmpDir, "postmaster.pid"), [], "no postmaster.pid remains");
    assert.deepEqual(filesNamed(busy.tmpDir, "PG_VERSION"), [], "no cluster directory remains");
    assert.equal(
      await connectionRefused(busyControlPort),
      true,
      "the control port was never left listening",
    );
  } finally {
    await busyRun.stop().catch(() => undefined);
    await blocker.close();
  }
});
