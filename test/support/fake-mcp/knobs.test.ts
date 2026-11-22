import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import type { FakeMcp, FakeMcpOptions, FakeMcpTool } from "./index.ts";
import { FAKE_MCP_TOOLS, startFakeMcp } from "./index.ts";

assert.equal(typeof startFakeMcp, "function");

const M = "io.modelcontextprotocol/protocolVersion";
const KEY = "Bearer k-mcp-7f3a";
const MODERN = "2026-07-28";

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

const LOG_TOOL: FakeMcpTool = {
  ...T_LOG,
  result: () => ({ text: "" }),
};

const HDR_TOOL: FakeMcpTool = {
  ...HDR_ENTRY,
  result: () => ({ text: "routed" }),
};

const EMPTY_TOOL: FakeMcpTool = {
  name: "",
  inputSchema: { type: "object" },
  result: () => ({ text: "" }),
};

const D1_RESULT = {
  resultType: "complete",
  supportedVersions: ["2026-07-28", "2025-11-25"],
  capabilities: { tools: {} },
  _meta: {
    "io.modelcontextprotocol/serverInfo": { name: "fake-mcp", version: "1.0.0" },
  },
  ttlMs: 60000,
  cacheScope: "private",
};

const C3_RESULT = {
  resultType: "complete",
  content: [{ type: "text", text: "noted: hello" }],
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
        [M]: MODERN,
        "io.modelcontextprotocol/clientCapabilities": {},
      },
    },
  });
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

function post(
  base: string,
  headers: http.OutgoingHttpHeaders,
  body: string,
  path = "/mcp",
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

function callBody(name: string, args?: unknown): string {
  const params: Record<string, unknown> = { name };
  if (args !== undefined) {
    params["arguments"] = args;
  }
  return bm("tools/call", params);
}

function ok(result: unknown, id: number = 1): unknown {
  return { jsonrpc: "2.0", id, result };
}

async function start(opts?: FakeMcpOptions): Promise<FakeMcp> {
  let started: FakeMcp | undefined;
  await assert.doesNotReject(async () => {
    started = await startFakeMcp(opts);
  });
  assert.ok(started !== undefined, "the fake started");
  return started;
}

function succeeds(action: () => void, label: string): void {
  let error: unknown;
  try {
    action();
  } catch (caught) {
    error = caught;
  }
  assert.equal(error, undefined, `${label} returned an error: ${String(error)}`);
}

test("C-0357da28 K1 failNext fails the next matching messages and records them", async () => {
  const mcp = await start();
  try {
    succeeds(() => mcp.failNext("tools/call", 503, 2), "failNext");

    const first = await post(mcp.origin, hm("tools/call", "log_note"), callBody("log_note", { note: "hello" }));
    assert.equal(first.status, 503);
    assert.deepEqual(JSON.parse(first.body), { error: "injected_failure", status: 503 });

    const middle = await post(mcp.origin, hm("server/discover"), bm("server/discover", {}));
    assert.equal(middle.status, 200);
    assert.deepEqual(JSON.parse(middle.body), ok(D1_RESULT));

    const third = await post(mcp.origin, hm("tools/call", "log_note"), callBody("log_note", { note: "hello" }));
    assert.equal(third.status, 503);
    assert.deepEqual(JSON.parse(third.body), { error: "injected_failure", status: 503 });

    const fourth = await post(mcp.origin, hm("tools/call", "log_note"), callBody("log_note", { note: "hello" }));
    assert.equal(fourth.status, 200);
    assert.deepEqual(JSON.parse(fourth.body), ok(C3_RESULT));

    assert.deepEqual(mcp.requests().map((record) => record.seq), [1, 2, 3, 4]);
    assert.deepEqual(mcp.requests().map((record) => record.status), [503, 200, 503, 200]);
  } finally {
    await mcp.close();
  }
});

test("C-0357da28 K2 failNext is not consumed by a refusal and the later call replaces it", async () => {
  const mcp = await start();
  try {
    succeeds(() => mcp.failNext("tools/call", 502), "failNext");

    const noKey = hm("tools/call", "log_note");
    delete noKey["authorization"];
    const refused = await post(mcp.origin, noKey, callBody("log_note", { note: "hello" }));
    assert.equal(refused.status, 401);
    assert.deepEqual(JSON.parse(refused.body), { error: "unauthorized" });

    const failed = await post(mcp.origin, hm("tools/call", "log_note"), callBody("log_note", { note: "hello" }));
    assert.equal(failed.status, 502);
    assert.deepEqual(JSON.parse(failed.body), { error: "injected_failure", status: 502 });

    const recovered = await post(mcp.origin, hm("tools/call", "log_note"), callBody("log_note", { note: "hello" }));
    assert.equal(recovered.status, 200);
    assert.deepEqual(JSON.parse(recovered.body), ok(C3_RESULT));

    succeeds(() => mcp.failNext("tools/call", 500, 5), "failNext");
    succeeds(() => mcp.failNext("tools/call", 429), "failNext");

    const replaced = await post(mcp.origin, hm("tools/call", "log_note"), callBody("log_note", { note: "hello" }));
    assert.equal(replaced.status, 429);
    assert.deepEqual(JSON.parse(replaced.body), { error: "injected_failure", status: 429 });

    const after = await post(mcp.origin, hm("tools/call", "log_note"), callBody("log_note", { note: "hello" }));
    assert.equal(after.status, 200);
    assert.deepEqual(JSON.parse(after.body), ok(C3_RESULT));
  } finally {
    await mcp.close();
  }
});

test("C-0357da28 K3 failNext on initialize injects a plain HTTP failure", async () => {
  const mcp = await start();
  try {
    succeeds(() => mcp.failNext("initialize", 400), "failNext");

    const injected = await post(mcp.origin, hl(), init("2025-11-25"));
    assert.equal(injected.status, 400);
    assert.match(String(injected.headers["content-type"]), /^application\/json/);
    assert.deepEqual(JSON.parse(injected.body), { error: "injected_failure", status: 400 });

    const initBody = {
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-11-25",
        capabilities: { tools: {} },
        serverInfo: { name: "fake-mcp", version: "1.0.0" },
      },
    };
    const handshake = await post(mcp.origin, hl(), init("2025-11-25"));
    assert.equal(handshake.status, 200);
    assert.deepEqual(JSON.parse(handshake.body), initBody);
  } finally {
    await mcp.close();
  }
});

test("C-0357da28 K4 and K5 setTools and reset restore the surface while close stays idempotent", async () => {
  const mcp = await start();
  const origin = mcp.origin;
  try {
    succeeds(() => mcp.setTools([HDR_TOOL]), "setTools");
    const replaced = await post(mcp.origin, hm("tools/list"), bm("tools/list", {}));
    assert.equal(replaced.status, 200);
    assert.deepEqual(
      JSON.parse(replaced.body),
      ok({
        resultType: "complete",
        tools: [HDR_ENTRY],
        ttlMs: 60000,
        cacheScope: "private",
      }),
    );

    succeeds(() => mcp.reset(), "reset");
    assert.deepEqual(mcp.requests(), []);

    const restored = await post(mcp.origin, hm("tools/list"), bm("tools/list", {}));
    assert.equal(restored.status, 200);
    assert.deepEqual(
      JSON.parse(restored.body),
      ok({
        resultType: "complete",
        tools: [T_FIND, T_LOG],
        ttlMs: 60000,
        cacheScope: "private",
      }),
    );
    assert.equal(mcp.requests()[0]?.seq, 1);
  } finally {
    await assert.doesNotReject(mcp.close());
  }

  await assert.doesNotReject(mcp.close());
  await assert.rejects(
    post(origin, hm("server/discover"), bm("server/discover", {})),
    (error: unknown) =>
      typeof error === "object" && error !== null && (error as { code?: unknown }).code === "ECONNREFUSED",
  );
  assert.equal(mcp.requests()[0]?.seq, 1);
});

function tcpWraps(): number {
  return process.getActiveResourcesInfo().filter((name) => name === "TCPServerWrap").length;
}

async function rejectsBadOption(opts: FakeMcpOptions, message: string): Promise<void> {
  const before = tcpWraps();
  let started: FakeMcp | undefined;
  try {
    await assert.rejects(
      async () => {
        started = await startFakeMcp(opts);
      },
      (error: unknown) => {
        assert.ok(error instanceof RangeError, `expected a RangeError, got ${String(error)}`);
        assert.equal((error as Error).message, message);
        return true;
      },
    );
    assert.equal(tcpWraps(), before, "a rejected option opened no listener");
  } finally {
    if (started !== undefined) {
      await started.close();
    }
  }
}

test("C-0357da28 A1 to A7 bad start options reject with RangeError and open no listener", async () => {
  await rejectsBadOption({ era: "x" } as unknown as FakeMcpOptions, "era must be modern, legacy or dual");
  await rejectsBadOption({ path: "mcp" }, "path must start with / and hold no ? or #");
  await rejectsBadOption({ path: "/a?b" }, "path must start with / and hold no ? or #");
  await rejectsBadOption({ keyHeader: "Bad Header" }, "keyHeader must be an HTTP token or null");
  await rejectsBadOption({ pageSize: 0 }, "pageSize must be a positive integer");
  await rejectsBadOption({ pageSize: 1.5 }, "pageSize must be a positive integer");

  const find = FAKE_MCP_TOOLS[0];
  if (find === undefined) {
    assert.fail("FAKE_MCP_TOOLS is missing find_vendor");
  }
  await rejectsBadOption({ tools: [find, find] }, "duplicate tool name: find_vendor");
});

test("C-0357da28 A8 to A15 bad knob arguments throw RangeError and change nothing", async () => {
  const mcp = await start();
  try {
    const cases: [() => void, string][] = [
      [() => mcp.failNext("", 500), "method must be a non-empty string"],
      [() => mcp.failNext("tools/call", 399), "status must be an integer from 400 to 599"],
      [() => mcp.failNext("tools/call", 600), "status must be an integer from 400 to 599"],
      [() => mcp.failNext("tools/call", 500.5), "status must be an integer from 400 to 599"],
      [() => mcp.failNext("tools/call", 500, 0), "times must be an integer from 1 to 1000"],
      [() => mcp.failNext("tools/call", 500, 1001), "times must be an integer from 1 to 1000"],
      [() => mcp.setTools([LOG_TOOL, LOG_TOOL]), "duplicate tool name: log_note"],
      [() => mcp.setTools([EMPTY_TOOL]), "tool name must be a non-empty string"],
    ];

    for (const [run, message] of cases) {
      let error: unknown;
      try {
        run();
      } catch (caught) {
        error = caught;
      }
      assert.ok(error instanceof RangeError, `expected a RangeError for ${message}, got ${String(error)}`);
      assert.equal((error as Error).message, message);
    }

    const list = await post(mcp.origin, hm("tools/list"), bm("tools/list", {}));
    assert.equal(list.status, 200);
    assert.deepEqual(
      JSON.parse(list.body),
      ok({
        resultType: "complete",
        tools: [T_FIND, T_LOG],
        ttlMs: 60000,
        cacheScope: "private",
      }),
    );
  } finally {
    await mcp.close();
  }
});

test("C-5a43c763 S5 failNext keeps the injected failure a JSON body under sse", async () => {
  const mcp = await start({ sse: true, session: true });
  try {
    succeeds(() => mcp.failNext("tools/call", 502), "failNext");

    const injected = await post(mcp.origin, hm("tools/call", "log_note"), callBody("log_note", { note: "hello" }));
    assert.equal(injected.status, 502);
    assert.match(String(injected.headers["content-type"]), /^application\/json/);
    assert.deepEqual(JSON.parse(injected.body), { error: "injected_failure", status: 502 });

    const streamed = await post(mcp.origin, hm("server/discover"), bm("server/discover", {}));
    assert.equal(streamed.status, 200);
    assert.match(String(streamed.headers["content-type"]), /^text\/event-stream/);
    assert.equal(streamed.headers["cache-control"], "no-cache");
  } finally {
    await mcp.close();
  }
});

test("C-19bb5be6 X5 reset restarts the session counter and forgets sessions", async () => {
  const mcp = await start({ session: true });
  try {
    const first = await post(mcp.origin, hl(), init("2025-11-25"));
    assert.equal(first.headers["mcp-session-id"], "fake-mcp-session-1");
    const second = await post(mcp.origin, hl(), init("2025-11-25"));
    assert.equal(second.headers["mcp-session-id"], "fake-mcp-session-2");

    succeeds(() => mcp.reset(), "reset");

    const restarted = await post(mcp.origin, hl(), init("2025-11-25"));
    assert.equal(restarted.status, 200);
    assert.equal(restarted.headers["mcp-session-id"], "fake-mcp-session-1");

    const stale = await post(
      mcp.origin,
      hl("2025-11-25", { "mcp-session-id": "fake-mcp-session-2" }),
      bl("tools/list", undefined, 2),
    );
    assert.equal(stale.status, 404);
    assert.deepEqual(JSON.parse(stale.body), {
      jsonrpc: "2.0",
      id: 2,
      error: { code: -32600, message: "Unknown session" },
    });
  } finally {
    await mcp.close();
  }
});
