-- Minimal control-plane rows needed by the Mintkey data plane (everything else is created by Liquibase).
-- Run as the migrate/superuser (bypasses RLS). IDs are fixed, non-secret UUIDs.
-- The Python seed-job (apps/seed-job/main.py:135-149) normally inserts the tenant; admin-api inserts the service.
INSERT INTO tenants (id, slug, display_name, isolation_mode)
VALUES ('00000000-0000-4000-8000-0000000000a1', 't_mkspike', 'M9 spike tenant', 'row')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (id, tenant_id, name, slug, base_url, auth_scheme)
VALUES ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1',
        'echo', 'echo', 'http://host.docker.internal:19050', 'api_key_header')
ON CONFLICT (tenant_id, slug) DO NOTHING;
