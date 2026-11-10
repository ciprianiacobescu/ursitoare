import assert from "node:assert/strict";
import { test } from "node:test";

import { listAuditEvents } from "../audit/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import {
  createPolicyEngine,
  defaultSrcDir,
  entityRef,
  toDecimal,
  userEntity,
  type Entity,
  type PolicyEngine,
  type PolicyRequest,
  type PrincipalEntity,
} from "../pdp/index.ts";
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
import {
  GrantsError,
  compileGrants,
  confirmGrant,
  createGrant,
  grantStatus,
  listGrants,
  reconfirmationsFor,
  revokeGrant,
} from "./index.ts";
import type { GrantDeps, GrantRecord, GrantStatus, Reconfirmation } from "./index.ts";

const CLOCK = fixedClock("2026-11-06T09:00:00.000Z");
const AT = "2026-11-06T09:00:00.000000Z";
const T = "tenant_a";

const FPA = "nf1_f24d1bc261f70ccadd830e24b3acb40edec5066462531278c03adc516dfeb51d";
const FPB = "nf1_20f87c5365e1cb05fe773dd9e4200d18670a144581e85b9f1c17918f7fda9868";

const CAROL = { kind: "user", id: "carol" } as const;
const ALICE = { kind: "user", id: "alice" } as const;
const ACTOR = { kind: "user", userId: "alice" } as const;

function G(n: number): string {
  return `grant_00000000-0000-7000-8000-${n.toString(16).padStart(12, "0")}`;
}

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

const F1_DOC: FlowDoc = {
  ursitoare: "0.1",
  flow: "pay-run",
  version: "1.0.0",
  inputs: {
    type: "object",
    properties: { vendor_name: { type: "string" }, amount: { type: "number" } },
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

function f3Doc(): FlowDoc {
  const doc = structuredClone(F1_DOC);
  delete doc.nodes["pay"];
  const approval = doc.nodes["approval"];
  assert.ok(approval !== undefined, "approval exists");
  approval["cases"] = { approved: "done", rejected: "stop", timeout: "stop" };
  return doc;
}

type CreateInput = Parameters<typeof createGrant>[2];

const NODE: CreateInput = {
  subject: { kind: "role", role: "author" },
  tool: "acme.create_payment@1",
  scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
  args: [{ arg: "amount", op: "lte", value: 1000.5 }],
};

interface Fixture {
  db: TestDatabase;
  a: TenantContext;
  b: TenantContext;
  deps: GrantDeps;
  h1: string;
  ho: string;
}

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
  const fx: Fixture = {
    db,
    a,
    b,
    h1: "",
    ho: "",
    deps: {
      ids: sequentialIds(),
      clock: CLOCK,
      catalogueFor: (ctx: TenantContext) => loadRegistryCatalogue(db.appPool, ctx),
    },
  };
  for (const name of ["pay-run", "other-flow"]) {
    await withTenantTx(db.appPool, a, (tx) =>
      createFlow(tx, a, { name, ownerTeam: "finance" }, ACTOR, { clock: CLOCK }),
    );
  }
  fx.h1 = await save(fx, "pay-run", F1_DOC, true);
  fx.ho = await save(fx, "other-flow", { ...F1_DOC, flow: "other-flow" }, true);
  return fx;
}

async function save(fx: Fixture, flowId: string, doc: FlowDoc, validate: boolean): Promise<string> {
  const catalogue = await loadRegistryCatalogue(fx.db.appPool, fx.a);
  return withTenantTx(fx.db.appPool, fx.a, async (tx) => {
    const saved = await saveFlowVersion(
      tx,
      fx.a,
      { flowId, format: "json", text: JSON.stringify(doc) },
      ACTOR,
      { clock: CLOCK },
    );
    if (validate) {
      await validateVersion(tx, fx.a, { flowId, hash: saved.version.hash, catalogue }, ACTOR, {
        clock: CLOCK,
      });
    }
    return saved.version.hash;
  });
}

async function validate(fx: Fixture, hash: string): Promise<void> {
  const catalogue = await loadRegistryCatalogue(fx.db.appPool, fx.a);
  await withTenantTx(fx.db.appPool, fx.a, async (tx) => {
    await validateVersion(tx, fx.a, { flowId: "pay-run", hash, catalogue }, ACTOR, {
      clock: CLOCK,
    });
  });
}

async function make(fx: Fixture, input: CreateInput): Promise<GrantRecord> {
  return withTenantTx(fx.db.appPool, fx.a, (tx) => createGrant(tx, fx.a, input, CAROL, fx.deps));
}

async function revoke(fx: Fixture, id: string): Promise<GrantRecord> {
  return withTenantTx(fx.db.appPool, fx.a, (tx) => revokeGrant(tx, fx.a, id, CAROL, fx.deps));
}

async function confirm(
  fx: Fixture,
  id: string,
  hash: string | null,
  actor: typeof CAROL | typeof ALICE = CAROL,
): Promise<GrantRecord> {
  return withTenantTx(fx.db.appPool, fx.a, (tx) =>
    confirmGrant(tx, fx.a, id, hash, actor, fx.deps),
  );
}

async function ok<T>(run: () => Promise<T>, label: string): Promise<T> {
  let result: T | undefined;
  await assert.doesNotReject(async () => {
    result = await run();
  }, label);
  assert.ok(result !== undefined, `${label} returns a value`);
  return result;
}

type Listed = { grant: GrantRecord; status: GrantStatus }[];

function list(fx: Fixture): Promise<Listed> {
  return ok(() => listGrants(fx.db.appPool, fx.a, { limit: 201, after: null }), "listGrants");
}

async function statuses(fx: Fixture): Promise<GrantStatus[]> {
  return (await list(fx)).map((x) => x.status);
}

function recon(fx: Fixture, from: string, to: string): Promise<Reconfirmation[]> {
  return ok(() => reconfirmationsFor(fx.db.appPool, fx.a, from, to, fx.deps), "reconfirmationsFor");
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

function request(fingerprint: string): PolicyRequest {
  const principal: PrincipalEntity = {
    tenantId: T,
    userId: "alice",
    kind: "human",
    roles: ["author"],
    teams: [],
  };
  const user = userEntity(principal);
  const flowId = `${T}/pay-run`;
  const teamId = `${T}/ops`;
  const tool = "acme.create_payment@1";
  const block: Entity = {
    uid: { type: "Block", id: `${T}/pay-run/pay` },
    attrs: { tenant: T, kind: "block", flow: entityRef("Flow", flowId) },
    parents: [],
  };
  return {
    principal: user.uid,
    action: "invoke_tool",
    resource: block.uid,
    context: {
      tool: entityRef("Tool", `${T}/${tool}`),
      args: { amount: toDecimal(10) },
      taint: [],
      run_initiator: entityRef("User", `${T}/alice`),
      sod_excluded: [],
      approvals: [],
      approvers_by_role: {},
      node_fingerprint: fingerprint,
    },
    entities: [
      user,
      { uid: { type: "Team", id: teamId }, attrs: { tenant: T }, parents: [] },
      {
        uid: { type: "Flow", id: flowId },
        attrs: { tenant: T, owner_team: entityRef("Team", teamId), reviewed: false },
        parents: [],
      },
      block,
      { uid: { type: "Tool", id: `${T}/${tool}` }, attrs: { tenant: T, effect: "pay" }, parents: [] },
    ],
  };
}

async function decisions(fx: Fixture, fingerprints: string[]): Promise<string[]> {
  const grants = (await list(fx)).map((x) => x.grant);
  const engine: PolicyEngine = await createPolicyEngine({
    srcDir: defaultSrcDir(),
    tenantPolicies: compileGrants(T, grants, { amount: "decimal" }),
    toolArgs: { amount: "decimal" },
    clock: CLOCK,
    ids: sequentialIds(),
    logger: createLogger({
      level: "silent",
      destination: {
        write(_line: string): void {},
      },
    }),
  });
  const out: string[] = [];
  for (const fp of fingerprints) {
    const decision = await engine.check(request(fp));
    assert.deepEqual(decision.errors, []);
    out.push(decision.decision);
  }
  return out;
}

async function events(fx: Fixture, eventType: string) {
  return listAuditEvents(fx.db.appPool, fx.a, {
    filter: { eventType },
    order: "asc",
    limit: 200,
  });
}

const BASE: GrantRecord = {
  id: "grant_1",
  subject: { kind: "role", role: "author" },
  tool: "acme.create_payment@1",
  scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
  args: [],
  fingerprints: [FPA],
  state: "active",
  createdBy: "carol",
  createdAt: AT,
  revokedBy: null,
  revokedAt: null,
};

test("C-84574afd: grantStatus derives revoked, needs_reconfirm and active", () => {
  const g = BASE;
  const a: GrantRecord = { ...BASE, scope: { kind: "any_step" }, fingerprints: [] };
  const r: GrantRecord = { ...BASE, state: "revoked", revokedBy: "carol", revokedAt: AT };
  const rows: [GrantRecord, string | null, GrantStatus][] = [
    [g, FPA, "active"],
    [g, FPB, "needs_reconfirm"],
    [g, null, "needs_reconfirm"],
    [a, null, "active"],
    [a, FPB, "active"],
    [r, FPA, "revoked"],
    [r, null, "revoked"],
  ];
  const got: (GrantStatus | undefined)[] = [];
  assert.doesNotThrow(() => {
    for (const [grant, latest] of rows) got.push(grantStatus(grant, latest));
  });
  assert.deepEqual(
    got,
    rows.map((row) => row[2]),
  );
});

test("C-84574afd: a validated moved step needs re-confirmation and decides by fingerprint", async () => {
  const fx = await setup();
  try {
    const created = await make(fx, NODE);
    assert.equal(created.id, G(0));
    assert.deepEqual(await list(fx), [{ grant: created, status: "active" }]);
    assert.deepEqual(created.fingerprints, [FPA]);

    const h2 = await save(fx, "pay-run", f2Doc(), false);
    assert.deepEqual(await statuses(fx), ["active"]);
    await expectError(() => reconfirmationsFor(fx.db.appPool, fx.a, fx.h1, h2, fx.deps), "GRANTS_REFUSED", {
      reason: "version_not_validated",
    });
    await expectError(() => reconfirmationsFor(fx.db.appPool, fx.a, h2, fx.h1, fx.deps), "GRANTS_REFUSED", {
      reason: "version_not_validated",
    });

    await validate(fx, h2);
    assert.deepEqual(await statuses(fx), ["needs_reconfirm"]);
    assert.deepEqual(await recon(fx, fx.h1, h2), [
      { grantId: G(0), nodeId: "pay", from: FPA, to: FPB },
    ]);
    assert.deepEqual(await recon(fx, fx.h1, fx.h1), []);
    assert.deepEqual(await decisions(fx, [FPA, FPB]), ["allow", "deny"]);
  } finally {
    await fx.db.close();
  }
});

test("C-84574afd: versioned creates, confirm and revoke move the statuses", async () => {
  const fx = await setup();
  try {
    await make(fx, NODE);
    const h2 = await save(fx, "pay-run", f2Doc(), true);

    const second = await make(fx, { ...NODE, versionHash: fx.h1 });
    assert.deepEqual(second.fingerprints, [FPA]);
    const third = await make(fx, NODE);
    assert.deepEqual(third.fingerprints, [FPB]);
    assert.deepEqual(await statuses(fx), ["needs_reconfirm", "needs_reconfirm", "active"]);
    assert.deepEqual(
      (await recon(fx, fx.h1, h2)).map((item) => item.grantId),
      [G(0), G(1)],
    );

    await revoke(fx, G(1));
    await revoke(fx, G(2));
    assert.deepEqual(await statuses(fx), ["needs_reconfirm", "revoked", "revoked"]);

    const confirmed = await confirm(fx, G(0), null, ALICE);
    assert.deepEqual(confirmed.fingerprints, [FPA, FPB]);
    assert.deepEqual(await statuses(fx), ["active", "revoked", "revoked"]);
    const log = await events(fx, "grants.confirmed");
    assert.equal(log.length, 1);
    assert.deepEqual(log[0]?.payload, { flowId: "pay-run", nodeId: "pay", fingerprint: FPB });
    assert.deepEqual(await recon(fx, fx.h1, h2), []);
    assert.deepEqual(await decisions(fx, [FPA, FPB]), ["allow", "allow"]);
    assert.deepEqual(await confirm(fx, G(0), h2), confirmed);
    assert.equal((await events(fx, "grants.confirmed")).length, 1);
  } finally {
    await fx.db.close();
  }
});

test("C-84574afd: a removed step has no latest fingerprint and a revoked grant decides nothing", async () => {
  const fx = await setup();
  try {
    await make(fx, NODE);
    const h2 = await save(fx, "pay-run", f2Doc(), true);
    await confirm(fx, G(0), null, ALICE);
    await make(fx, { ...NODE, versionHash: fx.h1 });
    await make(fx, NODE);
    await revoke(fx, G(1));
    await revoke(fx, G(2));

    const h3 = await save(fx, "pay-run", f3Doc(), true);
    assert.deepEqual(await statuses(fx), ["needs_reconfirm", "revoked", "revoked"]);
    assert.deepEqual(await recon(fx, h2, h3), [
      { grantId: G(0), nodeId: "pay", from: FPB, to: null },
    ]);
    assert.deepEqual(await recon(fx, h3, h2), []);
    await expectError(() => confirm(fx, G(0), null), "GRANTS_REFUSED", { reason: "node_unknown" });
    await expectError(() => confirm(fx, G(0), h3), "GRANTS_REFUSED", { reason: "node_unknown" });

    await revoke(fx, G(0));
    assert.deepEqual(await statuses(fx), ["revoked", "revoked", "revoked"]);
    assert.deepEqual(await decisions(fx, [FPA, FPB]), ["deny", "deny"]);
    assert.deepEqual(await recon(fx, fx.h1, h2), []);
    await expectError(() => confirm(fx, G(0), null), "GRANTS_REFUSED", { reason: "revoked" });

    const fourth = await make(fx, { ...NODE, versionHash: fx.h1 });
    assert.equal(fourth.id, G(3));
    assert.deepEqual(await recon(fx, h3, h2), [
      { grantId: G(3), nodeId: "pay", from: null, to: FPB },
    ]);
  } finally {
    await fx.db.close();
  }
});

test("C-84574afd: reconfirmationsFor refuses versions of two flows and bad hashes", async () => {
  const fx = await setup();
  try {
    await make(fx, NODE);
    const found = await recon(fx, fx.h1, fx.h1);
    assert.deepEqual(found, []);
    await expectError(
      () => reconfirmationsFor(fx.db.appPool, fx.a, fx.h1, fx.ho, fx.deps),
      "GRANTS_REFUSED",
      { reason: "not_same_flow" },
    );
    await expectError(
      () => reconfirmationsFor(fx.db.appPool, fx.a, fx.h1, "sha256:" + "1".repeat(64), fx.deps),
      "GRANTS_NOT_FOUND",
      {},
    );
    await expectError(
      () => reconfirmationsFor(fx.db.appPool, fx.a, fx.h1, "nope", fx.deps),
      "GRANTS_INVALID",
      { field: "hash" },
    );
  } finally {
    await fx.db.close();
  }
});

test("C-84574afd: listGrants pages in grant id order and refuses bad paging", async () => {
  const fx = await setup();
  try {
    await make(fx, NODE);
    await make(fx, NODE);
    await make(fx, NODE);
    await revoke(fx, G(1));

    const ids = async (limit: number, after: string | null) =>
      (await ok(() => listGrants(fx.db.appPool, fx.a, { limit, after }), "listGrants")).map(
        (x) => x.grant.id,
      );
    assert.deepEqual(await ids(1, null), [G(0)]);
    assert.deepEqual(await ids(1, G(0)), [G(1)]);
    assert.deepEqual(await ids(5, G(2)), []);

    for (const limit of [0, 202, 1.5]) {
      await expectError(
        () => listGrants(fx.db.appPool, fx.a, { limit, after: null }),
        "GRANTS_INVALID",
        { field: "limit" },
      );
    }
    await expectError(
      () => listGrants(fx.db.appPool, fx.a, { limit: 5, after: "x" }),
      "GRANTS_INVALID",
      { field: "after" },
    );
    assert.deepEqual(
      await ok(() => listGrants(fx.db.appPool, fx.b, { limit: 201, after: null }), "tenant B list"),
      [],
    );
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

test("C-84574afd: listGrants and reconfirmationsFor refuse a transaction of another tenant", async () => {
  const fx = await setup();
  try {
    const own = await ok(
      () => listGrants(fx.db.appPool, fx.a, { limit: 201, after: null }),
      "listGrants on the own pool",
    );
    assert.deepEqual(own, []);
    await expectError(
      () => listGrants(tenantBPool(), fx.a, { limit: 201, after: null }),
      "GRANTS_TENANT_MISMATCH",
      {},
    );
    await expectError(
      () => reconfirmationsFor(tenantBPool(), fx.a, fx.h1, fx.h1, fx.deps),
      "GRANTS_TENANT_MISMATCH",
      {},
    );
  } finally {
    await fx.db.close();
  }
});
