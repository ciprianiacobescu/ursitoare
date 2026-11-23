import assert from "node:assert/strict";
import { test } from "node:test";

import { mintkeyTenantId } from "../../gateway/index.ts";
import type { StepContext, ToolCall } from "../../interpreter/index.ts";
import type { PolicyRuntime } from "../../grants/index.ts";
import type { PolicyRequest } from "../../pdp/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import { invokeHarness } from "../../../test/support/invoke-runs/harness.ts";
import type { HarnessWrap, InvokeHarness } from "../../../test/support/invoke-runs/harness.ts";
import { startEchoUpstream } from "../../../test/support/fake-egress/index.ts";
import { SHOP_DOC, SHOP_ORIGIN, SHOP_OVERLAY } from "../../../test/support/openapi-kit.ts";
import { approveSurface } from "../store.ts";
import { registerOpenApiServerTx } from "../openapi/register.ts";
import { httpCallAdapter } from "./adapter.ts";

const T0 = "2026-11-06T10:00:00.000Z";
const S2 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
const D_SHOP = "sha256:726b207dffe2a42cb6d04fc724f06997614217038f83f37b9e8fae83614fc7ba";
const D_EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const D_W4 = "fffab11972d205c21f38a33909fa8a0e9c09faf74cf90a2434d94ccaf60b956d";
const D_W7 = "0f7b9f750d893a3d5f6c0b3db19905c4460e0299bd3343306d95d8c4e669f22e";
const IK = "ik1_" + "c".repeat(64);
const INPUT = { vendor_name: "Acme GmbH", amount: 12.5 };
const ALLOW_ALL = '@id("t-allow-all") permit (principal, action == Action::"invoke_tool", resource);';

// A stub's "not implemented" error must surface as an assertion failure, not a bare error.
async function settled<T>(what: string, fn: () => Promise<T>): Promise<T> {
  let value: T | undefined;
  let done = false;
  await assert.doesNotReject(async () => {
    value = await fn();
    done = true;
  }, what);
  assert.ok(done, `${what} resolved`);
  return value as T;
}

function ctxOf(effect: string, idemKey: string | null, extra: Record<string, unknown> = {}): StepContext {
  return {
    tenant: { tenantId: "tenant_a", reviewProfile: "solo" },
    runId: "r_1",
    lineageId: "r_1",
    flowId: "read-then-pay",
    flowHash: "sha256:" + "e".repeat(64),
    nodeId: "lookup",
    kind: "block",
    mode: "live",
    attempt: 1,
    effect,
    unsafeToRetry: effect !== "read",
    idemKey,
    principal: { userId: "alice", kind: "human" },
    now: new Date(T0),
    taint: [],
    ...extra,
  } as unknown as StepContext;
}

interface Echoed {
  method: string;
  path: string;
  query: string;
  headers: Record<string, string>;
  bodySha256: string;
}

test("C-c13efd06: an OpenAPI tool's request equals its permit, rows E1 to E5", async () => {
  const seen: PolicyRequest[] = [];
  const policy: NonNullable<HarnessWrap["policy"]> = (real) =>
    ({
      engine: Object.assign(Object.create(real.engine) as object, {
        check: async (req: PolicyRequest) => {
          seen.push(req);
          return real.engine.check(req);
        },
      }),
      toolArgs: (tenantId: string) => real.toolArgs(tenantId),
      reload: (tenantId: string) => real.reload(tenantId),
    }) as unknown as PolicyRuntime;
  const services: NonNullable<HarnessWrap["services"]> = (real) => ({
    resolve: (ctx, serverId) =>
      serverId === "shop" ? Promise.resolve({ serviceId: S2, origin: SHOP_ORIGIN }) : real.resolve(ctx, serverId),
  });
  const echo = await startEchoUpstream();
  let h: InvokeHarness | undefined;
  try {
    h = await settled("invokeHarness resolves", () =>
      invokeHarness({ calls: { http: httpCallAdapter }, services, policy }),
    );
    const harness = h;
    harness.egress.addUpstream("shop.fake.test", echo.origin);
    harness.egress.addCredentialless(S2, mintkeyTenantId("tenant_a"), SHOP_ORIGIN);
    await settled("deploy", () => harness.deploy(ALLOW_ALL));

    const registered = await settled("registerOpenApiServerTx resolves", () =>
      withTenantTx(harness.pool, harness.ctx, (tx) =>
        registerOpenApiServerTx(
          tx,
          harness.ctx,
          { id: "shop", origin: SHOP_ORIGIN, local: false, document: SHOP_DOC, overlay: SHOP_OVERLAY },
          { kind: "user", id: "u_carol" },
        ),
      ),
    );
    assert.equal(registered.pendingDigest, D_SHOP);
    const approved = await settled("approveSurface resolves", () =>
      approveSurface(
        harness.pool,
        harness.ctx,
        "shop",
        { digest: D_SHOP, selfApproval: true },
        { userId: "u_carol", kind: "user" },
      ),
    );
    assert.equal(approved.server.state, "approved");

    const run = await settled("h.start resolves", () => harness.start("H1", INPUT, "r_1"));
    const invoker = await settled("liveInvoker resolves", () => harness.path.liveInvoker(run));
    const authorize = invoker.authorize;
    assert.ok(authorize !== undefined, "the live invoker has authorize");

    let seq = 0;
    const row = async (tool: string, args: Record<string, unknown>, effect: string, key: string | null) => {
      const call: ToolCall = { tool, args: args as ToolCall["args"], nodeId: "lookup", effectSeq: seq++ };
      const ctx = ctxOf(effect, key);
      const auth = await settled("authorize resolves", () => authorize.call(invoker, call, ctx));
      const out = await settled("invoke resolves", () =>
        invoker.invoke(call, ctxOf(effect, key, { authorization: auth })),
      );
      const decisions = await harness.decisions("r_1");
      const decision = decisions.find((d) => d.decisionId === auth.decisionId);
      assert.ok(decision !== undefined, "the decision is stored");
      return { permit: decision.permit, echoed: (out as unknown as { output: Echoed }).output };
    };

    // E1
    const e1 = await row(
      "shop.get_vendor@1",
      { vendor_id: "V ACME/1", expand: true, limit: 5 },
      "read",
      IK,
    );
    assert.deepEqual(e1.permit, {
      method: "GET",
      host: "shop.fake.test",
      path: "/v1/vendors/V%20ACME%2F1?expand=true&limit=5",
      bodyDigest: D_EMPTY,
      serviceId: S2,
      ttlSeconds: 60,
    });
    assert.equal(e1.echoed.method, "GET");
    assert.equal(`${e1.echoed.path}?${e1.echoed.query}`, (e1.permit as { path: string }).path);
    assert.equal(e1.echoed.bodySha256, D_EMPTY);
    assert.equal(e1.echoed.headers["idempotency-key"], IK);
    assert.equal(e1.echoed.headers["accept"], "application/json");
    const first = harness.egress.requests()[0];
    assert.ok(first !== undefined, "the first request was forwarded");
    assert.equal(first.host, "shop.fake.test");
    assert.equal(first.outcome, "allowed");

    // E2
    const e2 = await row("shop.add_vendor@1", { name: "Acme GmbH", country: null }, "write", IK);
    assert.deepEqual(e2.permit, {
      method: "POST",
      host: "shop.fake.test",
      path: "/v1/vendors",
      bodyDigest: D_W4,
      serviceId: S2,
      ttlSeconds: 60,
    });
    assert.equal(e2.echoed.bodySha256, D_W4);
    assert.equal(e2.echoed.query, "");
    assert.equal(e2.echoed.headers["content-type"], "application/json");
    assert.equal(e2.echoed.headers["idempotency-key"], IK);

    // E3
    const e3 = await row("shop.add_vendor@1", { name: "Acme GmbH", country: null }, "write", null);
    assert.deepEqual(e3.permit, e2.permit);
    assert.equal("idempotency-key" in e3.echoed.headers, false);

    // E4
    const before = seen.length;
    const e4 = await row("shop.fetch_page@1", { url: "https://Docs.Example.com/a?x=1" }, "read", IK);
    assert.deepEqual(e4.permit, {
      method: "POST",
      host: "shop.fake.test",
      path: "/v1/pages",
      bodyDigest: D_W7,
      serviceId: S2,
      ttlSeconds: 60,
    });
    const checked = seen.slice(before).map((r) => (r as unknown as { context: { args?: unknown } }).context.args);
    assert.ok(
      checked.some(
        (a) =>
          JSON.stringify(a) ===
          JSON.stringify({ url: "https://Docs.Example.com/a?x=1", url_host: "docs.example.com" }),
      ),
      "the policy point saw url and url_host",
    );

    // E5
    const decisionsBefore = (await harness.decisions("r_1")).length;
    assert.equal(decisionsBefore, 4);
    const gatewayBefore = harness.gateway.calls.length;
    await assert.rejects(
      authorize.call(
        invoker,
        { tool: "shop.get_vendor@1", args: { vendor_id: "..", limit: 1 }, nodeId: "lookup", effectSeq: seq++ },
        ctxOf("read", null),
      ),
      (e: unknown) => {
        const err = e as { code?: unknown; details?: unknown };
        assert.equal(err.code, "INTERPRETER_TOOL_FAILED");
        assert.deepEqual(err.details, { stage: "request", reason: "path_param" });
        return true;
      },
    );
    assert.equal((await harness.decisions("r_1")).length, 4);
    assert.equal(harness.gateway.calls.length, gatewayBefore);
    assert.equal(harness.egress.requests().length, 4);

    const leaked = JSON.stringify(harness.logs()).includes(harness.egress.brokerServiceToken);
    assert.equal(leaked, false);
  } finally {
    if (h !== undefined) {
      await h.close();
    }
    await echo.close();
  }
});
