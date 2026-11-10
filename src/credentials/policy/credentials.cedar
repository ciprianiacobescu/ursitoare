@id("credentials-manage-admin")
permit (principal in Role::"tenant_admin", action == Action::"manage_credentials", resource);
