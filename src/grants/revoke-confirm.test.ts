import assert from "node:assert/strict";
import { test } from "node:test";

import { listAuditEvents } from "../audit/index.ts";
import type { AuditEventRecord } from "../audit/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import {
  createFlow,
  importCatalogue,
  loadRegistryCatalogue,
  saveFlowVersion,
  validateVersion,
} from "../registry/index.ts";
import type { BlockImport } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { GrantsError, confirmGrant, createGrant, revokeGrant } from "./index.ts";
import type { ArgConstraint, GrantDeps, GrantRecord } from "./index.ts";

const CLOCK = fixedClock("2026-11-06T09:00:00.000Z");
const AT = "2026-11-06T09:00:00.000000Z";

const FPA = "nf1_f24d1bc261f70ccadd830e24b3acb40edec5066462531278c03adc516dfeb51d";
const FPB = "nf1_20f87c5365e1cb05fe773dd9e4200d18670a144581e85b9f1c17918f7fda9868";

const CAROL = { kind: "user", id: "carol" } as const;
const ALICE = { kind: "user", id: "alice" } as const;

function G(n: number): string {
  return `grant_00000000-0000-7000-8000-${n.toString(16).padStart(12, "0")}`;
}

const ACME_BLOCKS: Record<string, BlockImport> = {
  "acme.lookup_vendor@1": {
    effect: "read",
    input: {
      type: "object",
      properties: {
        vendor_name: { type: "string" },
        limit: { type: "integer" },
        exact: { type: "boolean" },
      },
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

const F1_DOC: FlowDoc = {
  ursitoare: "0.1",
  flow: "pay-run",
  version: "1.0.0",
  inputs: {
    type: "object",
    properties: {
      vendor_name: { type: "string" },
      amount: { type: "number" },
    },
    required: ["vendor_name", "amount"],
  },
  start: "lookup",
  nodes: {
    lookup: {
      kind: "block",
      uses: "acme.lookup_vendor@1",
      with: { vendor_name: "${{ inputs.vendor_name }}" },
      next: "approval",
    },
    approval: {
      kind: "human.approval",
      assignee_role: "approver",
      summary: "Pay ${{ inputs.amount }} to ${{ nodes.lookup.output.vendor_id }}?",
      timeout: "PT48H",
      cases: { approved: "pay", rejected: "stop", timeout: "stop" },
    },
    pay: {
      kind: "block",
      uses: "acme.create_payment@1",
      with: {
        vendor_id: "${{ nodes.lookup.output.vendor_id }}",
        amount: "${{ inputs.amount }}",
        currency: "EUR",
      },
      next: "done",
    },
    done: { kind: "end", status: "completed" },
    stop: { kind: "end", status: "failed" },
  },
};

function f2Doc(): FlowDoc {
  const doc = structuredClone(F1_DOC);
  const lookup = doc.nodes["lookup"];
  const pay = doc.nodes["pay"];
  const approval = doc.nodes["approval"];
  assert.ok(lookup !== undefined && pay !== undefined && approval !== undefined, "F1 nodes exist");
  lookup["next"] = "pay";
  pay["next"] = "approval";
  approval["summary"] = "Confirm the payment of ${{ inputs.amount }}?";
  approval["cases"] = { approved: "done", rejected: "stop", timeout: "stop" };
  return doc;
}

type CreateInput = Parameters<typeof createGrant>[2];

interface Fixture {
  db: TestDatabase;
  a: TenantContext;
  b: TenantContext;
  deps: GrantDeps;
  h2: string;
}

const NODE: CreateInput = {
  subject: { kind: "role", role: "author" },
  tool: "acme.create_payment@1",
  scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
  args: [{ arg: "amount", op: "lte", value: 1000.5 } satisfies ArgConstraint],
};

const ANY: CreateInput = {
  subject: { kind: "role", role: "author" },
  tool: "acme.lookup_vendor@1",
  scope: { kind: "any_step" },
  args: [],
};

async function setup(): Promise<Fixture> {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);

  for (const ctx of [a, b]) {
    await withTenantTx(db.appPool, ctx, async (tx) => {
      for (const who of ["alice", "bob", "carol"]) {
        await tx.query(
          `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, display_name) VALUES ($1, $2, 'human', $2)`,
          [ctx.tenantId, who],
        );
      }
      await tx.query("INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, $2)", [
        ctx.tenantId,
        "finance",
      ]);
    });
    await importCatalogue(db.appPool, ctx, ACME_BLOCKS, CAROL, { clock: CLOCK });
  }
  const catalogue = await loadRegistryCatalogue(db.appPool, a);

  let h2 = "";
  await withTenantTx(db.appPool, a, async (tx) => {
    const actor = { kind: "user", userId: "alice" } as const;
    await createFlow(tx, a, { name: "pay-run", ownerTeam: "finance" }, actor, { clock: CLOCK });
    const first = await saveFlowVersion(
      tx,
      a,
      { flowId: "pay-run", format: "json", text: JSON.stringify(F1_DOC) },
      actor,
      { clock: CLOCK },
    );
    await validateVersion(
      tx,
      a,
      { flowId: "pay-run", hash: first.version.hash, catalogue },
      actor,
      { clock: CLOCK },
    );
    const second = await saveFlowVersion(
      tx,
      a,
      { flowId: "pay-run", format: "json", text: JSON.stringify(f2Doc()) },
      actor,
      { clock: CLOCK },
    );
    h2 = second.version.hash;
  });

  const fx: Fixture = {
    db,
    a,
    b,
    h2,
    deps: {
      ids: sequentialIds(),
      clock: CLOCK,
      catalogueFor: (ctx: TenantContext) => loadRegistryCatalogue(db.appPool, ctx),
    },
  };

  // The grants of the create scenario: G(0) node, G(1) user any step, G(2) role any step.
  await make(fx, fx.a, NODE);
  await make(fx, fx.a, {
    subject: { kind: "user", userId: "bob" },
    tool: "acme.lookup_vendor@1",
    scope: { kind: "any_step" },
    args: [{ arg: "limit", op: "lte", value: 50 }],
  });
  await make(fx, fx.a, {
    ...ANY,
    args: [
      { arg: "vendor_name", op: "eq", value: "Acme" },
      { arg: "exact", op: "eq", value: true },
      { arg: "limit", op: "gte", value: -3 },
    ],
  });
  return fx;
}

async function make(fx: Fixture, ctx: TenantContext, input: CreateInput): Promise<GrantRecord> {
  return withTenantTx(fx.db.appPool, ctx, (tx) => createGrant(tx, ctx, input, CAROL, fx.deps));
}

async function ok<T>(run: () => Promise<T>, label: string): Promise<T> {
  let result: T | undefined;
  await assert.doesNotReject(async () => {
    result = await run();
  }, label);
  assert.ok(result !== undefined, `${label} returns a value`);
  return result;
}

async function revoke(
  fx: Fixture,
  ctx: TenantContext,
  id: string,
  actor: typeof CAROL | typeof ALICE = CAROL,
): Promise<GrantRecord> {
  return ok(
    () => withTenantTx(fx.db.appPool, ctx, (tx) => revokeGrant(tx, ctx, id, actor, fx.deps)),
    "revokeGrant resolves",
  );
}

async function confirm(
  fx: Fixture,
  ctx: TenantContext,
  id: string,
  versionHash: string | null,
  actor: typeof CAROL | typeof ALICE = CAROL,
): Promise<GrantRecord> {
  return ok(
    () =>
      withTenantTx(fx.db.appPool, ctx, (tx) =>
        confirmGrant(tx, ctx, id, versionHash, actor, fx.deps),
      ),
    "confirmGrant resolves",
  );
}

async function expectError(
  run: () => Promise<unknown>,
  code: GrantsError["code"],
  details: Record<string, string>,
): Promise<void> {
  await assert.rejects(run(), (error: unknown) => {
    assert.ok(error instanceof GrantsError, "the error is a GrantsError");
    assert.equal(error.code, code);
    assert.deepEqual(error.details, details);
    return true;
  });
}

async function events(
  fx: Fixture,
  eventType: string,
): Promise<AuditEventRecord[]> {
  return listAuditEvents(fx.db.appPool, fx.a, {
    filter: { eventType },
    order: "asc",
    limit: 200,
  });
}

async function grantIds(fx: Fixture, ctx: TenantContext): Promise<string[]> {
  return withTenantTx(fx.db.appPool, ctx, async (tx) => {
    const result = await tx.query<{ grant_id: string }>(
      'SELECT grant_id FROM ursitoare."grant" ORDER BY grant_id COLLATE "C"',
    );
    return result.rows.map((row) => row.grant_id);
  });
}

test("C-fe6b6186: revokeGrant revokes once and a second call appends nothing", async () => {
  const fx = await setup();
  try {
    const first = await revoke(fx, fx.a, G(2));
    assert.deepEqual(first, {
      id: G(2),
      subject: { kind: "role", role: "author" },
      tool: "acme.lookup_vendor@1",
      scope: { kind: "any_step" },
      args: [
        { arg: "vendor_name", op: "eq", value: "Acme" },
        { arg: "exact", op: "eq", value: true },
        { arg: "limit", op: "gte", value: -3 },
      ],
      fingerprints: [],
      state: "revoked",
      createdBy: "carol",
      createdAt: AT,
      revokedBy: "carol",
      revokedAt: AT,
    } satisfies GrantRecord);

    const revoked = await events(fx, "grants.revoked");
    assert.equal(revoked.length, 1);
    assert.deepEqual(revoked[0]?.actor, { kind: "user", id: "carol" });
    assert.deepEqual(revoked[0]?.target, { kind: "grant", id: G(2) });
    assert.deepEqual(revoked[0]?.payload, { tool: "acme.lookup_vendor@1" });

    const second = await revoke(fx, fx.a, G(2), ALICE);
    assert.deepEqual(second, first);
    assert.equal((await events(fx, "grants.revoked")).length, 1);
  } finally {
    await fx.db.close();
  }
});

test("C-fe6b6186: revokeGrant and confirmGrant refuse an unknown grant", async () => {
  const fx = await setup();
  try {
    await ok(() => revoke(fx, fx.a, G(1)), "revoke G(1) resolves");
    await expectError(
      () =>
        withTenantTx(fx.db.appPool, fx.a, (tx) => revokeGrant(tx, fx.a, G(99), CAROL, fx.deps)),
      "GRANTS_NOT_FOUND",
      {},
    );
    await expectError(
      () =>
        withTenantTx(fx.db.appPool, fx.a, (tx) =>
          confirmGrant(tx, fx.a, G(99), null, CAROL, fx.deps),
        ),
      "GRANTS_NOT_FOUND",
      {},
    );
  } finally {
    await fx.db.close();
  }
});

test("C-fe6b6186: confirmGrant adds the new fingerprint once", async () => {
  const fx = await setup();
  try {
    const catalogue = await loadRegistryCatalogue(fx.db.appPool, fx.a);
    await withTenantTx(fx.db.appPool, fx.a, async (tx) => {
      await validateVersion(
        tx,
        fx.a,
        { flowId: "pay-run", hash: fx.h2, catalogue },
        { kind: "user", userId: "alice" },
        { clock: CLOCK },
      );
    });

    const first = await confirm(fx, fx.a, G(0), null);
    assert.deepEqual(first.fingerprints, [FPA, FPB]);
    assert.equal(first.state, "active");

    const confirmed = await events(fx, "grants.confirmed");
    assert.equal(confirmed.length, 1);
    assert.deepEqual(confirmed[0]?.target, { kind: "grant", id: G(0) });
    assert.deepEqual(confirmed[0]?.payload, {
      flowId: "pay-run",
      nodeId: "pay",
      fingerprint: FPB,
    });

    const second = await confirm(fx, fx.a, G(0), null);
    assert.deepEqual(second, first);
    assert.equal((await events(fx, "grants.confirmed")).length, 1);
  } finally {
    await fx.db.close();
  }
});

test("C-fe6b6186: confirmGrant refuses in order and checks the version hash", async () => {
  const fx = await setup();
  try {
    await revoke(fx, fx.a, G(2));
    const attempt = (id: string, hash: string | null) => () =>
      withTenantTx(fx.db.appPool, fx.a, (tx) => confirmGrant(tx, fx.a, id, hash, CAROL, fx.deps));

    await expectError(attempt(G(1), null), "GRANTS_REFUSED", { reason: "not_node_scoped" });
    await expectError(attempt(G(2), null), "GRANTS_REFUSED", { reason: "not_node_scoped" });
    await expectError(attempt(G(0), "xyz"), "GRANTS_INVALID", { field: "versionHash" });
    await expectError(attempt(G(0), "sha256:" + "0".repeat(64)), "GRANTS_REFUSED", {
      reason: "version_not_validated",
    });
    await expectError(attempt(G(0), fx.h2), "GRANTS_REFUSED", {
      reason: "version_not_validated",
    });

    await revoke(fx, fx.a, G(0));
    await expectError(attempt(G(0), null), "GRANTS_REFUSED", { reason: "revoked" });
    assert.equal((await events(fx, "grants.confirmed")).length, 0);
  } finally {
    await fx.db.close();
  }
});

test("C-fe6b6186: tenant B cannot revoke or confirm a grant of tenant A", async () => {
  const fx = await setup();
  try {
    await ok(() => revoke(fx, fx.a, G(1)), "revoke G(1) resolves");
    await expectError(
      () =>
        withTenantTx(fx.db.appPool, fx.b, (tx) => revokeGrant(tx, fx.b, G(0), CAROL, fx.deps)),
      "GRANTS_NOT_FOUND",
      {},
    );
    await expectError(
      () =>
        withTenantTx(fx.db.appPool, fx.b, (tx) =>
          confirmGrant(tx, fx.b, G(0), null, CAROL, fx.deps),
        ),
      "GRANTS_NOT_FOUND",
      {},
    );

    const own = await make(fx, fx.b, ANY);
    assert.equal(own.id, G(3));
    assert.deepEqual(await grantIds(fx, fx.b), [G(3)]);
    assert.deepEqual(await grantIds(fx, fx.a), [G(0), G(1), G(2)]);
    const stored = await withTenantTx(fx.db.appPool, fx.a, async (tx) => {
      const result = await tx.query<{ state: string }>(
        'SELECT state FROM ursitoare."grant" WHERE grant_id = $1',
        [G(0)],
      );
      return result.rows[0]?.state;
    });
    assert.equal(stored, "active");
  } finally {
    await fx.db.close();
  }
});

function tenantBPool(): TenantPool {
  const client = {
    on(_event: string, _listener: () => void): void {},
    removeListener(_event: string, _listener: () => void): void {},
    release(_destroy?: boolean): void {},
    async query(text: string): Promise<{ rows: unknown[]; rowCount: number; command: string }> {
      if (text.includes("current_setting('app.tenant_id'")) {
        return { rows: [{ t: "tenant_b" }], rowCount: 1, command: "SELECT" };
      }
      return { rows: [], rowCount: 0, command: "SELECT" };
    },
  };
  return { connect: () => Promise.resolve(client) } as unknown as TenantPool;
}

test("C-fe6b6186: revokeGrant and confirmGrant refuse a transaction of another tenant", async () => {
  const fx = await setup();
  try {
    await ok(() => revoke(fx, fx.a, G(1)), "revoke G(1) resolves");
    await expectError(
      () =>
        withTenantTx(tenantBPool(), fx.a, (tx) => revokeGrant(tx, fx.a, G(0), CAROL, fx.deps)),
      "GRANTS_TENANT_MISMATCH",
      {},
    );
    await expectError(
      () =>
        withTenantTx(tenantBPool(), fx.a, (tx) =>
          confirmGrant(tx, fx.a, G(0), null, CAROL, fx.deps),
        ),
      "GRANTS_TENANT_MISMATCH",
      {},
    );
  } finally {
    await fx.db.close();
  }
});
