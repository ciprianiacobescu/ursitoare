import { test } from "node:test";
import assert from "node:assert/strict";
import YAML from "yaml";
import { RF1_PATH } from "../src/catalogue.ts";
import { analyze, loadFlow, type FlowDoc } from "../src/extractor.ts";
import { fixtureDirectory } from "../src/directory.ts";
import { PolicyEngine } from "../src/engine.ts";

const rf1 = analyze(loadFlow(RF1_PATH));
const flow = (y: string) => YAML.parse(y) as FlowDoc;

test("RF-1: lethal trifecta detected (untrusted + private + send/pay)", () => {
  assert.deepEqual(rf1.capabilities, { reads_untrusted: true, reads_private: true, has_send_or_pay: true });
});

test("RF-1: only node 'pay' requests erp.create_payment@1 (extractor agrees with the policy allowlist)", () => {
  const payers = rf1.requests.filter((r) => r.tool === "erp.create_payment@1").map((r) => r.node);
  assert.deepEqual(payers, ["pay"]);
});

test("RF-1: static taint at pay is 'extracted' (llm.extract and code clear untrusted)", () => {
  assert.deepEqual(rf1.requests.find((r) => r.node === "pay")!.static_taint, ["extracted"]);
  assert.deepEqual(rf1.requests.find((r) => r.node === "extract")!.static_taint, ["untrusted"]);
});

test("RF-1 activation: ops-admin denied while unreviewed, allowed once reviewed, clerk always denied", () => {
  const ask = (who: string, reviewed: boolean) =>
    new PolicyEngine(fixtureDirectory({ rf1Reviewed: reviewed })).check({ action: "activate_flow", principal: who, flow: "invoice-intake", flow_capabilities: rf1.capabilities });
  assert.equal(ask("dave", false).decision, "deny");
  assert.match(ask("dave", false).reason, /org-trifecta-needs-review/);
  assert.equal(ask("dave", true).decision, "allow");
  assert.equal(ask("alice", true).decision, "deny");
});

test("flow without untrusted reads has no trifecta", () => {
  const a = analyze(flow(`
ursitoare: "0.1"
flow: kb-answer
version: 1.0.0
start: s
nodes:
  s: { kind: block, uses: kb.search@1, with: { query: "x" }, next: m }
  m: { kind: block, uses: mail.send@1, with: { to: a@example.com, subject: s, body: "\${{ nodes.s.output.passages }}" }, next: e }
  e: { kind: end, status: completed }
`));
  assert.deepEqual(a.capabilities, { reads_untrusted: false, reads_private: false, has_send_or_pay: true });
});

test("raw untrusted field flowing into send is labelled 'untrusted' and Cedar denies that request; via llm.extract it is 'extracted' and allowed", () => {
  const a = analyze(flow(`
ursitoare: "0.1"
flow: invoice-intake
version: 1.0.0
start: fetch
nodes:
  fetch: { kind: block, uses: invoices.get@1, with: { invoice_id: "\${{ inputs.invoice_id }}" }, next: raw_mail }
  raw_mail: { kind: block, uses: mail.send@1, with: { to: ap@example.com, subject: s, body: "\${{ nodes.fetch.output.raw_text }}" }, next: ex }
  ex: { kind: llm.extract, input: { t: "\${{ nodes.fetch.output.raw_text }}" }, instructions: i, output_schema: { type: object }, next: clean_mail }
  clean_mail: { kind: block, uses: mail.send@1, with: { to: ap@example.com, subject: s, body: "\${{ nodes.ex.output.summary }}" }, next: e }
  e: { kind: end, status: completed }
`));
  const raw = a.requests.find((r) => r.node === "raw_mail")!;
  const clean = a.requests.find((r) => r.node === "clean_mail")!;
  assert.deepEqual(raw.static_taint, ["untrusted"]);
  assert.deepEqual(clean.static_taint, ["extracted"]);
  const eng = new PolicyEngine(fixtureDirectory());
  const call = (node: string, taint: string[]) => eng.check({ action: "invoke_tool", principal: "alice", flow: "invoice-intake", node, tool: "mail.send@1", args: { to: "ap@example.com", subject: "s", body: "b" }, taint });
  // the synthetic node names are not in the directory, so replay the extracted taint at RF-1's notify_rejection node:
  assert.equal(call("notify_rejection", raw.static_taint).decision, "deny");
  assert.match(call("notify_rejection", raw.static_taint).reason, /org-forbid-untrusted-egress/);
  assert.equal(call("notify_rejection", clean.static_taint).decision, "allow");
});

test("agent node expands to one invoke_llm (with tools) plus one invoke_tool per allowlisted tool", () => {
  const a = analyze(flow(`
ursitoare: "0.1"
flow: ag
version: 1.0.0
start: a
nodes:
  a: { kind: agent, input: { q: "\${{ inputs.q }}" }, goal: g, tools: [kb.search@1, mail.send@1], max_steps: 3, output_schema: { type: object }, next: e }
  e: { kind: end, status: completed }
`));
  assert.deepEqual(a.requests.map((r) => `${r.action}:${r.tool ?? "-"}`), ["invoke_llm:-", "invoke_tool:kb.search@1", "invoke_tool:mail.send@1"]);
  assert.ok(a.requests.filter((r) => r.action === "invoke_tool").every((r) => r.dynamic_args));
  assert.equal(a.capabilities.has_send_or_pay, true);
});
