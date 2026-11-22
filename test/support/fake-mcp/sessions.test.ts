import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import type { FakeMcpOptions } from "./index.ts";
import { startFakeMcp } from "./index.ts";

const KEY = "Bearer k-mcp-7f3a";
const M = "io.modelcontextprotocol/protocolVersion";

interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function bl(method: string, params: Record<string, unknown> | undefined, id: number | null = 1): string {
  const message: Record<string, unknown> = { jsonrpc: "2.0", method };
  if (id !== null) {
    message["id"] = id;
  }
  if (params !== undefined) {
    message["params"] = params;
  }
  return JSON.stringify(message);
}

function init(version: string): string {
  return bl("initialize", {
    protocolVersion: version,
    capabilities: {},
    clientInfo: { name: "c", version: "1" },
  });
}

function hl(version?: string, extra: http.OutgoingHttpHeaders = {}): http.OutgoingHttpHeaders {
  const headers: http.OutgoingHttpHeaders = {
    host: "mcp.fake.test",
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    authorization: KEY,
    ...extra,
  };
  if (version !== undefined) {
    headers["mcp-protocol-version"] = version;
  }
  return headers;
}

const D1_BODY = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "server/discover",
  params: { _meta: { [M]: "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {} } },
});

function d1Headers(extra: http.OutgoingHttpHeaders = {}): http.OutgoingHttpHeaders {
  return hl("2026-07-28", { "mcp-method": "server/discover", ...extra });
}

function d1Result(versions: string[]): unknown {
  return {
    jsonrpc: "2.0",
    id: 1,
    result: {
      resultType: "complete",
      supportedVersions: versions,
      capabilities: { tools: {} },
      _meta: { "io.modelcontextprotocol/serverInfo": { name: "fake-mcp", version: "1.0.0" } },
      ttlMs: 60000,
      cacheScope: "private",
    },
  };
}

function initResult(version: string, id = 1): unknown {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: version,
      capabilities: { tools: {} },
      serverInfo: { name: "fake-mcp", version: "1.0.0" },
    },
  };
}

function post(base: string, headers: http.OutgoingHttpHeaders, body: string): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request(
      { host: url.hostname, port: url.port, method: "POST", path: "/mcp", headers, agent: false },
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

async function withFake(opts: FakeMcpOptions, fn: (origin: string) => Promise<void>): Promise<void> {
  const mcp = await startFakeMcp(opts);
  try {
    await fn(mcp.origin);
  } finally {
    await mcp.close();
  }
}

const LIST_TOOLS_NAMES = ["find_vendor", "log_note"];

test("C-19bb5be6 X1 initialize issues fake-mcp-session-1 then -2", async () => {
  await withFake({ session: true }, async (origin) => {
    const first = await post(origin, hl(), init("2025-11-25"));
    assert.equal(first.status, 200);
    assert.deepEqual(JSON.parse(first.body), initResult("2025-11-25"));
    assert.equal(first.headers["mcp-session-id"], "fake-mcp-session-1");
    const second = await post(origin, hl(), init("2025-11-25"));
    assert.equal(second.headers["mcp-session-id"], "fake-mcp-session-2");
  });
});

test("C-19bb5be6 X2 tools/list needs a known session", async () => {
  await withFake({ session: true }, async (origin) => {
    await post(origin, hl(), init("2025-11-25"));
    await post(origin, hl(), init("2025-11-25"));
    const request = bl("tools/list", undefined, 2);
    const missing = await post(origin, hl("2025-11-25"), request);
    assert.equal(missing.status, 400);
    assert.deepEqual(JSON.parse(missing.body), {
      jsonrpc: "2.0",
      id: 2,
      error: { code: -32600, message: "Missing Mcp-Session-Id header" },
    });
    const unknown = await post(origin, hl("2025-11-25", { "mcp-session-id": "fake-mcp-session-9" }), request);
    assert.equal(unknown.status, 404);
    assert.deepEqual(JSON.parse(unknown.body), {
      jsonrpc: "2.0",
      id: 2,
      error: { code: -32600, message: "Unknown session" },
    });
    const known = await post(origin, hl("2025-11-25", { "mcp-session-id": "fake-mcp-session-1" }), request);
    assert.equal(known.status, 200);
    const parsed = JSON.parse(known.body) as { result: { tools: { name: string }[] } };
    assert.deepEqual(
      parsed.result.tools.map((tool) => tool.name),
      LIST_TOOLS_NAMES,
    );
  });
});

test("C-19bb5be6 X3 the notification needs a session too", async () => {
  await withFake({ session: true }, async (origin) => {
    await post(origin, hl(), init("2025-11-25"));
    await post(origin, hl(), init("2025-11-25"));
    const request = bl("notifications/initialized", undefined, null);
    const missing = await post(origin, hl("2025-11-25"), request);
    assert.equal(missing.status, 400);
    assert.deepEqual(JSON.parse(missing.body), {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600, message: "Missing Mcp-Session-Id header" },
    });
    const known = await post(origin, hl("2025-11-25", { "mcp-session-id": "fake-mcp-session-2" }), request);
    assert.equal(known.status, 202);
    assert.equal(known.body, "");
  });
});

test("C-19bb5be6 X4 a modern message never needs or gets a session", async () => {
  await withFake({ session: true }, async (origin) => {
    const handshake = await post(origin, hl(), init("2025-11-25"));
    assert.equal(handshake.headers["mcp-session-id"], "fake-mcp-session-1");
    const plain = await post(origin, d1Headers(), D1_BODY);
    assert.equal(plain.status, 200);
    assert.deepEqual(JSON.parse(plain.body), d1Result(["2026-07-28", "2025-11-25"]));
    assert.equal(plain.headers["mcp-session-id"], undefined);
    const odd = await post(origin, d1Headers({ "mcp-session-id": "nonsense" }), D1_BODY);
    assert.equal(odd.status, 200);
    assert.deepEqual(JSON.parse(odd.body), d1Result(["2026-07-28", "2025-11-25"]));
    assert.equal(odd.headers["mcp-session-id"], undefined);
  });
});

test("C-19bb5be6 X6 a legacy-only fake with session issues fake-mcp-session-1", async () => {
  await withFake({ era: "legacy", session: true }, async (origin) => {
    const reply = await post(origin, hl(), init("2025-11-25"));
    assert.equal(reply.status, 200);
    assert.deepEqual(JSON.parse(reply.body), initResult("2025-11-25"));
    assert.equal(reply.headers["mcp-session-id"], "fake-mcp-session-1");
  });
});

test("C-19bb5be6 E1 a modern-only fake refuses legacy messages with -32020", async () => {
  await withFake({ era: "modern" }, async (origin) => {
    const message =
      "This server speaks MCP 2026-07-28 only (no initialize handshake); supported versions: 2026-07-28";
    const first = await post(origin, hl(), init("2025-11-25"));
    assert.equal(first.status, 400);
    assert.deepEqual(JSON.parse(first.body), {
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32020, message },
    });
    const second = await post(origin, hl("2025-11-25"), bl("tools/list", undefined, 2));
    assert.equal(second.status, 400);
    assert.deepEqual(JSON.parse(second.body), {
      jsonrpc: "2.0",
      id: 2,
      error: { code: -32020, message },
    });
    const discover = await post(origin, d1Headers(), D1_BODY);
    assert.equal(discover.status, 200);
    assert.deepEqual(JSON.parse(discover.body), d1Result(["2026-07-28"]));
  });
});

test("C-19bb5be6 E2 a legacy-only fake answers a modern message with an empty 400", async () => {
  await withFake({ era: "legacy" }, async (origin) => {
    const discover = await post(origin, d1Headers(), D1_BODY);
    assert.equal(discover.status, 400);
    assert.equal(discover.body, "");
    assert.equal(discover.headers["content-type"], undefined);
    assert.equal(discover.headers["content-length"], "0");
    const handshake = await post(origin, hl(), init("2025-11-25"));
    assert.equal(handshake.status, 200);
    assert.deepEqual(JSON.parse(handshake.body), initResult("2025-11-25"));
    const list = await post(origin, hl("2025-11-25"), bl("tools/list", undefined, 2));
    assert.equal(list.status, 200);
    const parsed = JSON.parse(list.body) as { result: { tools: { name: string }[]; resultType?: string } };
    assert.deepEqual(
      parsed.result.tools.map((tool) => tool.name),
      LIST_TOOLS_NAMES,
    );
    assert.equal(parsed.result.resultType, undefined);
  });
});
