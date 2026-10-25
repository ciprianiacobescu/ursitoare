# test/support/: shared test infrastructure

For L4 these files are ordinary code (`docs/decisions/0002`): green writes them, and their `*.test.ts` contract tests
stay frozen. By convention only a task that names a file changes it, and only its owner change creates it. Each fake has a
contract test written against a base URL, so the same suite runs against the fake in the gates and against the real
service in the stack tier (`docs/testing.md`).

| Path | Owner change | What |
|---|---|---|
| `global-setup.ts` | `add-db-foundation` | Starts the shared embedded-Postgres cluster for the test run |
| `pg.ts` | `add-db-foundation` | `withTestDatabase()`: a fresh migrated database with owner and app-role pools |
| `tenants.ts` | `add-tenancy-foundation` | Two seeded tenants for isolation tests |
| `e2e-stack/` | `add-e2e-stack` | The offline stack the e2e gate serves; it grows only through part files that other changes add (discovered in file-name order) |
| `fake-oidc/` | `add-fake-oidc` | Keycloak-shaped OIDC provider, two organisations, journey users, a bad-token minting helper |
| `catalogue/` | `add-test-catalogue` | The 20 mock blocks, RF-1, `rf-1-core`, `rf-1-core-approval` |
| `hook-flows/` | `add-test-catalogue` | Synthetic hook flows on the M5 node kinds |
| `crash/` | `add-crash-harness` | Spawn, kill and restart the engine; dedicated clusters |
| `node-conformance.ts` | `add-interpreter-core` | The kit every node runtime passes |
| `fake-egress/` | `add-fake-egress-proxy` | Broker, proxy and vault contract with per-service upstream routing |
| `fake-tools/` | `add-fake-tools` | The test-catalogue blocks as tool servers behind the fake proxy |
| `fake-mcp/` | `add-mcp-client` | An MCP server for the tool adapter tests |
| `fake-llm/` | `add-fake-llm-provider` | Anthropic, OpenAI and Ollama shapes with cassettes |
| `fake-n8n/` | `add-delegate-n8n` | n8n webhook in, signed callback out |

Bootstrap placeholders exist for `global-setup.ts` and `e2e-stack/main.ts`; their owner changes replace them.
