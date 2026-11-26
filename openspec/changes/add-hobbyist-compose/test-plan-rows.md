# Test plan (rows): add-hobbyist-compose

Each row edits a fresh copy of the committed file (`d` compose document, `ov` overlay, `b` base, `s` owner job text, `i` `.dockerignore` text). Rows C: the list contains the cell; other rows: the list equals the cell's problems, in order.

## Compose rules (`compose.test.ts`, `composeProblems`; rows C1-C24)

| Row | Edit | Problem (the list contains it) |
|---|---|---|
| C1 a seventh long-running service | `d.services.extra = { image: "x:1" }` | `services: unexpected extra` |
| C2 the broker removed | `delete d.services["mintkey-broker"]` | `services: missing mintkey-broker` |
| C3 a container name | `d.services.postgres.container_name = "pg"` | `postgres: container_name is set` |
| C4 a wrong restart policy | `d.services.keycloak.restart = "always"` | `keycloak: restart is not unless-stopped` |
| C5 no healthcheck on the vault | `delete d.services["mintkey-vault"].healthcheck` | `mintkey-vault: no healthcheck` |
| C6 a limit changed | `d.services.keycloak.mem_limit = "1g"` | `keycloak: mem_limit is 1g, expected 768m` |
| C7 a Go limit changed | `d.services["mintkey-vault"].environment.GOMEMLIMIT = "300MiB"` | `mintkey-vault: GOMEMLIMIT is 300MiB, expected 256MiB` |
| C8 the proxy digest changed | `d.services["mintkey-proxy"].image = "ghcr.io/welikecode/mintkey-proxy-plugin:sha-8766937@sha256:" + "0".repeat(64)` | `mintkey-proxy: image is not the pinned reference` |
| C9 the Keycloak tag without a digest | `d.services.keycloak.image = "quay.io/keycloak/keycloak:26.8.1"` | `keycloak: image is not the pinned reference` |
| C10 a moving tag on the vault | `d.services["mintkey-vault"].image = "ghcr.io/welikecode/mintkey-vault-adapter:latest"` | `mintkey-vault: image uses a moving tag` |
| C11 postgres by tag only | `d.services.postgres.image = "postgres:18"` | `postgres: image is not postgres:18 pinned by a sha256 digest` |
| C12 a development MINTKEY_ENV | `d.services["mintkey-broker"].environment.MINTKEY_ENV = "development"` | `mintkey-broker: MINTKEY_ENV is not production` |
| C13 the Keycloak realm value missing | `delete d.services.keycloak.environment.KC_URSITOARE_FIRST_PASSWORD` | `keycloak: environment lacks KC_URSITOARE_FIRST_PASSWORD` |
| C14 the postgres healthcheck without the TCP host | `d.services.postgres.healthcheck.test = ["CMD", "pg_isready", "-U", "postgres"]` | `postgres: healthcheck does not use -h 127.0.0.1` |
| C15 the engine not waiting for the owner job | `d.services.ursitoare.depends_on["owner-job"].condition = "service_started"` | `ursitoare: depends_on owner-job is not service_completed_successfully` |
| C16 the engine host | `d.services.ursitoare.environment.URSITOARE_HOST = "127.0.0.1"` | `ursitoare: URSITOARE_HOST is not 0.0.0.0` |
| C17 the sink switched off | `delete d.services.ursitoare.environment.URSITOARE_AUDIT_SINK` | `ursitoare: URSITOARE_AUDIT_SINK is not enabled` |
| C18 a list-form environment | `d.services.ursitoare.environment = ["URSITOARE_HOST=0.0.0.0"]` | `ursitoare: environment must be a map` |
| C19 the client secret without :? | `d.services.keycloak.environment.KC_URSITOARE_CLIENT_SECRET = "${KC_URSITOARE_CLIENT_SECRET}"` | `keycloak: KC_URSITOARE_CLIENT_SECRET is not ${KC_URSITOARE_CLIENT_SECRET:?message}` |
| C20 the first user with a default | `d.services.keycloak.environment.KC_URSITOARE_FIRST_USER = "${KC_URSITOARE_FIRST_USER:-owner}"` | `keycloak: KC_URSITOARE_FIRST_USER is not ${KC_URSITOARE_FIRST_USER:?message}` |
| C21 the first password a literal | `d.services.keycloak.environment.KC_URSITOARE_FIRST_PASSWORD = "x"` | `keycloak: KC_URSITOARE_FIRST_PASSWORD is not ${KC_URSITOARE_FIRST_PASSWORD:?message}` |
| C22 another service reading the first password | `d.services.ursitoare.environment.PW = "${KC_URSITOARE_FIRST_PASSWORD:-x}"` | `ursitoare: PW reads KC_URSITOARE_FIRST_PASSWORD without :?` |
| C23 a WAL volume dropped | `d.services["mintkey-proxy"].volumes = []` | `mintkey-proxy: does not mount proxy-wal:/var/lib/mintkey` |
| C24 the vault volume dropped | `delete d.volumes["vault-data"]` | `volumes: missing vault-data` |

## Network and port rules (`compose-network.test.ts`; rows N1-N10)

| Row | Edit | Problems |
|---|---|---|
| N1 the proxy joins app | `d.services["mintkey-proxy"].networks = ["mintkey", "egress", "app"]` | `mintkey-proxy: is on the unexpected network app` |
| N2 the proxy gets a database URL | `d.services["mintkey-proxy"].environment.DATABASE_URL = "postgres://x@postgres/y"` | `mintkey-proxy: has the database variable DATABASE_URL` |
| N3 the engine joins egress | `d.services.ursitoare.networks.push("egress")` | `ursitoare: is on the unexpected network egress` |
| N4 the proxy leaves egress | `d.services["mintkey-proxy"].networks = ["mintkey"]` | `mintkey-proxy: is not on the network egress` |
| N5 app is not internal | `d.networks.app = {}` | `networks: app is not internal` |
| N6 egress is internal | `d.networks.egress = { internal: true }` | `networks: egress is internal` |
| N7 8090 published | `d.services.ursitoare.ports.push("127.0.0.1:8090:8090")` | `ursitoare: publishes 127.0.0.1:8090:8090` |
| N8 the engine published on all interfaces | `d.services.ursitoare.ports = ["8080:8080"]` | `ursitoare: publishes 8080:8080`; `ursitoare: does not publish 127.0.0.1:${URSITOARE_HTTP_PORT:-8080}:8080` |
| N9 a second Keycloak port | `d.services.keycloak.ports.push("127.0.0.1:9000:9000")` | `keycloak: publishes 127.0.0.1:9000:9000` |
| N10 the vault published | `d.services["mintkey-vault"].ports = ["8084:8084"]` | `mintkey-vault: publishes 8084:8084` |

## Credential rules (`compose-secrets.test.ts`; rows S1-S7)

| Row | Edit | Problems |
|---|---|---|
| S1 an owner URL on the engine | `d.services.ursitoare.environment.URSITOARE_DATABASE_OWNER_URL = "postgres://o@postgres/x"` | `ursitoare: holds the owner variable URSITOARE_DATABASE_OWNER_URL` |
| S2 an admin password file on the engine | `d.services.ursitoare.environment.URSITOARE_DATABASE_ADMIN_PASSWORD_FILE = "/run/secrets/db_superuser_password"` | `ursitoare: holds the owner variable URSITOARE_DATABASE_ADMIN_PASSWORD_FILE`; `ursitoare: URSITOARE_DATABASE_ADMIN_PASSWORD_FILE reads /run/secrets/db_superuser_password, which the service does not mount` |
| S3 a sink token file on the engine | `d.services.ursitoare.environment.URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE = "/run/secrets/mk_broker_token"; d.services.ursitoare.secrets.push("mk_broker_token")` | `ursitoare: holds the owner variable URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE`; `ursitoare: mounts the unexpected secret mk_broker_token` |
| S4 a superuser secret on the engine | `d.services.ursitoare.secrets.push("db_superuser_password")` | `ursitoare: mounts the unexpected secret db_superuser_password` |
| S5 the owner job without the app URL | `delete d.services["owner-job"].environment.URSITOARE_DATABASE_URL` | `owner-job: environment lacks URSITOARE_DATABASE_URL`; `owner-job: URSITOARE_DATABASE_PASSWORD_FILE has no URSITOARE_DATABASE_URL` |
| S6 the postgres container gets a third secret | `d.services.postgres.secrets.push("kek")` | `postgres: mounts the unexpected secret kek` |
| S7 the owner job publishes a port | `d.services["owner-job"].ports = ["9000:9000"]` | `owner-job: publishes 9000:9000` |

The readers test also runs `composeProblems` on the parsed file with `ursitoare.environment.URSITOARE_ENGINE_KEY_FILE` set to `/run/secrets/kek`, `secrets.extra_secret` added as `{ file: "./secrets/extra_secret" }`, `secrets.kek` set to `{ file: "./secrets/other" }` and `secrets.engine_key` deleted; the problems are exactly `secrets: engine_key is not declared`; `secrets: kek is not file ./secrets/kek`; `secrets: extra_secret is not a SECRET_FILES name`; `ursitoare: mounts the undeclared secret engine_key`; `ursitoare: URSITOARE_ENGINE_KEY_FILE reads /run/secrets/kek, which the service does not mount`.

## Owner job rules (`owner-job.test.ts`, `ownerJobProblems`; rows O1-O9)

| Row | Edit | Problems |
|---|---|---|
| O1 steps swapped | `s.replace("db-roles", "XX").replace("db-prepare", "db-roles").replace("XX", "db-prepare")` | `owner-job: steps are [db-prepare, db-roles, tenant-create, tenant-idp, tenant-sink, admin bootstrap-admin], expected [db-roles, db-prepare, tenant-create, tenant-idp, tenant-sink, admin bootstrap-admin]` |
| O2 the sink step removed | `s.replace(/.*tenant-sink.*\n/, "")` | `owner-job: steps are [db-roles, db-prepare, tenant-create, tenant-idp, admin bootstrap-admin], expected [db-roles, db-prepare, tenant-create, tenant-idp, tenant-sink, admin bootstrap-admin]`; `owner-job: tenant-sink does not name the tenant` |
| O3 tenant-sink without the name | `s.replace('node src/cli/main.ts tenant-sink --tenant-name "$OWNER_JOB_TENANT_NAME"', "node src/cli/main.ts tenant-sink")` | `owner-job: tenant-sink does not name the tenant` |
| O4 tenant-idp without the issuer | `s.replace(' --issuer "$OWNER_JOB_ISSUER" --organization', " --organization")` | `owner-job: tenant-idp lacks --issuer or --organization` |
| O5 bootstrap without the issuer | `s.replace(' --issuer "$OWNER_JOB_ISSUER" --operator', " --operator")` | `owner-job: bootstrap-admin does not pass --issuer` |
| O6 bootstrap without the tenant | `s.replace('--tenant "$tenant_id"', "")` | `owner-job: bootstrap-admin does not pass --tenant` |
| O7 no set -eu | `s.replace("set -eu\n", "")` | `owner-job: first command is not set -eu` |
| O8 a failure ignored | `s.replace("db-prepare\n", "db-prepare \|\| true\n")` | `owner-job: a failure is ignored` |
| O9 bash instead of sh | `s.replace("#!/bin/sh", "#!/bin/bash")` | `owner-job: first line is not #!/bin/sh` |

## Overlay rules (`idp-external.test.ts`, `idpExternalProblems`; rows I1-I6)

| Row | Edit | Problems |
|---|---|---|
| I1 Keycloak kept | `delete ov.services.keycloak` | `idp-external: keycloak is not removed` |
| I2 the back-channel kept | `delete ov.services.ursitoare.environment.URSITOARE_OIDC_BACKCHANNEL_URL` | `idp-external: the engine keeps a back-channel` |
| I3 the engine issuer left alone | `delete ov.services.ursitoare.environment.URSITOARE_OIDC_ISSUER` | `idp-external: the engine's issuer is not EXTERNAL_OIDC_ISSUER` |
| I4 the owner job issuer left alone | `ov.services["owner-job"].environment.OWNER_JOB_ISSUER = "http://localhost:8180/realms/ursitoare"` | `idp-external: the owner job's issuer is not EXTERNAL_OIDC_ISSUER` |
| I5 the owner job organization left alone | `delete ov.services["owner-job"].environment.OWNER_JOB_ORGANIZATION` | `idp-external: the owner job's organization is not EXTERNAL_OIDC_ORGANIZATION` |
| I6 a service waiting for Keycloak | `b.services.ursitoare.depends_on.keycloak = { condition: "service_healthy" }` | `idp-external: ursitoare still depends on keycloak` |

## Dockerfile rules (`dockerfile.test.ts`, `dockerfileProblems`; rows D1-D10, the edit answering `[dockerfile, dockerignore]`; `DIGEST` is the node digest)

| Row | Edit | Problems |
|---|---|---|
| D1 a base image by tag | `[d.replace("node:24-bookworm-slim@" + DIGEST + " AS build", "node:24-bookworm-slim AS build"), i]` | `Dockerfile: base image node:24-bookworm-slim is not pinned by digest` |
| D2 test code copied into the runtime | `[d.replace("COPY --chown=node:node src ./src", "COPY --chown=node:node src ./src\nCOPY --chown=node:node test ./test"), i]` | `Dockerfile: the runtime stage copies test` |
| D3 a root runtime | `[d.replace("USER node\n", ""), i]` | `Dockerfile: the runtime user is root` |
| D4 an install without the lockfile | `[d.replace("RUN pnpm install --frozen-lockfile --prod", "RUN pnpm install --prod"), i]` | `Dockerfile: pnpm install without --frozen-lockfile` |
| D5 development dependencies in the runtime layer | `[d.replace("pnpm install --frozen-lockfile --prod", "pnpm install --frozen-lockfile"), i]` | `Dockerfile: the deps stage installs development dependencies` |
| D6 the whole context copied | `[d.replace("USER node\n", "COPY --chown=node:node . .\nUSER node\n"), i]` | `Dockerfile: the runtime stage copies .` |
| D7 another start command | `[d.replace('CMD ["node", "src/main.ts"]', 'CMD ["node", "test/support/e2e-stack/main.ts"]'), i]` | `Dockerfile: the runtime CMD is not ["node", "src/main.ts"]` |
| D8 seed not ignored | `[d, i.replace("seed\n", "")]` | `.dockerignore: seed is not excluded` |
| D9 tests not ignored | `[d, i.replace("**/*.test.ts\n", "")]` | `.dockerignore: **/*.test.ts is not excluded` |
| D10 a re-included path | `[d, `${i}!test/support\n`]` | `.dockerignore: !test/support re-includes a path` |
