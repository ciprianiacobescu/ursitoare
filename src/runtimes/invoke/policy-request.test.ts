import assert from "node:assert/strict";
import { test } from "node:test";

import type { Approval, StepContext } from "../../interpreter/index.ts";
import type { PrincipalEntity, ToolArgs } from "../../pdp/index.ts";
import { entityRef, toDecimal, userEntity } from "../../pdp/index.ts";
import type { ToolBinding } from "../../tools/index.ts";
import { invokeToolRequest as invokeToolRequestReal, pdpApprovals as pdpApprovalsReal } from "./request.ts";

// A stub's not-implemented error is swallowed so that the assertions after it fail instead.
function guarded<A extends unknown[], T>(fn: (...args: A) => T): (...args: A) => T {
  return (...args: A): T => {
    let out: T | undefined;
    assert.doesNotThrow(() => {
      out = fn(...args);
    });
    return out as T;
  };
}

const invokeToolRequest = guarded(invokeToolRequestReal);
const pdpApprovals = guarded(pdpApprovalsReal);

const FP = "nf1_" + "a".repeat(64);

const U = (x: string) => entityRef("User", "tenant_a/" + x);
const R = (x: string) => entityRef("Role", x);

const ROLES_OF = new Map<string, readonly string[]>([
  ["bob", ["author", "approver"]],
  ["dave", ["approver"]],
  ["erin", ["auditor", "custom"]],
]);

const a1: Approval = { nodeId: "a1", decision: "approved", approver: "bob" };
const a2: Approval = { nodeId: "a2", decision: "rejected", approver: "dave" };
const a3: Approval = { nodeId: "a3", decision: "approved", approver: null };
const a4: Approval = { nodeId: "a4", decision: "approved", approver: "erin" };
const a5: Approval = { nodeId: "a5", decision: "approved", approver: "zed" };
const a6: Approval = { nodeId: "a6", decision: "approved", approver: "bob" };

function binding(ref: string, tool: string, effect: ToolBinding["effect"], path: string): ToolBinding {
  return {
    serverId: "acme",
    origin: "https://tools.fake.test",
    local: false,
    state: "approved",
    ref,
    tool,
    effect,
    http: { method: "POST", path },
    untrustedResult: false,
    unsafeToRetry: false,
  };
}

const PAYB = binding("acme.create_payment@1", "create_payment", "pay", "/blocks/erp.create_payment@1");
const NOTE = binding("acme.post_message@1", "post_message", "send", "/blocks/slack.post_message@1");

const ALICE: PrincipalEntity = {
  tenantId: "tenant_a",
  userId: "alice",
  kind: "human",
  roles: ["author"],
  teams: ["finance"],
};

const EGRESS = {
  method: "POST",
  host: "tools.fake.test",
  path: "/blocks/erp.create_payment@1",
  bodyDigest: "af25dc0c3f8ca575c8b06c393f52c90967511a03d6db13a277b748379e77d4f8",
  serviceId: "87caf624-f579-8435-9540-24d6eb57aeff",
  ttlSeconds: 60,
};

const ARGS: ToolArgs = {
  vendor_id: "V-ACME",
  amount: toDecimal(12.5),
  currency: "EUR",
  reference: "inv-1",
};

// `taint` is a member the scaffold's StepContext lacks, so the context is built through a cast.
function ctxOf(over: Record<string, unknown> = {}): StepContext {
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
    ...over,
  } as unknown as StepContext;
}

function base(over: Record<string, unknown> = {}, ctxOver: Record<string, unknown> = {}) {
  return {
    ctx: ctxOf(ctxOver),
    principal: ALICE,
    binding: PAYB,
    flow: { ownerTeam: "finance" },
    args: ARGS,
    fingerprint: FP,
    approvals: pdpApprovals([a1], new Map([["bob", ["approver"]]]), "tenant_a"),
    egress: EGRESS,
    ...over,
  };
}

test("C-19be51e3 pdpApprovals groups approved approvers per held role", () => {
  assert.deepEqual(pdpApprovals([a1, a2, a3, a4, a5, a6], ROLES_OF, "tenant_a"), {
    approvals: [
      { approver: U("bob"), role: R("approver") },
      { approver: U("bob"), role: R("author") },
      { approver: U("erin"), role: R("auditor") },
    ],
    approvers_by_role: { approver: [U("bob")], author: [U("bob")], auditor: [U("erin")] },
  });
});

test("C-19be51e3 pdpApprovals gives nothing for no approval or only a rejection", () => {
  assert.deepEqual(pdpApprovals([], ROLES_OF, "tenant_a"), { approvals: [], approvers_by_role: {} });
  assert.deepEqual(pdpApprovals([a2], ROLES_OF, "tenant_a"), { approvals: [], approvers_by_role: {} });
  assert.equal(pdpApprovals([a1], ROLES_OF, "tenant_a").approvals.length, 2);
});

test("C-19be51e3 invokeToolRequest I1 carries the whole call context", () => {
  const req = invokeToolRequest(base());
  assert.deepEqual(req.principal, { type: "User", id: "tenant_a/alice" });
  assert.equal(req.action, "invoke_tool");
  assert.deepEqual(req.resource, { type: "Block", id: "tenant_a/read-then-pay/pay" });
  assert.deepEqual(req.context, {
    tool: entityRef("Tool", "tenant_a/acme.create_payment@1"),
    args: ARGS,
    taint: ["extracted"],
    run_initiator: U("alice"),
    sod_excluded: [U("alice")],
    approvals: [{ approver: U("bob"), role: R("approver") }],
    approvers_by_role: { approver: [U("bob")] },
    node_fingerprint: FP,
  });
  assert.deepEqual(req.egress, EGRESS);
  assert.deepEqual(
    req.entities.map((e) => `${e.uid.type}::${e.uid.id}`),
    [
      "User::tenant_a/alice",
      "Block::tenant_a/read-then-pay/pay",
      "Flow::tenant_a/read-then-pay",
      "Team::tenant_a/finance",
      "Tool::tenant_a/acme.create_payment@1",
      "User::tenant_a/bob",
    ],
  );
  assert.deepEqual(req.entities[0], userEntity(ALICE));
  assert.equal(req.entities[1]?.attrs["kind"], "block");
  assert.deepEqual(req.entities[1]?.attrs["flow"], entityRef("Flow", "tenant_a/read-then-pay"));
  assert.deepEqual(req.entities[2]?.attrs["owner_team"], entityRef("Team", "tenant_a/finance"));
  assert.equal(req.entities[2]?.attrs["reviewed"], false);
  assert.equal(req.entities[4]?.attrs["effect"], "pay");
  assert.deepEqual(
    req.entities[5],
    userEntity({ tenantId: "tenant_a", userId: "bob", kind: "human", roles: ["approver"], teams: [] }),
  );
});

test("C-19be51e3 invokeToolRequest I2 checks a hook as a hook", () => {
  const req = invokeToolRequest(
    base(
      {
        binding: NOTE,
        args: { channel: "#ap", text: "paid P" },
        approvals: pdpApprovals([], new Map(), "tenant_a"),
      },
      { flowId: "hooked-pay", hook: { phase: "post", label: "notify" } },
    ),
  );
  assert.deepEqual(req.resource, { type: "Block", id: "tenant_a/hooked-pay/pay:post:notify" });
  assert.equal(req.entities.length, 5);
  assert.equal(req.entities[1]?.attrs["kind"], "hook");
  assert.deepEqual(req.entities[1]?.attrs["flow"], entityRef("Flow", "tenant_a/hooked-pay"));
  assert.deepEqual(req.entities[4]?.uid, { type: "Tool", id: "tenant_a/acme.post_message@1" });
  assert.equal(req.entities[4]?.attrs["effect"], "send");
});

test("C-19be51e3 invokeToolRequest I3 defaults an absent taint to untrusted", () => {
  const none = base({ approvals: pdpApprovals([], new Map(), "tenant_a") });
  const absent = invokeToolRequest({ ...none, ctx: ctxOf({ taint: undefined }) });
  assert.deepEqual(absent.context["taint"], ["untrusted"]);
  const empty = invokeToolRequest({ ...none, ctx: ctxOf({ taint: [] }) });
  assert.deepEqual(empty.context["taint"], []);
  assert.equal(empty.entities.length, 5);
});

test("C-19be51e3 invokeToolRequest I4 cuts the entities at 24", () => {
  const ids = ["alice", ...Array.from({ length: 30 }, (_, i) => `u${String(i + 1).padStart(2, "0")}`)];
  const rolesOf = new Map(ids.map((id) => [id, ["approver"]] as const));
  const approvals: Approval[] = ids.map((id) => ({ nodeId: `n_${id}`, decision: "approved", approver: id }));
  const req = invokeToolRequest(base({ approvals: pdpApprovals(approvals, rolesOf, "tenant_a") }));
  assert.equal(req.entities.length, 24);
  assert.deepEqual(req.entities[23]?.uid, { type: "User", id: "tenant_a/u19" });
  assert.equal(req.entities.filter((e) => e.uid.id === "tenant_a/alice").length, 1);
  assert.equal((req.context["approvals"] as unknown[]).length, 31);
});
