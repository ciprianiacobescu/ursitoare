import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import type { FakeMcp, FakeMcpOptions, FakeMcpTool } from "./index.ts";
import { startFakeMcp } from "./index.ts";

assert.equal(typeof startFakeMcp, "function");

const M = "io.modelcontextprotocol/protocolVersion";
const KEY = "Bearer k-mcp-7f3a";

const T_FIND = {
  name: "find_vendor",
  inputSchema: {
    type: "object",
    properties: { vendor_name: { type: "string", minLength: 1 } },
    required: ["vendor_name"],
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: { vendor_id: { type: "string" }, status: { type: "string" } },
    required: ["vendor_id", "status"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
};

const T_LOG = {
  name: "log_note",
  inputSchema: {
    type: "object",
    properties: { note: { type: "string" } },
    required: ["note"],
  },
  annotations: { readOnlyHint: false, idempotentHint: true },
};

const HDR_ENTRY = {
  name: "route_ticket",
  description: "Route a ticket",
  inputSchema: {
    type: "object",
    properties: {
      region: { type: "string", "x-mcp-header": "Region" },
      ticket: { type: "string" },
    },
    required: ["region", "ticket"],
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
};

const FIND_TOOL: FakeMcpTool = {
  ...T_FIND,
  result: () => ({ text: "" }),
};

const LOG_TOOL: FakeMcpTool = {
  ...T_LOG,
  result: () => ({ text: "" }),
};

const HDR_TOOL: FakeMcpTool = {
  ...HDR_ENTRY,
  result: () => ({ text: "routed" }),
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

function hm(method: string): http.OutgoingHttpHeaders {
  return {
    host: "mcp.fake.test",
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    authorization: KEY,
    "mcp-protocol-version": "2026-07-28",
    "mcp-method": method,
  };
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

function err(code: number, message: string, id: number | null = 1): unknown {
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

test("C-9713619c D1 server discover advertises the dual era", async () => {
  const fake = await start();
  try {
    const reply = await post(
      fake.origin,
      "/mcp",
      hm("server/discover"),
      bm("server/discover", {}),
    );
    assert.equal(reply.status, 200);
    assert.deepEqual(
      JSON.parse(reply.body),
      ok({
        resultType: "complete",
        supportedVersions: ["2026-07-28", "2025-11-25"],
        capabilities: { tools: {} },
        _meta: {
          "io.modelcontextprotocol/serverInfo": { name: "fake-mcp", version: "1.0.0" },
        },
        ttlMs: 60000,
        cacheScope: "private",
      }),
    );
  } finally {
    await fake.close();
  }
});

test("C-9713619c D2 a modern-only server advertises only the modern version", async () => {
  const fake = await start({ era: "modern" });
  try {
    const reply = await post(
      fake.origin,
      "/mcp",
      hm("server/discover"),
      bm("server/discover", {}),
    );
    assert.equal(reply.status, 200);
    assert.deepEqual(
      JSON.parse(reply.body),
      ok({
        resultType: "complete",
        supportedVersions: ["2026-07-28"],
        capabilities: { tools: {} },
        _meta: {
          "io.modelcontextprotocol/serverInfo": { name: "fake-mcp", version: "1.0.0" },
        },
        ttlMs: 60000,
        cacheScope: "private",
      }),
    );
  } finally {
    await fake.close();
  }
});

test("C-9713619c L1 tools list serves the two fixtures in one page", async () => {
  const fake = await start();
  try {
    const reply = await post(fake.origin, "/mcp", hm("tools/list"), bm("tools/list", {}));
    assert.equal(reply.status, 200);
    assert.deepEqual(
      JSON.parse(reply.body),
      ok({
        resultType: "complete",
        tools: [T_FIND, T_LOG],
        ttlMs: 60000,
        cacheScope: "private",
      }),
    );
  } finally {
    await fake.close();
  }
});

test("C-9713619c L2 tools list pages by cursor and carries x-mcp-header verbatim", async () => {
  const fake = await start({ pageSize: 1, tools: [FIND_TOOL, LOG_TOOL, HDR_TOOL] });
  try {
    const first = await post(fake.origin, "/mcp", hm("tools/list"), bm("tools/list", {}));
    assert.equal(first.status, 200);
    assert.deepEqual(
      JSON.parse(first.body),
      ok({
        resultType: "complete",
        tools: [T_FIND],
        nextCursor: "page-1",
        ttlMs: 60000,
        cacheScope: "private",
      }),
    );

    const second = await post(
      fake.origin,
      "/mcp",
      hm("tools/list"),
      bm("tools/list", { cursor: "page-1" }),
    );
    assert.equal(second.status, 200);
    assert.deepEqual(
      JSON.parse(second.body),
      ok({
        resultType: "complete",
        tools: [T_LOG],
        nextCursor: "page-2",
        ttlMs: 60000,
        cacheScope: "private",
      }),
    );

    const third = await post(
      fake.origin,
      "/mcp",
      hm("tools/list"),
      bm("tools/list", { cursor: "page-2" }),
    );
    assert.equal(third.status, 200);
    assert.deepEqual(
      JSON.parse(third.body),
      ok({
        resultType: "complete",
        tools: [HDR_ENTRY],
        ttlMs: 60000,
        cacheScope: "private",
      }),
    );

    const restart = await post(
      fake.origin,
      "/mcp",
      hm("tools/list"),
      bm("tools/list", { cursor: "page-0" }),
    );
    assert.equal(restart.status, 200);
    assert.deepEqual(
      JSON.parse(restart.body),
      ok({
        resultType: "complete",
        tools: [T_FIND],
        nextCursor: "page-1",
        ttlMs: 60000,
        cacheScope: "private",
      }),
    );
  } finally {
    await fake.close();
  }
});

test("C-9713619c L3 invalid cursors are -32602 with HTTP 200", async () => {
  const fake = await start({ pageSize: 1, tools: [FIND_TOOL, LOG_TOOL, HDR_TOOL] });
  try {
    for (const cursor of ["bogus", "page-3", "page-01", 7]) {
      const reply = await post(
        fake.origin,
        "/mcp",
        hm("tools/list"),
        bm("tools/list", { cursor }),
      );
      assert.equal(reply.status, 200, `cursor ${String(cursor)} is a 200`);
      assert.deepEqual(
        JSON.parse(reply.body),
        err(-32602, "Invalid cursor"),
        `cursor ${String(cursor)} is refused`,
      );
    }
  } finally {
    await fake.close();
  }
});
