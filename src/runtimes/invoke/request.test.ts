import assert from "node:assert/strict";
import { test } from "node:test";

import { checkEgressSites } from "../../../test/arch/egress-sites.ts";
import { readSnapshot } from "../../../test/arch/sources.ts";
import type { JsonValue } from "../../authoring/index.ts";
import type { ServiceTarget } from "../../credentials/index.ts";
import type { ToolBinding } from "../../tools/index.ts";
import { blockResourceId, toolRequest } from "./request.ts";
import { INVOKE_LIMITS } from "./types.ts";

const ORIGIN = "https://tools.fake.test";
const LOOPBACK = "http://127.0.0.1:8123";
const SERVICE_ID = "87caf624-f579-8435-9540-24d6eb57aeff";
const IK = "ik1_" + "c".repeat(64);

const D_EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const D_LV = "ad89878ead763441ddc3bdb920c15ac97d953890d73464b6cdfc28e7a14d36ad";
const D_PAY = "af25dc0c3f8ca575c8b06c393f52c90967511a03d6db13a277b748379e77d4f8";
const D_N = "76aa76d553c645f69dc7fdd1677b11e51e7ea839d2d9a7e021b41af7d7cf5a06";
const D_A1 = "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862";
const D_ZOE = "ab8e8ba9b5c0468df54cf0d15eb2d34984c355c2e06c1ccb067856a0ebd95df9";

const encoder = new TextEncoder();

function bind(
  ref: string,
  tool: string,
  effect: ToolBinding["effect"],
  method: string,
  path: string,
  origin: string = ORIGIN,
): ToolBinding {
  return {
    serverId: "acme",
    origin,
    local: false,
    state: "approved",
    ref,
    tool,
    effect,
    http: { method, path },
    untrustedResult: false,
    unsafeToRetry: false,
  };
}

const LV = bind("acme.lookup_vendor@1", "lookup_vendor", "read", "POST", "/blocks/erp.lookup_vendor@1");
const PAYB = bind(
  "acme.create_payment@1",
  "create_payment",
  "pay",
  "POST",
  "/blocks/erp.create_payment@1",
);
const TARGET: ServiceTarget = { serviceId: SERVICE_ID, origin: ORIGIN };

function target(origin: string): ServiceTarget {
  return { serviceId: SERVICE_ID, origin };
}

function expectedRequest(
  method: string,
  path: string,
  headers: Record<string, string>,
  body: string | null,
  origin: string = ORIGIN,
): unknown {
  return {
    method,
    origin,
    path,
    headers,
    body: body === null ? null : encoder.encode(body),
  };
}

function expectedEgress(method: string, path: string, bodyDigest: string, origin = ORIGIN): unknown {
  return {
    method,
    host: new URL(origin).host,
    path,
    bodyDigest,
    serviceId: SERVICE_ID,
    ttlSeconds: 60,
  };
}

function result<T>(call: () => T): T {
  let value: T | undefined;
  assert.doesNotThrow(() => {
    value = call();
  });
  return value as T;
}

const TENANT = { tenantId: "tenant_a", reviewProfile: "solo" } as const;

test("C-6bc36306 toolRequest builds the V1 to V6 request and egress vectors", () => {
  const v1 = result(() => toolRequest(LV, TARGET, { vendor_name: "Acme GmbH" }, null));
  assert.deepEqual(v1, {
    request: expectedRequest(
      "POST",
      "/blocks/erp.lookup_vendor@1",
      { "content-type": "application/json" },
      '{"vendor_name":"Acme GmbH"}',
    ),
    egress: expectedEgress("POST", "/blocks/erp.lookup_vendor@1", D_LV),
  });

  const v2 = result(() =>
    toolRequest(
      PAYB,
      TARGET,
      { vendor_id: "V-ACME", amount: 12.5, currency: "EUR", reference: "inv-1" },
      IK,
    ),
  );
  assert.deepEqual(v2, {
    request: expectedRequest(
      "POST",
      "/blocks/erp.create_payment@1",
      { "content-type": "application/json", "idempotency-key": IK },
      '{"amount":12.5,"currency":"EUR","reference":"inv-1","vendor_id":"V-ACME"}',
    ),
    egress: expectedEgress("POST", "/blocks/erp.create_payment@1", D_PAY),
  });

  const v1WithKey = result(() => toolRequest(LV, TARGET, { vendor_name: "Acme GmbH" }, IK));
  assert.deepEqual(v1WithKey.egress, v1.egress);
  assert.deepEqual(v1WithKey.request.headers, {
    "content-type": "application/json",
    "idempotency-key": IK,
  });

  const status = bind("acme.status@1", "status", "read", "GET", "/blocks/status");
  const v3 = result(() => toolRequest(status, TARGET, {}, null));
  assert.deepEqual(v3, {
    request: expectedRequest("GET", "/blocks/status", {}, null),
    egress: expectedEgress("GET", "/blocks/status", D_EMPTY),
  });

  const remove = bind("acme.item@1", "item", "write", "DELETE", "/blocks/item");
  const v4 = result(() => toolRequest(remove, TARGET, {}, "k1"));
  assert.deepEqual(v4, {
    request: expectedRequest("DELETE", "/blocks/item", { "idempotency-key": "k1" }, null),
    egress: expectedEgress("DELETE", "/blocks/item", D_EMPTY),
  });

  const put = bind("acme.item@1", "item", "write", "PUT", "/blocks/item");
  const v5 = result(() => toolRequest(put, TARGET, { a: 1 }, null));
  assert.deepEqual(v5, {
    request: expectedRequest(
      "PUT",
      "/blocks/item",
      { "content-type": "application/json" },
      '{"a":1}',
    ),
    egress: expectedEgress("PUT", "/blocks/item", D_A1),
  });

  const v6 = result(() => toolRequest(LV, TARGET, { vendor_name: "Zoë" }, null));
  assert.deepEqual(v6, {
    request: expectedRequest(
      "POST",
      "/blocks/erp.lookup_vendor@1",
      { "content-type": "application/json" },
      '{"vendor_name":"Zoë"}',
    ),
    egress: expectedEgress("POST", "/blocks/erp.lookup_vendor@1", D_ZOE),
  });
});

test("C-6bc36306 toolRequest keeps the loopback host and sorts nested keys without mutating", () => {
  const localLv = bind(
    "acme.lookup_vendor@1",
    "lookup_vendor",
    "read",
    "POST",
    "/blocks/erp.lookup_vendor@1",
    LOOPBACK,
  );
  const v7 = result(() => toolRequest(localLv, target(LOOPBACK), { vendor_name: "Acme GmbH" }, null));
  assert.deepEqual(v7, {
    request: expectedRequest(
      "POST",
      "/blocks/erp.lookup_vendor@1",
      { "content-type": "application/json" },
      '{"vendor_name":"Acme GmbH"}',
      LOOPBACK,
    ),
    egress: expectedEgress("POST", "/blocks/erp.lookup_vendor@1", D_LV, LOOPBACK),
  });

  const args: JsonValue = { b: 1, a: { d: [3, { z: 1, y: 2 }], c: null } };
  const before = JSON.stringify(args);
  const v8 = result(() => toolRequest(PAYB, TARGET, args, null));
  assert.deepEqual(v8, {
    request: expectedRequest(
      "POST",
      "/blocks/erp.create_payment@1",
      { "content-type": "application/json" },
      '{"a":{"c":null,"d":[3,{"y":2,"z":1}]},"b":1}',
    ),
    egress: expectedEgress("POST", "/blocks/erp.create_payment@1", D_N),
  });
  assert.equal(JSON.stringify(args), before, "the arguments keep their key order");
});

test("C-6bc36306 blockResourceId is tenant flow node and optional hook", () => {
  assert.equal(
    result(() => blockResourceId({ tenant: TENANT, flowId: "read-then-pay", nodeId: "pay" })),
    "tenant_a/read-then-pay/pay",
  );
  assert.equal(
    result(() =>
      blockResourceId({
        tenant: TENANT,
        flowId: "hooked-pay",
        nodeId: "pay",
        hook: { phase: "post", label: "notify" },
      }),
    ),
    "tenant_a/hooked-pay/pay:post:notify",
  );
  assert.equal(
    result(() =>
      blockResourceId({
        tenant: TENANT,
        flowId: "hooked-pay",
        nodeId: "lookup",
        hook: { phase: "pre", label: "rule.audit" },
      }),
    ),
    "tenant_a/hooked-pay/lookup:pre:rule.audit",
  );
});

test("C-6bc36306 INVOKE_LIMITS fix the token ttl and the entity cap", () => {
  assert.deepEqual(INVOKE_LIMITS, { tokenTtlSeconds: 60, maxEntities: 24 });
});

test("C-2a04f1cb only request ts is an egress site of runtimes", () => {
  const violations = checkEgressSites(readSnapshot(), [
    "src/credentials/vault-call.ts",
    "src/main.ts",
  ]).filter((v) => v.file.startsWith("src/runtimes/"));
  assert.deepEqual(violations, [
    {
      code: "ARCH_EGRESS_SITE",
      file: "src/runtimes/invoke/request.ts",
      line: violations[0]?.line ?? 0,
      message:
        "src/runtimes/invoke/request.ts imports the gateway; add it to the egress-site inventory in test/arch/egress-sites.test.ts with the policy check it follows",
    },
  ]);
  assert.deepEqual(
    checkEgressSites(readSnapshot(), [
      "src/credentials/vault-call.ts",
      "src/main.ts",
      "src/runtimes/invoke/request.ts",
    ]),
    [],
  );
});
