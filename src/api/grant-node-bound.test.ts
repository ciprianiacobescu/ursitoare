import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { fixedClock, sequentialIds } from "../core/index.ts";
import type { GrantRecord } from "../grants/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine, defaultSrcDir } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import {
  createFlow,
  importCatalogue,
  loadRegistryCatalogue,
  saveFlowVersion,
  validateVersion,
} from "../registry/index.ts";
import type { BlockImport } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerGrantRoutes } from "./grant-routes.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

assert.equal(typeof registerGrantRoutes, "function");

const CLOCK = fixedClock("2026-11-06T09:00:00.000Z");
const BASE_URL = "http://127.0.0.1:8080";
const PATTERN = 'must match pattern "^[a-z][a-z0-9_]{0,127}$"';
const LONG = "p" + "a".repeat(127);
const TOO_LONG = "p" + "a".repeat(128);

const silentDestination: LogDestination = { write(): void {} };

const CAROL_ACTOR = { kind: "user", id: "carol" } as const;
const ALICE_ACTOR = { kind: "user", userId: "alice" } as const;

const ACME_BLOCKS: Record<string, BlockImport> = {
  "acme.lookup_vendor@1": {
    effect: "read",
    input: {
      type: "object",
      properties: { vendor_name: { type: "string" } },
      required: ["vendor_name"],
    },
    output: {
      type: "object",
      properties: { vendor_id: { type: "string" } },
      required: ["vendor_id"],
    },
  },
  "acme.create_payment@1": {
    effect: "pay",
    input: {
      type: "object",
      properties: {
        vendor_id: { type: "string" },
        amount: { type: "number" },
        currency: { type: "string" },
      },
      required: ["vendor_id", "amount", "currency"],
    },
    output: { type: "object" },
  },
};

interface FlowDoc {
  ursitoare: string;
  flow: string;
  version: string;
  inputs: Record<string, unknown>;
  start: string;
  nodes: Record<string, Record<string, unknown>>;
}

const LOOKUP_NODE: Record<string, unknown> = {
  kind: "block",
  uses: "acme.lookup_vendor@1",
  with: { vendor_name: "${{ inputs.vendor_name }}" },
  next: "approval",
};

const APPROVAL_NODE: Record<string, unknown> = {
  kind: "human.approval",
  assignee_role: "approver",
  summary: "Pay ${{ inputs.amount }} to ${{ nodes.lookup.output.vendor_id }}?",
  timeout: "PT48H",
};

const PAY_NODE: Record<string, unknown> = {
  kind: "block",
  uses: "acme.create_payment@1",
  with: {
    vendor_id: "${{ nodes.lookup.output.vendor_id }}",
    amount: "${{ inputs.amount }}",
    currency: "EUR",
  },
  next: "done",
};

const DONE_NODE: Record<string, unknown> = { kind: "end", status: "completed" };
const STOP_NODE: Record<string, unknown> = { kind: "end", status: "failed" };

function flowDoc(flow: string, payId: string): FlowDoc {
  return {
    ursitoare: "0.1",
    flow,
    version: "1.0.0",
    inputs: {
      type: "object",
      properties: { vendor_name: { type: "string" }, amount: { type: "number" } },
      required: ["vendor_name", "amount"],
    },
    start: "lookup",
    nodes: {
      lookup: LOOKUP_NODE,
      approval: {
        ...APPROVAL_NODE,
        cases: { approved: payId, rejected: "stop", timeout: "stop" },
      },
      [payId]: PAY_NODE,
      done: DONE_NODE,
      stop: STOP_NODE,
    },
  };
}

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  carol: Session;
}

async function setup(): Promise<Harness> {
  const db = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  await withTenantTx(db.appPool, a, async (tx) => {
    for (const name of ["alice", "bob", "carol"]) {
      await tx.query(
        `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, display_name)
         VALUES ($1, $2, 'human', $2)`,
        [a.tenantId, name],
      );
    }
  });
  await seedFlowActors(
    db,
    a,
    [
      { subject: "alice", roles: ["author"], teams: ["finance"] },
      { subject: "bob", roles: ["approver"], teams: ["finance"] },
      { subject: "carol", roles: ["tenant_admin"], teams: [] },
    ],
    CLOCK,
  );
  const carol = await createTestSession(db, a, "carol", CLOCK);
  await importCatalogue(db.appPool, a, ACME_BLOCKS, CAROL_ACTOR, { clock: CLOCK });
  const catalogue = await loadRegistryCatalogue(db.appPool, a);
  const flows: [string, FlowDoc][] = [
    ["pay-run", flowDoc("pay-run", "pay")],
    ["pay-long", flowDoc("pay-long", LONG)],
  ];
  await withTenantTx(db.appPool, a, async (tx) => {
    for (const [flowId, doc] of flows) {
      await createFlow(tx, a, { name: flowId, ownerTeam: "finance" }, ALICE_ACTOR, {
        clock: CLOCK,
      });
      const saved = await saveFlowVersion(
        tx,
        a,
        { flowId, format: "json", text: JSON.stringify(doc) },
        ALICE_ACTOR,
        { clock: CLOCK },
      );
      await validateVersion(
        tx,
        a,
        { flowId, hash: saved.version.hash, catalogue },
        ALICE_ACTOR,
        { clock: CLOCK },
      );
    }
  });
  return { db, a, carol };
}

async function silentServer(): Promise<FastifyInstance> {
  return buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
}

async function engineOf(): Promise<PolicyEngine> {
  return createPolicyEngine({
    srcDir: defaultSrcDir(),
    clock: CLOCK,
    ids: sequentialIds(200),
    logger: createLogger({ level: "silent", destination: silentDestination }),
  });
}

interface GrantBody {
  subject: Record<string, unknown>;
  tool: string;
  scope: Record<string, unknown>;
  args: Record<string, unknown>[];
}

function body(flowId: string, nodeId: string): GrantBody {
  return {
    subject: { kind: "role", role: "author" },
    tool: "acme.create_payment@1",
    scope: { kind: "node", flowId, nodeId },
    args: [{ arg: "amount", op: "lte", value: 1000.5 }],
  };
}

type Method = "GET" | "POST" | "DELETE";

interface Injected {
  statusCode: number;
  headers: Record<string, unknown>;
  json: () => unknown;
}

async function call(
  server: FastifyInstance,
  method: Method,
  url: string,
  session: Session,
  payload?: unknown,
): Promise<Injected> {
  const options: {
    method: Method;
    url: string;
    headers: Record<string, string>;
    payload?: object;
  } = {
    method,
    url,
    headers: { cookie: session.cookie, "x-csrf-token": session.csrfToken },
  };
  if (payload !== undefined) {
    options.payload = payload as object;
  }
  return (await server.inject(options)) as unknown as Injected;
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

function asError(res: Injected): ErrorBody["error"] {
  assert.ok(res.statusCode >= 400, `expected an error status, got ${res.statusCode}`);
  const parsed = res.json() as { error?: unknown };
  assert.ok(
    typeof parsed.error === "object" && parsed.error !== null,
    `the body of status ${res.statusCode} is an error envelope`,
  );
  return parsed.error as ErrorBody["error"];
}

async function countGrants(hx: Harness): Promise<number> {
  const rows = await withTenantTx(hx.db.appPool, hx.a, async (tx) =>
    await tx.query('SELECT count(*)::int AS count FROM ursitoare."grant"', []),
  );
  const first = rows.rows[0] as { count: number } | undefined;
  assert.ok(first !== undefined, "the grant row count is readable");
  return first.count;
}

test("C-d9e4f430 a 128 character node id is granted and a 129 character one is refused", async () => {
  const hx = await setup();
  const server = await silentServer();
  try {
    const engine = await engineOf();
    installPep(server, {
      pool: hx.db.appPool,
      engine,
      clock: CLOCK,
      publicBaseUrl: BASE_URL,
    });
    assert.doesNotThrow(() => {
      registerGrantRoutes(server, {
        pool: hx.db.appPool,
        clock: CLOCK,
        ids: sequentialIds(0),
        engineKey: { reveal: () => "k".repeat(64) },
      });
    }, "registerGrantRoutes registers the grant routes");

    const g1 = await call(server, "POST", "/api/v1/grants", hx.carol, body("pay-long", LONG));
    assert.equal(g1.statusCode, 201, "G1 the 128-character node is granted");
    const created = g1.json() as GrantRecord;
    assert.deepEqual(
      created.scope,
      { kind: "node", flowId: "pay-long", nodeId: LONG },
      "G1 the scope holds the 128-character node id",
    );
    assert.equal(created.state, "active", "G1 the grant is active");
    assert.equal(created.fingerprints.length, 1, "G1 the grant carries one fingerprint");
    assert.ok(
      created.fingerprints[0]?.startsWith("nf1_"),
      `G1 the fingerprint starts with nf1_: ${String(created.fingerprints[0])}`,
    );

    const g2 = await call(server, "POST", "/api/v1/grants", hx.carol, body("pay-run", LONG));
    assert.equal(g2.statusCode, 422, "G2 the flow that lacks the node refuses the grant");
    const g2Error = asError(g2);
    assert.equal(g2Error.code, "OPERATION_REFUSED", "G2 answers OPERATION_REFUSED");
    assert.deepEqual(g2Error.details, { reason: "node_unknown" }, "G2 names node_unknown");

    const g3 = await call(server, "POST", "/api/v1/grants", hx.carol, body("pay-run", TOO_LONG));
    assert.equal(g3.statusCode, 400, "G3 the 129-character node id is refused");
    const g3Error = asError(g3);
    assert.equal(g3Error.code, "VALIDATION_FAILED", "G3 answers VALIDATION_FAILED");
    assert.deepEqual(
      g3Error.details,
      { fields: [{ field: "body/scope/nodeId", message: PATTERN }] },
      "G3 names the node-id field and the bound",
    );

    const g4 = await call(server, "POST", "/api/v1/grants", hx.carol, body("pay-run", "Pay"));
    assert.equal(g4.statusCode, 400, "G4 an upper-case node id is refused");
    const g4Error = asError(g4);
    assert.equal(g4Error.code, "VALIDATION_FAILED", "G4 answers VALIDATION_FAILED");
    assert.deepEqual(
      g4Error.details,
      { fields: [{ field: "body/scope/nodeId", message: PATTERN }] },
      "G4 names the node-id field and the bound",
    );

    assert.equal(await countGrants(hx), 1, "after G1 to G4 exactly one grant is stored");
  } finally {
    await server.close();
    await hx.db.close();
  }
});
