import assert from "node:assert/strict";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import { Secret } from "../config/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { createGateway, mintkeyTenantId } from "../gateway/index.ts";
import { GatewayError } from "../gateway/index.ts";
import type { Gateway } from "../gateway/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine, defaultSrcDir } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { startFakeEgress } from "../../test/support/fake-egress/index.ts";
import type { FakeEgress } from "../../test/support/fake-egress/index.ts";
import {
  FAKE_MCP_HOST,
  FAKE_MCP_ORIGIN,
  FAKE_MCP_TOOLS,
  startFakeMcp,
} from "../../test/support/fake-mcp/index.ts";
import type { FakeMcp, FakeMcpOptions, FakeMcpTool } from "../../test/support/fake-mcp/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import type { ServiceLookup } from "../tools/index.ts";
import { installPep } from "./pep.ts";
import { registerMcpToolRoutes } from "./mcp-tool-routes.ts";
import { buildServer } from "./server.ts";
import { storedIdempotentReply } from "./idempotency.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-09T10:00:00Z";
const S_ID = "87caf624-f579-8435-9540-24d6eb57aeff";
const SESSION_MESSAGE = "the MCP server needs a stateful session, which Ursitoare does not support yet";
const REGISTER_URL = "/api/v1/tool-registrations/mcp";
const DISCOVER_URL = (id: string): string => `/api/v1/tool-servers/${id}/discover`;

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface ErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  b: TenantContext;
  server: FastifyInstance;
  carol: Session;
  alice: Session;
  mallory: Session;
  mcp: FakeMcp;
  egress: FakeEgress;
  close(): Promise<void>;
}

const HDR_TOOL: FakeMcpTool = {
  name: "route_ticket",
  description: "Route a ticket",
  inputSchema: {
    type: "object",
    properties: {
      region: { type: "string", "x-mcp-header": "Region" },
      ticket: { type: "string" },
    },
    required: ["region", "ticket"],
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  result(): { text: string } {
    return { text: "ok" };
  },
};

const EXTRA_TOOL: FakeMcpTool = {
  name: "a\u0000b",
  inputSchema: { type: "object" },
  result(): { text: string } {
    return { text: "x" };
  },
};

const COLLISION_TOOL: FakeMcpTool = {
  name: "Find.Vendor",
  inputSchema: (FAKE_MCP_TOOLS[1] as FakeMcpTool).inputSchema,
  annotations: (FAKE_MCP_TOOLS[1] as FakeMcpTool).annotations ?? {},
  result(): { text: string } {
    return { text: "noted" };
  },
};

interface CreateOptions {
  pepPool?: TenantPool | null;
  depsPool?: TenantPool | null;
  gateway?: Gateway | null | "unavailable";
  policy?: PolicyEngine | null;
  services?: ServiceLookup | null | "default";
  mcpTools?: readonly FakeMcpTool[];
  mcpOpts?: FakeMcpOptions;
}

const closersByHarness: Harness[] = [];

after(async () => {
  for (const h of closersByHarness) {
    await h.close().catch(() => undefined);
  }
});

function silentLogger() {
  return createLogger({ level: "silent", destination: silentDestination });
}

async function engineFor(clock: Clock): Promise<PolicyEngine> {
  return createPolicyEngine({
    srcDir: defaultSrcDir(),
    clock,
    ids: sequentialIds(200),
    logger: silentLogger(),
  });
}

async function createHarness(opts: CreateOptions = {}): Promise<Harness> {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);
  const clock = fixedClock(NOW);
  await seedFlowActors(
    db,
    a,
    [
      { subject: "carol", roles: ["tenant_admin"], teams: [] },
      { subject: "alice", roles: ["author"], teams: [] },
    ],
    clock,
  );
  await seedFlowActors(db, b, [{ subject: "mallory", roles: ["tenant_admin"], teams: [] }], clock);

  const engine = await engineFor(clock);
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
  });
  const pepPool = opts.pepPool === undefined ? db.appPool : opts.pepPool;
  installPep(server, { pool: pepPool, engine, clock, publicBaseUrl: BASE_URL });

  const egress = await startFakeEgress({ now: () => new Date(NOW) });
  const mcp = await startFakeMcp({
    keyHeader: null,
    ...(opts.mcpOpts ?? {}),
    ...(opts.mcpTools === undefined ? {} : { tools: opts.mcpTools }),
  });
  egress.addUpstream(FAKE_MCP_HOST, mcp.origin);
  egress.addCredentialless(S_ID, mintkeyTenantId("tenant_a"), FAKE_MCP_ORIGIN);

  let gateway: Gateway | null;
  if (opts.gateway === "unavailable") {
    gateway = {
      async requestToken() {
        throw new GatewayError("GATEWAY_UNAVAILABLE", "down");
      },
      async send() {
        throw new GatewayError("GATEWAY_UNAVAILABLE", "down");
      },
    } as Gateway;
  } else if (opts.gateway === undefined) {
    gateway = createGateway(
      {
        brokerUrl: egress.brokerUrl,
        proxyUrl: egress.proxyUrl,
        brokerToken: new Secret(egress.brokerServiceToken),
        agentId: "ursitoare-engine",
        vault: null,
      },
      { clock, logger: silentLogger() },
    );
  } else {
    gateway = opts.gateway;
  }

  let services: ServiceLookup | null;
  if (opts.services === undefined || opts.services === "default") {
    services = { resolve: async () => ({ serviceId: S_ID, origin: FAKE_MCP_ORIGIN }) };
  } else {
    services = opts.services;
  }

  const policy = opts.policy === undefined ? engine : opts.policy;
  const depsPool = opts.depsPool === undefined ? db.appPool : opts.depsPool;
  const engineKey = { reveal: () => "k".repeat(64) };

  assert.doesNotThrow(() => {
    registerMcpToolRoutes(server, {
      pool: depsPool,
      clock,
      ids: sequentialIds(1000),
      engineKey,
      policy,
      gateway,
      services,
    });
  }, "registerMcpToolRoutes");

  const carol = await createTestSession(db, a, "carol", clock);
  const alice = await createTestSession(db, a, "alice", clock);
  const mallory = await createTestSession(db, b, "mallory", clock);

  const h: Harness = {
    db,
    a,
    b,
    server,
    carol,
    alice,
    mallory,
    mcp,
    egress,
    async close() {
      await server.close().catch(() => undefined);
      await mcp.close().catch(() => undefined);
      await egress.close().catch(() => undefined);
      await db.close().catch(() => undefined);
    },
  };
  closersByHarness.push(h);
  return h;
}

function send(
  h: Harness,
  method: "POST",
  url: string,
  session: Session | null,
  payload?: unknown,
  key?: string,
) {
  const headers: Record<string, string> = {};
  if (session !== null) {
    headers.cookie = session.cookie;
    headers["x-csrf-token"] = session.csrfToken;
  }
  if (key !== undefined) headers["idempotency-key"] = key;
  return h.server.inject({ method, url, headers, payload: payload as never });
}

function codeOf(body: unknown): string {
  return (body as ErrorBody).error.code;
}

function detailsOf(body: unknown): Record<string, unknown> | undefined {
  return (body as ErrorBody).error.details;
}

function messageOf(body: unknown): string {
  return (body as ErrorBody).error.message;
}

async function registerDocs(h: Harness, key?: string): Promise<ReturnType<typeof send>> {
  return send(h, "POST", REGISTER_URL, h.carol, { id: "docs", url: "https://mcp.fake.test/mcp" }, key);
}

async function insertFixtureServer(h: Harness): Promise<void> {
  await withTenantTx(h.db.appPool, h.a, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.tool_server
         (tenant_id, tool_server_id, adapter, origin, local, state, registered_by, registered_at)
       VALUES ($1, $2, 'fixture', $3, false, 'pending', 'u_carol', $4)`,
      [h.a.tenantId, "fixture", "https://mcp.fake.test", NOW],
    );
  });
}

async function countToolSurfaces(h: Harness): Promise<number> {
  const result = await withTenantTx(h.db.appPool, h.a, (tx) =>
    tx.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM ursitoare.tool_surface WHERE tenant_id = $1 AND tool_server_id = $2",
      [h.a.tenantId, "docs"],
    ),
  );
  return Number(result.rows[0]?.n ?? "-1");
}

async function countPolicyDecisions(h: Harness): Promise<number> {
  const result = await withTenantTx(h.db.appPool, h.a, (tx) =>
    tx.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM ursitoare.policy_decision WHERE tenant_id = $1",
      [h.a.tenantId],
    ),
  );
  return Number(result.rows[0]?.n ?? "-1");
}

async function countDiscoveryDecisions(h: Harness): Promise<number> {
  const result = await withTenantTx(h.db.appPool, h.a, (tx) =>
    tx.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM ursitoare.policy_decision WHERE tenant_id = $1 AND permit IS NOT NULL",
      [h.a.tenantId],
    ),
  );
  return Number(result.rows[0]?.n ?? "-1");
}

assert.equal(typeof registerMcpToolRoutes, "function");
assert.equal(typeof storedIdempotentReply, "function");

test("C-df36af10 T6 discover returns a modern surface and a second overlay changes the digest", async () => {
  const h = await createHarness();
  try {
    const reg = await registerDocs(h);
    assert.equal(reg.statusCode, 201);

    const first = await send(h, "POST", DISCOVER_URL("docs"), h.carol, {});
    assert.equal(first.statusCode, 200);
    const firstBody = first.json() as {
      era: string;
      protocolVersion: string;
      excluded: unknown[];
      server: { state: string; pendingDigest: string; tools: { name: string; effect: string; ref: unknown }[] };
    };
    assert.equal(firstBody.era, "modern");
    assert.equal(firstBody.protocolVersion, "2026-07-28");
    assert.deepEqual(firstBody.excluded, []);
    assert.equal(firstBody.server.state, "pending");
    assert.match(firstBody.server.pendingDigest, /^sha256:[0-9a-f]{64}$/);
    assert.deepEqual(
      firstBody.server.tools.map((tool) => ({ name: tool.name, effect: tool.effect, ref: tool.ref })),
      [
        { name: "find_vendor", effect: "write", ref: null },
        { name: "log_note", effect: "write", ref: null },
      ],
    );
    const firstDigest = firstBody.server.pendingDigest;

    const second = await send(h, "POST", DISCOVER_URL("docs"), h.carol, {
      tools: { find_vendor: { effect: "read" } },
    });
    assert.equal(second.statusCode, 200);
    const secondBody = second.json() as {
      server: { pendingDigest: string; tools: { name: string; effect: string }[] };
    };
    assert.equal(
      secondBody.server.tools.find((tool) => tool.name === "find_vendor")?.effect,
      "read",
    );
    assert.notEqual(secondBody.server.pendingDigest, firstDigest);
  } finally {
    await h.close();
  }
});

test("C-df36af10 T6b an idempotent replay sends nothing extra", async () => {
  const h = await createHarness({ mcpTools: [...FAKE_MCP_TOOLS, EXTRA_TOOL] });
  try {
    const reg = await registerDocs(h);
    assert.equal(reg.statusCode, 201);

    const first = await send(h, "POST", DISCOVER_URL("docs"), h.carol, {}, "k1");
    assert.equal(first.statusCode, 200);
    assert.deepEqual(first.json().excluded, [{ name: "a?b", reason: "name_invalid" }]);

    const replay = await send(h, "POST", DISCOVER_URL("docs"), h.carol, {}, "k1");
    assert.equal(replay.statusCode, 200);
    assert.deepEqual(replay.json(), first.json());
    assert.equal(replay.headers["idempotent-replayed"], "true");
    assert.equal(h.mcp.requests().length, 2);
  } finally {
    await h.close();
  }
});

test("C-df36af10 T7 a non-mcp server is refused as adapter_mismatch", async () => {
  const h = await createHarness();
  try {
    await insertFixtureServer(h);
    const res = await send(h, "POST", DISCOVER_URL("fixture"), h.carol, {});
    assert.equal(res.statusCode, 422);
    assert.equal(codeOf(res.json()), "OPERATION_REFUSED");
    assert.equal(detailsOf(res.json())?.reason, "adapter_mismatch");
  } finally {
    await h.close();
  }
});

test("C-df36af10 T8 a missing service is credential_missing", async () => {
  const h = await createHarness({ services: { resolve: async () => null } });
  try {
    const reg = await registerDocs(h);
    assert.equal(reg.statusCode, 201);
    const res = await send(h, "POST", DISCOVER_URL("docs"), h.carol, {});
    assert.equal(res.statusCode, 422);
    assert.equal(codeOf(res.json()), "OPERATION_REFUSED");
    assert.equal(detailsOf(res.json())?.reason, "credential_missing");
  } finally {
    await h.close();
  }
});

test("C-df36af10 T9 a session-issuing legacy server is refused", async () => {
  const h = await createHarness({ mcpOpts: { era: "legacy", session: true } });
  try {
    const reg = await registerDocs(h);
    assert.equal(reg.statusCode, 201);
    const res = await send(h, "POST", DISCOVER_URL("docs"), h.carol, {});
    assert.equal(res.statusCode, 422);
    assert.equal(codeOf(res.json()), "OPERATION_REFUSED");
    assert.equal(detailsOf(res.json())?.reason, "mcp_session_required");
    assert.equal(messageOf(res.json()), SESSION_MESSAGE);
  } finally {
    await h.close();
  }
});

test("C-df36af10 T10 a server with only an excluded tool yields no_tools", async () => {
  const h = await createHarness({ mcpTools: [HDR_TOOL] });
  try {
    const reg = await registerDocs(h);
    assert.equal(reg.statusCode, 201);
    const res = await send(h, "POST", DISCOVER_URL("docs"), h.carol, {});
    assert.equal(res.statusCode, 422);
    assert.equal(codeOf(res.json()), "OPERATION_REFUSED");
    assert.equal(detailsOf(res.json())?.reason, "no_tools");
    assert.deepEqual(detailsOf(res.json())?.excluded, [
      { name: "route_ticket", reason: "x_mcp_header" },
    ]);
  } finally {
    await h.close();
  }
});

test("C-df36af10 T11 colliding tool names are refused", async () => {
  const h = await createHarness({ mcpTools: [FAKE_MCP_TOOLS[0] as FakeMcpTool, COLLISION_TOOL] });
  try {
    const reg = await registerDocs(h);
    assert.equal(reg.statusCode, 201);
    const res = await send(h, "POST", DISCOVER_URL("docs"), h.carol, {});
    assert.equal(res.statusCode, 422);
    assert.equal(codeOf(res.json()), "OPERATION_REFUSED");
    assert.equal(detailsOf(res.json())?.reason, "name_collision");
    assert.equal(detailsOf(res.json())?.names, "find_vendor,Find.Vendor");
  } finally {
    await h.close();
  }
});

test("C-df36af10 T12 an overlay entry for a missing tool is not_listed", async () => {
  const h = await createHarness();
  try {
    const reg = await registerDocs(h);
    assert.equal(reg.statusCode, 201);
    const res = await send(h, "POST", DISCOVER_URL("docs"), h.carol, {
      tools: { nope: {} },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as {
      excluded: { name: string; reason: string }[];
      server: { tools: { name: string }[] };
    };
    assert.deepEqual(body.excluded, [{ name: "nope", reason: "not_listed" }]);
    assert.equal(body.server.tools.length, 2);
  } finally {
    await h.close();
  }
});

test("C-df36af10 T13 a gateway that is unavailable returns 503", async () => {
  const h = await createHarness({ gateway: "unavailable" });
  try {
    const reg = await registerDocs(h);
    assert.equal(reg.statusCode, 201);
    const res = await send(h, "POST", DISCOVER_URL("docs"), h.carol, {});
    assert.equal(res.statusCode, 503);
    assert.equal(codeOf(res.json()), "EGRESS_UNAVAILABLE");
    assert.equal(detailsOf(res.json())?.reason, "gateway_unavailable");
    assert.equal(h.mcp.requests().length, 0);
  } finally {
    await h.close();
  }
});

test("C-df36af10 T14 null dependencies return discovery_not_configured", async () => {
  const nullCases: CreateOptions[] = [{ policy: null }, { gateway: null }, { services: null }];
  for (const opts of nullCases) {
    const h = await createHarness(opts);
    try {
      const res = await send(h, "POST", DISCOVER_URL("docs"), h.carol, {});
      assert.equal(res.statusCode, 503, JSON.stringify(opts));
      assert.equal(codeOf(res.json()), "EGRESS_UNAVAILABLE", JSON.stringify(opts));
      assert.equal(detailsOf(res.json())?.reason, "discovery_not_configured", JSON.stringify(opts));
      assert.equal(h.mcp.requests().length, 0, JSON.stringify(opts));
    } finally {
      await h.close();
    }
  }
});

test("C-df36af10 T14b a null pool is AUTHZ_UNAVAILABLE on both routes", async () => {
  const h = await createHarness({ depsPool: null });
  try {
    const reg = await send(h, "POST", REGISTER_URL, h.carol, {
      id: "docs",
      url: "https://mcp.fake.test/mcp",
    });
    assert.equal(reg.statusCode, 503);
    assert.equal(codeOf(reg.json()), "AUTHZ_UNAVAILABLE");

    const disc = await send(h, "POST", DISCOVER_URL("docs"), h.carol, {});
    assert.equal(disc.statusCode, 503);
    assert.equal(codeOf(disc.json()), "AUTHZ_UNAVAILABLE");
    assert.equal(h.mcp.requests().length, 0);

    const rows = await withTenantTx(h.db.ownerPool, h.a, (tx) =>
      tx.query<{ n: string }>(
        "SELECT count(*)::text AS n FROM ursitoare.mcp_server WHERE tenant_id = $1",
        [h.a.tenantId],
      ),
    );
    assert.equal(Number(rows.rows[0]?.n ?? "-1"), 0);
  } finally {
    await h.close();
  }
});

test("C-df36af10 T15 an idempotent replay reads the stored body", async () => {
  const h = await createHarness();
  try {
    const reg = await registerDocs(h);
    assert.equal(reg.statusCode, 201);

    const first = await send(h, "POST", DISCOVER_URL("docs"), h.carol, {}, "k1");
    assert.equal(first.statusCode, 200);
    const decisionsBefore = await countPolicyDecisions(h);
    assert.equal(await countDiscoveryDecisions(h), 2);
    const replay = await send(h, "POST", DISCOVER_URL("docs"), h.carol, {}, "k1");
    assert.equal(replay.statusCode, 200);
    assert.deepEqual(replay.json(), first.json());
    assert.equal(replay.headers["idempotent-replayed"], "true");
    assert.equal(h.mcp.requests().length, 2);
    assert.equal(await countToolSurfaces(h), 1);
    assert.equal(await countPolicyDecisions(h), decisionsBefore + 1);
    assert.equal(await countDiscoveryDecisions(h), 2);

    const reused = await send(h, "POST", DISCOVER_URL("docs"), h.carol, {
      tools: { find_vendor: { effect: "read" } },
    }, "k1");
    assert.equal(reused.statusCode, 422);
    assert.equal(codeOf(reused.json()), "IDEMPOTENCY_KEY_REUSED");
    assert.equal(h.mcp.requests().length, 2);
  } finally {
    await h.close();
  }
});
