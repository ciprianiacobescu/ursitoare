@id("registry-blocks-tenant-admin-read-registry")
permit (principal in Role::"tenant_admin", action == Action::"read_registry", resource);

@id("registry-blocks-author-read-registry")
permit (principal in Role::"author", action == Action::"read_registry", resource);

@id("registry-blocks-approver-read-registry")
permit (principal in Role::"approver", action == Action::"read_registry", resource);
