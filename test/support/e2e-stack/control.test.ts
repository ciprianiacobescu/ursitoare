import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import { startControlServer } from "./control.ts";
import { createFaultTable } from "./faults.ts";
import { E2eStackError } from "./part.ts";

type Outcome<T> = { value: T } | { error: string };

// Turns any throw (including the stubs') into data, so the test fails on its assertion.
async function attemptAsync<T>(call: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { value: await call() };
  } catch (error) {
    return { error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}

interface Envelope {
  error: {
    code: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function rawRequest(
  baseUrl: string,
  options: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: string;
    chunks?: readonly string[];
  },
): Promise<RawResponse> {
  const url = new URL(baseUrl);
  return new Promise<RawResponse>((resolve, reject) => {
    let responded = false;
    const request = http.request(
      {
        hostname: url.hostname,
        port: Number(url.port),
        path: options.path,
        method: options.method,
        headers: options.headers ?? {},
      },
      (response) => {
        responded = true;
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({ status: response.statusCode ?? 0, headers: response.headers, body });
        });
      },
    );
    request.on("error", (error) => {
      if (!responded) reject(error);
    });
    if (options.chunks !== undefined) {
      for (const chunk of options.chunks) request.write(chunk);
      request.end();
      return;
    }
    request.end(options.body ?? "");
  });
}

function headerOf(response: RawResponse, name: string): string | undefined {
  const value = response.headers[name];
  return Array.isArray(value) ? value.join(", ") : value;
}

function envelopeOf(response: RawResponse): Envelope {
  return JSON.parse(response.body) as Envelope;
}

async function fetchedEnvelope(response: { json(): Promise<unknown> }): Promise<Envelope> {
  return (await response.json()) as Envelope;
}

test("C-182af5d3 the control server binds loopback and refuses a foreign Host or any Origin without calling reset", async () => {
  assert.equal(typeof startControlServer, "function");

  const outcome = await attemptAsync(async () => {
    const faults = createFaultTable();
    let resets = 0;
    const server = await startControlServer({
      port: 0,
      faults,
      reset: async () => {
        resets += 1;
      },
    });
    try {
      const bound = new URL(server.url);
      const foreign = await rawRequest(server.url, {
        method: "POST",
        path: "/reset",
        headers: { host: `evil.example:${bound.port}` },
      });
      const origin = await rawRequest(server.url, {
        method: "POST",
        path: "/reset",
        headers: { origin: "http://127.0.0.1:39080" },
      });

      return {
        hostname: bound.hostname,
        nonzeroPort: bound.port !== "" && Number(bound.port) > 0,
        foreign: { status: foreign.status, code: envelopeOf(foreign).error.code },
        origin: { status: origin.status, code: envelopeOf(origin).error.code },
        resets,
      };
    } finally {
      await server.close();
      await server.close();
    }
  });

  assert.deepEqual(outcome, {
    value: {
      hostname: "127.0.0.1",
      nonzeroPort: true,
      foreign: { status: 403, code: "CONTROL_FORBIDDEN" },
      origin: { status: 403, code: "CONTROL_FORBIDDEN" },
      resets: 0,
    },
  });
});

test("C-67fb8681 routing and body limits answer method, route, media type and size errors and ignore reset bodies", async () => {
  const outcome = await attemptAsync(async () => {
    const faults = createFaultTable();
    let resets = 0;
    const server = await startControlServer({
      port: 0,
      faults,
      reset: async () => {
        resets += 1;
      },
    });
    try {
      const getReset = await fetch(`${server.url}/reset`, { method: "GET" });
      const getResetBody = await fetchedEnvelope(getReset);

      const nowhere = await fetch(`${server.url}/nowhere`, { method: "POST" });
      const nowhereBody = await fetchedEnvelope(nowhere);

      const plain = await fetch(`${server.url}/faults`, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "hello",
      });
      const plainBody = await fetchedEnvelope(plain);

      const tooLarge = await rawRequest(server.url, {
        method: "POST",
        path: "/faults",
        headers: { "content-type": "application/json" },
        body: "a".repeat(5000),
      });

      const charset = await fetch(`${server.url}/faults`, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ method: "GET", url: "/ok", status: 500 }),
      });
      const charsetText = await charset.text();

      const resetNoBody = await fetch(`${server.url}/reset`, { method: "POST" });
      const resetNoBodyText = await resetNoBody.text();

      const resetBody = await rawRequest(server.url, {
        method: "POST",
        path: "/reset",
        headers: { "content-type": "text/plain" },
        body: "x".repeat(5000),
      });

      const put = await fetch(`${server.url}/faults`, { method: "PUT" });
      const putBody = await fetchedEnvelope(put);

      return {
        getReset: {
          status: getReset.status,
          allow: getReset.headers.get("allow"),
          code: getResetBody.error.code,
        },
        nowhere: { status: nowhere.status, code: nowhereBody.error.code },
        plain: { status: plain.status, code: plainBody.error.code },
        tooLarge: { status: tooLarge.status, code: envelopeOf(tooLarge).error.code },
        charset: { status: charset.status, text: charsetText },
        resetNoBody: { status: resetNoBody.status, text: resetNoBodyText },
        resetBody: { status: resetBody.status, text: resetBody.body },
        put: { status: put.status, allow: put.headers.get("allow"), code: putBody.error.code },
        faults: faults.list(),
        resets,
      };
    } finally {
      await server.close();
    }
  });

  assert.deepEqual(outcome, {
    value: {
      getReset: { status: 405, allow: "POST", code: "CONTROL_METHOD_NOT_ALLOWED" },
      nowhere: { status: 404, code: "CONTROL_NOT_FOUND" },
      plain: { status: 415, code: "CONTROL_UNSUPPORTED_MEDIA_TYPE" },
      tooLarge: { status: 413, code: "CONTROL_PAYLOAD_TOO_LARGE" },
      charset: { status: 204, text: "" },
      resetNoBody: { status: 204, text: "" },
      resetBody: { status: 204, text: "" },
      put: { status: 405, allow: "POST, DELETE", code: "CONTROL_METHOD_NOT_ALLOWED" },
      faults: [{ method: "GET", url: "/ok", status: 500 }],
      resets: 2,
    },
  });
});

test("C-2d6b948a chunked and declared large bodies are refused with 413 and connection close", async () => {
  const outcome = await attemptAsync(async () => {
    const faults = createFaultTable();
    const server = await startControlServer({
      port: 0,
      faults,
      reset: async () => undefined,
    });
    try {
      const chunks = Array.from({ length: 5 }, () => "a".repeat(1000));
      const chunked = await rawRequest(server.url, {
        method: "POST",
        path: "/faults",
        headers: { "content-type": "application/json", "transfer-encoding": "chunked" },
        chunks,
      });
      const declared = await rawRequest(server.url, {
        method: "POST",
        path: "/faults",
        headers: { "content-type": "application/json", "content-length": "5000" },
        body: "a".repeat(5000),
      });

      return {
        chunked: {
          status: chunked.status,
          connection: headerOf(chunked, "connection"),
          code: envelopeOf(chunked).error.code,
        },
        declared: {
          status: declared.status,
          connection: headerOf(declared, "connection"),
          code: envelopeOf(declared).error.code,
        },
        faults: faults.list(),
      };
    } finally {
      await server.close();
    }
  });

  assert.deepEqual(outcome, {
    value: {
      chunked: { status: 413, connection: "close", code: "CONTROL_PAYLOAD_TOO_LARGE" },
      declared: { status: 413, connection: "close", code: "CONTROL_PAYLOAD_TOO_LARGE" },
      faults: [],
    },
  });
});

test("C-14cae224 malformed fault JSON answers 400 FAULT_INVALID with reason bad_json and leaves the table unchanged", async () => {
  const outcome = await attemptAsync(async () => {
    const faults = createFaultTable();
    const server = await startControlServer({
      port: 0,
      faults,
      reset: async () => undefined,
    });
    try {
      const response = await fetch(`${server.url}/faults`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      });
      const body = await fetchedEnvelope(response);
      return {
        status: response.status,
        code: body.error.code,
        reason: body.error.details?.["reason"],
        cacheControl: response.headers.get("cache-control"),
        faults: faults.list(),
      };
    } finally {
      await server.close();
    }
  });

  assert.deepEqual(outcome, {
    value: {
      status: 400,
      code: "FAULT_INVALID",
      reason: "bad_json",
      cacheControl: "no-store",
      faults: [],
    },
  });
});

test("C-20bba381 a rejecting reset answers 500 with the engine envelope and the failing part", async () => {
  const outcome = await attemptAsync(async () => {
    const faults = createFaultTable();
    const server = await startControlServer({
      port: 0,
      faults,
      reset: async () => {
        throw new E2eStackError("STACK_RESET_FAILED", "seed failed", { part: "p2" });
      },
    });
    try {
      const response = await fetch(`${server.url}/reset`, { method: "POST" });
      const body = await fetchedEnvelope(response);
      return {
        status: response.status,
        code: body.error.code,
        details: body.error.details,
        cacheControl: response.headers.get("cache-control"),
      };
    } finally {
      await server.close();
    }
  });

  assert.deepEqual(outcome, {
    value: {
      status: 500,
      code: "STACK_RESET_FAILED",
      details: { part: "p2" },
      cacheControl: "no-store",
    },
  });
});
