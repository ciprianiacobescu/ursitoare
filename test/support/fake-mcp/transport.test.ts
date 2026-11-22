import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import type { FakeMcp, FakeMcpOptions } from "./index.ts";
import { startFakeMcp } from "./index.ts";

assert.equal(typeof startFakeMcp, "function");

const M = "io.modelcontextprotocol/protocolVersion";
const KEY = "Bearer k-mcp-7f3a";
const MODERN = "2026-07-28";

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

function hm(method: string): http.OutgoingHttpHeaders {
  return {
    host: "mcp.fake.test",
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    authorization: KEY,
    "mcp-protocol-version": MODERN,
    "mcp-method": method,
  };
}

function request(
  base: string,
  method: string,
  path: string,
  headers: http.OutgoingHttpHeaders,
  body?: string,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request(
      { host: url.hostname, port: url.port, method, path, headers, agent: false },
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

function post(
  base: string,
  path: string,
  headers: http.OutgoingHttpHeaders,
  body: string,
): Promise<Reply> {
  return request(base, "POST", path, headers, body);
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

test("C-50dbcfcf T1 and T2 the Host header is checked and the local hosts are accepted", async () => {
  const fake = await start();
  try {
    for (const host of ["other.fake.test", "mcp.fake.test:443"]) {
      const headers = hm("server/discover");
      headers["host"] = host;
      const reply = await post(
        fake.origin,
        "/mcp",
        headers,
        bm("server/discover", {}),
      );
      assert.equal(reply.status, 421, `host ${host} is misdirected`);
      assert.deepEqual(JSON.parse(reply.body), { error: "misdirected_request" });
    }

    const port = new URL(fake.origin).port;
    for (const host of [`127.0.0.1:${port}`, "MCP.FAKE.TEST"]) {
      const headers = hm("server/discover");
      headers["host"] = host;
      const reply = await post(
        fake.origin,
        "/mcp",
        headers,
        bm("server/discover", {}),
      );
      assert.equal(reply.status, 200, `host ${host} is accepted`);
      assert.deepEqual(JSON.parse(reply.body), ok(D1_RESULT));
    }

    const query = await post(
      fake.origin,
      "/mcp?x=1",
      hm("server/discover"),
      bm("server/discover", {}),
    );
    assert.equal(query.status, 200);
    assert.deepEqual(JSON.parse(query.body), ok(D1_RESULT));
  } finally {
    await fake.close();
  }
});

test("C-50dbcfcf T3 and T8 a wrong path is 404 and the configured path is served", async () => {
  const fake = await start();
  try {
    const reply = await post(
      fake.origin,
      "/other",
      hm("server/discover"),
      bm("server/discover", {}),
    );
    assert.equal(reply.status, 404);
    assert.deepEqual(JSON.parse(reply.body), { error: "not_found" });
  } finally {
    await fake.close();
  }

  const custom = await start({ path: "/rpc/v1" });
  try {
    const wrong = await post(
      custom.origin,
      "/mcp",
      hm("server/discover"),
      bm("server/discover", {}),
    );
    assert.equal(wrong.status, 404);
    assert.deepEqual(JSON.parse(wrong.body), { error: "not_found" });

    const right = await post(
      custom.origin,
      "/rpc/v1",
      hm("server/discover"),
      bm("server/discover", {}),
    );
    assert.equal(right.status, 200);
    assert.deepEqual(JSON.parse(right.body), ok(D1_RESULT));
  } finally {
    await custom.close();
  }
});

test("C-50dbcfcf T4 GET and DELETE are 405 with allow POST", async () => {
  const fake = await start();
  try {
    for (const method of ["GET", "DELETE"]) {
      const reply = await request(fake.origin, method, "/mcp", hm("server/discover"));
      assert.equal(reply.status, 405, `${method} is refused`);
      assert.equal(reply.headers["allow"], "POST");
      assert.deepEqual(JSON.parse(reply.body), { error: "method_not_allowed" });
    }
  } finally {
    await fake.close();
  }
});

test("C-50dbcfcf T5 to T7 the key header is required unless the option is null", async () => {
  const fake = await start();
  try {
    const missing = hm("server/discover");
    delete missing["authorization"];
    const noKey = await post(
      fake.origin,
      "/mcp",
      missing,
      bm("server/discover", {}),
    );
    assert.equal(noKey.status, 401);
    assert.deepEqual(JSON.parse(noKey.body), { error: "unauthorized" });

    const empty = hm("server/discover");
    empty["authorization"] = "";
    const emptyKey = await post(
      fake.origin,
      "/mcp",
      empty,
      bm("server/discover", {}),
    );
    assert.equal(emptyKey.status, 401);
    assert.deepEqual(JSON.parse(emptyKey.body), { error: "unauthorized" });
  } finally {
    await fake.close();
  }

  const custom = await start({ keyHeader: "X-Api-Key" });
  try {
    const authorizationOnly = await post(
      custom.origin,
      "/mcp",
      hm("server/discover"),
      bm("server/discover", {}),
    );
    assert.equal(authorizationOnly.status, 401);
    assert.deepEqual(JSON.parse(authorizationOnly.body), { error: "unauthorized" });

    const withKey = hm("server/discover");
    withKey["x-api-key"] = "kk";
    const accepted = await post(
      custom.origin,
      "/mcp",
      withKey,
      bm("server/discover", {}),
    );
    assert.equal(accepted.status, 200);
    assert.deepEqual(JSON.parse(accepted.body), ok(D1_RESULT));
  } finally {
    await custom.close();
  }

  const open = await start({ keyHeader: null });
  try {
    const noKey = hm("server/discover");
    delete noKey["authorization"];
    const reply = await post(
      open.origin,
      "/mcp",
      noKey,
      bm("server/discover", {}),
    );
    assert.equal(reply.status, 200);
    assert.deepEqual(JSON.parse(reply.body), ok(D1_RESULT));
  } finally {
    await open.close();
  }
});

test("C-50dbcfcf T9 parse and invalid request bodies are 400 errors", async () => {
  const fake = await start();
  try {
    for (const body of ["{", ""]) {
      const reply = await post(
        fake.origin,
        "/mcp",
        hm("server/discover"),
        body,
      );
      assert.equal(reply.status, 400);
      assert.deepEqual(JSON.parse(reply.body), err(-32700, "Parse error", null));
    }

    for (const body of ["[1]", '{"jsonrpc":"2.0","id":1}']) {
      const reply = await post(
        fake.origin,
        "/mcp",
        hm("server/discover"),
        body,
      );
      assert.equal(reply.status, 400);
      assert.deepEqual(JSON.parse(reply.body), err(-32600, "Invalid Request", null));
    }
  } finally {
    await fake.close();
  }
});

test("C-50dbcfcf T10 host, method and path refusals precede the key check", async () => {
  const fake = await start();
  try {
    const headers = hm("server/discover");
    delete headers["authorization"];

    const wrongHost = { ...headers, host: "other.fake.test" };
    const hostReply = await post(
      fake.origin,
      "/mcp",
      wrongHost,
      bm("server/discover", {}),
    );
    assert.equal(hostReply.status, 421);
    assert.deepEqual(JSON.parse(hostReply.body), { error: "misdirected_request" });

    const wrongMethod = await request(fake.origin, "GET", "/mcp", headers);
    assert.equal(wrongMethod.status, 405);
    assert.equal(wrongMethod.headers["allow"], "POST");
    assert.deepEqual(JSON.parse(wrongMethod.body), { error: "method_not_allowed" });

    const wrongPath = await post(
      fake.origin,
      "/other",
      headers,
      bm("server/discover", {}),
    );
    assert.equal(wrongPath.status, 404);
    assert.deepEqual(JSON.parse(wrongPath.body), { error: "not_found" });
  } finally {
    await fake.close();
  }
});
