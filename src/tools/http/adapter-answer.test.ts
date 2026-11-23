import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CallAnswer, HttpCallSpec } from "../calls.ts";
import { httpCallAdapter } from "./adapter.ts";

const GET: HttpCallSpec = {
  kind: "http",
  method: "GET",
  path: "/v1/vendors/{vendor_id}",
  params: [{ name: "vendor_id", in: "path" }],
  body: false,
};

function answer(status: number, body: Uint8Array | string): CallAnswer {
  const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
  const box: { result?: CallAnswer } = {};
  assert.doesNotThrow(() => {
    box.result = httpCallAdapter.answer(GET, { status, headers: {}, body: bytes });
  });
  assert.ok(box.result);
  return box.result;
}

const NOT_JSON = { ok: false, stage: "response", reason: "not_json", status: null };

describe("httpCallAdapter answer", () => {
  it("C-26f73edc a 2xx with a JSON object gives the output", () => {
    assert.deepEqual(answer(200, '{"vendor_id":"V-1"}'), { ok: true, output: { vendor_id: "V-1" } });
    assert.deepEqual(answer(299, '{"a":1}'), { ok: true, output: { a: 1 } });
  });

  it("C-26f73edc a 2xx with an empty body gives an empty output", () => {
    assert.deepEqual(answer(201, ""), { ok: true, output: {} });
    assert.deepEqual(answer(204, ""), { ok: true, output: {} });
    assert.deepEqual(answer(200, '{"a":1}'), { ok: true, output: { a: 1 } });
  });

  it("C-26f73edc a 2xx that is not a JSON object is not_json", () => {
    for (const body of ["[1]", "null", "not json", "   ", new Uint8Array([0x7b, 0xff, 0x7d])]) {
      assert.deepEqual(answer(200, body), NOT_JSON);
    }
  });

  it("C-26f73edc a status outside 200 to 299 is an upstream failure", () => {
    assert.deepEqual(answer(500, '{"error":"x"}'), { ok: false, stage: "upstream", reason: "status", status: 500 });
    for (const status of [404, 301, 300, 199]) {
      assert.deepEqual(answer(status, ""), { ok: false, stage: "upstream", reason: "status", status });
    }
  });
});
