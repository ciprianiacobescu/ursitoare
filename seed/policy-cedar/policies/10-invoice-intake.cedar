// Per-step allowlist for flow `invoice-intake` (RF-1). Default deny does the rest: no other
// node has a permit for these tools. Read tools are covered by org-read-tools.

@id("inv-pay-step")
permit (principal, action == Action::"invoke_tool", resource == Node::"invoice-intake/pay")
when {
  context.tool == Tool::"erp.create_payment@1" &&
  resource.kind == "block" &&
  principal in [Role::"finance-clerk", Role::"finance-approver"]
};

@id("inv-notify-step")
permit (principal, action == Action::"invoke_tool", resource == Node::"invoice-intake/notify_rejection")
when {
  context.tool == Tool::"mail.send@1" &&
  context.args has to && context.args.to == "ap@example.com"
};

// delegate nodes call n8n workflows; the catalogue does not type their effect (assumed `send`).
@id("inv-archive-step")
permit (principal, action == Action::"invoke_tool", resource == Node::"invoice-intake/archive")
when { context.tool == Tool::"n8n:archive-invoice" };
