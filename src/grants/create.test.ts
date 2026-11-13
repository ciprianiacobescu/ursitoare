import assert from "node:assert/strict";
import { test } from "node:test";

import { AuditError, listAuditEvents } from "../audit/index.ts";
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
import { GrantsError, createGrant } from "./index.ts";
import type { ArgConstraint, GrantDeps, GrantRecord } from "./index.ts";
import type { AuditEventRecord } from "../audit/index.ts";

const CLOCK = fixedClock("2026-11-06T09:00:00.000Z");
const AT = "2026-11-06T09:00:00.000000Z";

const FPA = "nf1_f24d1bc261f70ccadd830e24b3acb40edec5066462531278c03adc516dfeb51d";

const CAROL = { kind: "user", id: "carol" } as const;

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
        tags: { type: "array", items: { type: "string" } },
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
  "acme.odd_args@1": {
    effect: "read",
    input: {
      type: "object",
      properties: {
        "Vendor-Id": { type: "string" },
        vendor_ok: { type: "string" },
      },
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
type Actor = Parameters<typeof createGrant>[3];

interface Fixture {
  db: TestDatabase;
  a: TenantContext;
  b: TenantContext;
  deps: GrantDeps;
  h1: string;
  h2: string;
}

function nodeInput(args: ArgConstraint[] = []): CreateInput {
  return {
    subject: { kind: "role", role: "author" },
    tool: "acme.create_payment@1",
    scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
    args,
  };
}

function anyInput(args: ArgConstraint[] = [], tool = "acme.lookup_vendor@1"): CreateInput {
  return {
    subject: { kind: "role", role: "author" },
    tool,
    scope: { kind: "any_step" },
    args,
  };
}

async function setup(): Promise<Fixture> {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);

  await withTenantTx(db.appPool, a, async (tx) => {
    for (const who of ["alice", "bob", "carol"]) {
      await tx.query(
        `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, display_name) VALUES ($1, $2, 'human', $2)`,
        [a.tenantId, who],
      );
    }
    await tx.query("INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, $2)", [
      a.tenantId,
      "finance",
    ]);
  });

  await importCatalogue(db.appPool, a, ACME_BLOCKS, { kind: "user", id: "carol" }, { clock: CLOCK });
  const catalogue = await loadRegistryCatalogue(db.appPool, a);

  let h1 = "";
  let h2 = "";
  await withTenantTx(db.appPool, a, async (tx) => {
    const actor = { kind: "user", userId: "alice" } as const;
    await createFlow(tx, a, { name: "pay-run", ownerTeam: "finance" }, actor, { clock: CLOCK });
    await createFlow(tx, a, { name: "empty-flow", ownerTeam: "finance" }, actor, { clock: CLOCK });

    const first = await saveFlowVersion(
      tx,
      a,
      { flowId: "pay-run", format: "json", text: JSON.stringify(F1_DOC) },
      actor,
      { clock: CLOCK },
    );
    h1 = first.version.hash;
    await validateVersion(
      tx,
      a,
      { flowId: "pay-run", hash: h1, catalogue },
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

  return {
    db,
    a,
    b,
    h1,
    h2,
    deps: {
      ids: sequentialIds(),
      clock: CLOCK,
      catalogueFor: (ctx: TenantContext) => loadRegistryCatalogue(db.appPool, ctx),
    },
  };
}

async function create(
  fx: Fixture,
  input: CreateInput,
  actor: Actor = CAROL,
  deps: GrantDeps = fx.deps,
): Promise<GrantRecord> {
  let record: GrantRecord | undefined;
  await assert.doesNotReject(async () => {
    record = await withTenantTx(fx.db.appPool, fx.a, (tx) =>
      createGrant(tx, fx.a, input, actor, deps),
    );
  }, "createGrant resolves");
  assert.ok(record !== undefined, "createGrant returns a record");
  return record;
}

async function expectRefused(
  fx: Fixture,
  input: unknown,
  details: Record<string, string>,
  code: "GRANTS_REFUSED" | "GRANTS_INVALID" = "GRANTS_REFUSED",
  actor: Actor = CAROL,
  deps: GrantDeps = fx.deps,
): Promise<void> {
  await assert.rejects(
    withTenantTx(fx.db.appPool, fx.a, (tx) =>
      createGrant(tx, fx.a, input as CreateInput, actor, deps),
    ),
    (error: unknown) => {
      assert.ok(error instanceof GrantsError, "the error is a GrantsError");
      assert.equal(error.code, code);
      assert.deepEqual(error.details, details);
      return true;
    },
  );
}

async function grantCount(fx: Fixture): Promise<number> {
  return withTenantTx(fx.db.appPool, fx.a, async (tx) => {
    const result = await tx.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM ursitoare."grant"',
    );
    return result.rows[0]?.n ?? -1;
  });
}

async function createdEvents(fx: Fixture): Promise<AuditEventRecord[]> {
  return listAuditEvents(fx.db.appPool, fx.a, {
    filter: { eventType: "grants.created" },
    order: "asc",
    limit: 200,
  });
}

async function counts(fx: Fixture): Promise<{ rows: number; events: number }> {
  return { rows: await grantCount(fx), events: (await createdEvents(fx)).length };
}

test("C-593145eb: createGrant stores and audits three active grants", async () => {
  const fx = await setup();
  try {
    const first = await create(fx, {
      ...nodeInput([{ arg: "amount", op: "lte", value: 1000.5 }]),
    });
    assert.deepEqual(first, {
      id: G(0),
      subject: { kind: "role", role: "author" },
      tool: "acme.create_payment@1",
      scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
      args: [{ arg: "amount", op: "lte", value: 1000.5 }],
      fingerprints: [FPA],
      state: "active",
      createdBy: "carol",
      createdAt: AT,
      revokedBy: null,
      revokedAt: null,
    } satisfies GrantRecord);

    const second = await create(fx, {
      subject: { kind: "user", userId: "bob" },
      tool: "acme.lookup_vendor@1",
      scope: { kind: "any_step" },
      args: [{ arg: "limit", op: "lte", value: 50 }],
    });
    assert.deepEqual(second, {
      id: G(1),
      subject: { kind: "user", userId: "bob" },
      tool: "acme.lookup_vendor@1",
      scope: { kind: "any_step" },
      args: [{ arg: "limit", op: "lte", value: 50 }],
      fingerprints: [],
      state: "active",
      createdBy: "carol",
      createdAt: AT,
      revokedBy: null,
      revokedAt: null,
    } satisfies GrantRecord);

    const third = await create(fx, {
      ...anyInput([
        { arg: "vendor_name", op: "eq", value: "Acme" },
        { arg: "exact", op: "eq", value: true },
        { arg: "limit", op: "gte", value: -3 },
      ]),
    });
    assert.deepEqual(third, {
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
      state: "active",
      createdBy: "carol",
      createdAt: AT,
      revokedBy: null,
      revokedAt: null,
    } satisfies GrantRecord);

    assert.deepEqual(await counts(fx), { rows: 3, events: 3 });

    const events = await createdEvents(fx);
    const eventFor = (id: string): AuditEventRecord => {
      const event = events.find((candidate) => candidate.target?.id === id);
      assert.ok(event !== undefined, `an event targets ${id}`);
      return event;
    };

    const expected = [
      {
        id: G(0),
        payload: {
          subjectKind: "role",
          tool: "acme.create_payment@1",
          scopeKind: "node",
          flowId: "pay-run",
          nodeId: "pay",
          argCount: 1,
        },
      },
      {
        id: G(1),
        payload: {
          subjectKind: "user",
          tool: "acme.lookup_vendor@1",
          scopeKind: "any_step",
          flowId: null,
          nodeId: null,
          argCount: 1,
        },
      },
      {
        id: G(2),
        payload: {
          subjectKind: "role",
          tool: "acme.lookup_vendor@1",
          scopeKind: "any_step",
          flowId: null,
          nodeId: null,
          argCount: 3,
        },
      },
    ];
    for (const row of expected) {
      const event = eventFor(row.id);
      assert.deepEqual(event.actor, { kind: "user", id: "carol" });
      assert.deepEqual(event.target, { kind: "grant", id: row.id });
      assert.deepEqual(event.payload, row.payload);
    }
  } finally {
    await fx.db.close();
  }
});

test("C-36fe0266: createGrant refuses invalid input and leaves no row or event", async () => {
  const fx = await setup();
  try {
    const before = await counts(fx);
    assert.deepEqual(before, { rows: 0, events: 0 });

    const invalid: Array<{ input: unknown; field: string }> = [
      { input: { ...nodeInput(), subject: { kind: "team", team: "x" } }, field: "subject" },
      { input: { ...nodeInput(), subject: { kind: "role" } }, field: "subject" },
      { input: null, field: "subject" },
      { input: { ...nodeInput(), tool: 5 }, field: "tool" },
      { input: { ...nodeInput(), scope: { kind: "flow" } }, field: "scope" },
      { input: { ...nodeInput(), scope: { kind: "node", flowId: "pay-run" } }, field: "scope" },
      { input: { ...nodeInput(), args: "x" }, field: "args" },
      {
        input: {
          ...nodeInput(),
          args: Array.from({ length: 9 }, () => ({ arg: "amount", op: "eq", value: 1 })),
        },
        field: "args",
      },
      {
        input: { ...nodeInput(), args: [{ arg: "amount", op: "eq", value: {} }] },
        field: "args",
      },
      {
        input: { ...nodeInput(), args: [{ arg: "amount", op: "eq", value: null }] },
        field: "args",
      },
      {
        input: { ...nodeInput(), args: [{ arg: "amount", op: "lt", value: 1 }] },
        field: "args",
      },
      { input: { ...anyInput(), versionHash: fx.h1 }, field: "versionHash" },
      { input: { ...nodeInput(), versionHash: "abc" }, field: "versionHash" },
    ];
    for (const row of invalid) {
      await expectRefused(fx, row.input, { field: row.field }, "GRANTS_INVALID");
      assert.deepEqual(await counts(fx), before);
    }

    const refused: Array<{ input: unknown; reason: string }> = [
      {
        input: { ...nodeInput(), subject: { kind: "role", role: "ghost" }, tool: "acme.nope@1" },
        reason: "role_unknown",
      },
      {
        input: {
          ...nodeInput(),
          subject: { kind: "user", userId: "zed" },
        },
        reason: "user_unknown",
      },
      {
        input: {
          ...nodeInput(),
          tool: "acme.nope@1",
          scope: { kind: "node", flowId: "ghost-flow", nodeId: "pay" },
        },
        reason: "tool_unknown",
      },
      {
        input: { ...nodeInput(), scope: { kind: "node", flowId: "ghost-flow", nodeId: "pay" } },
        reason: "flow_unknown",
      },
      {
        input: { ...nodeInput(), scope: { kind: "node", flowId: "empty-flow", nodeId: "pay" } },
        reason: "version_not_validated",
      },
      { input: { ...nodeInput(), versionHash: fx.h2 }, reason: "version_not_validated" },
      {
        input: { ...nodeInput(), versionHash: "sha256:" + "0".repeat(64) },
        reason: "version_not_validated",
      },
      {
        input: { ...nodeInput(), scope: { kind: "node", flowId: "pay-run", nodeId: "ghost" } },
        reason: "node_unknown",
      },
      {
        input: { ...nodeInput(), scope: { kind: "node", flowId: "pay-run", nodeId: "__proto__" } },
        reason: "node_unknown",
      },
      {
        input: { ...nodeInput([{ arg: "nope", op: "eq", value: 1 }]), tool: "acme.lookup_vendor@1", scope: { kind: "any_step" } },
        reason: "arg_unknown",
      },
      {
        input: {
          ...anyInput([{ arg: "nope", op: "eq", value: 'a"b' }]),
        },
        reason: "arg_unknown",
      },
      {
        input: {
          ...anyInput([{ arg: "__proto__", op: "eq", value: 1 }]),
        },
        reason: "arg_unknown",
      },
      {
        input: { ...anyInput([{ arg: "url", op: "eq", value: "x" }]) },
        reason: "arg_unknown",
      },
      {
        input: { ...anyInput([{ arg: "Vendor-Id", op: "eq", value: "x" }], "acme.odd_args@1") },
        reason: "arg_unknown",
      },
      {
        input: { ...anyInput([{ arg: "vendor_name", op: "lte", value: "x" }]) },
        reason: "arg_type",
      },
      {
        input: { ...anyInput([{ arg: "tags", op: "eq", value: "x" }]) },
        reason: "arg_type",
      },
      {
        input: { ...anyInput([{ arg: "limit", op: "eq", value: 1.5 }]) },
        reason: "arg_type",
      },
      {
        input: { ...anyInput([{ arg: "limit", op: "eq", value: "5" }]) },
        reason: "arg_type",
      },
      {
        input: { ...anyInput([{ arg: "exact", op: "eq", value: "true" }]) },
        reason: "arg_type",
      },
      {
        input: { ...nodeInput([{ arg: "amount", op: "lte", value: 1.00001 }]) },
        reason: "arg_type",
      },
      {
        input: { ...nodeInput([{ arg: "amount", op: "lte", value: 1e15 }]) },
        reason: "arg_type",
      },
      {
        input: { ...nodeInput([{ arg: "currency", op: "eq", value: 5 }]) },
        reason: "arg_type",
      },
      {
        input: { ...nodeInput([{ arg: "currency", op: "eq", value: 'E"UR' }]) },
        reason: "value_invalid",
      },
      {
        input: { ...nodeInput([{ arg: "currency", op: "eq", value: "E\\UR" }]) },
        reason: "value_invalid",
      },
      {
        input: { ...nodeInput([{ arg: "currency", op: "eq", value: "EU\tR" }]) },
        reason: "value_invalid",
      },
      {
        input: { ...nodeInput([{ arg: "currency", op: "eq", value: "x".repeat(257) }]) },
        reason: "value_invalid",
      },
      {
        input: { ...nodeInput([{ arg: "currency", op: "eq", value: "café" }]) },
        reason: "value_invalid",
      },
      {
        input: { ...nodeInput([{ arg: "currency", op: "eq", value: "a\uD800" }]) },
        reason: "value_invalid",
      },
    ];
    for (const row of refused) {
      await expectRefused(fx, row.input, { reason: row.reason });
      assert.deepEqual(await counts(fx), before);
    }
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

test("C-36fe0266: createGrant rolls back failing dependencies and refuses another tenant", async () => {
  const fx = await setup();
  try {
    await create(fx, nodeInput([{ arg: "amount", op: "lte", value: 1000.5 }]));
    await create(fx, {
      subject: { kind: "user", userId: "bob" },
      tool: "acme.lookup_vendor@1",
      scope: { kind: "any_step" },
      args: [{ arg: "limit", op: "lte", value: 50 }],
    });
    await create(
      fx,
      anyInput([
        { arg: "vendor_name", op: "eq", value: "Acme" },
        { arg: "exact", op: "eq", value: true },
        { arg: "limit", op: "gte", value: -3 },
      ]),
    );
    const before = await counts(fx);
    assert.deepEqual(before, { rows: 3, events: 3 });

    const failure = new Error("catalogue down");
    const failingDeps: GrantDeps = {
      ...fx.deps,
      catalogueFor: async () => {
        throw failure;
      },
    };
    await assert.rejects(
      withTenantTx(fx.db.appPool, fx.a, (tx) =>
        createGrant(tx, fx.a, nodeInput(), CAROL, failingDeps),
      ),
      (error: unknown) => {
        assert.equal(error, failure);
        return true;
      },
    );
    assert.deepEqual(await counts(fx), before);

    const badActor = { kind: "user", id: "car\u0001ol" } as const;
    await assert.rejects(
      withTenantTx(fx.db.appPool, fx.a, (tx) =>
        createGrant(tx, fx.a, nodeInput(), badActor, fx.deps),
      ),
      (error: unknown) => {
        assert.ok(error instanceof AuditError, "the error is an AuditError");
        assert.equal(error.code, "AUDIT_EVENT_INVALID");
        return true;
      },
    );
    assert.deepEqual(await counts(fx), before);
    assert.equal(fx.deps.ids.next("grant"), G(3));

    await assert.rejects(
      withTenantTx(tenantBPool(), fx.a, (tx) =>
        createGrant(tx, fx.a, nodeInput(), CAROL, fx.deps),
      ),
      (error: unknown) => {
        assert.ok(error instanceof GrantsError, "the error is a GrantsError");
        assert.equal(error.code, "GRANTS_TENANT_MISMATCH");
        return true;
      },
    );
  } finally {
    await fx.db.close();
  }
});
