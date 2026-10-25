#!/bin/sh
# Seed the minimal rows + store ONE credential through vault-adapter's own PutCredential RPC (envelope-encrypted by the adapter).
set -eu
cd "$(dirname "$0")"
. ./.runtime/mkspike.env
PROTO_DIR="$HOME/gooseProjects/mintkey/docs/architecture/contracts/vault-adapter"
docker exec -i mkspike-postgres-1 psql -v ON_ERROR_STOP=1 -U mintkey_migrate -d mintkey < sql/seed-minimal.sql
B64=$(printf %s "$MKSPIKE_UPSTREAM_SECRET" | base64 | tr -d '\n')
printf '{"tenant_id":"00000000-0000-4000-8000-0000000000a1","service_id":"00000000-0000-4000-8000-0000000000b1","auth_scheme":"AUTH_SCHEME_API_KEY_HEADER","value":"%s","header_name":"X-Mkspike-Upstream-Key","target_url":"http://host.docker.internal:19050","caller_actor_id":"mkspike-seed"}' "$B64" \
 | grpcurl -plaintext -import-path "$PROTO_DIR" -proto vault.proto \
     -H "x-mintkey-service-token: $MKSPIKE_VAULT_PROXY_TOKEN" -H "x-mintkey-service-identity: svcid_proxy" \
     -d @ 127.0.0.1:19084 mintkey.vault.v1.VaultAdapter/PutCredential
