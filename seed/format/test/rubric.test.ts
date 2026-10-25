import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkRubric, durationSeconds } from "../src/rubric.ts";
import { RF1, loadDoc } from "./helpers.ts";

const rf1 = () => loadDoc(RF1);
const run = (checks: unknown[], doc: any = rf1(), opts: { seed?: unknown } = {}) => checkRubric(doc, checks, opts);
const one = (check: unknown, doc: any = rf1(), opts: { seed?: unknown } = {}) => {
  const r = run([check], doc, opts);
  assert.equal(r.total, 1);
  return r.results[0];
};
const pass = (check: unknown, doc?: any, opts?: any) => assert.equal(one(check, doc, opts).pass, true, JSON.stringify(one(check, doc, opts)));
const fail = (check: unknown, doc?: any, opts?: any) => assert.equal(one(check, doc, opts).pass, false, JSON.stringify(one(check, doc, opts)));

/** small doc with a foreach, an agent, a human.form and a delegate */
const misc = () => ({
  ursitoare: "0.1", flow: "m", version: "1.0.0",
  inputs: { type: "object", properties: { u: { type: "string" } }, required: ["u"] },
  start: "inbox",
  nodes: {
    inbox: { kind: "block", uses: "mail.read_inbox@1", with: { mailbox: "support@example.com" }, next: "each" },
    each: { kind: "foreach", items: "${{ nodes.inbox.output.messages }}", uses: "crm.find_customer@1", with: { email: "${{ item.from }}" }, next: "ag" },
    ag: { kind: "agent", input: { q: "x" }, goal: "g", tools: ["kb.search@1", "crm.find_customer@1"], max_steps: 3, output_schema: { type: "object" }, next: "frm" },
    frm: { kind: "human.form", assignee_role: "support-lead", form_schema: { type: "object", properties: { a: { type: "string" } } }, timeout: "PT12H", next: "dl", on_timeout: "end2" },
    dl: { kind: "delegate", target: "n8n", workflow: "sync-crm", with: {}, callback_timeout: "PT30M", next: "tk", on_timeout: "end2" },
    tk: { kind: "block", uses: "crm.create_ticket@1", with: { customer_id: "${{ nodes.each.output.results }}", subject: "Re: ${{ nodes.ag.output.x }}", priority: "high", body: "b" }, next: "end1" },
    end1: { kind: "end", status: "completed" },
    end2: { kind: "end", status: "failed" },
  },
});

describe("rubric DSL (design section 8)", () => {
  it("has_kind: bounds, default min 1", () => {
    pass({ has_kind: "llm.decide", min: 1 });
    pass({ has_kind: "human.approval" });
    pass({ has_kind: "block", min: 4, max: 4 });
    fail({ has_kind: "foreach" });
    fail({ has_kind: "block", min: 1, max: 3 });
    fail({ has_kind: "block", min: 5 });
    pass({ has_kind: "agent", min: 0, max: 0 });
  });

  it("no_kind", () => {
    pass({ no_kind: "agent" });
    pass({ no_kind: "foreach" });
    fail({ no_kind: "llm.decide" });
    fail({ no_kind: "end" });
  });

  it("uses / no_uses count block.uses and foreach.uses", () => {
    pass({ uses: "erp.create_payment@1", min: 1, max: 1 });
    pass({ uses: "mail.send@1" });
    fail({ uses: "mail.send@1", min: 2 });
    fail({ uses: "http.post@1" });
    pass({ no_uses: "http.post@1" });
    fail({ no_uses: "mail.send@1" });
    // foreach.uses counts
    pass({ uses: "crm.find_customer@1", min: 1, max: 1 }, misc());
    fail({ no_uses: "crm.find_customer@1" }, misc());
    // agent tools do NOT count as `uses`
    fail({ uses: "kb.search@1" }, misc());
  });

  it("precedes: all-paths analysis over the DAG", () => {
    // every path to the payment passes the vendor lookup
    pass({ precedes: { before: { uses: "erp.lookup_vendor@1" }, after: { uses: "erp.create_payment@1" } } });
    // but the auto_approve path reaches payment without human approval
    fail({ precedes: { before: { kind: "human.approval" }, after: { uses: "erp.create_payment@1" } } });
    // selectors by id
    pass({ precedes: { before: { id: "classify" }, after: { id: "pay" } } });
    pass({ precedes: { before: { kind: "llm.decide" }, after: { kind: "human.approval" } } });
    // the reject path reaches notify_rejection without approval
    fail({ precedes: { before: { kind: "human.approval" }, after: { uses: "mail.send@1" } } });
    // a node does not precede itself
    fail({ precedes: { before: { id: "pay" }, after: { id: "pay" } } });
    // nothing matches `after` / `before`: stricter reading fails instead of passing vacuously
    const r = one({ precedes: { before: { kind: "llm.decide" }, after: { kind: "foreach" } } });
    assert.equal(r.pass, false);
    assert.match(r.detail, /no node matches after/);
    fail({ precedes: { before: { kind: "foreach" }, after: { kind: "end" } } });
  });

  it("precedes: diamond - 'before' on one branch only fails, on both branches passes", () => {
    const d: any = {
      start: "s",
      nodes: {
        s: { kind: "llm.decide", outcomes: ["a", "b"], cases: { a: "x", b: "y" } },
        x: { kind: "block", uses: "kb.search@1", next: "j" },
        y: { kind: "wait", next: "j" },
        j: { kind: "block", uses: "mail.send@1", next: "e" },
        e: { kind: "end", status: "completed" },
      },
    };
    fail({ precedes: { before: { uses: "kb.search@1" }, after: { uses: "mail.send@1" } } }, d);
    d.nodes.y = { kind: "block", uses: "kb.search@1", next: "j" };
    pass({ precedes: { before: { uses: "kb.search@1" }, after: { uses: "mail.send@1" } } }, d);
    // timeout / default edges count as paths
    const t: any = {
      start: "h",
      nodes: {
        h: { kind: "human.approval", cases: { approved: "p", rejected: "e", timeout: "p" } },
        p: { kind: "block", uses: "erp.create_payment@1", next: "e" },
        e: { kind: "end", status: "completed" },
      },
    };
    fail({ precedes: { before: { id: "h" }, after: { id: "e" } } }, { ...t, start: "p", nodes: { ...t.nodes, p: { ...t.nodes.p } } });
    pass({ precedes: { before: { id: "h" }, after: { id: "p" } } }, t);
  });

  it("decide_outcomes: some llm.decide has all labels", () => {
    pass({ decide_outcomes: { include: ["auto_approve", "needs_review", "reject"] } });
    pass({ decide_outcomes: { include: ["reject"] } });
    fail({ decide_outcomes: { include: ["auto_approve", "escalate"] } });
    fail({ decide_outcomes: { include: ["x"] } }, misc());
  });

  it("param_equals: literal equality on a node using the block", () => {
    pass({ param_equals: { uses: "mail.send@1", param: "to", value: "ap@example.com" } });
    fail({ param_equals: { uses: "mail.send@1", param: "to", value: "ap@example.org" } });
    fail({ param_equals: { uses: "mail.send@1", param: "cc", value: "x" } });
    fail({ param_equals: { uses: "http.post@1", param: "url", value: "x" } });
    pass({ param_equals: { uses: "crm.create_ticket@1", param: "priority", value: "high" } }, misc());
    fail({ param_equals: { uses: "crm.create_ticket@1", param: "priority", value: "urgent" } }, misc());
    pass({ param_equals: { uses: "mail.mailbox@1", param: "x", value: 1 } }, {
      start: "a", nodes: { a: { kind: "block", uses: "mail.mailbox@1", with: { x: 1 }, next: "b" }, b: { kind: "end", status: "completed" } },
    });
    // types matter: "1" != 1
    fail({ param_equals: { uses: "mail.mailbox@1", param: "x", value: "1" } }, {
      start: "a", nodes: { a: { kind: "block", uses: "mail.mailbox@1", with: { x: 1 }, next: "b" }, b: { kind: "end", status: "completed" } },
    });
    // reference whitespace is normalised when comparing reference literals
    pass({ param_equals: { uses: "erp.create_payment@1", param: "reference", value: "${{inputs.invoice_id}}" } });
  });

  it("param_from: single ref or reference inside a template", () => {
    pass({ param_from: { uses: "erp.create_payment@1", param: "amount", source: { id: "normalize" } } });
    pass({ param_from: { uses: "erp.create_payment@1", param: "amount", source: { kind: "code" } } });
    fail({ param_from: { uses: "erp.create_payment@1", param: "amount", source: { kind: "llm.extract" } } });
    pass({ param_from: { uses: "erp.lookup_vendor@1", param: "vendor_name", source: { kind: "llm.extract" } } });
    // inputs are not node outputs
    fail({ param_from: { uses: "erp.create_payment@1", param: "reference", source: { kind: "block" } } });
    // template: "Re: ${{ nodes.ag.output.x }}"
    pass({ param_from: { uses: "crm.create_ticket@1", param: "subject", source: { kind: "agent" } } }, misc());
    pass({ param_from: { uses: "crm.create_ticket@1", param: "customer_id", source: { uses: "crm.find_customer@1" } } }, misc());
    fail({ param_from: { uses: "crm.create_ticket@1", param: "body", source: { kind: "agent" } } }, misc());
  });

  it("approval_role: human.approval or human.form", () => {
    pass({ approval_role: "finance-approver" });
    fail({ approval_role: "finance-clerk" });
    pass({ approval_role: "support-lead" }, misc());
    fail({ approval_role: "ops-admin" }, misc());
  });

  it("timeout_max: every node of the kind (timeout or callback_timeout) within the bound", () => {
    pass({ timeout_max: { kind: "human.approval", duration: "PT48H" } });
    pass({ timeout_max: { kind: "human.approval", duration: "P2D" } });
    pass({ timeout_max: { kind: "human.approval", duration: "PT72H" } });
    fail({ timeout_max: { kind: "human.approval", duration: "PT24H" } });
    pass({ timeout_max: { kind: "delegate", duration: "PT1H" } });
    fail({ timeout_max: { kind: "delegate", duration: "PT59M" } });
    pass({ timeout_max: { kind: "human.form", duration: "PT12H" } }, misc());
    fail({ timeout_max: { kind: "human.form", duration: "PT11H" } }, misc());
    // stricter reading: no node of that kind fails (not vacuously true); kinds without a timeout field fail
    fail({ timeout_max: { kind: "agent", duration: "PT48H" } });
    fail({ timeout_max: { kind: "block", duration: "PT48H" } });
    // every node must satisfy it
    const two = rf1();
    two.nodes.approval2 = { ...two.nodes.approval, timeout: "P3DT1H" };
    fail({ timeout_max: { kind: "human.approval", duration: "PT72H" } }, two);
    assert.equal(durationSeconds("P1DT12H"), 129600);
    assert.equal(durationSeconds("PT90M"), 5400);
    assert.equal(durationSeconds("1h"), null);
  });

  it("foreach_over: items reference the output of a matching node", () => {
    pass({ foreach_over: { source: { uses: "mail.read_inbox@1" } } }, misc());
    pass({ foreach_over: { source: { id: "inbox" } } }, misc());
    fail({ foreach_over: { source: { kind: "llm.extract" } } }, misc());
    fail({ foreach_over: { source: { uses: "mail.read_inbox@1" } } }); // RF-1 has no foreach
  });

  it("agent_tools: some agent includes all of `include` and none of `exclude`", () => {
    pass({ agent_tools: { include: ["kb.search@1"] } }, misc());
    pass({ agent_tools: { include: ["kb.search@1", "crm.find_customer@1"], exclude: ["mail.send@1"] } }, misc());
    fail({ agent_tools: { include: ["kb.search@1"], exclude: ["crm.find_customer@1"] } }, misc());
    fail({ agent_tools: { include: ["mail.send@1"] } }, misc());
    fail({ agent_tools: { include: ["kb.search@1"] } }); // no agent at all
  });

  it("preserves / absent (edit checks), with a seed", () => {
    const seed = rf1();
    const edited = rf1();
    delete edited.nodes.archive;
    edited.nodes.done.output = {};
    edited.nodes.pay.next = "done";
    pass({ preserves: ["fetch_invoice", "pay", "approval"] }, edited, { seed });
    pass({ absent: ["archive"] }, edited, { seed });
    fail({ absent: ["pay"] }, edited, { seed });
    fail({ preserves: ["archive"] }, edited, { seed }); // removed
    const changed = rf1();
    changed.nodes.approval = { kind: "wait", duration: "PT1H", next: "pay" };
    const r = one({ preserves: ["approval"] }, changed, { seed });
    assert.equal(r.pass, false);
    assert.match(r.detail, /changed kind/);
    // id never in the seed is a rubric error -> fail
    fail({ preserves: ["ghost"] }, edited, { seed });
    // without a seed: preserves cannot be checked -> fail (does not throw); absent needs no seed
    const noSeed = one({ preserves: ["pay"] });
    assert.equal(noSeed.pass, false);
    assert.match(noSeed.detail, /seed/);
    pass({ absent: ["ghost"] });
  });

  it("result shape, envelope forms and counts", () => {
    const checks = [{ has_kind: "llm.decide" }, { no_kind: "agent" }, { uses: "http.post@1" }];
    const r = checkRubric(rf1(), checks);
    assert.deepEqual([r.passed, r.total, r.ok], [2, 3, false]);
    assert.deepEqual(r.results.map((x) => x.check), ["has_kind", "no_kind", "uses"]);
    assert.deepEqual(r.results.map((x) => x.pass), [true, true, false]);
    assert.ok(r.results.every((x) => typeof x.detail === "string" && x.detail.length > 0));
    assert.deepEqual(r.results[0].spec, checks[0]);
    const wrapped = checkRubric(rf1(), { checks });
    assert.deepEqual(wrapped.results.map((x) => x.pass), [true, true, false]);
    assert.throws(() => checkRubric(rf1(), { nope: 1 }), TypeError);
  });

  it("malformed checks fail with a clear detail instead of passing or throwing", () => {
    for (const bad of [{}, { bogus: 1 }, { has_kind: 5 }, { has_kind: "block", extra: 1 }, { has_kind: "block", min: -1 }, { has_kind: "block", uses: "x" },
      { precedes: { before: { kind: "a" } } }, { precedes: { before: { kind: "a", id: "b" }, after: { kind: "c" } } }, { timeout_max: { kind: "human.approval", duration: "48h" } },
      { agent_tools: { include: "x" } }, { absent: "x" }, null, 5]) {
      const r = one(bad);
      assert.equal(r.pass, false, JSON.stringify(bad));
      assert.match(r.detail, /malformed check/, JSON.stringify(bad));
    }
  });

  it("never throws on broken documents", () => {
    for (const d of [null, {}, { nodes: null }, { nodes: { a: null } }, { nodes: { a: 5 }, start: "a" }, "x", []]) {
      const r = checkRubric(d, [{ has_kind: "block" }, { precedes: { before: { kind: "a" }, after: { kind: "b" } } }, { uses: "x@1" }, { param_equals: { uses: "x@1", param: "p", value: 1 } }, { timeout_max: { kind: "human.approval", duration: "PT1H" } }, { absent: ["constructor"] }, { preserves: ["constructor"] }], { seed: d });
      assert.equal(r.total, 7);
    }
  });

  it("is deterministic", () => {
    const checks = [{ precedes: { before: { kind: "llm.decide" }, after: { uses: "erp.create_payment@1" } } }, { has_kind: "block", min: 1 }];
    assert.deepEqual(checkRubric(rf1(), checks), checkRubric(rf1(), checks));
  });
});

describe("durations", () => {
  it("parses ISO-8601 durations incl. fractions; fixed Y=365d, M=30d, W=7d", () => {
    assert.equal(durationSeconds("PT0.5H"), 1800);
    assert.equal(durationSeconds("P1Y"), 365 * 86400);
    assert.equal(durationSeconds("P1M"), 30 * 86400);
    assert.equal(durationSeconds("P1W"), 7 * 86400);
    assert.equal(durationSeconds("PT1M"), 60);
    for (const bad of ["P", "PT", "P1H", "PT1D", "1D", "", "P-1D", "PT1.H"]) assert.equal(durationSeconds(bad), null, bad);
  });
});
