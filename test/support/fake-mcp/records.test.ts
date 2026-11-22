import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import type { FakeMcp, FakeMcpRequest } from "./index.ts";
import { startFakeMcp } from "./index.ts";

const M = "io.modelcontextprotocol/protocolVersion";
const KEY_VALUE = "k-mcp-7f3a";

interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function hm(method: string, name?: string): http.OutgoingHttpHeaders {
  const headers: http.OutgoingHttpHeaders = {
    host: "mcp.fake.test",
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    authorization: `Bearer ${KEY_VALUE}`,
    "mcp-protocol-version": "2026-07-28",
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
    authorization: `Bearer ${KEY_VALUE}`,
    ...extra,
  };
  if (version !== undefined) {
    headers["mcp-protocol-version"] = version;
  }
  return headers;
}

function bm(method: string, params: Record<string, unknown>, id = 1): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id,
    method,
    params: { ...params, _meta: { [M]: "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {} } },
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

const INIT = bl("initialize", {
  protocolVersion: "2025-11-25",
  capabilities: {},
  clientInfo: { name: "c", version: "1" },
});

function send(
  base: string,
  verb: string,
  headers: http.OutgoingHttpHeaders,
  body: string | undefined,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request(
      { host: url.hostname, port: url.port, method: verb, path: "/mcp", headers, agent: false },
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

function read(mcp: FakeMcp, filter?: { method?: string }): FakeMcpRequest[] {
  let out: FakeMcpRequest[] = [];
  assert.doesNotThrow(() => {
    out = filter === undefined ? mcp.requests() : mcp.requests(filter);
  });
  return out;
}

const SECRETS = [KEY_VALUE, "secret-cookie", "Basic pp", "sess-abc", "fake-mcp-session-1"];

test("C-c83e670d Q1 to Q6 the six records hold the facts, the filters and the copies", async () => {
  const mcp = await startFakeMcp({ keyHeader: "x-api-key" });
  try {
    const q1Headers = {
      ...hm("tools/call", "find_vendor"),
      "x-api-key": KEY_VALUE,
      "x-ursitoare-call": "r_1:find:1",
      cookie: "c=secret-cookie",
      "proxy-authorization": "Basic pp",
      "mcp-session-id": "sess-abc",
    };
    const q1 = await send(
      mcp.origin,
      "POST",
      q1Headers,
      bm("tools/call", { name: "find_vendor", arguments: { vendor_name: "Acme GmbH" } }, 3),
    );
    assert.equal(q1.status, 200);
    const q2 = await send(
      mcp.origin,
      "POST",
      { ...hm("server/discover"), host: "other.fake.test", "x-api-key": "k" },
      bm("server/discover", {}),
    );
    assert.equal(q2.status, 421);
    const q3 = await send(mcp.origin, "GET", { host: "mcp.fake.test" }, undefined);
    assert.equal(q3.status, 405);
    const q4 = await send(mcp.origin, "POST", hm("tools/list"), bm("tools/list", {}));
    assert.equal(q4.status, 401);
    const q5 = await send(mcp.origin, "POST", { host: "mcp.fake.test", "x-api-key": "k" }, "{");
    assert.equal(q5.status, 400);
    const q6 = await send(mcp.origin, "POST", { ...hl(), "x-api-key": "k" }, INIT);
    assert.equal(q6.status, 200);

    const all = read(mcp);
    assert.equal(all.length, 6);
    assert.deepEqual(
      all.map((r) => [r.seq, r.method, r.era, r.host, r.status, r.path, r.bodySha256]),
      [
        [1, "tools/call", "modern", "mcp.fake.test", 200, "/mcp", "c34cd443a5bab0b6964cf8f8796201bce44640f0914d1f6fcd2da79dd2907ebe"],
        [2, "server/discover", "modern", "other.fake.test", 421, "/mcp", "381b7dc9512987aa8b21987b55c72b760defea2c555290e2c81660553c3afdaa"],
        [3, "", null, "mcp.fake.test", 405, "/mcp", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
        [4, "tools/list", "modern", "mcp.fake.test", 401, "/mcp", "cf6593c6adc60672c004b293075dadd9c15d3ee8f09f6d05f642ec77b51b072e"],
        [5, "", null, "mcp.fake.test", 400, "/mcp", "021fb596db81e6d02bf3d2586ee3981fe519f275c0ac9ca76bbcf2ebb4097d96"],
        [6, "initialize", "legacy", "mcp.fake.test", 200, "/mcp", "330ac568c28779957a896987b35b90d5951c38d6b2dc24b4b5d9dc27e43f070a"],
      ],
    );
    assert.deepEqual(
      all.map((r) => [r.callHeader, r.toolName]),
      [["r_1:find:1", "find_vendor"], [null, null], [null, null], [null, null], [null, null], [null, null]],
    );
    const wanted = {
      host: "mcp.fake.test",
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: "[credential]",
      "mcp-protocol-version": "2026-07-28",
      "mcp-method": "tools/call",
      "mcp-name": "find_vendor",
      "x-api-key": "[credential]",
      "x-ursitoare-call": "r_1:find:1",
      cookie: "[credential]",
      "proxy-authorization": "[credential]",
      "mcp-session-id": "[session]",
      "content-length": "231",
    };
    const got = all[0]?.headers ?? {};
    assert.deepEqual(
      Object.fromEntries(Object.keys(wanted).map((name) => [name, got[name]])),
      wanted,
    );
    assert.equal(all[3]?.headers["authorization"], "[credential]");

    assert.deepEqual(read(mcp, { method: "tools/call" }).map((r) => r.seq), [1]);
    assert.deepEqual(read(mcp, { method: "" }).map((r) => r.seq), [3, 5]);

    const first = read(mcp)[0];
    assert.ok(first !== undefined);
    (first.headers as Record<string, string>)["host"] = "changed";
    assert.equal(read(mcp)[0]?.headers["host"], "mcp.fake.test");

    const text = JSON.stringify(read(mcp));
    for (const secret of SECRETS.slice(0, 4)) {
      assert.equal(text.includes(secret), false, secret);
    }
  } finally {
    await mcp.close();
  }
});

test("C-c83e670d a session id is recorded as a placeholder and requests() works after close", async () => {
  const mcp = await startFakeMcp({ session: true });
  try {
    const first = await send(mcp.origin, "POST", hl("2025-11-25"), INIT);
    assert.equal(first.headers["mcp-session-id"], "fake-mcp-session-1");
    await send(mcp.origin, "POST", hl("2025-11-25"), INIT);
    const listed = await send(
      mcp.origin,
      "POST",
      hl("2025-11-25", { "mcp-session-id": "fake-mcp-session-1" }),
      bl("tools/list", undefined, 2),
    );
    assert.equal(listed.status, 200);

    const all = read(mcp);
    assert.equal(all.length, 3);
    assert.equal(all[2]?.headers["mcp-session-id"], "[session]");
    assert.equal(JSON.stringify(all).includes("fake-mcp-session-1"), false);
  } finally {
    await mcp.close();
  }
  assert.equal(read(mcp).length, 3);
});
