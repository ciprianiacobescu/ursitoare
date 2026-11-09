@id("tools-register-admin")
permit (principal in Role::"tenant_admin", action == Action::"register_tool_server", resource);

@id("tools-approve-admin")
permit (principal in Role::"tenant_admin", action == Action::"approve_tool_surface", resource);
