import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import { startFakeMcp } from "./index.ts";

const KEY = "Bearer k-mcp-7f3a";

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

function hl(version?: string): http.OutgoingHttpHeaders {
  const headers: http.OutgoingHttpHeaders = {
    host: "mcp.fake.test",
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    authorization: KEY,
  };
  if (version !== undefined) {
    headers["mcp-protocol-version"] = version;
  }
  return headers;
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

const TOOLS_LIST = [
  {
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
  },
  {
    name: "log_note",
    inputSchema: { type: "object", properties: { note: { type: "string" } }, required: ["note"] },
    annotations: { readOnlyHint: false, idempotentHint: true },
  },
];

test("C-5de3e5f2 G1 initialize echoes 2025-11-25 and issues no session", async () => {
  const mcp = await startFakeMcp();
  try {
    const reply = await post(mcp.origin, hl(), init("2025-11-25"));
    assert.equal(reply.status, 200);
    assert.deepEqual(JSON.parse(reply.body), initResult("2025-11-25"));
    assert.equal(reply.headers["mcp-session-id"], undefined);
  } finally {
    await mcp.close();
  }
});

test("C-5de3e5f2 G2 initialize echoes 2025-06-18 and 2025-03-26 and falls back to 2025-11-25", async () => {
  const mcp = await startFakeMcp();
  try {
    const cases: [string, string][] = [
      ["2025-06-18", "2025-06-18"],
      ["2025-03-26", "2025-03-26"],
      ["2024-11-05", "2025-11-25"],
    ];
    for (const [asked, answered] of cases) {
      const reply = await post(mcp.origin, hl(), init(asked));
      assert.equal(reply.status, 200);
      assert.deepEqual(JSON.parse(reply.body), initResult(answered));
    }
  } finally {
    await mcp.close();
  }
});

test("C-5de3e5f2 G3 the initialized notification is 202 and empty", async () => {
  const mcp = await startFakeMcp();
  try {
    const reply = await post(mcp.origin, hl("2025-11-25"), bl("notifications/initialized", undefined, null));
    assert.equal(reply.status, 202);
    assert.equal(reply.body, "");
  } finally {
    await mcp.close();
  }
});

test("C-5de3e5f2 G4 tools/list answers on a fresh fake with no resultType", async () => {
  const mcp = await startFakeMcp();
  try {
    const reply = await post(mcp.origin, hl("2025-11-25"), bl("tools/list", undefined, 2));
    assert.equal(reply.status, 200);
    assert.deepEqual(JSON.parse(reply.body), { jsonrpc: "2.0", id: 2, result: { tools: TOOLS_LIST } });
  } finally {
    await mcp.close();
  }
});

test("C-5de3e5f2 G5 tools/call answers on a fresh fake with no resultType", async () => {
  const mcp = await startFakeMcp();
  try {
    const vendor = { vendor_id: "V-ACME", status: "active" };
    const reply = await post(
      mcp.origin,
      hl("2025-06-18"),
      bl("tools/call", { name: "find_vendor", arguments: { vendor_name: "Acme GmbH" } }, 3),
    );
    assert.equal(reply.status, 200);
    assert.deepEqual(JSON.parse(reply.body), {
      jsonrpc: "2.0",
      id: 3,
      result: { content: [{ type: "text", text: JSON.stringify(vendor) }], structuredContent: vendor },
    });
  } finally {
    await mcp.close();
  }
});

test("C-5de3e5f2 G6 a missing, modern or old version header is 400 -32600", async () => {
  const mcp = await startFakeMcp();
  try {
    for (const version of [undefined, "2026-07-28", "2024-11-05"]) {
      const reply = await post(mcp.origin, hl(version), bl("tools/list", undefined, 2));
      assert.equal(reply.status, 400);
      assert.deepEqual(JSON.parse(reply.body), {
        jsonrpc: "2.0",
        id: 2,
        error: { code: -32600, message: "Missing or unsupported MCP-Protocol-Version header" },
      });
    }
  } finally {
    await mcp.close();
  }
});

test("C-5de3e5f2 G7 unknown method, tool and server/discover are 200 errors", async () => {
  const mcp = await startFakeMcp();
  try {
    const cases: [string, Record<string, unknown> | undefined, number, number, string][] = [
      ["ping2", undefined, 4, -32601, "Method not found: ping2"],
      ["tools/call", { name: "nope" }, 5, -32602, "Unknown tool: nope"],
      ["server/discover", undefined, 6, -32601, "Method not found: server/discover"],
    ];
    for (const [method, params, id, code, message] of cases) {
      const reply = await post(mcp.origin, hl("2025-11-25"), bl(method, params, id));
      assert.equal(reply.status, 200);
      assert.deepEqual(JSON.parse(reply.body), { jsonrpc: "2.0", id, error: { code, message } });
    }
  } finally {
    await mcp.close();
  }
});
