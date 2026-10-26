import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { AddressInfo } from "node:net";
import { createConnection } from "node:net";
import type { Socket } from "node:net";
import { test } from "node:test";

import { sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { buildServer } from "./server.ts";
import type { Signal, SignalSource } from "./shutdown.ts";
import { installGracefulShutdown } from "./shutdown.ts";

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

function record(value: unknown): Record<string, unknown> {
  assert.ok(typeof value === "object" && value !== null, "a record was present");
  return value as Record<string, unknown>;
}

function lineWith(lines: readonly string[], message: string): Record<string, unknown> {
  const found = lines.map((line) => parse(line)).filter((entry) => entry["msg"] === message);
  assert.equal(found.length, 1, `exactly one ${message} line was written`);
  const line = found[0];
  assert.ok(line, `the ${message} line was written`);
  return line;
}

interface SignalCall {
  signal: Signal;
  handler: () => void;
}

interface SpySignals {
  signals: SignalSource;
  emitter: EventEmitter;
  onCalls: SignalCall[];
  offCalls: SignalCall[];
}

function spySignals(): SpySignals {
  const emitter = new EventEmitter();
  const onCalls: SignalCall[] = [];
  const offCalls: SignalCall[] = [];
  return {
    emitter,
    onCalls,
    offCalls,
    signals: {
      on(signal: Signal, handler: () => void): unknown {
        onCalls.push({ signal, handler });
        return emitter.on(signal, handler);
      },
      off(signal: Signal, handler: () => void): unknown {
        offCalls.push({ signal, handler });
        return emitter.off(signal, handler);
      },
    },
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

test("C-341a5ed6 a SIGTERM then SIGINT closes once and exits zero", async () => {
  await assert.doesNotReject(async () => {
    const { destination, lines } = capture();
    const logger = createLogger({ level: "info", destination });
    const { signals, emitter } = spySignals();
    const exited = deferred<number>();
    let closeCalls = 0;
    const exitCodes: number[] = [];

    installGracefulShutdown({
      close: async () => {
        closeCalls += 1;
      },
      drainTimeoutMs: 5000,
      exit: (code) => {
        exitCodes.push(code);
        exited.resolve(code);
      },
      logger,
      signals,
    });

    emitter.emit("SIGTERM");
    emitter.emit("SIGINT");

    assert.equal(await exited.promise, 0);
    assert.equal(closeCalls, 1);
    assert.deepEqual(exitCodes, [0]);

    const shuttingDown = lineWith(lines, "shutting down");
    assert.equal(shuttingDown["reason"], "SIGTERM");
  });
});

test("C-3d0f68d6 a direct shutdown is idempotent and resolves undefined after exit zero", async () => {
  await assert.doesNotReject(async () => {
    const { destination, lines } = capture();
    const logger = createLogger({ level: "info", destination });
    const { signals, emitter } = spySignals();
    let closeCalls = 0;
    const exitCodes: number[] = [];

    const controller = installGracefulShutdown({
      close: async () => {
        closeCalls += 1;
      },
      drainTimeoutMs: 5000,
      exit: (code) => {
        exitCodes.push(code);
      },
      logger,
      signals,
    });

    const first = await controller.shutdown("test");
    assert.equal(first, undefined);
    const second = await controller.shutdown("again");
    assert.equal(second, undefined);
    emitter.emit("SIGTERM");
    const third = await controller.shutdown("third");
    assert.equal(third, undefined);

    assert.equal(closeCalls, 1);
    assert.deepEqual(exitCodes, [0]);

    const shuttingDown = lineWith(lines, "shutting down");
    assert.equal(shuttingDown["reason"], "test");
  });
});

test("C-3d0f68d6 dispose removes both signal listeners and never closes", async () => {
  await assert.doesNotReject(async () => {
    const { destination, lines } = capture();
    const logger = createLogger({ level: "info", destination });
    const { signals, emitter, onCalls, offCalls } = spySignals();
    let closeCalls = 0;
    const exitCodes: number[] = [];

    const controller = installGracefulShutdown({
      close: async () => {
        closeCalls += 1;
      },
      drainTimeoutMs: 5000,
      exit: (code) => {
        exitCodes.push(code);
      },
      logger,
      signals,
    });

    assert.equal(onCalls.length, 2);
    assert.deepEqual(
      onCalls.map((call) => call.signal).sort(),
      ["SIGINT", "SIGTERM"],
    );

    controller.dispose();
    controller.dispose();

    assert.equal(offCalls.length, 2);
    for (const call of offCalls) {
      const registered = onCalls.find((onCall) => onCall.signal === call.signal);
      assert.ok(registered !== undefined, `the ${call.signal} handler was registered`);
      assert.equal(call.handler, registered.handler);
    }

    assert.equal(emitter.listenerCount("SIGTERM"), 0);
    assert.equal(emitter.listenerCount("SIGINT"), 0);

    emitter.emit("SIGTERM");
    await new Promise<void>((resolve) => setImmediate(resolve));

    assert.equal(closeCalls, 0);
    assert.deepEqual(exitCodes, []);
    assert.equal(lines.length, 0);
  });
});

test("C-78a31ae6 a missed drain deadline force closes and exits one", async () => {
  await assert.doesNotReject(async () => {
    const { destination, lines } = capture();
    const logger = createLogger({ level: "info", destination });
    const { signals } = spySignals();
    let forceCloseCalls = 0;
    const exitCodes: number[] = [];

    const controller = installGracefulShutdown({
      close: () => new Promise<unknown>(() => undefined),
      forceClose: () => {
        forceCloseCalls += 1;
      },
      drainTimeoutMs: 20,
      exit: (code) => {
        exitCodes.push(code);
      },
      logger,
      signals,
    });

    const result = await controller.shutdown("test");
    assert.equal(result, undefined);
    assert.equal(forceCloseCalls, 1);
    assert.deepEqual(exitCodes, [1]);
    assert.equal(lineWith(lines, "drain deadline exceeded")["level"], 40);
  });
});

test("C-78a31ae6 a failed close logs shutdown failed without the error text", async () => {
  await assert.doesNotReject(async () => {
    const { destination, lines } = capture();
    const logger = createLogger({ level: "info", destination });
    const { signals } = spySignals();
    let forceCloseCalls = 0;
    const exitCodes: number[] = [];

    const controller = installGracefulShutdown({
      close: async () => {
        throw new Error("pw=hunter2");
      },
      forceClose: () => {
        forceCloseCalls += 1;
      },
      drainTimeoutMs: 5000,
      exit: (code) => {
        exitCodes.push(code);
      },
      logger,
      signals,
    });

    const result = await controller.shutdown("test");
    assert.equal(result, undefined);
    assert.equal(forceCloseCalls, 1);
    assert.deepEqual(exitCodes, [1]);

    const failure = lineWith(lines, "shutdown failed");
    assert.equal(record(failure["err"])["type"], "Error");
    assert.ok(!lines.some((line) => line.includes("hunter2")), "the error text never reaches a log");
  });
});

interface RawResponse {
  status: number;
  headers: Map<string, string>;
  body: string;
}

function parseRawResponses(raw: string): RawResponse[] {
  const responses: RawResponse[] = [];
  let rest = raw;
  while (rest.length > 0) {
    const headerEnd = rest.indexOf("\r\n\r\n");
    if (headerEnd < 0) {
      break;
    }
    const head = rest.slice(0, headerEnd).split("\r\n");
    const statusLine = head[0] ?? "";
    const status = Number(statusLine.split(" ")[1]);
    const headers = new Map<string, string>();
    for (const line of head.slice(1)) {
      const separator = line.indexOf(":");
      if (separator > 0) {
        headers.set(line.slice(0, separator).toLowerCase(), line.slice(separator + 1).trim());
      }
    }
    const length = Number(headers.get("content-length") ?? "0");
    const bodyStart = headerEnd + 4;
    if (rest.length < bodyStart + length) {
      break;
    }
    responses.push({ status, headers, body: rest.slice(bodyStart, bodyStart + length) });
    rest = rest.slice(bodyStart + length);
  }
  return responses;
}

function probeOnce(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const probe = createConnection({ host: "127.0.0.1", port });
    probe.once("connect", () => {
      probe.destroy();
      resolve(false);
    });
    probe.once("error", (error: NodeJS.ErrnoException) => {
      probe.destroy();
      resolve(error.code === "ECONNREFUSED");
    });
  });
}

async function waitUntilRefused(port: number): Promise<void> {
  for (let attempt = 0; attempt < 2000; attempt += 1) {
    if (await probeOnce(port)) {
      return;
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  assert.fail("a new connection was never refused");
}

test("C-9abd6ccb requests during the drain still get the envelope and the slow request finishes", async () => {
  await assert.doesNotReject(async () => {
    const { destination, lines } = capture();
    const logger = createLogger({ level: "info", destination });
    const server = await buildServer({
      version: "1.2.3",
      ids: sequentialIds(1),
      logger,
      tracer: noopTracer,
    });

    let releaseSlow = (): void => undefined;
    const slowGate = new Promise<void>((resolve) => {
      releaseSlow = resolve;
    });
    const entered = deferred<undefined>();
    server.get("/slow", async () => {
      entered.resolve(undefined);
      await slowGate;
      return { ok: true };
    });

    let socket: Socket | undefined;
    const exitCodes: number[] = [];
    try {
      await server.listen({ port: 0, host: "127.0.0.1" });
      const address = server.server.address();
      assert.ok(address !== null && typeof address === "object", "the server bound a port");
      const { port } = address as AddressInfo;

      const chunks: Buffer[] = [];
      socket = createConnection({ host: "127.0.0.1", port });
      await new Promise<void>((resolve, reject) => {
        socket?.once("connect", resolve);
        socket?.once("error", reject);
      });
      socket.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      const socketClosed = new Promise<void>((resolve) => {
        socket?.once("close", () => resolve());
      });

      socket.write(
        "GET /slow HTTP/1.1\r\nHost: 127.0.0.1\r\nx-request-id: drain-slow\r\nConnection: keep-alive\r\n\r\n",
      );
      await entered.promise;

      const controller = installGracefulShutdown({
        close: () => server.close(),
        drainTimeoutMs: 5000,
        exit: (code) => {
          exitCodes.push(code);
        },
        logger,
        signals: new EventEmitter(),
      });
      const shutdownPromise = controller.shutdown("test");

      await waitUntilRefused(port);

      socket.write(
        "GET /nope HTTP/1.1\r\nHost: 127.0.0.1\r\nx-request-id: drain-nope\r\nConnection: close\r\n\r\n",
      );
      releaseSlow();

      await shutdownPromise;
      await socketClosed;

      const responses = parseRawResponses(Buffer.concat(chunks).toString("utf8"));
      const slow = responses.find((response) => response.status === 200);
      const notFound = responses.find((response) => response.status === 404);
      assert.ok(slow !== undefined, "the slow request answered with 200");
      assert.ok(notFound !== undefined, "the late request answered with 404");
      assert.equal(
        responses.some((response) => response.status === 503),
        false,
        "the late request is not Fastify's 503 body",
      );
      assert.deepEqual(JSON.parse(notFound.body), {
        error: { code: "NOT_FOUND", message: "Route not found" },
      });
      assert.equal(notFound.headers.get("x-request-id"), "drain-nope");
      assert.equal(notFound.headers.get("connection"), "close");
      assert.deepEqual(JSON.parse(slow.body), { ok: true });
      assert.deepEqual(exitCodes, [0]);
      assert.equal(lineWith(lines, "shutting down")["reason"], "test");
    } finally {
      releaseSlow();
      socket?.destroy();
      if (server.server.listening) {
        await server.close().catch(() => undefined);
      }
    }
  });
});
