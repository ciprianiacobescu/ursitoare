# Test plan (data): add-stack-overlay

The data files of this unit, byte for byte. The tests compare rules, not text, so an implementer may change a comment line, never a value. The overlay was merged over U59's `deploy/compose.yaml`; the scripts ran under `bash` with a stub `docker` (`test-plan.md`); nothing ran in Docker.

## deploy/compose.e2e.yaml

```yaml
# The e2e overlay of deploy/compose.yaml. scripts/stack-e2e.sh is its only user (project ursitoare-e2e; docs/testing.md).
services:
  ursitoare:
    image: ursitoare/ursitoare:e2e
    ports: !reset []
  owner-job:
    image: ursitoare/ursitoare:e2e
    environment:
      OWNER_JOB_TENANT_NAME: E2E tenant
      OWNER_JOB_ORGANIZATION: org-a
  keycloak:
    ports: !reset []
  mintkey-proxy:
    environment:
      SSL_CERT_DIR: /etc/ursitoare-test-ca
    extra_hosts:
      - loopback-canary.fake.test:127.0.0.1
    volumes:
      - ../.stack-e2e/ca:/etc/ursitoare-test-ca:ro
  fakes:
    image: ursitoare/stack-runner:local
    build:
      context: ..
      dockerfile: deploy/e2e/runner.Dockerfile
    restart: "no"
    command: ["node", "test/support/stack/fakes-main.ts"]
    networks:
      egress:
        aliases: [tools.fake.test, mcp.fake.test, echo.fake.test]
    volumes:
      - ../.stack-e2e/tls:/run/stack-tls:ro
    healthcheck:
      test: ["CMD", "node", "-e", "require('net').connect(443, '127.0.0.1').on('connect', () => process.exit(0)).on('error', () => process.exit(1))"]
      interval: 5s
      timeout: 5s
      retries: 12
      start_period: 5s
  runner:
    image: ursitoare/stack-runner:local
    profiles: [runner]
    init: true
    shm_size: 1gb
    networks: [front, app, mintkey, egress]
    entrypoint: ["node", "test/support/stack/runner-main.ts"]
    environment:
      E2E_PROFILE: stack
      E2E_BASE_URL: http://127.0.0.1:8080
      E2E_STACK_CONTROL_URL: http://127.0.0.1:39181
      STACK_DIR: /run/stack-e2e
      STACK_OUT: /run/stack-out
      STACK_RUN: ${STACK_RUN:-}
    volumes:
      - ../.stack-e2e:/run/stack-e2e:ro
      - ../.stack-out:/run/stack-out

secrets:
  engine_key: { file: ../.stack-e2e/secrets/engine_key }
  kek: { file: ../.stack-e2e/secrets/kek }
  signing_seed: { file: ../.stack-e2e/secrets/signing_seed }
  mk_issue_token: { file: ../.stack-e2e/secrets/mk_issue_token }
  mk_proxy_token: { file: ../.stack-e2e/secrets/mk_proxy_token }
  mk_broker_token: { file: ../.stack-e2e/secrets/mk_broker_token }
  mk_vault_proxy_token: { file: ../.stack-e2e/secrets/mk_vault_proxy_token }
  mk_vault_writer_token: { file: ../.stack-e2e/secrets/mk_vault_writer_token }
  db_superuser_password: { file: ../.stack-e2e/secrets/db_superuser_password }
  db_owner_password: { file: ../.stack-e2e/secrets/db_owner_password }
  db_app_password: { file: ../.stack-e2e/secrets/db_app_password }
  db_keycloak_password: { file: ../.stack-e2e/secrets/db_keycloak_password }
  oidc_client_secret: { file: ../.stack-e2e/secrets/oidc_client_secret }
  keycloak_admin_password: { file: ../.stack-e2e/secrets/keycloak_admin_password }
  first_user_password: { file: ../.stack-e2e/secrets/first_user_password }
```

## deploy/e2e/runner.Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
# The e2e runner: pytest, Chromium and the Node steps of scripts/stack-e2e.sh. Its context is cut by runner.Dockerfile.dockerignore.
FROM node:24-bookworm-slim@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530 AS node

FROM mcr.microsoft.com/playwright/python:v1.63.0-noble@sha256:72bd171a9ffc2b4b59532aaa6210e21014d07093120dc25528870c0b840da1f0 AS runner
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/corepack/dist/corepack.js /usr/local/bin/corepack \
 && corepack enable \
 && pip install --no-cache-dir --break-system-packages uv==0.13.5
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile \
 && uv sync --project e2e --frozen
```

## deploy/e2e/runner.Dockerfile.dockerignore

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
**/.env
**/.env.*
**/node_modules
**/dist
**/.venv
**/__pycache__
coverage
test-results
deploy/secrets
```

## scripts/stack-e2e.sh

```bash
#!/usr/bin/env bash
# The milestone stack run: project ursitoare-e2e only, no host port, state in .stack-e2e/. Usage: bash scripts/stack-e2e.sh [--wipe]
set -euo pipefail
umask 077
export LC_ALL=C

PROJECT=ursitoare-e2e
STATE=.stack-e2e
STEP_DIR=scripts/stack-e2e.d
STATE_FILES=".env secrets/ users.json clients.json ca/ca.pem tls/cert.pem tls/key.pem"
RUNNER_IMAGE=ursitoare/stack-runner:local
WIPE=0
STARTED=0

for arg in "$@"; do
  case "$arg" in
    --wipe) WIPE=1 ;;
    *) echo "usage: bash scripts/stack-e2e.sh [--wipe]" >&2; exit 64 ;;
  esac
done

cd "$(dirname "$0")/.."
case "$PWD" in
  *[[:space:]]*) echo "run from a path without spaces" >&2; exit 64 ;;
esac

unset URSITOARE_HTTP_PORT KEYCLOAK_HTTP_PORT URSITOARE_TENANT_NAME KC_URSITOARE_ORGANIZATION COMPOSE_FILE COMPOSE_PROFILES COMPOSE_PROJECT_NAME
COMPOSE="docker compose -p $PROJECT --project-directory deploy -f deploy/compose.yaml -f deploy/compose.e2e.yaml --env-file $STATE/.env"
RUNNER="docker run --rm -i -v $PWD/$STATE:/run/stack-e2e $RUNNER_IMAGE"
RUN_OUT=".stack-out/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$RUN_OUT"
STACK_RUN=${RUN_OUT#.stack-out/}
export PROJECT COMPOSE RUNNER RUN_OUT STACK_RUN

wipe_project() {
  names=$(docker volume ls -q --filter "label=com.docker.compose.project=$PROJECT")
  echo "removing the volumes of project $PROJECT:"
  printf '%s\n' "$names"
  if [ -d "$STATE" ]; then
    backup="$STATE.$(date -u +%Y%m%dT%H%M%SZ).bak"
    if [ -e "$backup" ]; then echo "$backup exists; wait a second and rerun" >&2; exit 1; fi
    mv "$STATE" "$backup"
    echo "moved $STATE to $backup"
  fi
  docker compose -p "$PROJECT" down -v
}

finish() {
  rc=$?
  trap - EXIT
  set +e
  if [ "$STARTED" = 1 ]; then
    for step in "$STEP_DIR"/9[0-9]-*.sh; do
      [ -e "$step" ] || continue
      echo "== $(basename "$step") (exit trap)"
      bash "$step"
      code=$?
      if [ "$rc" -eq 0 ] && [ "$code" -ne 0 ]; then rc=$code; fi
    done
    $COMPOSE stop
  fi
  exit "$rc"
}

docker build -f deploy/e2e/runner.Dockerfile -t "$RUNNER_IMAGE" . >"$RUN_OUT/runner-build.log" 2>&1 \
  || { echo "the runner image did not build; see $RUN_OUT/runner-build.log" >&2; exit 1; }

docker run --rm "$RUNNER_IMAGE" node test/support/stack/project.ts steps --script scripts/stack-e2e.sh --dir "$STEP_DIR" \
  || { echo "a step breaks the step rules; nothing was run" >&2; exit 65; }

if [ "$WIPE" = 1 ]; then
  wipe_project
fi

mkdir -p "$STATE"
present=""
for file in $STATE_FILES; do
  if [ -e "$STATE/$file" ]; then present="$present${present:+,}$file"; fi
done
volumes=$(docker volume ls -q --filter "label=com.docker.compose.project=$PROJECT" | paste -sd, -)

status=0
verdict=$($RUNNER node test/support/stack/project.ts state --present "$present" --volumes "$volumes") || status=$?
if [ "$status" = 2 ]; then
  printf '%s\n' "$verdict"
  printf '%s\n' "$volumes" | tr , '\n'
  echo "the e2e state was lost; rerun with --wipe to remove these volumes of project $PROJECT" >&2
  exit 2
elif [ "$status" != 0 ]; then
  echo "the state check failed (exit $status)" >&2
  exit "$status"
fi
echo "state: $verdict"

trap finish EXIT

if [ "$verdict" = first-run ]; then
  $RUNNER node src/cli/main.ts init-secrets --dir /run/stack-e2e >"$RUN_OUT/init-secrets.log"
  $RUNNER node test/support/stack/project.ts prepare --dir /run/stack-e2e
fi

$COMPOSE --profile runner config --format json | $RUNNER node test/support/stack/project.ts check
$COMPOSE build
STARTED=1
$COMPOSE up -d --wait

for step in "$STEP_DIR"/[0-8][0-9]-*.sh; do
  [ -e "$step" ] || continue
  echo "== $(basename "$step")"
  bash "$step"
done
```

## scripts/stack-e2e.d/30-proxy-smoke.sh

```bash
#!/usr/bin/env bash
# TLS to echo.fake.test through the real proxy, and nothing published on the host (docs/testing.md).
set -euo pipefail

$COMPOSE run --rm runner node test/support/stack/smoke.ts
containers=$($COMPOSE ps --format json)
if grep -Eq '"PublishedPort":[1-9]' <<<"$containers"; then
  echo "a container of project $PROJECT publishes a host port" >&2
  exit 1
fi
echo "proxy smoke ok; no published port"
```
