@id("dry-run-flow-author-owner-team")
permit (principal in Role::"author", action == Action::"dry_run_flow", resource is Flow)
when { principal in resource.owner_team };

@id("dry-run-flow-capability")
permit (principal in Role::"author", action == Action::"dry_run_flow", resource is Tenant);
