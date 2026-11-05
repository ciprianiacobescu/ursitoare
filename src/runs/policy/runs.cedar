@id("runs-read-owner-team")
permit (principal, action == Action::"read_run", resource is Run)
when { principal in resource.owner_team };

@id("runs-read-initiator")
permit (principal, action == Action::"read_run", resource is Run)
when { principal == resource.initiator };

@id("runs-list")
permit (principal, action == Action::"read_run", resource is Tenant);

@id("runs-debug-author-owner-team")
permit (principal in Role::"author", action == Action::"debug_run", resource is Run)
when { principal in resource.owner_team };
