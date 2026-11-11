import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

import type { Gateway } from "../../gateway/index.ts";
import type { StepContext, ToolCall, ToolInvoker } from "../../interpreter/index.ts";
import type { RunRecord } from "../../runs/index.ts";
import type { ToolBinding } from "../../tools/index.ts";
import { invokeHarness } from "../../../test/support/invoke-runs/harness.ts";
import type { HarnessWrap, InvokeHarness } from "../../../test/support/invoke-runs/harness.ts";

const T0 = "2026-11-06T10:00:00.000Z";
const S = "87caf624-f579-8435-9540-24d6eb57aeff";
const S_LOCAL = "5b0c6a1e-2f3d-4e5a-9b7c-1d2e3f4a5b6c";
const LOCAL_ORIGIN = "https://local.fake.test";
const D_LV = "ad89878ead763441ddc3bdb920c15ac97d953890d73464b6cdfc28e7a14d36ad";
const INPUT = { vendor_name: "Acme GmbH", amount: 12.5 };
const TENANT_ID = "tenant_a";
const LOOKUP_OK = { vendor_id: "V-ACME", status: "active", payment_terms_days: 30 };
const ALLOW_ALL =
  '@id("t-allow-all") permit (principal, action == Action::"invoke_tool", resource);';

const LOOKUP: ToolCall = {
  tool: "acme.lookup_vendor@1",
  args: { vendor_name: "Acme GmbH" },
  nodeId: "lookup",
  effectSeq: 0,
};

const LV: ToolBinding = {
  serverId: "acme",
  origin: "https://tools.fake.test",
  local: false,
  state: "approved",
  ref: "acme.lookup_vendor@1",
  tool: "lookup_vendor",
  effect: "read",
  http: { method: "POST", path: "/blocks/erp.lookup_vendor@1" },
  untrustedResult: false,
  unsafeToRetry: false,
};

function localBinding(ref: string, path: string): ToolBinding {
  return { ...LV, ref, origin: LOCAL_ORIGIN, http: { method: "GET", path } };
}

const LOCAL_ROUTES: Readonly<Record<string, ToolBinding>> = {
  "acme.found@1": localBinding("acme.found@1", "/found"),
  "acme.text@1": localBinding("acme.text@1", "/text"),
  "acme.array@1": localBinding("acme.array@1", "/array"),
};

function ctxOf(extra: Record<string, unknown> = {}): StepContext {
  return {
    tenant: { tenantId: TENANT_ID, reviewProfile: "solo" },
    runId: "r_1",
    lineageId: "r_1",
    flowId: "read-then-pay",
    flowHash: "sha256:" + "e".repeat(64),
    nodeId: "lookup",
    kind: "block",
    mode: "live",
    attempt: 1,
    effect: "read",
    unsafeToRetry: false,
    idemKey: null,
    principal: { userId: "alice", kind: "human" },
    now: new Date(T0),
    taint: [],
    ...extra,
  } as StepContext;
}

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

interface Local {
  server: Server;
  seen: string[];
}

async function startLocal(): Promise<Local> {
  const seen: string[] = [];
  const server = createServer((req, res) => {
    seen.push(req.url ?? "");
    if (req.url === "/found") {
      res.writeHead(302, { location: "/elsewhere" }).end();
    } else if (req.url === "/text") {
      res.writeHead(200, { "content-type": "text/plain" }).end("ok");
    } else if (req.url === "/array") {
      res.writeHead(200, { "content-type": "application/json" }).end("[1]");
    } else {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, seen };
}

interface Rig {
  h: InvokeHarness;
  invoker: ToolInvoker;
  local: Local;
  close(): Promise<void>;
}

async function rig(wrap: HarnessWrap = {}): Promise<Rig> {
  const local = await startLocal();
  const { port } = local.server.address() as AddressInfo;
  const withLocal: HarnessWrap = {
    ...wrap,
    tools: (real) => {
      const inner = wrap.tools?.(real) ?? real;
      return {
        resolve: (ctx, ref) => {
          const own = LOCAL_ROUTES[ref];
          return own !== undefined ? Promise.resolve(own) : inner.resolve(ctx, ref);
        },
      };
    },
    services: (real) => {
      const inner = wrap.services?.(real) ?? real;
      return {
        resolve: (ctx, serverId) =>
          serverId === "local"
            ? Promise.resolve({ serviceId: S_LOCAL, origin: LOCAL_ORIGIN })
            : inner.resolve(ctx, serverId),
      };
    },
  };
  const h = await settled("invokeHarness resolves", () => invokeHarness(withLocal));
  h.egress.addUpstream("local.fake.test", `http://127.0.0.1:${port}`);
  await settled("deploy", () => h.deploy(ALLOW_ALL));
  const run: RunRecord = await settled("h.start resolves", () => h.start("H1", INPUT, "r_1"));
  const invoker = await settled("liveInvoker resolves", () => h.path.liveInvoker(run));
  return {
    h,
    invoker,
    local,
    async close() {
      await h.close();
      await new Promise<void>((resolve) => local.server.close(() => resolve()));
    },
  };
}

// The fake egress keys its routes by the gateway's tenant id, which a token it issued carries:
// one warm-up call reads it, then the records are cleared.
async function addLocalService(r: Rig): Promise<void> {
  const call = { ...LOOKUP };
  const auth = await authorized(r, call);
  await settled("warm-up invoke", () => invokeOf(r, ctxOf({ authorization: auth })));
  const token = r.h.egress.issued()[0];
  assert.ok(token !== undefined, "the warm-up issued a token");
  r.h.egress.addCredentialless(S_LOCAL, token.tenantId, LOCAL_ORIGIN);
  r.h.egress.clearRecords();
  r.h.tools.reset();
}

async function authorized(r: Rig, call: ToolCall = LOOKUP) {
  assert.ok(r.invoker.authorize !== undefined, "the live invoker has authorize");
  return settled("authorize resolves", () =>
    (r.invoker.authorize as NonNullable<ToolInvoker["authorize"]>)(call, ctxOf()),
  );
}

interface Failure {
  code?: unknown;
  message?: unknown;
  details?: unknown;
}

async function failsWith(
  p: Promise<unknown>,
  code: string,
  details: Record<string, string>,
  message: string,
): Promise<void> {
  await assert.rejects(p, (e: unknown) => {
    const err = e as Failure;
    assert.equal(err.code, code);
    assert.equal(err.message, message);
    assert.deepEqual(err.details, details);
    return true;
  });
}

const FAILED = (details: Record<string, string>) =>
  [details, "node execution failed"] as const;

function invokeOf(r: Rig, ctx: StepContext): Promise<{ output: unknown }> {
  return Promise.resolve().then(
    () => r.invoker.invoke(LOOKUP, ctx) as unknown as Promise<{ output: unknown }>,
  );
}

test("C-17a3e8b7 a granted read is sent as one brokered request, row C1", async () => {
  const r = await rig();
  try {
    const auth = await authorized(r);
    const out = await settled("invoke resolves", () =>
      invokeOf(r, ctxOf({ authorization: auth })),
    );
    assert.deepEqual(out, { output: LOOKUP_OK });
    const issued = r.h.egress.issued();
    assert.equal(issued.length, 1);
    const token = issued[0];
    assert.ok(token !== undefined);
    assert.equal(token.serviceId, S);
    assert.equal(token.agentId, "ursitoare-engine");
    assert.equal(token.ttlSeconds, 60);
    const calls = r.h.tools.calls();
    assert.equal(calls.length, 1);
    const call = calls[0];
    assert.ok(call !== undefined);
    assert.equal(call.callHeader, "r_1:lookup:1");
    assert.equal(call.host, "tools.fake.test");
    assert.equal(call.path, "/blocks/erp.lookup_vendor@1");
    assert.equal(call.bodySha256, D_LV);
  } finally {
    await r.close();
  }
});

test("C-17a3e8b7 an upstream status other than 2xx fails the call, rows C2 and C3", async () => {
  const r = await rig();
  try {
    for (const status of [500, 404]) {
      r.h.tools.failNext("erp.lookup_vendor@1", status);
      const auth = await authorized(r);
      const p = invokeOf(r, ctxOf({ authorization: auth }));
      await failsWith(
        p,
        "INTERPRETER_TOOL_FAILED",
        ...FAILED({ stage: "upstream", status: String(status) }),
      );
    }
    const text = JSON.stringify(r.h.logs());
    assert.ok(!text.includes("brokerServiceToken"));
    assert.ok(!text.includes("injected_failure"));
  } finally {
    await r.close();
  }
});

test("C-17a3e8b7 a redirect is not followed and a non JSON body fails, rows C4 to C6", async () => {
  const r = await rig();
  try {
    await addLocalService(r);
    const rows: [string, Record<string, string>][] = [
      ["acme.found@1", { stage: "upstream", status: "302" }],
      ["acme.text@1", { stage: "response", reason: "not_json" }],
      ["acme.array@1", { stage: "response", reason: "not_json" }],
    ];
    for (const [tool, details] of rows) {
      const call = { ...LOOKUP, tool };
      const auth = await authorized(r, call);
      await failsWith(
        Promise.resolve().then(() => r.invoker.invoke(call, ctxOf({ authorization: auth }))),
        "INTERPRETER_TOOL_FAILED",
        ...FAILED(details),
      );
    }
    assert.deepEqual(r.local.seen, ["/found"]);
  } finally {
    await r.close();
  }
});

function refusing(over: Partial<Gateway>): NonNullable<HarnessWrap["gateway"]> {
  return (real) => ({
    requestToken: (permit, tag) => real.requestToken(permit, tag),
    send: (permit, request, token, tag) => real.send(permit, request, token, tag),
    ...over,
  });
}

test("C-17a3e8b7 a rejected token request fails at the token stage, row C7", async () => {
  const r = await rig({
    gateway: refusing({
      requestToken: () => Promise.reject(Object.assign(new Error("denied"), { code: "GATEWAY_X" })),
    }),
  });
  try {
    const auth = await authorized(r);
    await failsWith(
      invokeOf(r, ctxOf({ authorization: auth })),
      "INTERPRETER_TOOL_FAILED",
      ...FAILED({ stage: "token" }),
    );
    assert.equal(r.h.egress.issued().length, 0);
    assert.equal(r.h.tools.calls().length, 0);
  } finally {
    await r.close();
  }
});

test("C-17a3e8b7 a rejected send fails at the send stage, row C8", async () => {
  const r = await rig({
    gateway: refusing({ send: () => Promise.reject(new TypeError("fetch failed")) }),
  });
  try {
    const auth = await authorized(r);
    await failsWith(
      invokeOf(r, ctxOf({ authorization: auth })),
      "INTERPRETER_TOOL_FAILED",
      ...FAILED({ stage: "send" }),
    );
    assert.equal(r.h.tools.calls().length, 0);
  } finally {
    await r.close();
  }
});

test("C-17a3e8b7 a missing or copied authorization is unauthorized, row C9", async () => {
  const r = await rig();
  try {
    const auth = await authorized(r);
    const before = r.h.gateway.calls.length;
    const unauthorized = [
      "INTERPRETER_TOOL_DENIED",
      { reason: "unauthorized" },
      'tool call of "lookup" is not permitted (unauthorized)',
    ] as const;
    await failsWith(invokeOf(r, ctxOf()), unauthorized[0], unauthorized[1], unauthorized[2]);
    await failsWith(
      invokeOf(r, ctxOf({ authorization: { ...auth } })),
      unauthorized[0],
      unauthorized[1],
      unauthorized[2],
    );
    assert.equal(r.h.gateway.calls.length, before);
    assert.equal(r.h.egress.issued().length, 0);
    const out = await settled("the genuine authorization still works", () =>
      invokeOf(r, ctxOf({ authorization: auth })),
    );
    assert.deepEqual(out, { output: LOOKUP_OK });
  } finally {
    await r.close();
  }
});

test("C-17a3e8b7 an authorization is consumed by its invoke, row C10", async () => {
  const r = await rig();
  try {
    const auth = await authorized(r);
    const ctx = ctxOf({ authorization: auth });
    const first = await settled("first invoke", () => invokeOf(r, ctx));
    assert.deepEqual(first, { output: LOOKUP_OK });
    await failsWith(
      invokeOf(r, ctx),
      "INTERPRETER_TOOL_DENIED",
      { reason: "unauthorized" },
      'tool call of "lookup" is not permitted (unauthorized)',
    );
    assert.equal(r.h.egress.issued().length, 1);
    assert.equal(r.h.gateway.calls.filter((c) => (c as { op: string }).op === "send").length, 1);
  } finally {
    await r.close();
  }
});
