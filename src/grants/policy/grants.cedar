@id("grants-deploy-admin")
permit (principal in Role::"tenant_admin", action == Action::"deploy_policy", resource);
