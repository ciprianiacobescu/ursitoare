# Spec Delta

## Purpose
Roles, teams, IdP group mappings and memberships inside one tenant: IdP groups decide, through a reviewed mapping, who holds which role or team, and the principal carries that into policy checks.

## ADDED Requirements

### Requirement: Every tenant has the four default roles — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Schema test does not check the exported DEFAULT_ROLES
- **WHEN** after seedTwoTenants(db) the owner inserts tenant_c and DEFAULT_ROLES is imported from src/identity/index.ts
- **THEN** a

#### Scenario: Schema test does not check the exported DEFAULT_ROLES (2)
- **WHEN** after seedTwoTenants(db) the owner inserts tenant_c and DEFAULT_ROLES is imported from src/identity/index.ts
- **THEN** a test asserts that [...DEFAULT_ROLES].sort() deep-equals [
