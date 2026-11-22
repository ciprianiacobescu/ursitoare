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

function hm(method: string, extra: http.OutgoingHttpHeaders = {}): http.OutgoingHttpHeaders {
  return {
    host: "mcp.fake.test",
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    authorization: KEY,
    "mcp-protocol-version": "2026-07-28",
    "mcp-method": method,
    ...extra,
  };
}

function bm(method: string, params: Record<string, unknown>, id: number | null = 1): string {
  const message: Record<string, unknown> = {
    jsonrpc: "2.0",
    method,
    params: { ...params, _meta: { [M]: "2026-07-28" } },
  };
  if (id !== null) {
    message["id"] = id;
  }
  return JSON.stringify(message);
}

const INIT_BODY = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "c", version: "1" } },
});

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

const PROG = {
  jsonrpc: "2.0",
  method: "notifications/progress",
  params: { progressToken: "fake-progress", progress: 1, total: 1 },
};

function ev(x: unknown): string {
  return `event: message\ndata: ${JSON.stringify(x)}\n\n`;
}

const SSE = { sse: true, session: true } satisfies FakeMcpOptions;

function assertStream(reply: Reply): void {
  assert.equal(reply.status, 200);
  assert.match(String(reply.headers["content-type"]), /^text\/event-stream/);
  assert.equal(reply.headers["cache-control"], "no-cache");
  assert.equal(reply.headers["content-length"], undefined);
}

test("C-5a43c763 S1 a discover answer is an SSE stream with a progress event first", async () => {
  await withFake(SSE, async (origin) => {
    const reply = await post(origin, hm("server/discover"), bm("server/discover", {}));
    assertStream(reply);
    const result = {
      jsonrpc: "2.0",
      id: 1,
      result: {
        resultType: "complete",
        supportedVersions: ["2026-07-28", "2025-11-25"],
        capabilities: { tools: {} },
        _meta: { "io.modelcontextprotocol/serverInfo": { name: "fake-mcp", version: "1.0.0" } },
        ttlMs: 60000,
        cacheScope: "private",
      },
    };
    assert.equal(reply.body, ev(PROG) + ev(result));
  });
});

test("C-5a43c763 S3 an initialize answer is an SSE stream and keeps its session header", async () => {
  await withFake(SSE, async (origin) => {
    const reply = await post(
      origin,
      { host: "mcp.fake.test", "content-type": "application/json", authorization: KEY },
      INIT_BODY,
    );
    assertStream(reply);
    assert.equal(reply.headers["mcp-session-id"], "fake-mcp-session-1");
    const result = {
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-11-25",
        capabilities: { tools: {} },
        serverInfo: { name: "fake-mcp", version: "1.0.0" },
      },
    };
    assert.equal(reply.body, ev(PROG) + ev(result));
  });
});

test("C-5a43c763 S4 a 200 JSON-RPC error is an SSE stream too", async () => {
  await withFake(SSE, async (origin) => {
    const reply = await post(
      origin,
      hm("tools/call", { "mcp-name": "nope" }),
      bm("tools/call", { name: "nope", arguments: {} }),
    );
    assertStream(reply);
    const error = { jsonrpc: "2.0", id: 1, error: { code: -32602, message: "Unknown tool: nope" } };
    assert.equal(reply.body, ev(PROG) + ev(error));
  });
});

test("C-5a43c763 S5 refusals and a notification stay JSON under sse", async () => {
  await withFake(SSE, async (origin) => {
    const noKey = hm("server/discover");
    delete noKey["authorization"];
    const unauthorized = await post(origin, noKey, bm("server/discover", {}));
    assert.equal(unauthorized.status, 401);
    assert.match(String(unauthorized.headers["content-type"]), /^application\/json/);
    assert.deepEqual(JSON.parse(unauthorized.body), { error: "unauthorized" });

    const mismatch = await post(origin, hm("tools/list"), bm("server/discover", {}));
    assert.equal(mismatch.status, 400);
    assert.match(String(mismatch.headers["content-type"]), /^application\/json/);
    assert.deepEqual(JSON.parse(mismatch.body), {
      jsonrpc: "2.0",
      id: 1,
      error: {
        code: -32020,
        message: "Header mismatch: Mcp-Method header value 'tools/list' does not match body value 'server/discover'",
      },
    });

    const notified = await post(origin, hm("notifications/cancelled"), bm("notifications/cancelled", { requestId: 1 }, null));
    assert.equal(notified.status, 202);
    assert.equal(notified.body, "");

    // a streamed answer proves the option is live, so the JSON rows above are not vacuous
    const streamed = await post(origin, hm("server/discover"), bm("server/discover", {}));
    assertStream(streamed);
  });
});
