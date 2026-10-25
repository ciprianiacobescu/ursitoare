// Flow `sales-followup` (synthetic third flow).

@id("sales-slack-step")
permit (principal, action == Action::"invoke_tool", resource == Node::"sales-followup/notify_channel")
when {
  context.tool == Tool::"slack.post_message@1" && principal in Role::"sales-rep" &&
  context.args has channel && context.args.channel like "#sales-*"
};

@id("sales-log-row-step")
permit (principal, action == Action::"invoke_tool", resource == Node::"sales-followup/log_row")
when { context.tool == Tool::"sheets.append_row@1" && principal in Role::"sales-rep" };

@id("sales-calendar-step")
permit (principal, action == Action::"invoke_tool", resource == Node::"sales-followup/book_meeting")
when { context.tool == Tool::"calendar.create_event@1" && principal in Role::"sales-rep" };

// Explicit denylist: this flow may never POST to arbitrary endpoints, whoever runs it.
@id("sales-no-http-post")
forbid (principal, action == Action::"invoke_tool", resource)
when { resource.flow == Flow::"sales-followup" && context.tool == Tool::"http.post@1" };
