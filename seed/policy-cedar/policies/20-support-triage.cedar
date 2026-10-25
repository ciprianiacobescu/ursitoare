// Flow `support-triage` (synthetic second flow, gives the policy set realistic volume).

@id("sup-send-reply-step")
permit (principal, action == Action::"invoke_tool", resource == Node::"support-triage/send_reply")
when { context.tool == Tool::"mail.send@1" && principal in [Role::"support-agent", Role::"support-lead"] };

@id("sup-open-ticket-step")
permit (principal, action == Action::"invoke_tool", resource == Node::"support-triage/open_ticket")
when { context.tool == Tool::"crm.create_ticket@1" && principal in [Role::"support-agent", Role::"support-lead"] };

@id("sup-ticket-urgent-lead-only")
forbid (principal, action == Action::"invoke_tool", resource)
when { context.tool == Tool::"crm.create_ticket@1" && context.args has priority && context.args.priority == "urgent" }
unless { principal in Role::"support-lead" };

@id("sup-close-ticket-step")
permit (principal, action == Action::"invoke_tool", resource == Node::"support-triage/close_ticket")
when { context.tool == Tool::"crm.update_ticket@1" && principal in [Role::"support-agent", Role::"support-lead"] };

// Refund limits by role: agent <= 100.00, lead <= 1000.00; anything above is forbidden outright.
@id("sup-refund-step")
permit (principal, action == Action::"invoke_tool", resource == Node::"support-triage/refund")
when {
  context.tool == Tool::"orders.refund@1" && context.args has amount &&
  (
    (principal in Role::"support-agent" && context.args.amount.lessThanOrEqual(decimal("100.0000"))) ||
    (principal in Role::"support-lead" && context.args.amount.lessThanOrEqual(decimal("1000.0000")))
  )
};

@id("sup-refund-hard-cap")
forbid (principal, action == Action::"invoke_tool", resource)
when { context.tool == Tool::"orders.refund@1" }
unless { context.args has amount && context.args.amount.lessThanOrEqual(decimal("1000.0000")) };
