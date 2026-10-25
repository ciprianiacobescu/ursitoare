// Ursitoare M6 -- org-wide policies. Every policy constrains `action` (strict validation
// checks each policy against every (principal, action, resource) environment it can match,
// and the context shape differs per action).

// ---------------------------------------------------------------- tool calls: baseline
@id("org-read-tools")
permit (principal, action == Action::"invoke_tool", resource)
when { context.tool.effect == "read" && !principal.roles.isEmpty() };

// Taint: raw untrusted data may never reach a send or pay tool. (Read stays allowed.)
@id("org-forbid-untrusted-egress")
forbid (principal, action == Action::"invoke_tool", resource)
when { context.taint.contains("untrusted") && ["send", "pay"].contains(context.tool.effect) };

// An LLM-driven `agent` node may never pick a send/pay tool on its own.
@id("org-forbid-agent-consequential")
forbid (principal, action == Action::"invoke_tool", resource)
when { resource.kind == "agent" && ["send", "pay"].contains(context.tool.effect) };

// Egress allowlist for the gateway HTTP blocks (read-effect http.get would otherwise pass).
// Cedar `like` has no host boundary: `*` also matches "/", so `url like "https://*.example.com/*"` accepts
// "https://evil.test/.example.com/x". The PEP therefore derives `url_host` with the WHATWG URL parser and
// the policy compares the host, not the raw string.
@id("org-http-url-allowlist")
forbid (principal, action == Action::"invoke_tool", resource)
when { [Tool::"http.get@1", Tool::"http.post@1"].contains(context.tool) }
unless {
  context.args has url && context.args has url_host &&
  context.args.url like "https://*" &&
  (context.args.url_host == "example.com" || context.args.url_host like "*.example.com")
};

// ---------------------------------------------------------------- payments: argument constraints
// amount and currency are required, currency in {EUR, USD}. (Case-sensitive: normalise upstream.)
@id("org-payment-args")
forbid (principal, action == Action::"invoke_tool", resource)
when { context.tool == Tool::"erp.create_payment@1" }
unless {
  context.args has amount && context.args has currency &&
  ["EUR", "USD"].contains(context.args.currency)
};

// amount > 10000 needs a finance-approver approval by somebody other than the run initiator.
// `approvers_by_role` is a pure grouping of `approvals` by role (see README: Cedar has no
// existential quantifier over a Set<Record>). Set equality is by value, so
// `ids != [run_initiator]` means "somebody besides the initiator is in the set".
@id("org-payment-large-needs-sod")
forbid (principal, action == Action::"invoke_tool", resource)
when {
  context.tool == Tool::"erp.create_payment@1" &&
  context.args has amount && context.args.amount.greaterThan(decimal("10000.0000"))
}
unless {
  context.approvers_by_role has "finance-approver" &&
  !context.approvers_by_role["finance-approver"].isEmpty() &&
  context.approvers_by_role["finance-approver"] != [context.run_initiator]
};

// Defence in depth: a payment run in which the initiator is recorded as a finance-approver
// is refused outright, even if somebody else also approved. Uses the literal Set<Record>.
@id("org-payment-no-self-approval-record")
forbid (principal, action == Action::"invoke_tool", resource)
when {
  context.tool == Tool::"erp.create_payment@1" &&
  context.approvals.contains({ approver: context.run_initiator, role: Role::"finance-approver" })
};

// ---------------------------------------------------------------- LLM calls
// NOTE: `!(x has a) || x.a ...` is rejected by the strict validator (no capability is derived from
// the negated `has`); `if x has a then ... else true` is accepted.
@id("org-llm-default-profiles")
permit (principal, action == Action::"invoke_llm", resource)
when {
  !principal.roles.isEmpty() &&
  (if context.args has model_profile then ["default", "fast"].contains(context.args.model_profile) else true)
};

@id("org-llm-careful-profile")
permit (principal, action == Action::"invoke_llm", resource)
when {
  principal in [Role::"finance-approver", Role::"support-lead", Role::"ops-admin"] &&
  context.args has model_profile && context.args.model_profile == "careful"
};

// Defence in depth: structured-output LLM nodes never carry tools (format v0, section 4.2).
@id("org-llm-no-tools-on-structured-nodes")
forbid (principal, action == Action::"invoke_llm", resource)
when { ["llm.extract", "llm.generate", "llm.decide"].contains(resource.kind) && context.args has tools };

// ---------------------------------------------------------------- role gating
@id("org-start-run")
permit (principal, action == Action::"start_run", resource)
when { !principal.roles.isEmpty() && (principal in Role::"ops-admin" || principal.team == resource.owner_team) };

@id("org-approve-finance")
permit (principal in Role::"finance-approver", action == Action::"approve_task", resource)
when { resource.kind == "human.approval" && resource.flow.owner_team == "finance" && principal.team == "finance" };

@id("org-approve-support")
permit (principal in Role::"support-lead", action == Action::"approve_task", resource)
when { resource.kind == "human.approval" && resource.flow.owner_team == "support" && principal.team == "support" };

// Separation of duties at the source: nobody approves a run they started.
@id("org-no-self-approval")
forbid (principal, action == Action::"approve_task", resource)
when { principal == context.run_initiator };

// ---------------------------------------------------------------- activation and editing
@id("org-activate-flow")
permit (principal in Role::"ops-admin", action == Action::"activate_flow", resource);

// Activation-time lethal trifecta: untrusted input + private data + send/pay needs a review.
@id("org-trifecta-needs-review")
forbid (principal, action == Action::"activate_flow", resource)
when {
  context.flow_capabilities.reads_untrusted &&
  context.flow_capabilities.reads_private &&
  context.flow_capabilities.has_send_or_pay
}
unless { resource.reviewed };

@id("org-edit-admin")
permit (principal in Role::"ops-admin", action == Action::"edit_flow", resource);

@id("org-edit-team-lead")
permit (principal, action == Action::"edit_flow", resource)
when { principal in [Role::"finance-approver", Role::"support-lead"] && principal.team == resource.owner_team };
