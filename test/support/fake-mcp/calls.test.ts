import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import type { FakeMcp, FakeMcpOptions, FakeMcpTool } from "./index.ts";
import { startFakeMcp } from "./index.ts";

assert.equal(typeof startFakeMcp, "function");

const M = "io.modelcontextprotocol/protocolVersion";
const KEY = "Bearer k-mcp-7f3a";

const V_ACME = { vendor_id: "V-ACME", status: "active" };
const V_UNK = { vendor_id: "V-UNKNOWN", status: "unknown" };

const BOOM: FakeMcpTool = {
  name: "boom",
  inputSchema: { type: "object" },
  result: () => ({ text: "boom", isError: true, structuredContent: { code: 7 } }),
};

const FINE: FakeMcpTool = {
  name: "fine",
  inputSchema: { type: "object" },
  result: () => ({ text: "ok", isError: false }),
};

interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function bm(method: string, params: Record<string, unknown>, id: number = 1): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id,
    method,
    params: {
      ...params,
      _meta: {
        [M]: "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": {},
      },
    },
  });
}

function hm(method: string, name?: string): http.OutgoingHttpHeaders {
  const headers: http.OutgoingHttpHeaders = {
    host: "mcp.fake.test",
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    authorization: KEY,
    "mcp-protocol-version": "2026-07-28",
    "mcp-method": method,
  };
  if (name !== undefined) {
    headers["mcp-name"] = name;
  }
  return headers;
}

function post(
  base: string,
  path: string,
  headers: http.OutgoingHttpHeaders,
  body: string,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request(
      { host: url.hostname, port: url.port, method: "POST", path, headers, agent: false },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

function ok(result: unknown, id: number = 1): unknown {
  return { jsonrpc: "2.0", id, result };
}

function err(code: number, message: string, id: number = 1): unknown {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function start(opts?: FakeMcpOptions): Promise<FakeMcp> {
  let started: FakeMcp | undefined;
  await assert.doesNotReject(async () => {
    started = await startFakeMcp(opts);
  });
  assert.ok(started !== undefined, "the fake started");
  return started;
}

function callBody(name: string, args?: unknown): string {
  const params: Record<string, unknown> = { name };
  if (args !== undefined) {
    params["arguments"] = args;
  }
  return bm("tools/call", params);
}

test("C-5c007fd0 C1 and C2 find_vendor answers a known and an unknown vendor", async () => {
  const fake = await start();
  try {
    const known = await post(
      fake.origin,
      "/mcp",
      hm("tools/call", "find_vendor"),
      callBody("find_vendor", { vendor_name: "Acme GmbH" }),
    );
    assert.equal(known.status, 200);
    assert.deepEqual(
      JSON.parse(known.body),
      ok({
        resultType: "complete",
        content: [{ type: "text", text: JSON.stringify(V_ACME) }],
        structuredContent: V_ACME,
      }),
    );

    const unknown = await post(
      fake.origin,
      "/mcp",
      hm("tools/call", "find_vendor"),
      callBody("find_vendor", { vendor_name: "Globex" }),
    );
    assert.equal(unknown.status, 200);
    assert.deepEqual(
      JSON.parse(unknown.body),
      ok({
        resultType: "complete",
        content: [{ type: "text", text: JSON.stringify(V_UNK) }],
        structuredContent: V_UNK,
      }),
    );
  } finally {
    await fake.close();
  }
});

test("C-5c007fd0 C3 and C4 log_note answers and defaults missing arguments", async () => {
  const fake = await start();
  try {
    const noted = await post(
      fake.origin,
      "/mcp",
      hm("tools/call", "log_note"),
      callBody("log_note", { note: "hello" }),
    );
    assert.equal(noted.status, 200);
    assert.deepEqual(
      JSON.parse(noted.body),
      ok({
        resultType: "complete",
        content: [{ type: "text", text: "noted: hello" }],
      }),
    );

    const missing = await post(
      fake.origin,
      "/mcp",
      hm("tools/call", "log_note"),
      callBody("log_note"),
    );
    assert.equal(missing.status, 200);
    assert.deepEqual(
      JSON.parse(missing.body),
      ok({
        resultType: "complete",
        content: [{ type: "text", text: "noted: undefined" }],
      }),
    );
  } finally {
    await fake.close();
  }
});

test("C-5c007fd0 C5 a base64 mcp-name sentinel is accepted", async () => {
  const fake = await start();
  try {
    const reply = await post(
      fake.origin,
      "/mcp",
      hm("tools/call", "=?base64?ZmluZF92ZW5kb3I=?="),
      callBody("find_vendor", { vendor_name: "Acme GmbH" }),
    );
    assert.equal(reply.status, 200);
    assert.deepEqual(
      JSON.parse(reply.body),
      ok({
        resultType: "complete",
        content: [{ type: "text", text: JSON.stringify(V_ACME) }],
        structuredContent: V_ACME,
      }),
    );
  } finally {
    await fake.close();
  }
});

test("C-5c007fd0 C6 and C7 an unknown tool and non-object arguments are -32602", async () => {
  const fake = await start();
  try {
    const unknown = await post(
      fake.origin,
      "/mcp",
      hm("tools/call", "nope"),
      callBody("nope", {}),
    );
    assert.equal(unknown.status, 200);
    assert.deepEqual(JSON.parse(unknown.body), err(-32602, "Unknown tool: nope"));

    const badArguments = await post(
      fake.origin,
      "/mcp",
      hm("tools/call", "log_note"),
      callBody("log_note", []),
    );
    assert.equal(badArguments.status, 200);
    assert.deepEqual(
      JSON.parse(badArguments.body),
      err(-32602, "Invalid params: arguments must be an object"),
    );
  } finally {
    await fake.close();
  }
});

test("C-5c007fd0 C8 isError is present exactly when the result sets it", async () => {
  const fake = await start({ tools: [BOOM, FINE] });
  try {
    const boom = await post(
      fake.origin,
      "/mcp",
      hm("tools/call", "boom"),
      callBody("boom", {}),
    );
    assert.equal(boom.status, 200);
    assert.deepEqual(
      JSON.parse(boom.body),
      ok({
        resultType: "complete",
        content: [{ type: "text", text: "boom" }],
        structuredContent: { code: 7 },
        isError: true,
      }),
    );

    const fine = await post(
      fake.origin,
      "/mcp",
      hm("tools/call", "fine"),
      callBody("fine", {}),
    );
    assert.equal(fine.status, 200);
    assert.deepEqual(
      JSON.parse(fine.body),
      ok({
        resultType: "complete",
        content: [{ type: "text", text: "ok" }],
        isError: false,
      }),
    );
  } finally {
    await fake.close();
  }
});
