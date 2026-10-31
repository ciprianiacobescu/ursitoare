@id("identity-rbac-tenant-admin-manage-users-roles")
permit (principal in Role::"tenant_admin", action == Action::"manage_users_roles", resource);

@id("identity-rbac-tenant-admin-manage-tenant")
permit (principal in Role::"tenant_admin", action == Action::"manage_tenant", resource);

@id("identity-rbac-tenant-admin-read-audit")
permit (principal in Role::"tenant_admin", action == Action::"read_audit", resource);

@id("identity-rbac-auditor-read-audit")
permit (principal in Role::"auditor", action == Action::"read_audit", resource);
