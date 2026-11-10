import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { listAuditEvents } from "../audit/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { importCatalogue } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { createPolicyRuntime } from "./policy-runtime.ts";
import type { PolicyRuntime } from "./policy-runtime.ts";
import { validatePolicySet } from "./policy-sets.ts";
import type { PolicyValidation } from "./policy-sets.ts";

const CLOCK = fixedClock("2026-11-06T09:00:00.000Z");
const CAROL = { kind: "user", id: "carol" } as const;
const FP1 = "nf1_" + "a1".repeat(32);

function G(n: number): string {
  return "grant_00000000-0000-7000-8000-" + n.toString(16).padStart(12, "0");
}

const ACME = {
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
    },
    output: { type: "object" },
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
    },
    output: { type: "object" },
  },
};

const OTHER = {
  "acme.other@1": {
    effect: "read",
    input: { type: "object", properties: { limit: { type: "number" } } },
    output: { type: "object" },
  },
};

const READ_SELF = (id: string): string =>
  `@id("${id}")\npermit (principal, action == Action::"read_self", resource);\n`;
const SRC_A1 =
  `@id("t-a-read-all")\npermit (principal, action == Action::"invoke_tool", resource is Block)\nwhen { context.tool.effect == "read" };\n\n` +
  `@id("t-pay-needs-approval")\nforbid (principal, action == Action::"invoke_tool", resource)\nwhen { context.tool == Tool::"tenant_a/acme.create_payment@1" && context.args has "amount" && context.args["amount"].greaterThan(decimal("1000.0000")) && !(context.approvers_by_role has "approver" && !context.approvers_by_role.approver.isEmpty()) };\n`;
const KIND = (literal: string): string =>
  `@id("t-kind")\npermit (principal, action == Action::"read_self", resource) when { principal.kind == "${literal}" };\n`;

const tempDirs: string[] = [];

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

interface Fixture {
  db: TestDatabase;
  t: TenantContext;
  u: TenantContext;
  w: TenantContext;
  lines: string[];
  runtime: PolicyRuntime;
}

async function withFixture(run: (f: Fixture) => Promise<void>): Promise<void> {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await db.ownerPool.query(
      "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_c', 'Tenant C') ON CONFLICT DO NOTHING",
    );
    const w: TenantContext = { tenantId: "tenant_c", reviewProfile: "solo" };
    const dir = await mkdtemp(join(tmpdir(), "policy-validate-"));
    tempDirs.push(dir);
    const lines: string[] = [];
    const logger = createLogger({
      level: "debug",
      destination: {
        write(line: string): void {
          lines.push(line);
        },
      },
    });
    const runtime = await createPolicyRuntime({
      pool: db.appPool,
      srcDir: dir,
      clock: CLOCK,
      ids: sequentialIds(1000),
      logger,
    });
    await run({ db, t: a, u: b, w, lines, runtime });
  } finally {
    await db.close();
  }
}

interface SeedGrant {
  id: string;
  role?: string;
  user?: string;
  tool: string;
  node?: boolean;
  args?: unknown[];
  revoked?: boolean;
}

async function seedGrant(db: TestDatabase, ctx: TenantContext, g: SeedGrant): Promise<void> {
  await withTenantTx(db.appPool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare."grant"
         (tenant_id, grant_id, subject_kind, subject_id, tool, scope_kind, flow_id, node_id,
          args, fingerprints, state, created_by, created_at, revoked_by, revoked_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::text[], $11, 'carol',
               '2026-11-06T09:00:00Z', $12, $13::timestamptz)`,
      [
        ctx.tenantId,
        g.id,
        g.user !== undefined ? "user" : "role",
        g.user ?? g.role ?? "author",
        g.tool,
        g.node === true ? "node" : "any_step",
        g.node === true ? "pay-run" : null,
        g.node === true ? "pay" : null,
        JSON.stringify(g.args ?? []),
        g.node === true ? [FP1] : [],
        g.revoked === true ? "revoked" : "active",
        g.revoked === true ? "carol" : null,
        g.revoked === true ? "2026-11-06T09:30:00Z" : null,
      ],
    );
  });
}

async function importBlocks(db: TestDatabase, ctx: TenantContext, blocks: object): Promise<void> {
  await importCatalogue(db.appPool, ctx, blocks as never, CAROL, { clock: CLOCK });
}

async function seedT(f: Fixture): Promise<void> {
  await importBlocks(f.db, f.t, ACME);
  await seedGrant(f.db, f.t, { id: G(0), role: "author", tool: "acme.lookup_vendor@1" });
  await seedGrant(f.db, f.t, {
    id: G(1),
    user: "bob",
    tool: "acme.lookup_vendor@1",
    args: [{ arg: "limit", op: "lte", value: 50 }],
  });
  await seedGrant(f.db, f.t, {
    id: G(2),
    role: "author",
    tool: "acme.create_payment@1",
    node: true,
    args: [{ arg: "amount", op: "lte", value: 2000 }],
  });
  await seedGrant(f.db, f.t, {
    id: G(3),
    role: "auditor",
    tool: "acme.lookup_vendor@1",
    revoked: true,
  });
}

async function validate(f: Fixture, ctx: TenantContext, source: string): Promise<PolicyValidation> {
  let result: PolicyValidation | undefined;
  await assert.doesNotReject(async () => {
    result = await validatePolicySet(f.runtime, f.db.appPool, ctx, source);
  }, "validatePolicySet resolves");
  assert.ok(result !== undefined, "validatePolicySet returns a validation");
  return result;
}

function problem(stage: string, ids: string[], message = ""): PolicyValidation["problems"][number] {
  return { stage, ids, message };
}

function assertHealthy(v: PolicyValidation, label: string): void {
  assert.equal(v.ok, true, `${label}: ok`);
  assert.deepEqual(v.problems, [], `${label}: no problems`);
  assert.match(String(v.policySetVersion), /^[0-9a-f]{64}$/, `${label}: a version`);
}

async function assertNothingWritten(f: Fixture): Promise<void> {
  const rows = await f.db.ownerPool.query<{ n: string }>(
    "SELECT count(*) AS n FROM ursitoare.policy_set",
  );
  assert.equal(rows.rows[0]?.n, "0", "policy_set stays empty");
  for (const ctx of [f.t, f.u, f.w]) {
    const events = await listAuditEvents(f.db.appPool, ctx, {
      filter: { eventType: "policy.deployed" },
      order: "asc",
      limit: 10,
    });
    assert.deepEqual(events, [], `no policy.deployed event for ${ctx.tenantId}`);
  }
}

test("C-9e64966c validation answers a healthy source with a version per source", async () => {
  await withFixture(async (f) => {
    await seedT(f);
    const versions: string[] = [];
    for (const source of ["", SRC_A1, "  \n", "//" + "x".repeat(65534)]) {
      const v = await validate(f, f.t, source);
      assertHealthy(v, `source of ${source.length} characters`);
      versions.push(String(v.policySetVersion));
    }
    assert.equal(new Set(versions).size, 4, "the four versions are distinct");
    await assertNothingWritten(f);
  });
});

test("C-9e64966c validation names parse, template, id, policy and reserved problems", async () => {
  await withFixture(async (f) => {
    await seedT(f);
    assert.deepEqual(
      (await validate(f, f.t, "permit (principal")).problems,
      [problem("parse", ["tenant/source"], "unexpected end of input")],
      "parse",
    );
    assert.deepEqual(
      (await validate(f, f.t, `@id("t-tpl")\npermit (principal == ?principal, action, resource);\n`)).problems,
      [problem("template", ["tenant/source"])],
      "template",
    );
    assert.deepEqual(
      (await validate(f, f.t, `permit (principal, action == Action::"read_self", resource);\n`)).problems,
      [problem("id", ["tenant/source"])],
      "id",
    );
    assert.deepEqual(
      (await validate(f, f.t, READ_SELF("platform-read-self"))).problems,
      [problem("policy", ["platform-read-self"])],
      "platform id",
    );
    assert.deepEqual(
      (await validate(f, f.t, READ_SELF("t-dup") + READ_SELF("t-dup"))).problems,
      [problem("policy", ["t-dup"])],
      "duplicate id",
    );
    assert.deepEqual(
      (await validate(f, f.t, READ_SELF("grant_x"))).problems,
      [problem("reserved", ["grant_x"])],
      "reserved prefix",
    );
    assert.deepEqual(
      (await validate(f, f.t, READ_SELF(G(0)))).problems,
      [problem("reserved", [G(0)])],
      "active grant id",
    );
    assert.deepEqual(
      (await validate(f, f.t, READ_SELF(G(3)))).problems,
      [problem("reserved", [G(3)])],
      "revoked grant id",
    );
    assert.deepEqual(
      (await validate(f, f.t, READ_SELF("platform-read-self") + READ_SELF(G(0)))).problems,
      [problem("reserved", [G(0)]), problem("policy", ["platform-read-self"])],
      "reserved comes first",
    );
    await assertNothingWritten(f);
  });
});

test("C-9e64966c validation reduces validate messages and logs no diagnostic", async () => {
  await withFixture(async (f) => {
    await seedT(f);
    assertHealthy(await validate(f, f.t, KIND("human")), "plain literal");
    const mixed = await validate(f, f.t, KIND("приvet"));
    assert.equal(mixed.ok, false);
    assert.equal(mixed.policySetVersion, null);
    assert.deepEqual(mixed.problems, [
      problem("validate", ["t-kind"], 'for policy `t-kind`, string `"???vet"` contains mixed scripts'),
    ]);
    assert.deepEqual(
      (await validate(f, f.t, "a\u0000b")).problems,
      [problem("parse", ["tenant/source"], "the source holds U+0000 or a lone surrogate")],
      "U+0000",
    );
    assert.deepEqual(
      (await validate(f, f.t, "// \ud800")).problems,
      [problem("parse", ["tenant/source"], "the source holds U+0000 or a lone surrogate")],
      "lone surrogate",
    );
    assert.deepEqual(
      (await validate(f, f.t, "x".repeat(65537))).problems,
      [problem("limit", ["tenant/source"])],
      "source over the limit",
    );
    for (const line of f.lines) {
      assert.ok(!line.includes("mixed scripts"), "no log record holds the diagnostic");
      assert.ok(!line.includes("приvet"), "no log record holds the literal");
    }
    await assertNothingWritten(f);
  });
});

test("C-9e64966c validation names an impossible grant and stops at compile", async () => {
  await withFixture(async (f) => {
    await importBlocks(f.db, f.u, ACME);
    await importBlocks(f.db, f.u, OTHER);
    await seedGrant(f.db, f.u, {
      id: G(10),
      role: "author",
      tool: "acme.lookup_vendor@1",
      args: [{ arg: "limit", op: "lte", value: 5 }],
    });
    assert.deepEqual((await validate(f, f.u, "")).problems, [
      problem(
        "validate",
        [G(10)],
        `for policy \`${G(10)}\`, policy is impossible: the policy expression evaluates to false for all valid requests`,
      ),
    ]);
    await seedGrant(f.db, f.u, {
      id: G(11),
      role: "author",
      tool: "acme.lookup_vendor@1",
      args: [{ arg: "vendor_name", op: "eq", value: 'a"b' }],
    });
    await seedGrant(f.db, f.u, {
      id: G(12),
      role: "author",
      tool: "acme.lookup_vendor@1",
      args: [{ arg: "vendor_name", op: "eq", value: "a\\b" }],
    });
    assert.deepEqual((await validate(f, f.u, "")).problems, [problem("compile", [G(11), G(12)])]);
    await assertNothingWritten(f);
  });
});

test("C-9e64966c validation limits active grants to 500", async () => {
  await withFixture(async (f) => {
    await importBlocks(f.db, f.w, ACME);
    await withTenantTx(f.db.appPool, f.w, async (tx) => {
      await tx.query(
        `INSERT INTO ursitoare."grant"
           (tenant_id, grant_id, subject_kind, subject_id, tool, scope_kind, state, created_by, created_at)
         SELECT 'tenant_c', 'grant_00000000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'),
                'role', 'author', 'acme.lookup_vendor@1', 'any_step', 'active', 'carol',
                '2026-11-06T09:00:00Z'
           FROM generate_series(100, 599) AS n`,
      );
    });
    assertHealthy(await validate(f, f.w, ""), "500 active grants");
    await seedGrant(f.db, f.w, { id: G(600), role: "author", tool: "acme.lookup_vendor@1" });
    assert.deepEqual((await validate(f, f.w, "")).problems, [problem("limit", ["grants"])]);
    assert.deepEqual(
      (await validate(f, f.w, "x".repeat(65537))).problems,
      [problem("limit", ["tenant/source", "grants"])],
      "both limits, in that order",
    );
    await assertNothingWritten(f);
  });
});

test("C-9e64966c validation rejects a runtime not made by createPolicyRuntime", async () => {
  await withFixture(async (f) => {
    await seedT(f);
    assertHealthy(await validate(f, f.t, ""), "the real runtime");
    const literal = {
      engine: f.runtime.engine,
      async toolArgs() {
        return {};
      },
      async reload(): Promise<void> {},
    };
    await assert.rejects(validatePolicySet(literal, f.db.appPool, f.t, ""), {
      name: "TypeError",
      message: "not a policy runtime made by createPolicyRuntime",
    });
  });
});
