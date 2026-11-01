@id("registry-flows-author-edit-own-team")
permit (principal in Role::"author", action == Action::"edit_flow", resource is Flow)
when { principal in resource.owner_team };

@id("registry-flows-team-read")
permit (principal, action == Action::"read_flow", resource is Flow)
when { principal in resource.owner_team };

@id("registry-flows-list")
permit (principal, action == Action::"read_flow", resource is Tenant);
