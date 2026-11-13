import assert from "node:assert/strict";
import { test } from "node:test";

import type { QueryResultRow } from "pg";

import type { Approval, StepContext } from "../interpreter/index.ts";
import { invokeToolRequest, pdpApprovals } from "../runtimes/invoke/request.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import type { ToolBinding } from "../tools/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { toDecimal } from "./index.ts";
import type { PrincipalEntity } from "./index.ts";
import type { ToolArgs } from "./index.ts";
import { requestDigest } from "./digest.ts";
import { recordDecisionOwnTx } from "./log.ts";
import type { Decision, PolicyRequest } from "./types.ts";

const FP = "nf1_" + "a".repeat(64);

const PAYB: ToolBinding = {
  serverId: "acme",
  origin: "https://tools.fake.test",
  local: false,
  state: "approved",
  ref: "acme.create_payment@1",
  tool: "create_payment",
  effect: "pay",
  http: { method: "POST", path: "/blocks/erp.create_payment@1" },
  untrustedResult: false,
  unsafeToRetry: false,
};

const ALICE: PrincipalEntity = {
  tenantId: "tenant_a",
  userId: "alice",
  kind: "human",
  roles: ["author"],
  teams: ["finance"],
};

const ARGS: ToolArgs = {
  vendor_id: "V-ACME",
  amount: toDecimal(12.5),
  currency: "EUR",
  reference: "inv-1",
};

const EGRESS = {
  method: "POST",
  host: "tools.fake.test",
  path: "/blocks/erp.create_payment@1",
  bodyDigest: "af25dc0c3f8ca575c8b06c393f52c90967511a03d6db13a277b748379e77d4f8",
  serviceId: "87caf624-f579-8435-9540-24d6eb57aeff",
  ttlSeconds: 60,
};

// `taint` is a member the scaffold's StepContext lacks, so the context is built through a cast.
function ctxOf(): StepContext {
  return {
    tenant: { tenantId: "tenant_a", reviewProfile: "solo" },
    runId: "r_1",
    lineageId: "r_1",
    flowId: "read-then-pay",
    flowHash: "sha256:" + "e".repeat(64),
    nodeId: "pay",
    kind: "block",
    mode: "live",
    attempt: 1,
    effect: "pay",
    unsafeToRetry: false,
    idemKey: null,
    principal: { userId: "alice", kind: "human" },
    now: new Date("2026-11-06T10:00:00.000Z"),
    taint: ["extracted"],
  } as unknown as StepContext;
}

// The request of test-plan.md row I1, built by the same builder task 1.2 implemented.
function i1Request(): PolicyRequest {
  return invokeToolRequest({
    ctx: ctxOf(),
    principal: ALICE,
    binding: PAYB,
    flow: { ownerTeam: "finance" },
    args: ARGS,
    fingerprint: FP,
    approvals: pdpApprovals(
      [{ nodeId: "a1", decision: "approved", approver: "bob" } satisfies Approval],
      new Map([["bob", ["approver"]]]),
      "tenant_a",
    ),
    egress: EGRESS,
  });
}

const DECISION: Decision = {
  decision: "deny",
  decisionId: "dec_own",
  decidedAt: "2026-11-06T10:00:00.000Z",
  reasons: [],
  errors: [],
  policySetVersion: "a".repeat(64),
};

const EXTRA = { runId: "r_9", nodeId: "n_9" };

// A stub's "not implemented" error must surface as an assertion failure, not a bare error.
async function recorded(
  pool: TenantPool,
  ctx: TenantContext,
  decision: Decision,
  req: PolicyRequest,
  extra: typeof EXTRA,
): Promise<boolean> {
  let value: boolean | undefined;
  await assert.doesNotReject(async () => {
    value = await recordDecisionOwnTx(pool, ctx, decision, req, extra);
  });
  assert.ok(value !== undefined, "recordDecisionOwnTx returned a result");
  return value;
}

interface DecisionRow extends QueryResultRow {
  decided_at: string;
  action: string;
  principal: string;
  resource: string;
  decision: string;
  reasons: string[];
  errors: string[];
  policy_set_version: string;
  request_digest: string;
  permit: unknown;
  run_id: string | null;
  node_id: string | null;
}

async function readRows(db: Awaited<ReturnType<typeof withTestDatabase>>, ctx: TenantContext): Promise<DecisionRow[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<DecisionRow>(
      `SELECT to_char(decided_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS decided_at,
              action, principal, resource, decision, reasons, errors,
              policy_set_version, request_digest, permit, run_id, node_id
         FROM ursitoare.policy_decision`,
    );
    return result.rows;
  });
}

test("C-0834e2d4 a decision is recorded in a transaction of its own", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const req = i1Request();

    const first = await recorded(db.appPool, a, DECISION, req, EXTRA);
    assert.equal(first, true);
    const rows = await readRows(db, a);
    assert.deepEqual(rows, [
      {
        decided_at: "2026-11-06T10:00:00Z",
        action: "invoke_tool",
        principal: 'User::"tenant_a/alice"',
        resource: 'Block::"tenant_a/read-then-pay/pay"',
        decision: "deny",
        reasons: [],
        errors: [],
        policy_set_version: "a".repeat(64),
        request_digest: requestDigest(req),
        permit: null,
        run_id: "r_9",
        node_id: "n_9",
      },
    ]);

    const repeated = await recorded(db.appPool, a, DECISION, req, EXTRA);
    assert.equal(repeated, false);
    assert.equal((await readRows(db, a)).length, 1);

    const broken: TenantPool = { connect: () => Promise.reject(new Error("db down")) };
    await assert.rejects(recordDecisionOwnTx(broken, a, DECISION, req, EXTRA), {
      message: "db down",
    });
    assert.equal((await readRows(db, a)).length, 1);
  } finally {
    await db.close();
  }
});
