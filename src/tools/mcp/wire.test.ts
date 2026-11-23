import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import type { ToolHttpResponse, ToolJson } from "../calls.ts";

import type { McpReply } from "./wire.ts";
import { mcpBody, mcpHeaders, mcpNameHeader, readMcpReply } from "./wire.ts";

type Version = "2026-07-28" | "2025-11-25" | "2025-06-18" | "2025-03-26";

const FV: { [key: string]: ToolJson } = { vendor_name: "Acme GmbH" };

function body(
  id: number | null,
  method: string,
  params: { [key: string]: ToolJson },
  version: Version,
): Uint8Array {
  const box: { result?: Uint8Array } = {};
  assert.doesNotThrow(() => {
    box.result = mcpBody(id, method, params, version);
  });
  assert.ok(box.result);
  return box.result;
}

function text(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function headers(
  method: string,
  name: string | null,
  version: Version,
  idemKey: string | null,
): Readonly<Record<string, string>> {
  const box: { result?: Readonly<Record<string, string>> } = {};
  assert.doesNotThrow(() => {
    box.result = mcpHeaders(method, name, version, idemKey);
  });
  assert.ok(box.result);
  return box.result;
}

function nameHeader(name: string): string {
  const box: { result?: string } = {};
  assert.doesNotThrow(() => {
    box.result = mcpNameHeader(name);
  });
  assert.ok(box.result !== undefined);
  return box.result;
}

function json(bodyText: string): ToolHttpResponse {
  return { status: 200, headers: { "content-type": "application/json" }, body: new TextEncoder().encode(bodyText) };
}

function sse(bodyText: string): ToolHttpResponse {
  return {
    status: 200,
    headers: { "content-type": "text/event-stream; charset=utf-8" },
    body: new TextEncoder().encode(bodyText),
  };
}

function event(message: unknown): string {
  return `event: message\ndata: ${JSON.stringify(message)}\n\n`;
}

function reply(response: ToolHttpResponse, id = 1): McpReply {
  const box: { result?: McpReply } = {};
  assert.doesNotThrow(() => {
    box.result = readMcpReply(response, id);
  });
  assert.ok(box.result);
  return box.result;
}

const NOT_JSON: McpReply = { ok: false, reason: "not_json", code: null };
const NO_REPLY: McpReply = { ok: false, reason: "no_reply", code: null };

describe("mcpBody", () => {
  it("C-387709ea W1 a modern tools call is 305 bytes with the fixed digest", () => {
    const bytes = body(1, "tools/call", { name: "find_vendor", arguments: FV }, "2026-07-28");
    assert.equal(bytes.byteLength, 305);
    assert.equal(sha(bytes), "884bf0ecc3569c8bc3cb7ee6d3fe044f5ae98593478ddbbaa9975e35801bba28");
  });

  it("C-387709ea W2 a legacy tools call has no meta member", () => {
    const bytes = body(1, "tools/call", { name: "find_vendor", arguments: FV }, "2025-11-25");
    assert.equal(bytes.byteLength, 118);
    assert.equal(sha(bytes), "096dc27bb3e5bd7d6d0a2c0a6df5ffd657ccf234a3cd9fe717d0a104a2e6b1a3");
    assert.equal(text(bytes).includes("_meta"), false);
  });

  it("C-387709ea W3 server discover is 249 bytes with the fixed digest", () => {
    const bytes = body(1, "server/discover", {}, "2026-07-28");
    assert.equal(bytes.byteLength, 249);
    assert.equal(sha(bytes), "76269e460a435d1338b204ce7cd4f0be1b20e25e1da8ad458d0a4b8e3e164c3f");
  });

  it("C-387709ea W4 to W8 discover and list bodies have the fixed bytes", () => {
    const w4 = body(
      2,
      "initialize",
      { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "ursitoare", version: "0.1" } },
      "2025-11-25",
    );
    assert.equal(w4.byteLength, 156);
    assert.equal(sha(w4), "7024e8cbb64460ab1752dbdb0e218cba37841854275e7e21a7227e1144f49ce6");

    const w5 = body(null, "notifications/initialized", {}, "2025-11-25");
    assert.equal(w5.byteLength, 66);
    assert.equal(sha(w5), "c01acc5d43647dfe74d55a6c24e26a748188851204d330e6d1f1d7e64b2ed999");
    assert.equal(text(w5).includes('"id"'), false);

    const w6 = body(2, "tools/list", {}, "2026-07-28");
    assert.equal(w6.byteLength, 244);
    assert.equal(sha(w6), "c2e762215efb0d1e2077566a9267636485e3e582db86b133dddb60e338beb8a2");

    const w7 = body(3, "tools/list", { cursor: "page-1" }, "2026-07-28");
    assert.equal(w7.byteLength, 262);
    assert.equal(sha(w7), "eebbe51f5dd813a8e1420ab847891635c37d07cd14b81fe6e2c4478bf546d942");

    const w8 = body(4, "tools/list", {}, "2025-11-25");
    assert.equal(w8.byteLength, 58);
    assert.equal(sha(w8), "86d054baa44ee2f470bd2acda333ee42f8ffae1f5764a0c502bc10ae88720d7b");
    assert.equal(text(w8).includes("_meta"), false);
  });

  it("C-387709ea W9 a proto member sorts between B and a at every depth", () => {
    const args = JSON.parse('{"b":1,"__proto__":{"x":2},"a":[{"z":1,"y":2}],"B":"é"}') as {
      [key: string]: ToolJson;
    };
    const bytes = body(1, "tools/call", { name: "log_note", arguments: args }, "2026-07-28");
    const params = text(bytes);
    assert.equal(bytes.byteLength, 331);
    assert.equal(sha(bytes), "26c6894321480d85caa1f80f6d3b3734a524fd75ed7914bc8e30d660374204d0");
    const argumentsText = '{"B":"é","__proto__":{"x":2},"a":[{"y":2,"z":1}],"b":1}';
    assert.equal(params.includes(argumentsText), true);
    const between =
      params.indexOf('"B":"é"') < params.indexOf('"__proto__":{"x":2}') &&
      params.indexOf('"__proto__":{"x":2}') < params.indexOf('"a":[{"y":2,"z":1}]');
    assert.equal(between, true);
  });

  it("C-387709ea W10 arguments sort at every depth so their order does not matter", () => {
    const one = body(1, "tools/call", { name: "find_vendor", arguments: { b: 1, a: 2 } }, "2026-07-28");
    const two = body(1, "tools/call", { name: "find_vendor", arguments: { a: 2, b: 1 } }, "2026-07-28");
    assert.equal(one.byteLength, 291);
    assert.equal(sha(one), "4bd7d8f9640608885f43cadca9fc204d001e775d27c9d1d52d689bc055f4cc4d");
    assert.equal(sha(two), sha(one));
    assert.equal(text(one).includes('"arguments":{"a":2,"b":1}'), true);
  });

  it("C-387709ea W11 and W12 legacy and modern call bodies have the fixed bytes", () => {
    const w11 = body(1, "tools/call", { name: "log_note", arguments: { note: "hello" } }, "2025-06-18");
    assert.equal(w11.byteLength, 104);
    assert.equal(sha(w11), "ffb631dede5f5f1edf9c4527e75cb0e2e0fb40c9cb81da80ab2b20770311e916");
    assert.equal(text(w11).includes("_meta"), false);

    const w12 = body(1, "tools/call", { name: "log_note", arguments: {} }, "2026-07-28");
    assert.equal(w12.byteLength, 277);
    assert.equal(sha(w12), "e886f9efdca91cfa27a27eb104f82d9f3bb294b32ef50441b47acdb531ffe3a5");
  });
});

describe("mcpHeaders and mcpNameHeader", () => {
  it("C-387709ea H1 to H3 headers carry the protocol method and name", () => {
    assert.deepEqual(headers("tools/call", "find_vendor", "2026-07-28", "k_1"), {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "mcp-protocol-version": "2026-07-28",
      "mcp-method": "tools/call",
      "mcp-name": "find_vendor",
      "idempotency-key": "k_1",
    });
    assert.deepEqual(headers("tools/call", "find_vendor", "2025-11-25", null), {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "mcp-protocol-version": "2025-11-25",
    });
    assert.deepEqual(headers("server/discover", null, "2026-07-28", null), {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "mcp-protocol-version": "2026-07-28",
      "mcp-method": "server/discover",
    });
  });

  it("C-387709ea N1 to N5 a name header is plain or base64 encoded", () => {
    assert.equal(nameHeader("find_vendor"), "find_vendor");
    assert.equal(nameHeader("Hello, 世界"), "=?base64?SGVsbG8sIOS4lueVjA==?=");
    assert.equal(nameHeader("a b"), "=?base64?YSBi?=");
    assert.equal(nameHeader("=?base64?x?="), "=?base64?PT9iYXNlNjQ/eD89?=");
    assert.equal(nameHeader("=?base64?abc"), "=?base64?abc");
    assert.equal(nameHeader(""), "");
  });
});

describe("readMcpReply", () => {
  it("C-387709ea P1 to P5 a JSON reply answers its message or is not_json", () => {
    assert.deepEqual(reply(json('{"jsonrpc":"2.0","id":1,"result":{"a":1}}')), { ok: true, result: { a: 1 } });
    assert.deepEqual(reply(json('{"jsonrpc":"2.0","id":1,"error":{"code":-32602,"message":"x"}}')), {
      ok: false,
      reason: "rpc_error",
      code: -32602,
    });
    assert.deepEqual(reply(json('{"jsonrpc":"2.0","id":null,"error":{"code":-32700,"message":"x"}}')), {
      ok: false,
      reason: "rpc_error",
      code: -32700,
    });
    assert.deepEqual(reply(json('{"jsonrpc":"2.0","id":2,"result":{"a":1}}')), NO_REPLY);
    for (const bad of ["<html>", "[1]", ""]) {
      assert.deepEqual(reply(json(bad)), NOT_JSON);
    }
  });

  it("C-387709ea P6 to P9 an SSE reply reads the matching message", () => {
    const progress = { jsonrpc: "2.0", method: "notifications/progress", params: { progress: 1 } };
    assert.deepEqual(reply(sse(event(progress) + event({ jsonrpc: "2.0", id: 1, result: { b: 2 } }))), {
      ok: true,
      result: { b: 2 },
    });
    assert.deepEqual(reply(sse(event(progress))), NO_REPLY);
    assert.deepEqual(reply(sse("")), NO_REPLY);
    assert.deepEqual(
      reply(sse('event: message\r\ndata: {"jsonrpc":"2.0",\r\ndata: "id":1,"result":{"c":3}}\r\n\r\n')),
      { ok: true, result: { c: 3 } },
    );
    assert.deepEqual(reply(sse(event({ jsonrpc: "2.0", id: 1, error: { code: -32602, message: "x" } }))), {
      ok: false,
      reason: "rpc_error",
      code: -32602,
    });
  });

  it("C-387709ea P10 and P11 a non-object result or message-less error is no_reply or rpc_error", () => {
    assert.deepEqual(reply(json('{"jsonrpc":"2.0","id":1,"result":[1]}')), NO_REPLY);
    assert.deepEqual(reply(json('{"jsonrpc":"2.0","id":1,"error":{"message":"x"}}')), {
      ok: false,
      reason: "rpc_error",
      code: null,
    });
  });
});
