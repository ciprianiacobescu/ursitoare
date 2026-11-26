# Test plan (data): add-hobbyist-compose

The data files, byte for byte; they ran against the tests of `test-plan.md` in a scratch copy. The tests compare rules, not text: a comment line may change, a value may not. `$$` in a healthcheck is Compose's escape for `$`; `${NAME:?message}` stops Compose when `NAME` is unset or empty.

## deploy/compose.yaml

```yaml
# The hobbyist stack. First run: docs/deploy.md.
name: ursitoare

services:
  ursitoare:
    build:
      context: ..
      dockerfile: Dockerfile
    image: ursitoare/ursitoare:local
    restart: unless-stopped
    mem_limit: 512m
    networks: [front, app, mintkey]
    ports:
      - "127.0.0.1:${URSITOARE_HTTP_PORT:-8080}:8080"
    environment:
      URSITOARE_ROLE: all
      URSITOARE_HOST: 0.0.0.0
      URSITOARE_PORT: "8080"
      URSITOARE_PUBLIC_BASE_URL: http://127.0.0.1:${URSITOARE_HTTP_PORT:-8080}
      URSITOARE_DATABASE_URL: postgres://ursitoare_app@postgres:5432/ursitoare?sslmode=disable
      URSITOARE_DATABASE_PASSWORD_FILE: /run/secrets/db_app_password
      URSITOARE_ENGINE_KEY_FILE: /run/secrets/engine_key
      URSITOARE_OIDC_ISSUER: http://localhost:${KEYCLOAK_HTTP_PORT:-8180}/realms/ursitoare
      URSITOARE_OIDC_BACKCHANNEL_URL: http://keycloak:8080
      URSITOARE_OIDC_CLIENT_SECRET_FILE: /run/secrets/oidc_client_secret
      URSITOARE_EGRESS_BROKER_URL: http://mintkey-broker:8083
      URSITOARE_EGRESS_PROXY_URL: http://mintkey-proxy:8086
      URSITOARE_EGRESS_BROKER_TOKEN_FILE: /run/secrets/mk_issue_token
      URSITOARE_EGRESS_VAULT_URL: http://mintkey-vault:8084
      URSITOARE_EGRESS_VAULT_IDENTITY: svcid_ursitoare
      URSITOARE_EGRESS_VAULT_TOKEN_FILE: /run/secrets/mk_vault_writer_token
      URSITOARE_INTERNAL_PORT: "8090"
      URSITOARE_AUDIT_SINK: enabled
    secrets: [db_app_password, engine_key, oidc_client_secret, mk_issue_token, mk_vault_writer_token]
    depends_on:
      owner-job:
        condition: service_completed_successfully
      mintkey-broker:
        condition: service_healthy
      mintkey-proxy:
        condition: service_healthy
      mintkey-vault:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:8080/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 40s

  owner-job:
    build:
      context: ..
      dockerfile: Dockerfile
    image: ursitoare/ursitoare:local
    restart: "no"
    entrypoint: ["sh", "/app/deploy/owner-job.sh"]
    networks: [app]
    environment:
      URSITOARE_DATABASE_ADMIN_URL: postgres://postgres@postgres:5432/ursitoare?sslmode=disable
      URSITOARE_DATABASE_ADMIN_PASSWORD_FILE: /run/secrets/db_superuser_password
      URSITOARE_DATABASE_OWNER_URL: postgres://ursitoare_owner@postgres:5432/ursitoare?sslmode=disable
      URSITOARE_DATABASE_OWNER_PASSWORD_FILE: /run/secrets/db_owner_password
      URSITOARE_DATABASE_URL: postgres://ursitoare_app@postgres:5432/ursitoare?sslmode=disable
      URSITOARE_DATABASE_PASSWORD_FILE: /run/secrets/db_app_password
      URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE: /run/secrets/mk_broker_token
      URSITOARE_AUDIT_SINK_PROXY_TOKEN_FILE: /run/secrets/mk_proxy_token
      OWNER_JOB_TENANT_NAME: ${URSITOARE_TENANT_NAME:-Home}
      OWNER_JOB_ISSUER: http://localhost:${KEYCLOAK_HTTP_PORT:-8180}/realms/ursitoare
      OWNER_JOB_ORGANIZATION: ${KC_URSITOARE_ORGANIZATION:-home}
    secrets: [db_superuser_password, db_owner_password, db_app_password, mk_broker_token, mk_proxy_token]
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:18@sha256:c699303802144847d238196173655dbbecf7a96aeca1565f2b02eb671a1f0b6b
    restart: unless-stopped
    mem_limit: 512m
    command: ["postgres", "-c", "shared_buffers=128MB"]
    networks: [app]
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_superuser_password
      POSTGRES_DB: ursitoare
    secrets: [db_superuser_password, db_keycloak_password]
    volumes:
      - pgdata:/var/lib/postgresql
      - ./postgres/initdb:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD", "pg_isready", "-h", "127.0.0.1", "-U", "postgres", "-d", "ursitoare"]
      interval: 5s
      timeout: 5s
      retries: 12
      start_period: 20s

  keycloak:
    image: quay.io/keycloak/keycloak:26.8.1@sha256:3f3c5f8e03c614774b4bd9173b88391fefa4153bfc010d8012d59ad825377332
    restart: unless-stopped
    mem_limit: 768m
    command: ["start", "--import-realm"]
    networks: [front, app]
    ports:
      - "127.0.0.1:${KEYCLOAK_HTTP_PORT:-8180}:8080"
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: ${KC_DB_PASSWORD}
      KC_DB_POOL_MAX_SIZE: "10"
      KC_HTTP_ENABLED: "true"
      KC_HOSTNAME: http://localhost:${KEYCLOAK_HTTP_PORT:-8180}
      KC_HOSTNAME_BACKCHANNEL_DYNAMIC: "true"
      KC_HEALTH_ENABLED: "true"
      KC_BOOTSTRAP_ADMIN_USERNAME: ${KC_BOOTSTRAP_ADMIN_USERNAME}
      KC_BOOTSTRAP_ADMIN_PASSWORD: ${KC_BOOTSTRAP_ADMIN_PASSWORD}
      KC_URSITOARE_CLIENT_SECRET: ${KC_URSITOARE_CLIENT_SECRET:?run init-secrets first}
      KC_URSITOARE_REDIRECT_URI: http://127.0.0.1:${URSITOARE_HTTP_PORT:-8080}/auth/oidc/callback
      KC_URSITOARE_POST_LOGOUT_URI: http://127.0.0.1:${URSITOARE_HTTP_PORT:-8080}/sign-in
      KC_URSITOARE_FIRST_USER: ${KC_URSITOARE_FIRST_USER:?run init-secrets first}
      KC_URSITOARE_FIRST_PASSWORD: ${KC_URSITOARE_FIRST_PASSWORD:?run init-secrets first}
      KC_URSITOARE_ORGANIZATION: ${KC_URSITOARE_ORGANIZATION:-home}
    volumes:
      - ./keycloak/import:/opt/keycloak/data/import:ro
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "bash", "-c", "exec 3<>/dev/tcp/localhost/9000 && printf 'GET /health/ready HTTP/1.1\\r\\nHost: localhost\\r\\nConnection: close\\r\\n\\r\\n' >&3 && read -r line <&3 && [[ $$line == *' 200 '* ]]"]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 60s

  mintkey-broker:
    image: ghcr.io/welikecode/mintkey-broker:sha-8766937@sha256:f38871ef0555d5c3213de5d562f57b51de817b606a5b1005d43e5aad53ad0e5d
    restart: unless-stopped
    mem_limit: 128m
    networks: [mintkey]
    environment:
      MINTKEY_ENV: production
      BROKER_HTTP_PORT: "8083"
      MINTKEY_BROKER_SIGNING_KEY_FILE: /run/secrets/signing_seed
      MINTKEY_MCP_SERVICE_TOKEN_FILE: /run/secrets/mk_issue_token
      MINTKEY_PROXY_SERVICE_TOKEN_FILE: /run/secrets/mk_proxy_token
      MINTKEY_BROKER_SERVICE_TOKEN_FILE: /run/secrets/mk_broker_token
      MINTKEY_ADMIN_API_URL: http://ursitoare:8090
      MINTKEY_AUDIT_WAL_PATH: /var/lib/mintkey/broker-audit.wal
      GOMEMLIMIT: 100MiB
      OTEL_TRACES_SAMPLER: always_off
    secrets: [signing_seed, mk_issue_token, mk_proxy_token, mk_broker_token]
    volumes:
      - broker-wal:/var/lib/mintkey
    healthcheck:
      test: ["CMD", "/wget", "-qO-", "http://localhost:8083/v1/health"]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 10s

  mintkey-proxy:
    image: ghcr.io/welikecode/mintkey-proxy-plugin:sha-8766937@sha256:290571d9f98d155384367401fafb270de83d9fee4fa91f40594307f45b8c9305
    restart: unless-stopped
    mem_limit: 128m
    networks: [mintkey, egress]
    environment:
      MINTKEY_ENV: production
      PLUGIN_PORT: "8086"
      BROKER_ADDR: mintkey-broker:8083
      VAULT_GRPC_ADDR: mintkey-vault:8084
      MINTKEY_PROXY_SERVICE_TOKEN_FILE: /run/secrets/mk_proxy_token
      MINTKEY_VAULT_PROXY_IDENTITY_ID: svcid_proxy
      MINTKEY_VAULT_PROXY_TOKEN_FILE: /run/secrets/mk_vault_proxy_token
      MINTKEY_ADMIN_API_URL: http://ursitoare:8090
      MINTKEY_AUDIT_WAL_PATH: /var/lib/mintkey/proxy-audit.wal
      GOMEMLIMIT: 100MiB
      OTEL_TRACES_SAMPLER: always_off
    secrets: [mk_proxy_token, mk_vault_proxy_token]
    volumes:
      - proxy-wal:/var/lib/mintkey
    depends_on:
      mintkey-broker:
        condition: service_healthy
      mintkey-vault:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "/wget", "-qO-", "http://localhost:8086/healthz"]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 10s

  mintkey-vault:
    image: ghcr.io/welikecode/mintkey-vault-adapter:sha-8766937@sha256:45fd9f1c27f1b84016032508ef51f2e1abcf9af9292bfb8c7add544ff479eb35
    restart: unless-stopped
    mem_limit: 320m
    networks: [mintkey]
    environment:
      MINTKEY_ENV: production
      MINTKEY_VAULT_KEK_FILE: /run/secrets/kek
      MINTKEY_VAULT_BACKEND: sqlite
      MINTKEY_VAULT_FILE_PATH: /var/lib/mintkey/vault.sqlite
      MINTKEY_VAULT_PROXY_IDENTITY_ID: svcid_proxy
      MINTKEY_VAULT_PROXY_TOKEN_FILE: /run/secrets/mk_vault_proxy_token
      MINTKEY_VAULT_ADMIN_IDENTITY_ID: svcid_ursitoare
      MINTKEY_VAULT_ADMIN_TOKEN_FILE: /run/secrets/mk_vault_writer_token
      GOMEMLIMIT: 256MiB
      OTEL_TRACES_SAMPLER: always_off
    secrets: [kek, mk_vault_proxy_token, mk_vault_writer_token]
    volumes:
      - vault-data:/var/lib/mintkey
    healthcheck:
      test: ["CMD", "/grpc_health_probe", "-addr=:8084"]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 10s

networks:
  front: {}
  egress: {}
  app:
    internal: true
  mintkey:
    internal: true

volumes:
  pgdata: {}
  vault-data: {}
  broker-wal: {}
  proxy-wal: {}

secrets:
  engine_key:
    file: ./secrets/engine_key
  kek:
    file: ./secrets/kek
  signing_seed:
    file: ./secrets/signing_seed
  mk_issue_token:
    file: ./secrets/mk_issue_token
  mk_proxy_token:
    file: ./secrets/mk_proxy_token
  mk_broker_token:
    file: ./secrets/mk_broker_token
  mk_vault_proxy_token:
    file: ./secrets/mk_vault_proxy_token
  mk_vault_writer_token:
    file: ./secrets/mk_vault_writer_token
  db_superuser_password:
    file: ./secrets/db_superuser_password
  db_owner_password:
    file: ./secrets/db_owner_password
  db_app_password:
    file: ./secrets/db_app_password
  db_keycloak_password:
    file: ./secrets/db_keycloak_password
  oidc_client_secret:
    file: ./secrets/oidc_client_secret
  keycloak_admin_password:
    file: ./secrets/keycloak_admin_password
  first_user_password:
    file: ./secrets/first_user_password
```

## deploy/compose.idp-external.yaml

```yaml
# Replaces Keycloak with your identity provider (docs/deploy.md):
#   docker compose -f deploy/compose.yaml -f deploy/compose.idp-external.yaml up -d --build --wait
services:
  keycloak: !reset null
  ursitoare:
    environment:
      URSITOARE_OIDC_ISSUER: ${EXTERNAL_OIDC_ISSUER}
      URSITOARE_OIDC_BACKCHANNEL_URL: ""
      URSITOARE_OIDC_CLIENT_ID: ${EXTERNAL_OIDC_CLIENT_ID:-ursitoare-engine}
  owner-job:
    environment:
      OWNER_JOB_ISSUER: ${EXTERNAL_OIDC_ISSUER}
      OWNER_JOB_ORGANIZATION: ${EXTERNAL_OIDC_ORGANIZATION}
```

## deploy/owner-job.sh

```sh
#!/bin/sh
# The owner job: runs to completion on every `up` and holds the only owner credentials. Every step is safe to repeat.
set -eu

node src/cli/main.ts db-roles
node src/cli/main.ts db-prepare
line=$(node src/cli/main.ts tenant-create --name "$OWNER_JOB_TENANT_NAME")
printf '%s\n' "$line"
tenant_id=${line#tenant }
tenant_id=${tenant_id%% *}
node src/cli/main.ts tenant-idp --tenant-name "$OWNER_JOB_TENANT_NAME" --issuer "$OWNER_JOB_ISSUER" --organization "$OWNER_JOB_ORGANIZATION"
node src/cli/main.ts tenant-sink --tenant-name "$OWNER_JOB_TENANT_NAME"
node src/cli/main.ts admin bootstrap-admin --tenant "$tenant_id" --issuer "$OWNER_JOB_ISSUER" --operator owner-job
exit 0
```

## Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
# The engine image: every URSITOARE_ROLE, from source; the build context is cut by .dockerignore.

FROM node:24-bookworm-slim@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530 AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/package.json
RUN pnpm install --frozen-lockfile
COPY web web
RUN pnpm --filter @ursitoare/web run build

FROM node:24-bookworm-slim@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530 AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/package.json
RUN pnpm install --frozen-lockfile --prod

FROM node:24-bookworm-slim@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530 AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./package.json
COPY --chown=node:node src ./src
COPY --from=build --chown=node:node /app/web/dist ./web/dist
COPY --chown=node:node deploy/owner-job.sh ./deploy/owner-job.sh
USER node
EXPOSE 8080
CMD ["node", "src/main.ts"]
```

## .dockerignore

```
.git
.github
.l4
.l4-out
.orchestration
.serena
.stack-e2e
.stack-e2e.*.bak
.stack-out
.env
.env.*
node_modules
**/node_modules
dist
**/dist
coverage
test-results
e2e
test
seed
tools
openspec
docs
deploy/.env
deploy/secrets
**/*.test.ts
**/*.test.tsx
```
