import assert from "node:assert/strict";
import { test } from "node:test";

import { canonicalJson, requestDigest, sha256Hex } from "./digest.ts";
import type { PolicyRequest } from "./types.ts";

const FALLBACK_DIGEST = "2f600a98a05b66eadd93b11605e6f82102236a634f91a7fa74df0dea6da97caf";

function baseRequest(): PolicyRequest {
  return {
    principal: { type: "User", id: "alice" },
    action: "read",
    resource: { type: "Doc", id: "d1" },
    context: { n: 0, tool: { __entity: { type: "Tool", id: "mail" } } },
    entities: [{ uid: { type: "User", id: "alice" }, attrs: {}, parents: [] }],
  };
}

test("C-c797dcfe canonical form", () => {
  assert.doesNotThrow(() => {
    assert.equal(
      canonicalJson({ b: 1, a: [2, { d: null, c: "x" }], e: undefined }),
      '{"a":[2,{"c":"x","d":null}],"b":1}',
    );
    assert.equal(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

test("C-1366d87a unsupported values", () => {
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  const deepRoot: Record<string, unknown> = {};
  let deep = deepRoot;
  for (let i = 0; i < 65; i += 1) {
    const next: Record<string, unknown> = {};
    deep.next = next;
    deep = next;
  }
  const unsupported = [Number.NaN, Number.POSITIVE_INFINITY, 1n, new Date(), () => 1, [undefined], cyclic, deepRoot];
  for (const value of unsupported) {
    assert.throws(() => canonicalJson(value), TypeError);
  }
});

test("C-f1ea76a1 a request digest", () => {
  const base = baseRequest();
  assert.doesNotThrow(() => {
    assert.equal(requestDigest(base), "d509c5be45e2f1c03edbba166c6de537dcd669d297f23cbb9eb538fe3a8be716");
    const withExtra = { ...base, extra: true } as PolicyRequest;
    assert.equal(requestDigest(withExtra), "d509c5be45e2f1c03edbba166c6de537dcd669d297f23cbb9eb538fe3a8be716");
    const withEgress: PolicyRequest = {
      ...base,
      egress: {
        method: "POST",
        host: "api.example.test",
        path: "/v1/send",
        bodyDigest: "a".repeat(64),
        serviceId: "svc_mail",
        ttlSeconds: 60,
      },
    };
    assert.notEqual(requestDigest(withEgress), "d509c5be45e2f1c03edbba166c6de537dcd669d297f23cbb9eb538fe3a8be716");
    const twoEntities: PolicyRequest = {
      ...base,
      entities: [...base.entities, { uid: { type: "Doc", id: "d2" }, attrs: {}, parents: [] }],
    };
    const reversed: PolicyRequest = { ...twoEntities, entities: [...twoEntities.entities].reverse() };
    assert.notEqual(requestDigest(reversed), requestDigest(twoEntities));
  });
});

test("C-50195607 a request that cannot be serialised still has a digest", () => {
  const bigintContext: PolicyRequest = { ...baseRequest(), context: { n: 1n } };
  const throwingContext = baseRequest();
  Object.defineProperty(throwingContext, "context", {
    enumerable: true,
    configurable: true,
    get(): never {
      throw new Error("boom");
    },
  });
  assert.doesNotThrow(() => {
    assert.equal(requestDigest(bigintContext), FALLBACK_DIGEST);
    assert.equal(requestDigest(throwingContext), FALLBACK_DIGEST);
    assert.equal(requestDigest(null as unknown as PolicyRequest), FALLBACK_DIGEST);
  });
});
