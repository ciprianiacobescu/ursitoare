import assert from "node:assert/strict";
import { test } from "node:test";

import { callHeader } from "./client.ts";
import { bodyDigest, permitMatches } from "./digest.ts";
import { mintkeyTenantId } from "./tenant.ts";
import type { CallTag, OutboundRequest } from "./types.ts";
import type { Egress } from "../pdp/index.ts";

const S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
const D_BODY = "0e9900c914ed43a1be38e237e918e29501562e302390f970957dd30a83a41966";
const D_EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const BODY = new TextEncoder().encode('{"vendor_name":"ACME"}');

const TAG: CallTag = { tenantId: "tenant_a", runId: "r_1", nodeId: "lookup", attempt: 1 };

const BASE_EGRESS: Egress = {
  method: "POST",
  host: "tools.fake.test",
  path: "/v1/lookup?id=7",
  bodyDigest: D_BODY,
  serviceId: S1,
  ttlSeconds: 60,
};

const REQ: OutboundRequest = {
  method: "POST",
  origin: "https://tools.fake.test",
  path: "/v1/lookup?id=7",
  headers: { "x-caller": "2" },
  body: BODY,
};

function requestWith(change: Partial<OutboundRequest>): OutboundRequest {
  return { ...REQ, ...change };
}

function permitWith(change: Partial<Egress>): Egress {
  return { ...BASE_EGRESS, ...change };
}

test("C-187a76ab mintkeyTenantId derives the frozen UUIDv8 tenant ids", () => {
  assert.doesNotThrow(() => {
    assert.equal(mintkeyTenantId("tenant_a"), "d7f4eeba-9f57-8892-b4bb-591d220496d4");
    assert.equal(mintkeyTenantId("tenant_b"), "93baa9da-a394-803d-800c-bf45c3375469");
    assert.equal(mintkeyTenantId("tenant_a"), "d7f4eeba-9f57-8892-b4bb-591d220496d4");
    assert.equal(mintkeyTenantId("tenant_b"), "93baa9da-a394-803d-800c-bf45c3375469");

    const uuid8 = /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    assert.match(mintkeyTenantId("tenant_a"), uuid8);
    assert.match(mintkeyTenantId("tenant_b"), uuid8);
  });
});

test("C-187a76ab bodyDigest hashes null and empty as the empty digest and a body as its sha256", () => {
  assert.doesNotThrow(() => {
    assert.equal(bodyDigest(null), D_EMPTY);
    assert.equal(bodyDigest(new Uint8Array(0)), D_EMPTY);
    assert.equal(bodyDigest(BODY), D_BODY);
    assert.equal(bodyDigest(Buffer.from(BODY)), D_BODY);
  });
});

test("C-187a76ab callHeader joins run node and attempt", () => {
  assert.doesNotThrow(() => {
    assert.equal(callHeader(TAG), "r_1:lookup:1");
    assert.equal(callHeader({ ...TAG, attempt: 12 }), "r_1:lookup:12");
  });
});

test("C-187a76ab permitMatches accepts equal method host path and digest", () => {
  assert.doesNotThrow(() => {
    assert.equal(permitMatches(BASE_EGRESS, REQ), true);
    assert.equal(permitMatches(BASE_EGRESS, requestWith({ origin: "https://Tools.Fake.Test" })), true);
    assert.equal(permitMatches(BASE_EGRESS, requestWith({ origin: "https://tools.fake.test:443" })), true);
    assert.equal(permitMatches(BASE_EGRESS, requestWith({ origin: "http://tools.fake.test/ignored" })), true);
    assert.equal(
      permitMatches(
        permitWith({ host: "tools.fake.test:8443" }),
        requestWith({ origin: "https://tools.fake.test:8443" }),
      ),
      true,
    );
    assert.equal(permitMatches(permitWith({ bodyDigest: D_EMPTY }), requestWith({ body: null })), true);
    assert.equal(permitMatches(permitWith({ bodyDigest: D_EMPTY }), requestWith({ body: new Uint8Array(0) })), true);
  });
});

test("C-187a76ab permitMatches rejects any method host path or digest difference and an unparsable origin", () => {
  assert.doesNotThrow(() => {
    assert.equal(permitMatches(BASE_EGRESS, requestWith({ method: "post" })), false);
    assert.equal(permitMatches(BASE_EGRESS, requestWith({ origin: "https://tools.fake.test:8443" })), false);
    assert.equal(permitMatches(BASE_EGRESS, requestWith({ origin: "https://other.fake.test" })), false);
    assert.equal(permitMatches(BASE_EGRESS, requestWith({ origin: "https://tools.fake.test.evil.test" })), false);
    assert.equal(permitMatches(BASE_EGRESS, requestWith({ origin: "not a url" })), false);
    assert.equal(permitMatches(BASE_EGRESS, requestWith({ origin: "" })), false);
    assert.equal(
      permitMatches(permitWith({ host: "tools.fake.test:8443" }), requestWith({ origin: "https://tools.fake.test" })),
      false,
    );
    assert.equal(permitMatches(BASE_EGRESS, requestWith({ path: "/v1/lookup?id=8" })), false);
    assert.equal(
      permitMatches(BASE_EGRESS, requestWith({ body: new TextEncoder().encode('{"vendor_name":"ACMF"}') })),
      false,
    );
    assert.equal(permitMatches(BASE_EGRESS, requestWith({ body: null })), false);
  });
});
