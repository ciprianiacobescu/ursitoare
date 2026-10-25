// Limitations of Cedar found during the spike, pinned as executable facts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cedar, loadPolicyMap, loadSchemaText } from "../src/cedar.ts";
import { fixtureDirectory } from "../src/directory.ts";
import { PolicyEngine, type CheckRequest } from "../src/engine.ts";

const dir = fixtureDirectory();
const schema = loadSchemaText();
const payReq = (over: Partial<Extract<CheckRequest, { action: "invoke_tool" }>>): CheckRequest => ({
  action: "invoke_tool", principal: "alice", flow: "invoice-intake", node: "pay", tool: "erp.create_payment@1",
  args: { vendor_id: "V", amount: 20000, currency: "EUR", reference: "r" }, taint: ["extracted"], run_initiator: "alice", ...over,
});

test("L1 a forbid that errors at runtime is SKIPPED by Cedar (fail-open) -> the PEP must treat any error as deny", () => {
  const policies = { allow_all: `permit (principal, action, resource);`, bad_forbid: `forbid (principal, action, resource) when { context.nope > 1 };` };
  const raw = cedar.isAuthorized({ principal: { type: "User", id: "alice" }, action: { type: "Action", id: "start_run" }, resource: { type: "Flow", id: "f" }, context: {}, policies: { staticPolicies: policies }, entities: [] });
  assert.equal(raw.type, "success");
  if (raw.type === "success") {
    assert.equal(raw.response.decision, "allow", "raw Cedar allows although the forbid could not be evaluated");
    assert.equal(raw.response.diagnostics.errors.length, 1);
    const e = new PolicyEngine(dir);
    assert.equal(e.interpret(raw).decision, "deny");
    assert.match(e.interpret(raw).reason, /^policy_error/);
  }
});

test("L2 missing entity in the slice -> evaluation errors -> PEP denies (fail closed)", () => {
  const e = new PolicyEngine(dir);
  const { call } = e.build({ action: "invoke_tool", principal: "alice", flow: "invoice-intake", node: "fetch_invoice", tool: "invoices.get@1", args: { invoice_id: "x" }, taint: [] });
  assert.equal(e.interpret(e.evaluate(call)).decision, "allow");
  const broken = { ...call, entities: call.entities.filter((x) => x.uid.type !== "Tool") };
  const d = e.interpret(e.evaluate(broken));
  assert.equal(d.decision, "deny");
  assert.ok(d.errors.length > 0, "Cedar reports the missing Tool entity as an evaluation error");
});

test("L3 set-of-records: the literal Set<{approver, role}> cannot express 'a finance-approver other than the initiator' (false allow), the role-grouped projection can", () => {
  // Best literal formulation: forbid unless the approvals are not a subset of {initiator's own approval}.
  const literal = {
    allow_all: `permit (principal, action == Action::"invoke_tool", resource);`,
    literal_sod: `forbid (principal, action == Action::"invoke_tool", resource)
      when { context.tool == Tool::"erp.create_payment@1" && context.args has amount && context.args.amount.greaterThan(decimal("10000.0000")) }
      unless { !([{ approver: context.run_initiator, role: Role::"finance-approver" }].containsAll(context.approvals)) };`,
  };
  const lit = new PolicyEngine(dir, undefined, literal);
  // A run with a single approval recorded under the WRONG role (finance-clerk) by someone else.
  const wrongRole = payReq({ approvals: [{ approver: "henry", role: "finance-clerk" }] });
  assert.equal(lit.check(wrongRole).decision, "allow", "literal formulation false-allows: it never checks that the role is finance-approver");
  assert.equal(lit.check(payReq({ approvals: [{ approver: "alice", role: "finance-approver" }] })).decision, "deny", "it does catch the initiator approving alone");
  // The shipped policy (role-grouped projection + set equality) denies the wrong-role case:
  const shipped = new PolicyEngine(dir);
  assert.equal(shipped.check(wrongRole).decision, "deny");
});

test("L4 free-form object args are invisible to policy and are reported as unconstrained", () => {
  const e = new PolicyEngine(dir);
  const d = e.check({ action: "invoke_tool", principal: "gina", flow: "sales-followup", node: "post_hook", tool: "http.post@1", args: { url: "https://hooks.example.com/x", json: { secret: "x" } }, taint: [] });
  assert.deepEqual(d.unconstrained_args, ["json"]);
});

test("L5 Long vs decimal: policy using `>` on a decimal amount does not type-check", () => {
  const r = cedar.validate({ validationSettings: { mode: "strict" }, schema, policies: { staticPolicies: { p: `forbid (principal, action == Action::"invoke_tool", resource) when { context.args has amount && context.args.amount > 10000 };` } } });
  assert.equal(r.type, "success");
  if (r.type === "success") assert.ok(r.validationErrors.length > 0);
});

test("L6 context with an attribute the schema does not declare is rejected by schema-based parsing (closed records)", () => {
  const e = new PolicyEngine(dir);
  const { call } = e.build({ action: "invoke_llm", principal: "alice", flow: "invoice-intake", node: "classify", args: {}, taint: [] });
  const ans = e.evaluate({ ...call, context: { ...call.context, surprise: 1 } });
  assert.equal(ans.type, "failure");
  assert.equal(e.interpret(ans).decision, "deny");
});

test("L7 Cedar `like` has no host boundary: a naive URL allowlist is bypassable; the shipped policy compares the PEP-derived host", () => {
  const naive = {
    allow_all: `permit (principal, action == Action::"invoke_tool", resource);`,
    naive_url: `forbid (principal, action == Action::"invoke_tool", resource)
      when { context.tool == Tool::"http.get@1" }
      unless { context.args has url && context.args.url like "https://*.example.com/*" };`,
  };
  const req = (url: string): CheckRequest => ({ action: "invoke_tool", principal: "gina", flow: "sales-followup", node: "find_customer", tool: "http.get@1", args: { url }, taint: [] });
  const n = new PolicyEngine(dir, undefined, naive);
  assert.equal(n.check(req("https://docs.example.com/a")).decision, "allow");
  assert.equal(n.check(req("https://evil.test/.example.com/x")).decision, "allow", "BYPASS: `*` matched 'evil.test/' and the literal '.example.com/' sits in the path");
  assert.equal(new PolicyEngine(dir).check(req("https://evil.test/.example.com/x")).decision, "deny", "shipped policy denies it");
});
