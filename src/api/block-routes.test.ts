import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import { canonicalize } from "../audit/index.ts";
import type { Clock } from "../core/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerBlockRoutes } from "./block-routes.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-10-31T09:00:00Z";
const IMPORTED_AT = "2026-10-31T09:00:00.000000Z";
const MAIL_BINDING = { server: "mail", tool: "send" };

interface Def {
  effect: string;
  description?: string;
  input: unknown;
  output: unknown;
  untrusted_fields: string[];
  data_class?: string;
  untrusted_result: boolean;
  unsafe_to_retry: boolean;
}

const defI: Def = {
  effect: "read",
  description: "Fetch an invoice.",
  input: {
    type: "object",
    properties: { invoice_id: { type: "string" } },
    required: ["invoice_id"],
  },
  output: {
    type: "object",
    properties: { raw_text: { type: "string" }, vendor_name: { type: "string" } },
  },
  untrusted_fields: ["raw_text", "vendor_name"],
  data_class: "private",
  untrusted_result: false,
  unsafe_to_retry: false,
};
const defD: Def = {
  effect: "read",
  input: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
  output: { type: "object", properties: { content: { type: "string" } } },
  untrusted_fields: ["content"],
  data_class: "public",
  untrusted_result: true,
  unsafe_to_retry: false,
};
const defM: Def = {
  effect: "send",
  description: "Send a mail.",
  input: { type: "object", properties: { to: { type: "string" } } },
  output: { type: "object" },
  untrusted_fields: [],
  untrusted_result: false,
  unsafe_to_retry: true,
};
const defMB: Def = { ...defM, description: "Send a mail (tenant B)." };

function hashOf(def: Def, binding: unknown): string {
  const digest = createHash("sha256")
    .update(canonicalize({ binding, def } as never), "utf8")
    .digest("hex");
  return `sha256:${digest}`;
}

interface Session {
  cookie: string;
}

interface Harness {
  db: TestDatabase;
  server: FastifyInstance;
  alice: Session;
  bob: Session;
  cara: Session;
}

interface ErrorBody {
  error: { code: string; message: string; details?: { decisionId?: unknown } };
}

interface BlocksBody {
  items: { ref: string; def: unknown; bound: boolean; contentHash: string; importedAt: string }[];
  next_cursor: string | null;
}

const engineDirs: string[] = [];

function silentLogger() {
  return createLogger({ level: "silent", destination: silentDestination });
}

async function engineFor(clock: Clock, permitAll: boolean): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-block-routes-src-"));
  engineDirs.push(srcDir);
  return createPolicyEngine({
    srcDir,
    tenantPolicies: permitAll
      ? [{ id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' }]
      : [],
    clock,
    ids: sequentialIds(200),
    logger: silentLogger(),
  });
}

async function seed(
  db: TestDatabase,
  ctx: TenantContext,
  ref: string,
  def: Def,
  binding: unknown,
): Promise<void> {
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.block_version
         (tenant_id, ref, effect, description, input, output, untrusted_fields,
          data_class, untrusted_result, unsafe_to_retry, binding, content_hash,
          imported_by, imported_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::text[], $8, $9, $10,
               $11::jsonb, $12, 'operator:e2e-seed', $13::timestamptz)`,
      [
        ctx.tenantId,
        ref,
        def.effect,
        def.description ?? null,
        JSON.stringify(def.input),
        JSON.stringify(def.output),
        def.untrusted_fields,
        def.data_class ?? null,
        def.untrusted_result,
        def.unsafe_to_retry,
        binding === null ? null : JSON.stringify(binding),
        hashOf(def, binding),
        NOW,
      ],
    );
  });
}

async function createHarness(opts: { permitAll: boolean; keyed: boolean }): Promise<Harness> {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);
  await db.ownerPool.query(
    "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_c', 'Tenant C') ON CONFLICT DO NOTHING",
  );
  const c: TenantContext = { tenantId: "tenant_c", reviewProfile: "solo" };
  const clock = fixedClock(NOW);
  const engine = await engineFor(clock, opts.permitAll);
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
  });
  assert.doesNotThrow(() => {
    installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  }, "installPep");
  assert.doesNotThrow(() => {
    registerBlockRoutes(server, {
      pool: db.appPool,
      engineKey: opts.keyed ? { reveal: () => "k".repeat(64) } : null,
    });
  }, "registerBlockRoutes");

  await seed(db, a, "invoices.get@1", defI, null);
  await seed(db, a, "docs.fetch@1", defD, null);
  await seed(db, a, "mail.send@1", defM, MAIL_BINDING);
  await seed(db, b, "mail.send@1", defMB, MAIL_BINDING);

  const alice = await createTestSession(db, a, "alice", clock);
  const bob = await createTestSession(db, b, "bob", clock);
  const cara = await createTestSession(db, c, "cara", clock);
  return { db, server, alice, bob, cara };
}

async function closeHarness(h: Harness): Promise<void> {
  await h.server.close();
  await h.db.close();
}

function get(h: Harness, url: string, session?: Session) {
  return h.server.inject({
    method: "GET",
    url: `/api/v1/blocks${url}`,
    headers: session === undefined ? {} : { cookie: session.cookie },
  });
}

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-69798f82 alice walks her blocks two at a time", async () => {
  const h = await createHarness({ permitAll: true, keyed: true });
  try {
    const first = await get(h, "?limit=2", h.alice);
    assert.equal(first.statusCode, 200);
    const page1 = first.json() as BlocksBody;
    assert.deepEqual(
      page1.items.map((item) => item.ref),
      ["docs.fetch@1", "invoices.get@1"],
    );
    assert.equal(typeof page1.next_cursor, "string");
    assert.deepEqual(page1.items[0], {
      ref: "docs.fetch@1",
      def: defD,
      bound: false,
      contentHash: hashOf(defD, null),
      importedAt: IMPORTED_AT,
    });

    const second = await get(h, `?limit=2&cursor=${encodeURIComponent(page1.next_cursor ?? "")}`, h.alice);
    assert.equal(second.statusCode, 200);
    const page2 = second.json() as BlocksBody;
    assert.deepEqual(
      page2.items.map((item) => item.ref),
      ["mail.send@1"],
    );
    assert.equal(page2.items[0]?.bound, true);
    assert.equal(page2.next_cursor, null);

    for (const text of [first.body, second.body]) {
      assert.ok(!text.includes("binding"), "no binding in the answer");
      assert.ok(!text.includes("server"), "no server in the answer");
    }
  } finally {
    await closeHarness(h);
  }
});

test("C-69798f82 each tenant sees only its own blocks", async () => {
  const h = await createHarness({ permitAll: true, keyed: true });
  try {
    const bobs = await get(h, "", h.bob);
    assert.equal(bobs.statusCode, 200);
    const body = bobs.json() as BlocksBody;
    assert.deepEqual(
      body.items.map((item) => item.ref),
      ["mail.send@1"],
    );
    assert.equal(body.items[0]?.contentHash, hashOf(defMB, MAIL_BINDING));

    const caras = await get(h, "", h.cara);
    assert.equal(caras.statusCode, 200);
    assert.deepEqual(caras.json(), { items: [], next_cursor: null });
  } finally {
    await closeHarness(h);
  }
});

test("C-8c4615c5 a request without a session or a permit is refused", async () => {
  const h = await createHarness({ permitAll: false, keyed: true });
  try {
    const anonymous = await get(h, "");
    assert.equal(anonymous.statusCode, 401);
    assert.equal((anonymous.json() as ErrorBody).error.code, "UNAUTHENTICATED");

    const denied = await get(h, "", h.alice);
    assert.equal(denied.statusCode, 403);
    const error = (denied.json() as ErrorBody).error;
    assert.equal(error.code, "FORBIDDEN");
    assert.equal(typeof error.details?.decisionId, "string");
  } finally {
    await closeHarness(h);
  }
});

test("C-8c4615c5 bad queries and bad cursors are refused", async () => {
  const h = await createHarness({ permitAll: true, keyed: true });
  try {
    const ok = await get(h, "?limit=2", h.alice);
    assert.equal(ok.statusCode, 200);
    const cursor = (ok.json() as BlocksBody).next_cursor ?? "";
    assert.notEqual(cursor, "", "the first page has a cursor");

    for (const query of ["?limit=0", "?limit=201", "?effect=read", "?tenant_id=tenant_b", "?cursor="]) {
      const response = await get(h, query, h.alice);
      assert.equal(response.statusCode, 400, query);
      assert.equal((response.json() as ErrorBody).error.code, "VALIDATION_FAILED", query);
    }

    const foreign = await get(h, `?cursor=${encodeURIComponent(cursor)}`, h.bob);
    assert.equal(foreign.statusCode, 400);
    assert.equal((foreign.json() as ErrorBody).error.code, "CURSOR_INVALID");

    const last = cursor.endsWith("A") ? "B" : "A";
    const edited = await get(h, `?cursor=${encodeURIComponent(cursor.slice(0, -1) + last)}`, h.alice);
    assert.equal(edited.statusCode, 400);
    assert.equal((edited.json() as ErrorBody).error.code, "CURSOR_INVALID");
  } finally {
    await closeHarness(h);
  }
});

test("C-8c4615c5 a keyless server refuses a cursor or a further page", async () => {
  const h = await createHarness({ permitAll: true, keyed: false });
  try {
    for (const query of ["?limit=2", "?cursor=abc"]) {
      const response = await get(h, query, h.alice);
      assert.equal(response.statusCode, 503, query);
      assert.equal((response.json() as ErrorBody).error.code, "ENGINE_KEY_REQUIRED", query);
    }
    const whole = await get(h, "?limit=3", h.alice);
    assert.equal(whole.statusCode, 200);
    const body = whole.json() as BlocksBody;
    assert.equal(body.items.length, 3);
    assert.equal(body.next_cursor, null);
  } finally {
    await closeHarness(h);
  }
});
