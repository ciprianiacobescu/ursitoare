import assert from "node:assert/strict";
import { test } from "node:test";

import { kitBinding } from "../../../test/support/adapter-kit.ts";
import type { ServiceTarget } from "../../credentials/index.ts";
import { callRequest, toolRequest } from "./request.ts";

const SERVICE_ID = "87caf624-f579-8435-9540-24d6eb57aeff";
const ORIGIN = "https://tools.fake.test";
const IK = "ik1_" + "c".repeat(64);

const D_LV = "ad89878ead763441ddc3bdb920c15ac97d953890d73464b6cdfc28e7a14d36ad";
const D_EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const TARGET: ServiceTarget = { serviceId: SERVICE_ID, origin: ORIGIN };

const encoder = new TextEncoder();

function result<T>(call: () => T): T {
  let value: T | undefined;
  assert.doesNotThrow(() => {
    value = call();
  });
  return value as T;
}

function expectedEgress(method: string, path: string, bodyDigest: string): unknown {
  return {
    method,
    host: new URL(ORIGIN).host,
    path,
    bodyDigest,
    serviceId: SERVICE_ID,
    ttlSeconds: 60,
  };
}

test("C-bbe52fdc callRequest builds W1 to W3 and toolRequest refuses a binding without http", () => {
  const body = encoder.encode('{"vendor_name":"Acme GmbH"}');

  const w1 = result(() =>
    callRequest(TARGET, {
      method: "POST",
      path: "/vendors/find",
      headers: { "content-type": "application/json" },
      body,
    }),
  );
  assert.deepEqual(w1, {
    request: {
      method: "POST",
      origin: ORIGIN,
      path: "/vendors/find",
      headers: { "content-type": "application/json" },
      body,
    },
    egress: expectedEgress("POST", "/vendors/find", D_LV),
  });

  const w2 = result(() =>
    callRequest(TARGET, {
      method: "GET",
      path: "/vendors/V-ACME?expand=true",
      headers: {},
      body: null,
    }),
  );
  assert.deepEqual(w2, {
    request: {
      method: "GET",
      origin: ORIGIN,
      path: "/vendors/V-ACME?expand=true",
      headers: {},
      body: null,
    },
    egress: expectedEgress("GET", "/vendors/V-ACME?expand=true", D_EMPTY),
  });

  const w3 = result(() =>
    callRequest(TARGET, {
      method: "POST",
      path: "/vendors/find",
      headers: { "content-type": "application/json", "idempotency-key": IK },
      body: encoder.encode('{"vendor_name":"Acme GmbH"}'),
    }),
  );
  assert.deepEqual(w3.egress, w1.egress);
  assert.deepEqual(w3.request.headers, {
    "content-type": "application/json",
    "idempotency-key": IK,
  });

  assert.throws(() => toolRequest(kitBinding("http"), TARGET, {}, null), {
    name: "RangeError",
    message: "toolRequest: binding has no http",
  });
});
