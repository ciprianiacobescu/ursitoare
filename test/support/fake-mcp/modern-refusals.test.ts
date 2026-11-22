import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import type { FakeMcp, FakeMcpOptions } from "./index.ts";
import { startFakeMcp } from "./index.ts";

assert.equal(typeof startFakeMcp, "function");

const M = "io.modelcontextprotocol/protocolVersion";
const KEY = "Bearer k-mcp-7f3a";
const MODERN = "2026-07-28";

interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function bm(
  method: string,
  params: Record<string, unknown>,
  id: number = 1,
  version: string = MODERN,
): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id,
    method,
    params: {
      ...params,
      _meta: {
        [M]: version,
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
    "mcp-protocol-version": MODERN,
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

function err(code: number, message: string, id: number | null = 1, data?: unknown): unknown {
  const error: Record<string, unknown> = { code, message };
  if (data !== undefined) {
    error["data"] = data;
  }
  return { jsonrpc: "2.0", id, error };
}

async function start(opts?: FakeMcpOptions): Promise<FakeMcp> {
  let started: FakeMcp | undefined;
  await assert.doesNotReject(async () => {
    started = await startFakeMcp(opts);
  });
  assert.ok(started !== undefined, "the fake started");
  return started;
}

test("C-285c5703 H1 to H4 MCP-Protocol-Version and Mcp-Method mismatches are 400 -32020", async () => {
  const fake = await start();
  try {
    const missingVersion = hm("server/discover");
    delete missingVersion["mcp-protocol-version"];
    const h1 = await post(fake.origin, "/mcp", missingVersion, bm("server/discover", {}));
    assert.equal(h1.status, 400);
    assert.deepEqual(
      JSON.parse(h1.body),
      err(-32020, "Header mismatch: MCP-Protocol-Version header is missing"),
    );

    const wrongVersion = hm("server/discover");
    wrongVersion["mcp-protocol-version"] = "2025-11-25";
    const h2 = await post(fake.origin, "/mcp", wrongVersion, bm("server/discover", {}));
    assert.equal(h2.status, 400);
    assert.deepEqual(
      JSON.parse(h2.body),
      err(
        -32020,
        "Header mismatch: MCP-Protocol-Version header value '2025-11-25' does not match body value '2026-07-28'",
      ),
    );

    const missingMethod = hm("server/discover");
    delete missingMethod["mcp-method"];
    const h3 = await post(fake.origin, "/mcp", missingMethod, bm("server/discover", {}));
    assert.equal(h3.status, 400);
    assert.deepEqual(
      JSON.parse(h3.body),
      err(-32020, "Header mismatch: Mcp-Method header is missing"),
    );

    const h4 = await post(
      fake.origin,
      "/mcp",
      hm("tools/list"),
      bm("server/discover", {}),
    );
    assert.equal(h4.status, 400);
    assert.deepEqual(
      JSON.parse(h4.body),
      err(
        -32020,
        "Header mismatch: Mcp-Method header value 'tools/list' does not match body value 'server/discover'",
      ),
    );
  } finally {
    await fake.close();
  }
});

test("C-285c5703 H5 to H7 Mcp-Name missing, mismatched and invalid sentinel are 400 -32020", async () => {
  const fake = await start();
  try {
    const body = bm("tools/call", { name: "find_vendor", arguments: {} });

    const missing = hm("tools/call");
    const h5 = await post(fake.origin, "/mcp", missing, body);
    assert.equal(h5.status, 400);
    assert.deepEqual(
      JSON.parse(h5.body),
      err(-32020, "Header mismatch: Mcp-Name header is missing"),
    );

    const h6 = await post(fake.origin, "/mcp", hm("tools/call", "log_note"), body);
    assert.equal(h6.status, 400);
    assert.deepEqual(
      JSON.parse(h6.body),
      err(
        -32020,
        "Header mismatch: Mcp-Name header value 'log_note' does not match body value 'find_vendor'",
      ),
    );

    const h7 = await post(
      fake.origin,
      "/mcp",
      hm("tools/call", "=?base64?literal?="),
      body,
    );
    assert.equal(h7.status, 400);
    assert.deepEqual(
      JSON.parse(h7.body),
      err(
        -32020,
        "Header mismatch: Mcp-Name header value '=?base64?literal?=' does not match body value 'find_vendor'",
      ),
    );
  } finally {
    await fake.close();
  }
});

test("C-285c5703 H8 and H9 an unsupported version is 400 -32022 with data", async () => {
  const dual = await start();
  try {
    const oldHeaders = hm("server/discover");
    oldHeaders["mcp-protocol-version"] = "1900-01-01";
    const h8a = await post(
      dual.origin,
      "/mcp",
      oldHeaders,
      bm("server/discover", {}, 1, "1900-01-01"),
    );
    assert.equal(h8a.status, 400);
    assert.deepEqual(
      JSON.parse(h8a.body),
      err(-32022, "Unsupported protocol version", 1, {
        supported: ["2026-07-28", "2025-11-25"],
        requested: "1900-01-01",
      }),
    );

    const legacyHeaders = hm("server/discover");
    legacyHeaders["mcp-protocol-version"] = "2025-11-25";
    const h8b = await post(
      dual.origin,
      "/mcp",
      legacyHeaders,
      bm("server/discover", {}, 1, "2025-11-25"),
    );
    assert.equal(h8b.status, 400);
    assert.deepEqual(
      JSON.parse(h8b.body),
      err(-32022, "Unsupported protocol version", 1, {
        supported: ["2026-07-28", "2025-11-25"],
        requested: "2025-11-25",
      }),
    );
  } finally {
    await dual.close();
  }

  const modern = await start({ era: "modern" });
  try {
    const headers = hm("server/discover");
    headers["mcp-protocol-version"] = "1900-01-01";
    const h9 = await post(
      modern.origin,
      "/mcp",
      headers,
      bm("server/discover", {}, 1, "1900-01-01"),
    );
    assert.equal(h9.status, 400);
    assert.deepEqual(
      JSON.parse(h9.body),
      err(-32022, "Unsupported protocol version", 1, {
        supported: ["2026-07-28"],
        requested: "1900-01-01",
      }),
    );
  } finally {
    await modern.close();
  }
});

test("C-285c5703 H10 N1 and N2 an unknown method 404 and notifications 202 or -32020", async () => {
  const fake = await start();
  try {
    const h10 = await post(
      fake.origin,
      "/mcp",
      hm("nope/unknown"),
      bm("nope/unknown", {}),
    );
    assert.equal(h10.status, 404);
    assert.deepEqual(
      JSON.parse(h10.body),
      err(-32601, "Method not found: nope/unknown"),
    );

    const notification = JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/cancelled",
      params: {
        requestId: 1,
        _meta: { [M]: MODERN },
      },
    });
    const n1 = await post(
      fake.origin,
      "/mcp",
      hm("notifications/cancelled"),
      notification,
    );
    assert.equal(n1.status, 202);
    assert.equal(n1.body, "");

    const noMethod = hm("notifications/cancelled");
    delete noMethod["mcp-method"];
    const n2 = await post(fake.origin, "/mcp", noMethod, notification);
    assert.equal(n2.status, 400);
    assert.deepEqual(
      JSON.parse(n2.body),
      err(-32020, "Header mismatch: Mcp-Method header is missing", null),
    );
  } finally {
    await fake.close();
  }
});
