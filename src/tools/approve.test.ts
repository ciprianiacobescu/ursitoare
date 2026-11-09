import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../core/clock.ts";
import type { Clock } from "../core/clock.ts";
import type { BlockImport } from "../registry/block-input.ts";
import { importCatalogue } from "../registry/block-store.ts";
import type { TenantContext } from "../tenancy/context.ts";
import { withTenantTx } from "../tenancy/tx.ts";
import type { TenantPool } from "../tenancy/tx.ts";
import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixtureSurface } from "../../test/support/tool-surface.ts";
import { approveSurface, getToolServer, registerToolServer } from "./store.ts";
import type { ToolServerRecord, ToolSurface } from "./types.ts";

assert.equal(typeof approveSurface, "function");

const ORIGIN = "https://tools.fake.test";
const ALICE = { kind: "user", id: "u_alice" } as const;
const ALICE_APPROVER = { userId: "u_alice", kind: "user" } as const;
const DAVE = { userId: "u_dave", kind: "user" } as const;
const REGISTERED_AT = "2026-11-06T10:00:00.000000Z";
const ZERO = `sha256:${"0".repeat(64)}`;

const D_A = "sha256:347725d7d6171586139eba5892b32b2b2ff6b25a556e8cbb2bca57c0624db7d9";
const D_ONE = "sha256:b9abc02155ff61abbcbfdccbda174b71a0502bd2597072ce6e5d6584e08818aa";
const D_ONE_T = "sha256:dfd7d562dae0c64d5452e722adb05a3d15ce87e468c64b8dc6ff8556a3e9c814";
const H_LV_F = "sha256:995af4085de7518f271b1881877eaee8c6bb10caf610793d10898dccf97d16e8";
const H_PAY = "sha256:a31f60cf684faacb19e103ebdf2f8a19c674db56704c9ac68d19166e61de095b";

const LV = "erp.lookup_vendor@1";
const CP = "erp.create_payment@1";
const SURF_A: ToolSurface = fixtureSurface([LV, CP], {
  untrustedResult: { [LV]: false, [CP]: false },
});
const SURF_ONE: ToolSurface = fixtureSurface([LV], { untrustedResult: { [LV]: false } });
const SURF_ONE_T: ToolSurface = fixtureSurface([LV]);

const REC_APPROVED_A: ToolServerRecord = {
  id: "acme",
  adapter: "fixture",
  origin: ORIGIN,
  local: false,
  state: "approved",
  registeredBy: "u_alice",
  registeredAt: REGISTERED_AT,
  approvedDigest: D_A,
  pendingDigest: null,
  pendingSubmittedBy: null,
  tools: [
    { name: "lookup_vendor", effect: "read", ref: "acme.lookup_vendor@1" },
    { name: "create_payment", effect: "pay", ref: "acme.create_payment@1" },
  ],
};

const REC_APPROVED_ONE: ToolServerRecord = {
  id: "beta",
  adapter: "fixture",
  origin: ORIGIN,
  local: false,
  state: "approved",
  registeredBy: "u_alice",
  registeredAt: REGISTERED_AT,
  approvedDigest: D_ONE,
  pendingDigest: null,
  pendingSubmittedBy: null,
  tools: [{ name: "lookup_vendor", effect: "read", ref: "beta.lookup_vendor@1" }],
};

interface MutableClock extends Clock {
  advance(seconds: number): void;
}

function mutableClock(startIso: string): MutableClock {
  let millis = Date.parse(startIso);
  return {
    now: (): Date => new Date(millis),
    advance(seconds: number): void {
      millis += seconds * 1000;
    },
  };
}

function statementText(query: unknown): string {
  if (typeof query === "string") return query;
  const text = (query as { text?: unknown } | null)?.text;
  return typeof text === "string" ? text : "";
}

function proxyPool(
  base: TenantPool,
  onQuery: (text: string) => Promise<void> | undefined,
): TenantPool {
  const wrapped = {
    async connect() {
      const client = await base.connect();
      return new Proxy(client, {
        get(target, property, receiver) {
          if (property === "query") {
            const raw = target as unknown as {
              query: (query: unknown, values?: unknown) => Promise<unknown>;
            };
            return async (query: unknown, values?: unknown): Promise<unknown> => {
              const action = onQuery(statementText(query));
              if (action !== undefined) await action;
              return raw.query(query, values);
            };
          }
          const value = Reflect.get(target, property, receiver) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    },
  };
  return wrapped as unknown as TenantPool;
}

function rejectingPool(base: TenantPool, matches: (text: string) => boolean): TenantPool {
  return proxyPool(base, (text) =>
    matches(text) ? Promise.reject(new Error("injected")) : undefined,
  );
}

function racingPool(
  base: TenantPool,
  matches: (text: string) => boolean,
  before: () => Promise<void>,
): TenantPool {
  let fired = false;
  return proxyPool(base, (text) => {
    if (fired || !matches(text)) return undefined;
    fired = true;
    return before();
  });
}

interface BlockRow {
  ref: string;
  binding: unknown;
  content_hash: string;
  imported_by: string;
}

async function blockRows(db: TestDatabase, ctx: TenantContext): Promise<BlockRow[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const { rows } = await tx.query<BlockRow>(
      `SELECT ref, binding, content_hash, imported_by FROM ursitoare.block_version
       ORDER BY ref COLLATE "C"`,
    );
    return rows;
  });
}

interface AuditRow {
  event_type: string;
  target: unknown;
  payload: unknown;
}

async function auditRows(
  db: TestDatabase,
  ctx: TenantContext,
  prefix: string,
): Promise<AuditRow[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const { rows } = await tx.query<AuditRow>(
      `SELECT event_type, target, payload FROM ursitoare.audit_event
       WHERE event_type LIKE $1 ORDER BY seq`,
      [`${prefix}%`],
    );
    return rows;
  });
}

interface SurfaceApproval {
  approved_by: string | null;
  approved_at_set: boolean;
  self_approved: boolean | null;
}

async function surfaceApproval(
  db: TestDatabase,
  ctx: TenantContext,
  serverId: string,
  digest: string,
): Promise<SurfaceApproval | undefined> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const { rows } = await tx.query<SurfaceApproval>(
      `SELECT approved_by, (approved_at IS NOT NULL) AS approved_at_set, self_approved
         FROM ursitoare.tool_surface
        WHERE tenant_id = $1 AND tool_server_id = $2 AND surface_digest = $3`,
      [ctx.tenantId, serverId, digest],
    );
    return rows[0];
  });
}

function registerInput(
  id: string,
  surface: ToolSurface,
): {
  id: string;
  adapter: "fixture";
  origin: string;
  local: boolean;
  surface: ToolSurface;
} {
  return { id, adapter: "fixture", origin: ORIGIN, local: false, surface };
}

function refusal(reason: string): { code: string; details: { reason: string } } {
  return { code: "TOOLS_REFUSED", details: { reason } };
}

test("C-59cbd279: a team refuses the submitter, a solo tenant needs the flag, and every refusal writes nothing", async () => {
  const db = await withTestDatabase();
  try {
    const seeded = await seedTwoTenants(db);
    const solo: TenantContext = { tenantId: seeded.a.tenantId, reviewProfile: "solo" };
    const team: TenantContext = { tenantId: seeded.a.tenantId, reviewProfile: "team" };
    const clock = fixedClock("2026-11-06T10:00:00Z");

    const acme = await registerToolServer(
      db.appPool,
      solo,
      registerInput("acme", SURF_A),
      ALICE,
      { clock },
    );
    assert.equal(acme.state, "pending");
    assert.equal(acme.pendingDigest, D_A);
    const beta = await registerToolServer(
      db.appPool,
      solo,
      registerInput("beta", SURF_ONE),
      ALICE,
      { clock },
    );
    assert.equal(beta.pendingDigest, D_ONE);

    await assert.rejects(
      approveSurface(
        db.appPool,
        team,
        "acme",
        { digest: D_A, selfApproval: true },
        ALICE_APPROVER,
        { clock },
      ),
      refusal("approver_is_submitter"),
    );
    await assert.rejects(
      approveSurface(
        db.appPool,
        team,
        "acme",
        { digest: ZERO, selfApproval: false },
        DAVE,
        { clock },
      ),
      refusal("digest_mismatch"),
    );
    await assert.rejects(
      approveSurface(
        db.appPool,
        solo,
        "beta",
        { digest: D_ONE, selfApproval: false },
        ALICE_APPROVER,
        { clock },
      ),
      refusal("self_approval_required"),
    );
    await assert.rejects(
      approveSurface(
        db.appPool,
        solo,
        "nope",
        { digest: D_A, selfApproval: false },
        DAVE,
        { clock },
      ),
      { code: "TOOLS_NOT_FOUND", details: { id: "nope" } },
    );

    const refusedBlocks = (await blockRows(db, solo)).filter(
      (row) => row.ref.startsWith("acme.") || row.ref.startsWith("beta."),
    );
    assert.deepEqual(refusedBlocks, []);
    assert.deepEqual(await auditRows(db, solo, "tools.surface_"), []);

    let selfApproved: Awaited<ReturnType<typeof approveSurface>> | undefined;
    await assert.doesNotReject(async () => {
      selfApproved = await approveSurface(
        db.appPool,
        solo,
        "beta",
        { digest: D_ONE, selfApproval: true },
        ALICE_APPROVER,
        { clock },
      );
    });
    assert.ok(selfApproved !== undefined, "the flagged solo approval resolves");
    assert.deepEqual(selfApproved.blocks, ["beta.lookup_vendor@1"]);
    assert.deepEqual(selfApproved.server, REC_APPROVED_ONE);
    assert.deepEqual(await surfaceApproval(db, solo, "beta", D_ONE), {
      approved_by: "u_alice",
      approved_at_set: true,
      self_approved: true,
    });
    const selfEvents = await auditRows(db, solo, "tools.surface_self_approved");
    assert.equal(selfEvents.length, 1);
    assert.deepEqual(selfEvents[0]?.payload, {
      digest: D_ONE,
      refs: ["beta.lookup_vendor@1"],
    });

    let approvedA: Awaited<ReturnType<typeof approveSurface>> | undefined;
    await assert.doesNotReject(async () => {
      approvedA = await approveSurface(
        db.appPool,
        team,
        "acme",
        { digest: D_A, selfApproval: false },
        DAVE,
        { clock },
      );
    });
    assert.ok(approvedA !== undefined, "a second admin's approval resolves");
    assert.deepEqual(approvedA.blocks, [
      "acme.create_payment@1",
      "acme.lookup_vendor@1",
    ]);
    assert.deepEqual(approvedA.server, REC_APPROVED_A);
    assert.deepEqual(await surfaceApproval(db, solo, "acme", D_A), {
      approved_by: "u_dave",
      approved_at_set: true,
      self_approved: false,
    });
    const approvedEvents = await auditRows(db, solo, "tools.surface_approved");
    assert.equal(approvedEvents.length, 1);
    assert.deepEqual(approvedEvents[0]?.payload, {
      digest: D_A,
      refs: ["acme.create_payment@1", "acme.lookup_vendor@1"],
    });

    await assert.rejects(
      approveSurface(
        db.appPool,
        team,
        "acme",
        { digest: D_A, selfApproval: false },
        DAVE,
        { clock },
      ),
      refusal("nothing_pending"),
    );
  } finally {
    await db.close();
  }
});

test("C-6d84e4c8: approval imports bound blocks, and a repeat completes after a failed second step", async () => {
  const db = await withTestDatabase();
  try {
    const seeded = await seedTwoTenants(db);
    const solo: TenantContext = { tenantId: seeded.a.tenantId, reviewProfile: "solo" };
    const team: TenantContext = { tenantId: seeded.a.tenantId, reviewProfile: "team" };
    const clock = mutableClock("2026-11-06T10:00:00Z");

    const catalogue = loadTestCatalogue();
    const blocks: Record<string, BlockImport> = {};
    for (const ref of catalogue.blockRefs()) {
      const def = catalogue.block(ref);
      assert.ok(def !== undefined, `the test catalogue holds ${ref}`);
      blocks[ref] = def;
    }
    const report = await importCatalogue(
      db.appPool,
      solo,
      blocks,
      { kind: "system", id: "operator:e2e-seed" },
      { clock },
    );
    assert.equal(report.imported.length, 20);
    const originals = new Map((await blockRows(db, solo)).map((row) => [row.ref, row]));
    assert.equal(originals.size, 20);

    await registerToolServer(db.appPool, solo, registerInput("acme", SURF_A), ALICE, { clock });
    let approvedA: Awaited<ReturnType<typeof approveSurface>> | undefined;
    await assert.doesNotReject(async () => {
      approvedA = await approveSurface(
        db.appPool,
        team,
        "acme",
        { digest: D_A, selfApproval: false },
        DAVE,
        { clock },
      );
    });
    assert.ok(approvedA !== undefined, "dave approves acme in a team");
    assert.deepEqual(approvedA.blocks, [
      "acme.create_payment@1",
      "acme.lookup_vendor@1",
    ]);

    const afterAcme = await blockRows(db, solo);
    assert.equal(afterAcme.length, 22);
    assert.deepEqual(
      afterAcme.find((row) => row.ref === "acme.lookup_vendor@1"),
      {
        ref: "acme.lookup_vendor@1",
        binding: { server: "acme", tool: "lookup_vendor" },
        content_hash: H_LV_F,
        imported_by: "u_dave",
      },
    );
    assert.deepEqual(
      afterAcme.find((row) => row.ref === "acme.create_payment@1"),
      {
        ref: "acme.create_payment@1",
        binding: { server: "acme", tool: "create_payment" },
        content_hash: H_PAY,
        imported_by: "u_dave",
      },
    );
    for (const [ref, row] of originals) {
      assert.deepEqual(afterAcme.find((stored) => stored.ref === ref), row);
    }

    await registerToolServer(db.appPool, solo, registerInput("gamma", SURF_ONE), ALICE, {
      clock,
    });
    const failing = rejectingPool(db.appPool, (text) =>
      /UPDATE ursitoare\.tool_surface/.test(text),
    );
    await assert.rejects(
      approveSurface(
        failing,
        team,
        "gamma",
        { digest: D_ONE, selfApproval: false },
        DAVE,
        { clock },
      ),
      /injected/,
    );
    const pendingGamma = await getToolServer(db.appPool, solo, "gamma");
    assert.ok(pendingGamma !== null, "gamma exists");
    assert.equal(pendingGamma.state, "pending");
    assert.equal(pendingGamma.pendingDigest, D_ONE);
    const gammaBlocks = await blockRows(db, solo);
    assert.equal(gammaBlocks.length, 23);
    assert.deepEqual(
      gammaBlocks.find((row) => row.ref === "gamma.lookup_vendor@1")?.binding,
      { server: "gamma", tool: "lookup_vendor" },
    );

    let repeat: Awaited<ReturnType<typeof approveSurface>> | undefined;
    await assert.doesNotReject(async () => {
      repeat = await approveSurface(
        db.appPool,
        team,
        "gamma",
        { digest: D_ONE, selfApproval: false },
        DAVE,
        { clock },
      );
    });
    assert.ok(repeat !== undefined, "the repeat completes");
    assert.equal(repeat.server.state, "approved");
    assert.equal(repeat.server.approvedDigest, D_ONE);
    assert.equal((await blockRows(db, solo)).length, 23);
    const gammaImports = (await auditRows(db, solo, "registry.block_imported")).filter(
      (row) => (row.target as { id?: string }).id === "gamma.lookup_vendor@1",
    );
    assert.equal(gammaImports.length, 1);

    await registerToolServer(db.appPool, solo, registerInput("delta", SURF_ONE), ALICE, {
      clock,
    });
    const rivalPool = racingPool(
      db.appPool,
      (text) => text.includes("ursitoare:block_import:"),
      async () => {
        await withTenantTx(db.ownerPool, solo, async (tx) => {
          await tx.query(
            `INSERT INTO ursitoare.block_version
               (tenant_id, ref, effect, description, input, output, untrusted_fields, data_class,
                untrusted_result, unsafe_to_retry, binding, content_hash, imported_by, imported_at)
             VALUES ($1, 'delta.lookup_vendor@1', 'read', 'rival', '{"type":"object"}'::jsonb,
                     '{"type":"object"}'::jsonb, '{}'::text[], NULL, false, false,
                     '{"server":"delta","tool":"lookup_vendor"}'::jsonb, $2, 'u_rival', $3)`,
            [solo.tenantId, ZERO, clock.now()],
          );
        });
      },
    );
    await assert.rejects(
      approveSurface(
        rivalPool,
        team,
        "delta",
        { digest: D_ONE, selfApproval: false },
        DAVE,
        { clock },
      ),
      refusal("ref_conflict"),
    );
    const pendingDelta = await getToolServer(db.appPool, solo, "delta");
    assert.ok(pendingDelta !== null, "delta exists");
    assert.equal(pendingDelta.state, "pending");
    assert.equal((await blockRows(db, solo)).length, 24);

    await registerToolServer(db.appPool, team, registerInput("zeta", SURF_ONE), ALICE, {
      clock,
    });
    const zetaPool = racingPool(
      db.appPool,
      (text) => /ursitoare\.tool_server[\s\S]*FOR UPDATE/.test(text),
      async () => {
        clock.advance(1);
        await withTenantTx(db.ownerPool, team, async (tx) => {
          await tx.query(
            `INSERT INTO ursitoare.tool_surface
               (tenant_id, tool_server_id, surface_digest, surface, submitted_by, submitted_at,
                approved_by, approved_at, self_approved)
             VALUES ($1, 'zeta', $2, $3::jsonb, 'u_dave', $4, NULL, NULL, NULL)`,
            [team.tenantId, D_ONE_T, JSON.stringify(SURF_ONE_T), clock.now()],
          );
        });
      },
    );
    await assert.rejects(
      approveSurface(
        zetaPool,
        team,
        "zeta",
        { digest: D_ONE, selfApproval: false },
        DAVE,
        { clock },
      ),
      refusal("digest_mismatch"),
    );
    const pendingZeta = await getToolServer(db.appPool, solo, "zeta");
    assert.ok(pendingZeta !== null, "zeta exists");
    assert.equal(pendingZeta.state, "pending");
    assert.equal(pendingZeta.pendingDigest, D_ONE_T);
    assert.equal(pendingZeta.pendingSubmittedBy, "u_dave");
    assert.equal(pendingZeta.approvedDigest, null);
    const zetaBlocks = await blockRows(db, solo);
    assert.equal(zetaBlocks.length, 25);
    assert.deepEqual(
      zetaBlocks.find((row) => row.ref === "zeta.lookup_vendor@1")?.binding,
      { server: "zeta", tool: "lookup_vendor" },
    );
    const zetaSurfaces = await withTenantTx(db.appPool, solo, async (tx) => {
      const { rows } = await tx.query<{ approved_by: string | null }>(
        `SELECT approved_by FROM ursitoare.tool_surface
          WHERE tenant_id = $1 AND tool_server_id = 'zeta'`,
        [solo.tenantId],
      );
      return rows;
    });
    assert.equal(zetaSurfaces.length, 2);
    assert.ok(zetaSurfaces.every((row) => row.approved_by === null));
    const zetaApproved = (await auditRows(db, solo, "tools.surface_approved")).filter(
      (row) => (row.target as { id?: string }).id === "zeta",
    );
    assert.deepEqual(zetaApproved, []);
  } finally {
    await db.close();
  }
});
