## Purpose

A catalog test that guards every table of schema `ursitoare` and the runtime role, so a later migration cannot skip tenant isolation. In catalog scenarios a *compliant* table has text columns `tenant_id`, `id`, primary key `(tenant_id, id)`, RLS enabled and forced, and one policy with `USING` and `WITH CHECK` of `tenant_id = current_setting('app.tenant_id', true)`.

## ADDED Requirements

### Requirement: The catalog test guards every table
`checkTenancyCatalog(db, opts?)` SHALL report every table of schema `ursitoare` outside the closed allowlist `schema_migration`, `tenant`, `tenant_route` that lacks `tenant_id` as first primary-key column (no key or no such column included), has a unique index or foreign key that does not lead with or include `tenant_id`, lacks row-level security enabled or forced, or lacks a policy set in which every permissive policy applying to the app role (for `PUBLIC`, the app role or a role it is a member of) mentions `app.tenant_id`, and be clean on a migrated database.

#### Scenario: The migrated database is clean
- **WHEN** `checkTenancyCatalog(db.ownerPool)` runs on `withTestDatabase()`, and `CATALOG_GLOBAL_TABLES` is read
- **THEN** the violations are `[]` and the constant equals `["schema_migration", "tenant", "tenant_route"]`

#### Scenario: Each broken object is reported
- **WHEN** in a fresh database the owner adds compliant `ok_t`, and with extra text columns `email`, `ok_id`, `other_tenant`: compliant `ok_child` (plus `FOREIGN KEY (tenant_id, ok_id) REFERENCES ursitoare.ok_t (tenant_id, id)`), compliant `ok_part` (list-partitioned on `tenant_id`) with partition `ok_part_a`, and otherwise compliant `bad_pk` (primary key `id`), `bad_open` (no RLS, no policy), `bad_policy` (policy `USING (true)`), `bad_extra` (plus a policy `open` `USING (true)`), `bad_check` (`WITH CHECK (true)`), `bad_unique` (`CONSTRAINT bad_unique_email_key UNIQUE (email)`), `bad_fk` (`CONSTRAINT bad_fk_scope FOREIGN KEY (other_tenant, ok_id) REFERENCES ursitoare.ok_t (tenant_id, id)`) and `bad_swap` (`CONSTRAINT bad_swap_fkey FOREIGN KEY (tenant_id, ok_id) REFERENCES ursitoare.ok_t (id, tenant_id)`)
- **THEN** the violations (`rule ursitoare.<object>`, sorted by rule then object) are exactly `fk_not_tenant_scoped` for `bad_fk_scope` and `bad_swap_fkey`, `no_tenant_policy` for `bad_check`, `bad_extra`, `bad_open` and `bad_policy`, `not_tenant_leading bad_pk`, `rls_not_enabled bad_open`, `rls_not_forced bad_open` and `unique_not_tenant_leading bad_unique_email_key`

#### Scenario: A table with no key or no tenant column is reported
- **WHEN** in a fresh database the owner adds, each with RLS enabled and forced and policy `USING (current_setting('app.tenant_id', true) IS NOT NULL)`: `bad_nopk` (columns `tenant_id`, `id`, no key) and `bad_notid` (`id text PRIMARY KEY`, `email text`, `parent text`, `CONSTRAINT bad_notid_email_key UNIQUE (email)`, `CONSTRAINT bad_notid_parent_fk FOREIGN KEY (parent) REFERENCES ursitoare.bad_notid (id)`)
- **THEN** the violations are exactly `fk_not_tenant_scoped bad_notid_parent_fk`, `not_tenant_leading bad_nopk`, `not_tenant_leading bad_notid` and `unique_not_tenant_leading bad_notid_email_key`

#### Scenario: A policy for the app role or its group counts
- **WHEN** through `readTestCluster().adminUrl` roles `probe_grp_<hex>` and `probe_<hex>` (a member of the first) exist (dropped in `after`, after `db.close()` has dropped the database holding the policies), and in a fresh database the owner adds compliant `bad_app` plus policy `open_app` `TO ursitoare_app USING (true)`, and compliant `bad_grp` plus policy `open_grp` `TO probe_grp_<hex> USING (true)`
- **THEN** the default role gives exactly `no_tenant_policy ursitoare.bad_app`, and `appRole` `probe_<hex>` gives exactly `no_tenant_policy ursitoare.bad_grp`

### Requirement: The runtime role is unprivileged
`checkTenancyCatalog` SHALL also report an app role that is missing, superuser, `BYPASSRLS`, owns a relation or is a member of `ursitoare_owner` or of a superuser or `BYPASSRLS` role; an app-role privilege on `tenant_route`, a partition, a view without `security_invoker`, or a materialized or foreign table; and a `SECURITY DEFINER` function of the schema not owned by `ursitoare_owner`, executable by `PUBLIC`, or whose `search_path` does not end in `pg_temp` or names anything but `pg_catalog`, `ursitoare`, `pg_temp`.

#### Scenario: Objects that open a hole
- **WHEN** in a fresh database the owner creates compliant `ok_part` with partition `ok_part_a`, grants `SELECT` on `ursitoare.tenant_route` and `ok_part_a`, and creates, with `SELECT` granted, view `bad_view` over `ursitoare.tenant`, materialized view `bad_mv` over it and foreign table `bad_ft (x text)` (a superuser connection to that database, `adminUrl` with path `/<db.name>`, first creates `FOREIGN DATA WRAPPER probe_fdw` and grants its `USAGE` to `ursitoare_owner`, who creates `SERVER probe_srv`); the same view `ok_view` (`SELECT` granted) `WITH (security_invoker = true)`; and `SECURITY DEFINER` functions `bad_fn()` (no `SET`), `bad_fn_path()` (`SET search_path = ursitoare`), `bad_fn_public()` (`SET search_path = public, pg_temp`) and `bad_fn_exec()` (`SET search_path = pg_catalog, pg_temp`, `EXECUTE` granted to `PUBLIC`)
- **THEN** the violations (`rule ursitoare.<object>`) are exactly `definer_function_unsafe` for `bad_fn()`, `bad_fn_exec()`, `bad_fn_path()` and `bad_fn_public()`, `partition_open_to_app ok_part_a`, `route_table_open tenant_route`, and `view_open_to_app` for `bad_ft`, `bad_mv` and `bad_view`

#### Scenario: A definer function of another owner
- **WHEN** `checkTenancyCatalog(db.ownerPool, { ownerRole: "postgres" })` runs on `withTestDatabase()`
- **THEN** the violations are exactly `definer_function_unsafe` for `ursitoare.register_tenant_route(p_kind text, p_key_hash bytea)`, `ursitoare.resolve_tenant(p_kind text, p_key_hash bytea)` and `ursitoare.unregister_tenant_route(p_kind text, p_key_hash bytea)`, in that order

#### Scenario: The real role and probe roles
- **WHEN** the check runs on a migrated database with the default role, then with `appRole` `"postgres"`, `"ursitoare_owner"`, `"no_such_role"`, a login role `probe_<hex>` granted `ursitoare_owner`, and one granted a `BYPASSRLS` role (created through `readTestCluster().adminUrl`, dropped in `after`)
- **THEN** the default gives `[]` (`rolsuper` and `rolbypassrls` `false`, no owned `pg_class` row, no membership in `ursitoare_owner`); the others include `app_role_privileged postgres`, `app_role_owns_relation ursitoare_owner` and `app_role_privileged <probe>` for each probe role, and `no_such_role` gives exactly `[{ rule: "app_role_missing", object: "no_such_role" }]`
