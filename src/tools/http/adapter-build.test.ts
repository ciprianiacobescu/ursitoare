import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import type { CallBuild, HttpCallSpec, ToolJson } from "../calls.ts";
import { httpCallAdapter } from "./adapter.ts";

const IK = `ik1_${"c".repeat(64)}`;

const GET: HttpCallSpec = {
  kind: "http",
  method: "GET",
  path: "/v1/vendors/{vendor_id}",
  params: [
    { name: "vendor_id", in: "path" },
    { name: "expand", in: "query" },
    { name: "limit", in: "query" },
  ],
  body: false,
};
const DEL: HttpCallSpec = {
  kind: "http",
  method: "DELETE",
  path: "/v1/vendors/{vendor_id}",
  params: [{ name: "vendor_id", in: "path" }],
  body: false,
};
const POST: HttpCallSpec = { kind: "http", method: "POST", path: "/v1/vendors", params: [], body: true };
const PAGES: HttpCallSpec = { kind: "http", method: "POST", path: "/v1/pages", params: [], body: true };
const SEARCH: HttpCallSpec = {
  kind: "http",
  method: "GET",
  path: "/v1/vendors/{vendor_id}",
  params: [
    { name: "vendor_id", in: "path" },
    { name: "q", in: "query" },
    { name: "n", in: "query" },
  ],
  body: false,
};

function build(call: HttpCallSpec, args: ToolJson, key: string | null): CallBuild {
  const box: { result?: CallBuild } = {};
  assert.doesNotThrow(() => {
    box.result = httpCallAdapter.build(call, args, key);
  });
  assert.ok(box.result);
  return box.result;
}

function request(call: HttpCallSpec, args: ToolJson, key: string | null): CallBuild & { ok: true } {
  const result = build(call, args, key);
  assert.equal(result.ok, true);
  return result as CallBuild & { ok: true };
}

function digest(body: Uint8Array | null): string | null {
  return body === null ? null : createHash("sha256").update(body).digest("hex");
}

function text(body: Uint8Array | null): string | null {
  return body === null ? null : new TextDecoder().decode(body);
}

describe("httpCallAdapter build", () => {
  it("C-17c28968 W1 a templated GET has the path and accept header, with and without a key", () => {
    const args = { vendor_id: "V-ACME", expand: true, limit: 5 };
    const plain = request(GET, args, null).request;
    assert.equal(plain.method, "GET");
    assert.equal(plain.path, "/v1/vendors/V-ACME?expand=true&limit=5");
    assert.deepEqual(plain.headers, { accept: "application/json" });
    assert.equal(plain.body, null);
    const keyed = request(GET, args, IK).request;
    assert.equal(keyed.path, plain.path);
    assert.deepEqual(keyed.headers, { accept: "application/json", "idempotency-key": IK });
    assert.equal(keyed.body, null);
  });

  it("C-17c28968 W2 values are encoded, null is left out and extra arguments are dropped", () => {
    const paths = [
      [{ vendor_id: "V ACME/1", limit: 5 }, "/v1/vendors/V%20ACME%2F1?limit=5"],
      [{ vendor_id: "V-ACME", expand: null, limit: 0 }, "/v1/vendors/V-ACME?limit=0"],
      [{ vendor_id: 7, limit: 1, junk: "x" }, "/v1/vendors/7?limit=1"],
      [{ vendor_id: "%2e%2e", limit: 1 }, "/v1/vendors/%252e%252e?limit=1"],
    ] as const;
    for (const [args, path] of paths) {
      const r = request(GET, args, null).request;
      assert.equal(r.path, path);
      assert.equal(r.body, null);
      assert.equal(r.headers["content-type"], undefined);
    }
  });

  it("C-17c28968 W3 query names and values are percent-encoded", () => {
    const r = request(SEARCH, { vendor_id: "a", q: "a&b=c d?é", n: 1.5 }, null).request;
    assert.equal(r.path, "/v1/vendors/a?q=a%26b%3Dc%20d%3F%C3%A9&n=1.5");
  });

  it("C-17c28968 W4 a POST sends sorted JSON with a content type, the same with or without a key", () => {
    const args = { name: "Acme GmbH", country: null };
    const plain = request(POST, args, null).request;
    const keyed = request(POST, args, IK).request;
    const want = "fffab11972d205c21f38a33909fa8a0e9c09faf74cf90a2434d94ccaf60b956d";
    assert.equal(plain.path, "/v1/vendors");
    assert.deepEqual(plain.headers, { accept: "application/json", "content-type": "application/json" });
    assert.deepEqual(keyed.headers, {
      accept: "application/json",
      "content-type": "application/json",
      "idempotency-key": IK,
    });
    assert.equal(text(plain.body), '{"country":null,"name":"Acme GmbH"}');
    assert.equal(plain.body?.byteLength, 35);
    assert.equal(digest(plain.body), want);
    assert.equal(digest(keyed.body), want);
    assert.equal(keyed.path, plain.path);
  });

  it("C-17c28968 W5 body keys are sorted at every depth", () => {
    const r = request(POST, { name: "Acme GmbH", country: null, meta: { b: 1, a: [{ z: 1, y: 2 }] } }, null).request;
    assert.equal(text(r.body), '{"country":null,"meta":{"a":[{"y":2,"z":1}],"b":1},"name":"Acme GmbH"}');
    assert.equal(r.body?.byteLength, 70);
    assert.equal(digest(r.body), "a214622608d0193891b35608fc40f3ec0e0ccc2a2c567869c2c1f09bf3841cff");
  });

  it("C-17c28968 W6 a DELETE sends no body and no content type, only the key", () => {
    const keyed = request(DEL, { vendor_id: "V-1", junk: 1 }, IK).request;
    const plain = request(DEL, { vendor_id: "V-1", junk: 1 }, null).request;
    assert.equal(keyed.method, "DELETE");
    assert.equal(keyed.path, "/v1/vendors/V-1");
    assert.deepEqual(keyed.headers, { accept: "application/json", "idempotency-key": IK });
    assert.equal(keyed.body, null);
    assert.equal(plain.path, keyed.path);
    assert.deepEqual(plain.headers, { accept: "application/json" });
  });

  it("C-17c28968 W7 a url argument stays in the body unchanged", () => {
    const r = request(PAGES, { url: "https://Docs.Example.com/a?x=1" }, null).request;
    assert.equal(text(r.body), '{"url":"https://Docs.Example.com/a?x=1"}');
    assert.equal(r.body?.byteLength, 40);
    assert.equal(digest(r.body), "0f7b9f750d893a3d5f6c0b3db19905c4460e0299bd3343306d95d8c4e669f22e");
  });

  it("C-17c28968 arguments that are not an object are refused", () => {
    for (const args of [[], null, "x"] as ToolJson[]) {
      assert.deepEqual(build(GET, args, null), { ok: false, reason: "args_not_object" });
    }
    assert.equal(request(GET, { vendor_id: "a", limit: 1 }, null).ok, true);
  });

  it("C-17c28968 a bad path value is path_param", () => {
    const bad: ToolJson[] = [undefined as unknown as ToolJson, "", null, "..", ".", "\ud800", { a: 1 }, true];
    for (const value of bad) {
      const args = value === undefined ? { limit: 5 } : { vendor_id: value, limit: 5 };
      assert.deepEqual(build(GET, args, null), { ok: false, reason: "path_param" });
    }
    assert.equal(request(GET, { vendor_id: "a", limit: 5 }, null).ok, true);
  });

  it("C-17c28968 a bad query value is query_param", () => {
    const bad: Record<string, ToolJson>[] = [{ limit: {} }, { limit: "\ud800" }, { expand: [1] }];
    for (const extra of bad) {
      assert.deepEqual(build(GET, { vendor_id: "a", limit: 1, ...extra }, null), {
        ok: false,
        reason: "query_param",
      });
    }
    assert.equal(request(GET, { vendor_id: "a", limit: 1 }, null).ok, true);
  });

  it("C-17c28968 path and query of 2048 characters are accepted and 2049 are path_too_long", () => {
    const okDel = request(DEL, { vendor_id: "a".repeat(2036) }, null).request;
    assert.equal(okDel.path.length, 2048);
    assert.deepEqual(build(DEL, { vendor_id: "a".repeat(2037) }, null), { ok: false, reason: "path_too_long" });
    const okGet = request(SEARCH, { vendor_id: "a", q: "a".repeat(2032) }, null).request;
    assert.equal(okGet.path.length, 2048);
    assert.deepEqual(build(SEARCH, { vendor_id: "a", q: "a".repeat(2033) }, null), {
      ok: false,
      reason: "path_too_long",
    });
  });
});
