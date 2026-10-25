// The scenario table: every row is one policy.check() request with an expected decision and an
// expected deciding policy (substring of Decision.reason). Used by test/scenarios.test.ts and
// src/report-scenarios.ts (which prints the markdown table for REPORT.md).
import type { CheckRequest, Approval } from "./engine.ts";

export interface Scenario {
  id: string;
  group: string;
  title: string;
  req: CheckRequest;
  expect: "allow" | "deny";
  reason: string;            // substring of Decision.reason (policy id, "default_deny" or "request_error")
  rf1Reviewed?: boolean;     // directory variant: invoice-intake flow marked reviewed
}

const payArgs = (o: Record<string, unknown> = {}) => ({ vendor_id: "V-100", amount: 2450, currency: "EUR", reference: "INV-1001", ...o });
const pay = (principal: string, args: Record<string, unknown>, taint: string[], approvals: Approval[] = [], node = "pay", init = "alice"): CheckRequest =>
  ({ action: "invoke_tool", principal, flow: "invoice-intake", node, tool: "erp.create_payment@1", args, taint, run_initiator: init, approvals });
const mail = (node: string, to: string, taint: string[], principal = "alice", flow = "invoice-intake"): CheckRequest =>
  ({ action: "invoke_tool", principal, flow, node, tool: "mail.send@1", args: { to, subject: "s", body: "b" }, taint });
const llm = (principal: string, node: string, args: { model_profile?: string; tools?: string[] }, flow = "invoice-intake"): CheckRequest =>
  ({ action: "invoke_llm", principal, flow, node, args, taint: ["untrusted"] });
const caps = (u: boolean, p: boolean, s: boolean) => ({ reads_untrusted: u, reads_private: p, has_send_or_pay: s });
const activate = (principal: string, c: ReturnType<typeof caps>, flow = "invoice-intake"): CheckRequest =>
  ({ action: "activate_flow", principal, flow, flow_capabilities: c });
const refund = (principal: string, amount: number): CheckRequest =>
  ({ action: "invoke_tool", principal, flow: "support-triage", node: "refund", tool: "orders.refund@1", args: { order_id: "O-1", amount, reason: "damaged" }, taint: [] });
const A = (approver: string, role = "finance-approver"): Approval => ({ approver, role });

export const SCENARIOS: Scenario[] = [
  // ---- A. per-step allowlist
  { id: "A01", group: "step-allowlist", title: "alice, node pay, erp.create_payment 2450 EUR, taint extracted", req: pay("alice", payArgs(), ["extracted"]), expect: "allow", reason: "inv-pay-step" },
  { id: "A02", group: "step-allowlist", title: "same principal, node notify_rejection calls erp.create_payment", req: pay("alice", payArgs(), ["extracted"], [], "notify_rejection"), expect: "deny", reason: "default_deny" },
  { id: "A03", group: "step-allowlist", title: "same principal, llm.extract node calls erp.create_payment", req: pay("alice", payArgs(), [], [], "extract"), expect: "deny", reason: "default_deny" },
  { id: "A04", group: "step-allowlist", title: "agent node (invoice-intake/triage_agent) calls erp.create_payment", req: pay("alice", payArgs(), [], [], "triage_agent"), expect: "deny", reason: "org-forbid-agent-consequential" },
  { id: "A05", group: "step-allowlist", title: "other flow (support-triage/refund) calls erp.create_payment", req: { ...pay("bob", payArgs(), []), flow: "support-triage", node: "refund" } as CheckRequest, expect: "deny", reason: "default_deny" },
  { id: "A06", group: "step-allowlist", title: "ops-admin has no bypass: node archive calls erp.create_payment", req: pay("dave", payArgs(), [], [], "archive", "dave"), expect: "deny", reason: "default_deny" },
  { id: "A07", group: "step-allowlist", title: "right node, wrong tool: node pay calls mail.send", req: mail("pay", "ap@example.com", []), expect: "deny", reason: "default_deny" },
  { id: "A08", group: "step-allowlist", title: "node notify_rejection mail.send to ap@example.com", req: mail("notify_rejection", "ap@example.com", []), expect: "allow", reason: "inv-notify-step" },
  { id: "A09", group: "step-allowlist", title: "node notify_rejection mail.send to attacker@evil.test (arg constraint)", req: mail("notify_rejection", "attacker@evil.test", []), expect: "deny", reason: "default_deny" },
  { id: "A10", group: "step-allowlist", title: "node fetch_invoice reads invoices.get (read tools allowed anywhere)", req: { action: "invoke_tool", principal: "alice", flow: "invoice-intake", node: "fetch_invoice", tool: "invoices.get@1", args: { invoice_id: "INV-1001" }, taint: [] }, expect: "allow", reason: "org-read-tools" },
  // ---- B. argument constraints
  { id: "B01", group: "args", title: "amount exactly 10000.00, no approvals (boundary: not > 10000)", req: pay("alice", payArgs({ amount: 10000 }), ["extracted"]), expect: "allow", reason: "inv-pay-step" },
  { id: "B02", group: "args", title: "amount 10000.01, no approvals", req: pay("alice", payArgs({ amount: 10000.01 }), ["extracted"]), expect: "deny", reason: "org-payment-large-needs-sod" },
  { id: "B03", group: "args", title: "amount 20000, approved by bob (finance-approver != initiator alice)", req: pay("alice", payArgs({ amount: 20000 }), ["extracted"], [A("bob")]), expect: "allow", reason: "inv-pay-step" },
  { id: "B04", group: "args", title: "amount 20000, only approver is the initiator (separation of duties)", req: pay("henry", payArgs({ amount: 20000 }), ["extracted"], [A("henry")], "pay", "henry"), expect: "deny", reason: "org-payment-large-needs-sod" },
  { id: "B05", group: "args", title: "amount 20000, no approvals at all", req: pay("alice", payArgs({ amount: 20000 }), ["extracted"]), expect: "deny", reason: "org-payment-large-needs-sod" },
  { id: "B06", group: "args", title: "amount 20000, approval recorded under role finance-clerk only", req: pay("alice", payArgs({ amount: 20000 }), ["extracted"], [A("henry", "finance-clerk")]), expect: "deny", reason: "org-payment-large-needs-sod" },
  { id: "B07", group: "args", title: "amount 20000, approvals {initiator, bob} (defence-in-depth record rule)", req: pay("henry", payArgs({ amount: 20000 }), ["extracted"], [A("henry"), A("bob")], "pay", "henry"), expect: "deny", reason: "org-payment-no-self-approval-record" },
  { id: "B08", group: "args", title: "amount 20000, two approvers bob + carol", req: pay("alice", payArgs({ amount: 20000 }), ["extracted"], [A("bob"), A("carol")]), expect: "allow", reason: "inv-pay-step" },
  { id: "B09", group: "args", title: "currency GBP", req: pay("alice", payArgs({ currency: "GBP" }), ["extracted"]), expect: "deny", reason: "org-payment-args" },
  { id: "B10", group: "args", title: "currency USD", req: pay("alice", payArgs({ currency: "USD", amount: 120.5 }), ["extracted"]), expect: "allow", reason: "inv-pay-step" },
  { id: "B11", group: "args", title: "currency 'usd' (lower case; policy is case-sensitive)", req: pay("alice", payArgs({ currency: "usd" }), ["extracted"]), expect: "deny", reason: "org-payment-args" },
  { id: "B12", group: "args", title: "amount missing (required arg absent: fail closed)", req: pay("alice", { vendor_id: "V", currency: "EUR", reference: "r" }, ["extracted"]), expect: "deny", reason: "org-payment-args" },
  { id: "B13", group: "args", title: "amount 0.1+0.2 (more than 4 decimals: PEP refuses to round)", req: pay("alice", payArgs({ amount: 0.1 + 0.2 }), ["extracted"]), expect: "deny", reason: "request_error:decimal_precision" },
  { id: "B14", group: "args", title: "undeclared argument key (foo) on a catalogue tool", req: pay("alice", payArgs({ foo: 1 }), ["extracted"]), expect: "deny", reason: "request_error:unknown_arg" },
  // ---- C. taint
  { id: "C01", group: "taint", title: "taint {untrusted}, mail.send at notify_rejection", req: mail("notify_rejection", "ap@example.com", ["untrusted"]), expect: "deny", reason: "org-forbid-untrusted-egress" },
  { id: "C02", group: "taint", title: "taint {untrusted}, erp.create_payment 2450 EUR at pay", req: pay("alice", payArgs(), ["untrusted"]), expect: "deny", reason: "org-forbid-untrusted-egress" },
  { id: "C03", group: "taint", title: "taint {untrusted}, read tool invoices.get", req: { action: "invoke_tool", principal: "alice", flow: "invoice-intake", node: "fetch_invoice", tool: "invoices.get@1", args: { invoice_id: "INV-1001" }, taint: ["untrusted"] }, expect: "allow", reason: "org-read-tools" },
  { id: "C04", group: "taint", title: "taint {extracted}, mail.send at notify_rejection", req: mail("notify_rejection", "ap@example.com", ["extracted"]), expect: "allow", reason: "inv-notify-step" },
  { id: "C05", group: "taint", title: "taint {untrusted, extracted}, mail.send", req: mail("notify_rejection", "ap@example.com", ["extracted", "untrusted"]), expect: "deny", reason: "org-forbid-untrusted-egress" },
  { id: "C06", group: "taint", title: "taint {untrusted}, write tool crm.create_ticket (write is NOT covered by the rule)", req: { action: "invoke_tool", principal: "erin", flow: "support-triage", node: "open_ticket", tool: "crm.create_ticket@1", args: { customer_id: "C1", subject: "s", priority: "normal", body: "b" }, taint: ["untrusted"] }, expect: "allow", reason: "sup-open-ticket-step" },
  // ---- D. role gating
  { id: "D01", group: "roles", title: "finance-clerk start_run invoice-intake", req: { action: "start_run", principal: "alice", flow: "invoice-intake" }, expect: "allow", reason: "org-start-run" },
  { id: "D02", group: "roles", title: "finance-clerk approve_task (run started by someone else)", req: { action: "approve_task", principal: "alice", flow: "invoice-intake", node: "approval", run_initiator: "henry" }, expect: "deny", reason: "default_deny" },
  { id: "D03", group: "roles", title: "finance-approver bob approve_task (run started by alice)", req: { action: "approve_task", principal: "bob", flow: "invoice-intake", node: "approval", run_initiator: "alice" }, expect: "allow", reason: "org-approve-finance" },
  { id: "D04", group: "roles", title: "finance-approver bob approves his own run (forbid overrides permit)", req: { action: "approve_task", principal: "bob", flow: "invoice-intake", node: "approval", run_initiator: "bob" }, expect: "deny", reason: "org-no-self-approval" },
  { id: "D05", group: "roles", title: "ops-admin activate_flow sales-followup (no trifecta)", req: activate("dave", caps(true, false, true), "sales-followup"), expect: "allow", reason: "org-activate-flow" },
  { id: "D06", group: "roles", title: "finance-clerk activate_flow", req: activate("alice", caps(false, false, false)), expect: "deny", reason: "default_deny" },
  { id: "D07", group: "roles", title: "user with no roles start_run", req: { action: "start_run", principal: "ivy", flow: "invoice-intake" }, expect: "deny", reason: "default_deny" },
  { id: "D08", group: "roles", title: "approver role but wrong team (kim, support) approves finance flow", req: { action: "approve_task", principal: "kim", flow: "invoice-intake", node: "approval", run_initiator: "alice" }, expect: "deny", reason: "default_deny" },
  { id: "D09", group: "roles", title: "sales-rep start_run on finance flow", req: { action: "start_run", principal: "gina", flow: "invoice-intake" }, expect: "deny", reason: "default_deny" },
  { id: "D10", group: "roles", title: "ops-admin edit_flow", req: { action: "edit_flow", principal: "dave", flow: "invoice-intake" }, expect: "allow", reason: "org-edit-admin" },
  { id: "D11", group: "roles", title: "finance-clerk edit_flow (own team, but not a lead)", req: { action: "edit_flow", principal: "alice", flow: "invoice-intake" }, expect: "deny", reason: "default_deny" },
  { id: "D12", group: "roles", title: "finance-approver edit_flow in own team", req: { action: "edit_flow", principal: "bob", flow: "invoice-intake" }, expect: "allow", reason: "org-edit-team-lead" },
  { id: "D13", group: "roles", title: "support-lead edit_flow on a finance flow", req: { action: "edit_flow", principal: "frank", flow: "invoice-intake" }, expect: "deny", reason: "default_deny" },
  // ---- E. activation-time lethal trifecta
  { id: "E01", group: "trifecta", title: "ops-admin activates RF-1 shape (untrusted+private+send/pay), unreviewed", req: activate("dave", caps(true, true, true)), expect: "deny", reason: "org-trifecta-needs-review" },
  { id: "E02", group: "trifecta", title: "same, Flow.reviewed == true", req: activate("dave", caps(true, true, true)), expect: "allow", reason: "org-activate-flow", rf1Reviewed: true },
  { id: "E03", group: "trifecta", title: "untrusted + private, no send/pay, unreviewed", req: activate("dave", caps(true, true, false)), expect: "allow", reason: "org-activate-flow" },
  { id: "E04", group: "trifecta", title: "untrusted + send/pay, no private, unreviewed", req: activate("dave", caps(true, false, true)), expect: "allow", reason: "org-activate-flow" },
  { id: "E05", group: "trifecta", title: "non-admin bob activates reviewed trifecta flow", req: activate("bob", caps(true, true, true)), expect: "deny", reason: "default_deny", rf1Reviewed: true },
  // ---- F. LLM calls
  { id: "F01", group: "llm", title: "alice invoke_llm (profile default) on llm.decide node", req: llm("alice", "classify", { model_profile: "default" }), expect: "allow", reason: "org-llm-default-profiles" },
  { id: "F02", group: "llm", title: "alice (finance-clerk) asks for profile 'careful'", req: llm("alice", "classify", { model_profile: "careful" }), expect: "deny", reason: "default_deny" },
  { id: "F03", group: "llm", title: "bob (finance-approver) asks for profile 'careful'", req: llm("bob", "classify", { model_profile: "careful" }), expect: "allow", reason: "org-llm-careful-profile" },
  { id: "F04", group: "llm", title: "llm.extract node call carries tools (defence in depth), even for bob", req: llm("bob", "extract", { model_profile: "default", tools: ["erp.create_payment@1"] }), expect: "deny", reason: "org-llm-no-tools-on-structured-nodes" },
  { id: "F05", group: "llm", title: "agent node call carries tools", req: llm("alice", "triage_agent", { model_profile: "default", tools: ["kb.search@1"] }), expect: "allow", reason: "org-llm-default-profiles" },
  { id: "F06", group: "llm", title: "llm.extract node call with empty tools set (key present)", req: llm("alice", "extract", { tools: [] }), expect: "deny", reason: "org-llm-no-tools-on-structured-nodes" },
  { id: "F07", group: "llm", title: "alice asks for unknown profile 'exotic'", req: llm("alice", "classify", { model_profile: "exotic" }), expect: "deny", reason: "default_deny" },
  { id: "F08", group: "llm", title: "no model_profile in args (engine default)", req: llm("alice", "extract", {}), expect: "allow", reason: "org-llm-default-profiles" },
  // ---- G. default deny, forbid-overrides-permit, misc constraints
  { id: "G01", group: "default-deny", title: "user without roles reads invoices.get", req: { action: "invoke_tool", principal: "ivy", flow: "invoice-intake", node: "fetch_invoice", tool: "invoices.get@1", args: { invoice_id: "x" }, taint: [] }, expect: "deny", reason: "default_deny" },
  { id: "G02", group: "default-deny", title: "tool unknown to the catalogue", req: { action: "invoke_tool", principal: "alice", flow: "invoice-intake", node: "pay", tool: "nope.nothing@1", args: {}, taint: [] }, expect: "deny", reason: "request_error:unknown_tool" },
  { id: "G03", group: "default-deny", title: "unknown principal", req: { action: "start_run", principal: "mallory", flow: "invoice-intake" }, expect: "deny", reason: "request_error:unknown_user" },
  { id: "G04", group: "default-deny", title: "hook claims kind=llm.extract for node pay (kind mismatch with directory)", req: { ...(pay("alice", payArgs(), ["extracted"]) as object), kind: "llm.extract" } as CheckRequest, expect: "deny", reason: "request_error:kind_mismatch" },
  { id: "G05", group: "default-deny", title: "hook claims flow_version 9.9.9 (mismatch with directory 1.0.0)", req: { ...(pay("alice", payArgs(), ["extracted"]) as object), flow_version: "9.9.9" } as CheckRequest, expect: "deny", reason: "request_error:version_mismatch" },
  { id: "G06", group: "default-deny", title: "flow_version matches (1.0.0) and kind matches (block)", req: { ...(pay("alice", payArgs(), ["extracted"]) as object), flow_version: "1.0.0", kind: "block" } as CheckRequest, expect: "allow", reason: "inv-pay-step" },
  { id: "G07", group: "forbid-overrides", title: "http.post in sales-followup (forbid) by the owning sales-rep", req: { action: "invoke_tool", principal: "gina", flow: "sales-followup", node: "post_hook", tool: "http.post@1", args: { url: "https://hooks.example.com/x", json: { a: 1 } }, taint: [] }, expect: "deny", reason: "sales-no-http-post" },
  { id: "G08", group: "args", title: "http.get to https://docs.example.com/a (egress allowlist)", req: { action: "invoke_tool", principal: "gina", flow: "sales-followup", node: "find_customer", tool: "http.get@1", args: { url: "https://docs.example.com/a" }, taint: [] }, expect: "allow", reason: "org-read-tools" },
  { id: "G09", group: "args", title: "http.get to https://evil.test/ (read effect, but URL not allowlisted)", req: { action: "invoke_tool", principal: "gina", flow: "sales-followup", node: "find_customer", tool: "http.get@1", args: { url: "https://evil.test/" }, taint: [] }, expect: "deny", reason: "org-http-url-allowlist" },
  { id: "G10", group: "args", title: "slack.post_message to #sales-eu by sales-rep", req: { action: "invoke_tool", principal: "gina", flow: "sales-followup", node: "notify_channel", tool: "slack.post_message@1", args: { channel: "#sales-eu", text: "hi" }, taint: [] }, expect: "allow", reason: "sales-slack-step" },
  { id: "G11", group: "args", title: "slack.post_message to #general (like-pattern constraint)", req: { action: "invoke_tool", principal: "gina", flow: "sales-followup", node: "notify_channel", tool: "slack.post_message@1", args: { channel: "#general", text: "hi" }, taint: [] }, expect: "deny", reason: "default_deny" },
  { id: "G12", group: "args", title: "support-agent refund 80.00 (cap 100)", req: refund("erin", 80), expect: "allow", reason: "sup-refund-step" },
  { id: "G13", group: "args", title: "support-agent refund 150.00", req: refund("erin", 150), expect: "deny", reason: "default_deny" },
  { id: "G14", group: "args", title: "support-lead refund 800.00 (cap 1000)", req: refund("frank", 800), expect: "allow", reason: "sup-refund-step" },
  { id: "G15", group: "args", title: "support-lead refund 1500.00 (hard cap forbid)", req: refund("frank", 1500), expect: "deny", reason: "sup-refund-hard-cap" },
  { id: "G16", group: "args", title: "support-agent opens an urgent ticket (lead-only)", req: { action: "invoke_tool", principal: "erin", flow: "support-triage", node: "open_ticket", tool: "crm.create_ticket@1", args: { customer_id: "C1", subject: "s", priority: "urgent", body: "b" }, taint: [] }, expect: "deny", reason: "sup-ticket-urgent-lead-only" },
  { id: "G17", group: "args", title: "support-lead opens an urgent ticket", req: { action: "invoke_tool", principal: "frank", flow: "support-triage", node: "open_ticket", tool: "crm.create_ticket@1", args: { customer_id: "C1", subject: "s", priority: "urgent", body: "b" }, taint: [] }, expect: "allow", reason: "sup-open-ticket-step" },
  { id: "G18", group: "args", title: "support-agent closes a ticket at close_ticket (crm.update_ticket)", req: { action: "invoke_tool", principal: "erin", flow: "support-triage", node: "close_ticket", tool: "crm.update_ticket@1", args: { ticket_id: "T1", status: "solved" }, taint: [] }, expect: "allow", reason: "sup-close-ticket-step" },
  { id: "G19", group: "args", title: "sales-rep appends a sheet row at log_row", req: { action: "invoke_tool", principal: "gina", flow: "sales-followup", node: "log_row", tool: "sheets.append_row@1", args: { sheet_id: "S1", values: ["a", "b"] }, taint: [] }, expect: "allow", reason: "sales-log-row-step" },
  { id: "G20", group: "args", title: "sales-rep books a meeting at book_meeting", req: { action: "invoke_tool", principal: "gina", flow: "sales-followup", node: "book_meeting", tool: "calendar.create_event@1", args: { title: "t", start: "2026-11-01T10:00", end: "2026-11-01T11:00", attendees: ["a@example.com"] }, taint: [] }, expect: "allow", reason: "sales-calendar-step" },
  { id: "G21", group: "args", title: "sales-rep books a meeting from the wrong node (log_row)", req: { action: "invoke_tool", principal: "gina", flow: "sales-followup", node: "log_row", tool: "calendar.create_event@1", args: { title: "t", start: "s", end: "e", attendees: [] }, taint: [] }, expect: "deny", reason: "default_deny" },
  { id: "D14", group: "roles", title: "support-lead approves a support-owned approval node (run started by erin)", req: { action: "approve_task", principal: "frank", flow: "support-triage", node: "refund_ok", run_initiator: "erin" }, expect: "allow", reason: "org-approve-support" },
  { id: "D15", group: "roles", title: "finance-approver bob approves a support-owned approval node", req: { action: "approve_task", principal: "bob", flow: "support-triage", node: "refund_ok", run_initiator: "erin" }, expect: "deny", reason: "default_deny" },
  { id: "G22", group: "step-allowlist", title: "delegate node archive calls n8n:archive-invoice (assumed effect send, clean taint)", req: { action: "invoke_tool", principal: "alice", flow: "invoice-intake", node: "archive", tool: "n8n:archive-invoice", args: { invoice_id: "INV-1001", payment_id: "P-1" }, taint: ["extracted"] }, expect: "allow", reason: "inv-archive-step" },
  { id: "G23", group: "taint", title: "delegate node archive with taint {untrusted} (delegate is egress)", req: { action: "invoke_tool", principal: "alice", flow: "invoice-intake", node: "archive", tool: "n8n:archive-invoice", args: { invoice_id: "INV-1001" }, taint: ["untrusted"] }, expect: "deny", reason: "org-forbid-untrusted-egress" },
  { id: "G24", group: "args", title: "support-agent sends a reply at send_reply (mail.send)", req: mail("send_reply", "customer@example.org", ["extracted"], "erin", "support-triage"), expect: "allow", reason: "sup-send-reply-step" },
  { id: "G25", group: "step-allowlist", title: "support-agent sends mail from the wrong node (draft_reply)", req: mail("draft_reply", "customer@example.org", [], "erin", "support-triage"), expect: "deny", reason: "default_deny" },
  { id: "G26", group: "args", title: "http.get URL that smuggles the allowed domain into the path (https://evil.test/.example.com/x)", req: { action: "invoke_tool", principal: "gina", flow: "sales-followup", node: "find_customer", tool: "http.get@1", args: { url: "https://evil.test/.example.com/x" }, taint: [] }, expect: "deny", reason: "org-http-url-allowlist" },
  { id: "G27", group: "args", title: "http.get URL with userinfo trick (https://docs.example.com@evil.test/)", req: { action: "invoke_tool", principal: "gina", flow: "sales-followup", node: "find_customer", tool: "http.get@1", args: { url: "https://docs.example.com@evil.test/" }, taint: [] }, expect: "deny", reason: "org-http-url-allowlist" },
  { id: "G28", group: "args", title: "http.get plain http:// to an allowed host", req: { action: "invoke_tool", principal: "gina", flow: "sales-followup", node: "find_customer", tool: "http.get@1", args: { url: "http://docs.example.com/a" }, taint: [] }, expect: "deny", reason: "org-http-url-allowlist" },
  { id: "G29", group: "args", title: "http.get https://example.com/a?x=1 (apex host, with query)", req: { action: "invoke_tool", principal: "gina", flow: "sales-followup", node: "find_customer", tool: "http.get@1", args: { url: "https://example.com/a?x=1" }, taint: [] }, expect: "allow", reason: "org-read-tools" },
  { id: "G30", group: "default-deny", title: "http.get with an unparseable URL (PEP refuses)", req: { action: "invoke_tool", principal: "gina", flow: "sales-followup", node: "find_customer", tool: "http.get@1", args: { url: "not a url" }, taint: [] }, expect: "deny", reason: "request_error" },
];
