import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import type { CallAnswer, CallBuild, McpCallSpec, ToolHttpResponse, ToolJson } from "../calls.ts";
import { mcpCallAdapter } from "./adapter.ts";

const SPEC_S: McpCallSpec = {
  kind: "mcp",
  endpoint: "/mcp",
  name: "find_vendor",
  protocolVersion: "2026-07-28",
  output: "structured",
};
const SPEC_T: McpCallSpec = {
  kind: "mcp",
  endpoint: "/mcp",
  name: "log_note",
  protocolVersion: "2026-07-28",
  output: "text",
};
const SPEC_L: McpCallSpec = {
  kind: "mcp",
  endpoint: "/rpc/v1",
  name: "log_note",
  protocolVersion: "2025-06-18",
  output: "text",
};

const FV: { [key: string]: ToolJson } = { vendor_name: "Acme GmbH" };
const V: { [key: string]: ToolJson } = { vendor_id: "V-ACME", status: "active" };

const W1 = "884bf0ecc3569c8bc3cb7ee6d3fe044f5ae98593478ddbbaa9975e35801bba28";
const W11 = "ffb631dede5f5f1edf9c4527e75cb0e2e0fb40c9cb81da80ab2b20770311e916";
const W12 = "e886f9efdca91cfa27a27eb104f82d9f3bb294b32ef50441b47acdb531ffe3a5";

function build(call: McpCallSpec, args: ToolJson, key: string | null): CallBuild {
  const box: { result?: CallBuild } = {};
  assert.doesNotThrow(() => {
    box.result = mcpCallAdapter.build(call, args, key);
  });
  assert.ok(box.result);
  return box.result;
}

function request(call: McpCallSpec, args: ToolJson, key: string | null): CallBuild & { ok: true } {
  const result = build(call, args, key);
  assert.equal(result.ok, true);
  return result as CallBuild & { ok: true };
}

function sha(body: Uint8Array | null): string {
  assert.ok(body);
  return createHash("sha256").update(body).digest("hex");
}

function answer(
  call: McpCallSpec,
  status: number,
  body: string | Uint8Array,
  contentType = "application/json",
): CallAnswer {
  const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
  const headers: Record<string, string> = contentType === "" ? {} : { "content-type": contentType };
  const response: ToolHttpResponse = { status, headers, body: bytes };
  const box: { result?: CallAnswer } = {};
  assert.doesNotThrow(() => {
    box.result = mcpCallAdapter.answer(call, response);
  });
  assert.ok(box.result);
  return box.result;
}

function json(id: number, result: { [key: string]: ToolJson }): string {
  return JSON.stringify({ jsonrpc: "2.0", id, result });
}

function jsonError(code: number | null, message: string): string {
  return JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code, message } });
}

function event(message: unknown): string {
  return `event: message\ndata: ${JSON.stringify(message)}\n\n`;
}

const NOT_JSON: CallAnswer = { ok: false, stage: "response", reason: "not_json", status: null };
const NO_REPLY: CallAnswer = { ok: false, stage: "response", reason: "no_reply", status: null };
const NOT_OBJECT: CallAnswer = { ok: false, stage: "response", reason: "not_object", status: null };

describe("mcpCallAdapter build", () => {
  it("C-41c968f2 B1 and B2 a structured call is one POST with W1 bytes, a key only adds a header", () => {
    const plain = request(SPEC_S, FV, null).request;
    assert.equal(plain.method, "POST");
    assert.equal(plain.path, "/mcp");
    assert.deepEqual(plain.headers, {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "mcp-protocol-version": "2026-07-28",
      "mcp-method": "tools/call",
      "mcp-name": "find_vendor",
    });
    assert.equal(plain.body?.byteLength, 305);
    assert.equal(sha(plain.body), W1);

    const keyed = request(SPEC_S, FV, "k_1").request;
    assert.equal(keyed.method, "POST");
    assert.equal(keyed.path, plain.path);
    assert.deepEqual(keyed.headers, {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "mcp-protocol-version": "2026-07-28",
      "mcp-method": "tools/call",
      "mcp-name": "find_vendor",
      "idempotency-key": "k_1",
    });
    assert.equal(keyed.body?.byteLength, 305);
    assert.equal(sha(keyed.body), W1);
  });

  it("C-41c968f2 B3 and B5 a legacy call has its endpoint and version, a text call has W12 bytes", () => {
    const legacy = request(SPEC_L, { note: "hello" }, null).request;
    assert.equal(legacy.method, "POST");
    assert.equal(legacy.path, "/rpc/v1");
    assert.deepEqual(legacy.headers, {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "mcp-protocol-version": "2025-06-18",
    });
    assert.equal(legacy.body?.byteLength, 104);
    assert.equal(sha(legacy.body), W11);

    const text = request(SPEC_T, {}, null).request;
    assert.equal(text.method, "POST");
    assert.equal(text.path, "/mcp");
    assert.deepEqual(text.headers, {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "mcp-protocol-version": "2026-07-28",
      "mcp-method": "tools/call",
      "mcp-name": "log_note",
    });
    assert.equal(text.body?.byteLength, 277);
    assert.equal(sha(text.body), W12);
  });

  it("C-41c968f2 B4 arguments that are not an object are args_not_object", () => {
    for (const args of [[1], null, "x"] as ToolJson[]) {
      assert.deepEqual(build(SPEC_S, args, null), { ok: false, reason: "args_not_object" });
    }
    assert.equal(request(SPEC_S, FV, null).ok, true);
  });
});

describe("mcpCallAdapter answer", () => {
  it("C-41c968f2 A1 and A10 a structured result gives structuredContent over JSON or SSE", () => {
    assert.deepEqual(
      answer(
        SPEC_S,
        200,
        json(1, { resultType: "complete", content: [{ type: "text", text: "<V>" }], structuredContent: V }),
      ),
      { ok: true, output: V },
    );
    const progress = { jsonrpc: "2.0", method: "notifications/progress", params: { progress: 1 } };
    const sse = event(progress) + event({ jsonrpc: "2.0", id: 1, result: { structuredContent: V } });
    assert.deepEqual(answer(SPEC_S, 200, sse, "text/event-stream; charset=utf-8"), { ok: true, output: V });
  });

  it("C-41c968f2 A2 a text result joins the text items with a newline", () => {
    assert.deepEqual(
      answer(
        SPEC_T,
        200,
        json(1, {
          resultType: "complete",
          content: [
            { type: "text", text: "noted: hello" },
            { type: "image", data: "AAAA", mimeType: "image/png" },
            { type: "text", text: "second" },
          ],
        }),
      ),
      { ok: true, output: { text: "noted: hello\nsecond" } },
    );
    assert.deepEqual(answer(SPEC_T, 200, json(1, { content: [] })), { ok: true, output: { text: "" } });
    assert.deepEqual(answer(SPEC_T, 200, json(1, {})), { ok: true, output: { text: "" } });
  });

  it("C-41c968f2 A3 a status outside 2xx is an upstream status failure", () => {
    assert.deepEqual(answer(SPEC_S, 500, "oops"), {
      ok: false,
      stage: "upstream",
      reason: "status",
      status: 500,
    });
    assert.deepEqual(answer(SPEC_S, 400, jsonError(-32020, "bad")), {
      ok: false,
      stage: "upstream",
      reason: "status",
      status: 400,
    });
    assert.deepEqual(answer(SPEC_S, 301, "", ""), {
      ok: false,
      stage: "upstream",
      reason: "status",
      status: 301,
    });
  });

  it("C-41c968f2 A4 an rpc error is upstream with a null status and no server text", () => {
    const result = answer(SPEC_S, 200, jsonError(-32602, "Unknown tool: nope"));
    assert.deepEqual(result, { ok: false, stage: "upstream", reason: "rpc_error", status: null });
    assert.equal(JSON.stringify(result).includes("Unknown tool"), false);
  });

  it("C-41c968f2 A5 and A6 a non-JSON body and an SSE without a reply are response failures", () => {
    assert.deepEqual(answer(SPEC_S, 200, "<html>"), NOT_JSON);
    assert.deepEqual(answer(SPEC_S, 204, ""), NOT_JSON);
    const progress = { jsonrpc: "2.0", method: "notifications/progress", params: { progress: 1 } };
    assert.deepEqual(answer(SPEC_S, 200, event(progress), "text/event-stream; charset=utf-8"), NO_REPLY);
  });

  it("C-41c968f2 A7 input_required and an unknown result type are response failures", () => {
    assert.deepEqual(answer(SPEC_S, 200, json(1, { resultType: "input_required" })), {
      ok: false,
      stage: "response",
      reason: "input_required",
      status: null,
    });
    assert.deepEqual(answer(SPEC_S, 200, json(1, { resultType: "weird" })), {
      ok: false,
      stage: "response",
      reason: "result_type",
      status: null,
    });
  });

  it("C-41c968f2 A8 a tool error is upstream and leaks no server text", () => {
    const result = answer(
      SPEC_S,
      200,
      json(1, { isError: true, content: [{ type: "text", text: "boom secret" }] }),
    );
    assert.deepEqual(result, { ok: false, stage: "upstream", reason: "tool_error", status: null });
    assert.equal(JSON.stringify(result).includes("boom secret"), false);
  });

  it("C-41c968f2 A9 a structured call without an object structuredContent is not_object", () => {
    assert.deepEqual(answer(SPEC_S, 200, json(1, { content: [] })), NOT_OBJECT);
    assert.deepEqual(answer(SPEC_S, 200, json(1, { structuredContent: [1] })), NOT_OBJECT);
    assert.deepEqual(answer(SPEC_S, 200, json(1, { structuredContent: V })), { ok: true, output: V });
  });
});
