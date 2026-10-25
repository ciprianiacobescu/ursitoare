#!/bin/sh
# Generate throwaway secrets for the mkspike data-plane spike. Output is git-ignored (.runtime/).
# Never prints values. Re-running overwrites (new secrets => must `docker compose -p mkspike down -v`-equivalent
# volume reset for postgres; we use `stop`, so only re-run on a fresh stack).
set -eu
cd "$(dirname "$0")"
mkdir -p .runtime && umask 077
r() { openssl rand -hex "$1"; }
cat > .runtime/mkspike.env <<EOT
MKSPIKE_PG_PASSWORD=$(r 16)
MKSPIKE_DB_APP_PASSWORD=$(r 16)
MKSPIKE_DB_SUBSCRIBER_PASSWORD=$(r 16)
MKSPIKE_VAULT_KEK=$(r 32)
MKSPIKE_VAULT_PROXY_TOKEN=$(r 24)
MKSPIKE_MCP_SERVICE_TOKEN=$(r 24)
MKSPIKE_PROXY_SERVICE_TOKEN=$(r 24)
MKSPIKE_BROKER_SERVICE_TOKEN=$(r 24)
MKSPIKE_UPSTREAM_SECRET=$(r 16)
EOT
head -c 32 /dev/urandom > .runtime/signing.seed
chmod 600 .runtime/mkspike.env .runtime/signing.seed
# names only:
cut -d= -f1 .runtime/mkspike.env
