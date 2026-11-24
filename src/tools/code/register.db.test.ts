import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../../core/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../../tenancy/index.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { fixtureSurface } from "../../../test/support/tool-surface.ts";
import { kitSurface } from "../../../test/support/adapter-kit.ts";
import { approveSurface, registerToolServer } from "../store.ts";
import { registerAdapterServerTx } from "../adapter-store.ts";
import { registerCodeBlockServerTx, submitCodeBlocksTx } from "./register.ts";
import type { CodeBlockToolInput } from "./register.ts";

const CAROL = { kind: "user", id: "u_carol" } as const;
const CAROL_USER = { userId: "u_carol", kind: "user" } as const;
const DAVE = { kind: "user", id: "u_dave" } as const;
const CLOCK = fixedClock("2026-11-06T10:00:00Z");
const REGISTERED_AT = "2026-11-06T10:00:00.000000Z";

const IN_T = { type: "object", properties: { text: { type: "string" } }, required: ["text"] };
const OUT_W = { type: "object", properties: { words: { type: "integer" } }, required: ["words"] };
const SRC_WC = "return { words: input.text.trim().split(/\\s+/).length };";
const SRC_WC2 = "return { words: input.text.split(' ').length };";

const WC: CodeBlockToolInput = {
  name: "word_count",
  description: "Count the words.",
  input: IN_T as CodeBlockToolInput["input"],
  output: OUT_W as CodeBlockToolInput["output"],
  source: SRC_WC,
};
const WC2: CodeBlockToolInput = { ...WC, source: SRC_WC2 };

const D_WC = "59d11c4654e2eeb76542d2e1fcc814eb8fa1abc9c38debe573a09afa5d1d5a61";
const D_WC2 = "e014904e0bd3fa801c703f0fd769c1f5d39d773b4d8d428bc895d572ca058ed6";

const BIG_OK = "return {};" + " ".repeat(65526);
const BIG = "return {};" + " ".repeat(65527);

function register(pool: TenantPool, ctx: TenantContext, tools: readonly CodeBlockToolInput[] = [WC], id = "snips") {
  return withTenantTx(pool, ctx, (tx) => registerCodeBlockServerTx(tx, ctx, { id, tools }, CAROL, { clock: CLOCK }));
}

function submit(pool: TenantPool, ctx: TenantContext, id: string, tools: readonly CodeBlockToolInput[]) {
  return withTenantTx(pool, ctx, (tx) => submitCodeBlocksTx(tx, ctx, id, tools, DAVE, { clock: CLOCK }));
}

async function attempt(run: () => Promise<unknown>): Promise<{ code?: unknown; details?: unknown }> {
  try {
    await run();
  } catch (error) {
    const e = error as { code?: unknown; details?: unknown };
    return { code: e.code, details: e.details };
  }
  return {};
}

async function counts(pool: TenantPool, ctx: TenantContext): Promise<{ servers: number; surfaces: number; events: number }> {
  return withTenantTx(pool, ctx, async (tx) => {
    const n = async (table: string): Promise<number> => {
      const r = await tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM ursitoare.${table}`);
      return r.rows[0]?.n ?? -1;
    };
    return { servers: await n("tool_server"), surfaces: await n("tool_surface"), events: await n("audit_event") };
  });
}

async function events(pool: TenantPool, ctx: TenantContext, type: string, id: string): Promise<{ payload: unknown }[]> {
  const r = await withTenantTx(pool, ctx, (tx) =>
    tx.query<{ payload: unknown }>(
      `SELECT payload FROM ursitoare.audit_event
        WHERE event_type = $1 AND target->>'id' = $2 ORDER BY seq`,
      [type, id],
    ),
  );
  return r.rows;
}

const invalid = (field: string, reason: string): { code: string; details: unknown } => ({
  code: "TOOLS_INVALID",
  details: { field, reason },
});

test("C-548b8f7f: registerCodeBlockServerTx registers snips pending, rows R1 to R4", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    let r1: unknown;
    await assert.doesNotReject(async () => {
      r1 = await register(db.appPool, a);
    });
    assert.deepEqual(r1, {
      id: "snips",
      adapter: "code_block",
      origin: "sandbox",
      local: false,
      state: "pending",
      registeredBy: "u_carol",
      registeredAt: REGISTERED_AT,
      approvedDigest: null,
      pendingDigest: `sha256:${D_WC}`,
      pendingSubmittedBy: "u_carol",
      tools: [{ name: "word_count", effect: "read", ref: null }],
    });
    assert.deepEqual(await events(db.appPool, a, "tools.server_registered", "snips"), [
      { payload: { adapter: "code_block", origin: "sandbox" } },
    ]);

    // R2 approve
    const approved = await approveSurface(db.appPool, a, "snips", { digest: `sha256:${D_WC}`, selfApproval: true }, CAROL_USER, { clock: CLOCK });
    assert.equal(approved.server.state, "approved");
    assert.equal(approved.server.approvedDigest, `sha256:${D_WC}`);
    assert.deepEqual(approved.blocks, ["snips.word_count@1"]);
    // R3 submit WC2 by dave -> drifted
    let r3: unknown;
    await assert.doesNotReject(async () => {
      r3 = await submit(db.appPool, a, "snips", [WC2]);
    });
    const rec3 = r3 as { state: string; approvedDigest: string | null; pendingDigest: string; pendingSubmittedBy: string };
    assert.equal(rec3.state, "drifted");
    assert.equal(rec3.approvedDigest, `sha256:${D_WC}`);
    assert.equal(rec3.pendingDigest, `sha256:${D_WC2}`);
    assert.equal(rec3.pendingSubmittedBy, "u_dave");
    const submitted = await events(db.appPool, a, "tools.surface_submitted", "snips");
    assert.deepEqual(submitted[submitted.length - 1], { payload: { digest: `sha256:${D_WC2}`, drift: true } });

    // R4 again no new event
    const beforeEvents = (await events(db.appPool, a, "tools.surface_submitted", "snips")).length;
    let r4: unknown;
    await assert.doesNotReject(async () => {
      r4 = await submit(db.appPool, a, "snips", [WC2]);
    });
    const afterEvents = (await events(db.appPool, a, "tools.surface_submitted", "snips")).length;
    assert.equal(afterEvents, beforeEvents);
    assert.deepEqual(r4, r3);

    const approved2 = await approveSurface(db.appPool, a, "snips", { digest: `sha256:${D_WC2}`, selfApproval: true }, CAROL_USER, { clock: CLOCK });
    assert.deepEqual(approved2.blocks, ["snips.word_count@1"]);
  } finally {
    await db.close();
  }
});

test("C-548b8f7f: registerCodeBlockServerTx refuses bad inputs, rows F1 to F8", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const before = await counts(db.ownerPool, a);

    // F1 duplicate
    assert.deepEqual(await attempt(() => register(db.appPool, a, [WC, WC])), invalid("tools/1/name", "duplicate"));

    // F2 empty
    assert.deepEqual(await attempt(() => register(db.appPool, a, [])), invalid("tools", "size"));

    // F3 BIG
    const bigTool: CodeBlockToolInput = { ...WC, source: BIG };
    assert.deepEqual(await attempt(() => register(db.appPool, a, [bigTool])), invalid("tools/0/call/source", "bad_value"));

    // F4 U+0000
    const nulTool: CodeBlockToolInput = { ...WC, source: "return { a: 'x\u0000y' };" };
    assert.deepEqual(await attempt(() => register(db.appPool, a, [nulTool])), invalid("tools/0/call/source", "bad_value"));

    // F5 lone surrogate
    const loneTool: CodeBlockToolInput = { ...WC, source: "return { a: '\ud800' };" };
    assert.deepEqual(await attempt(() => register(db.appPool, a, [loneTool])), invalid("tools/0/call/source", "bad_value"));

    // F6 id Snips
    assert.deepEqual(await attempt(() => register(db.appPool, a, [WC], "Snips")), invalid("id", "bad_value"));

    // F7 exists
    await assert.doesNotReject(async () => { await register(db.appPool, a); });
    const afterOne = await counts(db.ownerPool, a);
    assert.equal(afterOne.servers, before.servers + 1);
    assert.deepEqual(await attempt(() => register(db.appPool, a)), { code: "TOOLS_EXISTS", details: { id: "snips" } });

    // F8 bad input schema
    const badInput: CodeBlockToolInput = { ...WC, input: { type: "nope" } as never };
    assert.deepEqual(await attempt(() => register(db.appPool, a, [badInput])), invalid("tools/0/input", "schema_invalid"));

    assert.deepEqual(await counts(db.ownerPool, a), afterOne);
  } finally {
    await db.close();
  }
});

test("C-548b8f7f: submitCodeBlocksTx refuses missing, fixture and mismatched servers, rows G1 to G3", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const team = { tenantId: a.tenantId, reviewProfile: "team" as const };

    await registerToolServer(db.appPool, team, {
      id: "acme",
      adapter: "fixture",
      origin: "https://tools.fake.test",
      local: false,
      surface: fixtureSurface(["erp.lookup_vendor@1"]),
    }, CAROL as never, { clock: CLOCK });

    await withTenantTx(db.appPool, team, (tx) =>
      registerAdapterServerTx(tx, team, {
        id: "shop",
        adapter: "http_openapi",
        origin: "https://shop.fake.test",
        local: false,
        surface: kitSurface("http"),
      }, CAROL, { clock: CLOCK }),
    );

    await assert.doesNotReject(async () => { await register(db.appPool, team); });

    const before = await counts(db.ownerPool, team);

    assert.deepEqual(await attempt(() => submit(db.appPool, team, "ghost", [WC])), {
      code: "TOOLS_NOT_FOUND",
      details: { id: "ghost" },
    });
    assert.deepEqual(await attempt(() => submit(db.appPool, team, "acme", [WC])), {
      code: "TOOLS_REFUSED",
      details: { reason: "adapter_mismatch" },
    });

    // G3 shop mismatched -> tools/0/call/kind kind_mismatch
    assert.deepEqual(await attempt(() => submit(db.appPool, team, "shop", [WC])), invalid("tools/0/call/kind", "kind_mismatch"));

    assert.deepEqual(await counts(db.ownerPool, team), before);
  } finally {
    await db.close();
  }
});

test("C-548b8f7f: BIG_OK registers pending", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const bigOkTool: CodeBlockToolInput = { ...WC, source: BIG_OK };
    let r: unknown;
    await assert.doesNotReject(async () => {
      r = await register(db.appPool, a, [bigOkTool], "big");
    });
    assert.equal((r as { state: string }).state, "pending");
  } finally {
    await db.close();
  }
});
