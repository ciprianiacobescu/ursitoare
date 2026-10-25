import path from "node:path";
import { RF1_PATH } from "./catalogue.ts";
import { fixtureDirectory } from "./directory.ts";
import { PolicyEngine, type CheckRequest } from "./engine.ts";
import { analyze, loadFlow, resolveValue } from "./extractor.ts";

const file = process.argv[2] ? path.resolve(process.argv[2]) : RF1_PATH;
const doc = loadFlow(file);
const a = analyze(doc);

console.log(`flow ${a.flow}@${a.version}  (${file})`);
console.log("activation context (flow_capabilities):", JSON.stringify(a.capabilities));
console.log("evidence:", JSON.stringify(a.capability_evidence));
console.log("assumptions:\n  - " + a.assumptions.join("\n  - "));

console.log("\nexpected policy requests per node:");
console.log("node               kind          action        tool / profile                 effect  static_taint");
for (const r of a.requests) {
  console.log(`${r.node.padEnd(18)} ${r.kind.padEnd(13)} ${r.action.padEnd(13)} ${(r.tool ?? r.model_profile ?? r.assignee_role ?? "").padEnd(30)} ${(r.effect ?? "-").padEnd(7)} [${r.static_taint.join(",")}]${r.effect_assumed ? " (effect assumed)" : ""}`);
}

console.log("\nactivation decisions (principal dave = ops-admin; also alice = finance-clerk):");
for (const [who, reviewed] of [["dave", false], ["dave", true], ["alice", true]] as const) {
  const eng = new PolicyEngine(fixtureDirectory({ rf1Reviewed: reviewed }));
  const d = eng.check({ action: "activate_flow", principal: who, flow: a.flow, flow_capabilities: a.capabilities });
  console.log(`  principal=${who.padEnd(6)} Flow.reviewed=${String(reviewed).padEnd(5)} -> ${d.decision.toUpperCase().padEnd(5)} ${d.reason}`);
}

if (a.flow === "invoice-intake") {
  // Dry-run every expected request with fixture INV-1001 values: the flow as designed must be authorised end to end.
  const env = {
    inputs: { invoice_id: "INV-1001" },
    nodes: {
      fetch_invoice: { output: { raw_text: "Acme GmbH ... 2450.00 EUR", invoice_id: "INV-1001" } },
      extract: { output: { vendor_name: "Acme GmbH", amount: 2450, currency: "EUR" } },
      lookup_vendor: { output: { vendor_id: "V-ACME", status: "active" } },
      normalize: { output: { amount: 2450, currency: "EUR", is_large: true } },
      pay: { output: { payment_id: "PAY-1" } },
    },
  };
  const eng = new PolicyEngine(fixtureDirectory({ rf1Reviewed: true }));
  console.log("\ndry-run of the expected requests (run initiator alice = finance-clerk, INV-1001 2450 EUR):");
  let denied = 0;
  for (const r of a.requests) {
    if (r.dynamic_args) { console.log(`  ${r.node.padEnd(18)} ${r.action.padEnd(13)} ${r.tool} -> skipped (agent-chosen arguments)`); continue; }
    let req: CheckRequest;
    if (r.action === "invoke_tool") req = { action: "invoke_tool", principal: "alice", flow: a.flow, flow_version: a.version, node: r.node, kind: r.kind, tool: r.tool!, args: resolveValue(r.args, env) as Record<string, unknown>, taint: r.static_taint, run_initiator: "alice" };
    else if (r.action === "invoke_llm") req = { action: "invoke_llm", principal: "alice", flow: a.flow, flow_version: a.version, node: r.node, kind: r.kind, args: { model_profile: r.model_profile, ...(r.tools ? { tools: r.tools } : {}) }, taint: r.static_taint, run_initiator: "alice" };
    else req = { action: "approve_task", principal: "bob", flow: a.flow, flow_version: a.version, node: r.node, kind: r.kind, run_initiator: "alice" };
    const d = eng.check(req);
    if (d.decision !== "allow") denied++;
    console.log(`  ${r.node.padEnd(18)} ${r.action.padEnd(13)} ${(r.tool ?? r.model_profile ?? "").padEnd(24)} -> ${d.decision.toUpperCase().padEnd(5)} ${d.reason}`);
  }
  console.log(`dry-run: ${a.requests.length} requests, ${denied} denied`);
}
