# Keycloak as the default IdP: footprint and OAuth check

- **Date:** 2026-10-24.
- **Why:** on 2026-10-24 the owner chose Keycloak as the default identity provider. The hobbyist compose shares one `postgres:18` container on a 2 CPU / 4 GB target.
- **Run by:** the orchestrator, inline, as a small check. It was not one of the pre-registered spikes and has no decision rule.
- **Host:** the same busy shared host as Phase 0 (load average about 12, about 68 neighbour containers, Docker 29.8.2, 4 CPUs).
- **Values:** every secret below is a throwaway spike value.

## Setup

`compose.yaml` (project `us-kc`) runs two containers:
- `postgres:18` (18.6) with `shared_buffers=128MB` and a 512m limit;
- `quay.io/keycloak/keycloak:26.8.1`, digest `sha256:a78d6b79572168cb25886b80a8b5b8d4ed4390743e3eecb810538683e209dd6b` (the `latest` tag on the day), image 475 MB.
  - It runs in production mode, `kc.sh start --import-realm`.
  - It is plain HTTP (`KC_HTTP_ENABLED=true`), with `KC_HOSTNAME=http://localhost:18580`.
  - It uses a `keycloak` database in that Postgres.
  - Realm `ursitoare` is imported from `import/ursitoare-realm.json`. The realm has one confidential client `ursitoare-engine` (service account and direct grants enabled for the test) and one user.

`load.sh N` runs 4 parallel loops. Each loop does N password grants and N client-credentials grants.

## Results

| Check | Result | Label |
|---|---|---|
| Production `start` over plain HTTP, no TLS | Starts (`Profile prod activated`). Only `http-enabled` and `hostname` were set | verified (spike) |
| Keycloak on Postgres 18.6 | Schema migration (Liquibase) and realm import succeeded. The `keycloak` database is 16 MB with 101 tables. Whether 18 is *officially* supported is a documentation question (see the Keycloak lookup) | verified (spike) |
| Time to ready, from container start to a 200 on OIDC discovery | 18 s on first start, including the build step and the schema migration; 12 s on restart | verified (spike) |
| Memory, `mem_limit` 1g | 542 MiB idle after boot; 597 MiB after 800 token requests | verified (spike) |
| Memory, `mem_limit` 512m | 473 MiB idle; 503 MiB after 800 requests; 506 MiB after 2,000 more. 0 failures, no OOM kill. That is **99% of the limit** | verified (spike) |
| JVM sizing | The process runs with `-XX:MaxRAMPercentage=70 -XX:MinRAMPercentage=70 -XX:InitialRAMPercentage=50`, so the heap scales with the container limit. Usage follows the limit given, not the load | verified (spike) |
| Throughput | 800 token requests (400 password, 400 client-credentials) in about 7 s at concurrency 4; 2,000 in about 14 s | verified (spike), busy host |
| Postgres with the Keycloak database | 97–100 MiB | verified (spike) |
| Realm defaults on import | `sslRequired=external`, `accessTokenLifespan=300` s, `ssoSessionIdleTimeout=1800` s | verified (spike) |
| Organizations | `organizationsEnabled=true` on import; feature `ORGANIZATION` is DEFAULT and enabled | verified (spike) |
| Organization as a tenant handle | Creating an organization returned 201, and adding the user returned 201. With `scope=openid organization`, the access token carries `"organization": ["tenant-one"]` and `iss` = the realm URL | verified (spike) |
| OAuth server metadata (RFC 8414) | 200 at both `/.well-known/oauth-authorization-server/realms/ursitoare` and `/realms/ursitoare/.well-known/oauth-authorization-server` | verified (spike) |
| Dynamic client registration (RFC 7591) | The endpoint is advertised. An anonymous registration from the host returned 403: "Policy 'Trusted Hosts' rejected request … Host not trusted." Open registration needs a policy change or an initial access token | verified (spike) |
| Resource indicators (RFC 8707) | A `resource=https://ursitoare.example/mcp` parameter on client credentials was ignored: `aud` = `"account"`. Feature `RESOURCE_INDICATORS` is **EXPERIMENTAL, disabled** | verified (spike) |
| Client ID metadata documents (CIMD) | Feature `CIMD` is **EXPERIMENTAL, disabled** | verified (spike) |
| Other flags of note | `DPOP` and `PAR` are DEFAULT, enabled. Token exchange is in `grant_types_supported`. `SPIFFE` is PREVIEW, disabled | verified (spike) |

## What this means for the architecture (inferred)

- The hobbyist stack goes from 5 to **6 long-running containers**. Keycloak can share the engine's Postgres 18 as a separate database, so no second Postgres is needed.
- **Budget:** 768m for Keycloak (inferred). 512m held under this light load, but at 99% of the limit, with no headroom for the admin console, many sessions or brokering. The sum of limits goes from 1,600 to about 2,368 MiB.
- **No TLS container is needed** for localhost or a private LAN, because `sslRequired=external` allows plain HTTP from private addresses. Exposure beyond the LAN needs the `tls` profile.
- **For MCP callers,** RFC 8707 audience binding is not on by default, so Ursitoare needs a bridge: an `ursitoare-mcp` client scope with a hard-coded audience mapper, plus `aud` validation in the engine. Registration needs pre-registered clients or initial access tokens. Experimental flags stay off in the default.

## Reproduce

```sh
docker compose -p us-kc up -d                           # 1g limit
./load.sh 100; docker stats --no-stream us-kc-keycloak-1
KC_MEM=512m docker compose -p us-kc up -d --force-recreate keycloak
./load.sh 100; ./load.sh 250; docker stats --no-stream us-kc-keycloak-1
docker compose -p us-kc stop
```
