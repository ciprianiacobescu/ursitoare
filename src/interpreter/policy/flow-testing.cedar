@id("interpreter-test-flow-author-owner-team")
permit (principal in Role::"author", action == Action::"test_flow", resource is Flow)
when { principal in resource.owner_team };

@id("interpreter-test-flow-capability")
permit (principal in Role::"author", action == Action::"test_flow", resource is Tenant);
