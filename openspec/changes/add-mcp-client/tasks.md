Every test file starts with `assert.equal(typeof <function under test>, "function")`, wraps a stub call (async: `p.then((v) => v, (e: unknown) => e)`), closes databases, servers, pools and the harness in `finally`, and has no `.`, `[` or `::` in a test name. Red tests import from the file the Interfaces name, not from an `index.ts`. Values: `test-plan.md`, `test-plan-wire.md`.

## 1. Wire and adapter

- [x] 1.1 Write `src/tools/mcp/wire.test.ts` first (scenario "Body, header and reply vectors"), then implement `src/tools/mcp/wire.ts` and add its export lines to `src/tools/index.ts`
- [x] 1.2 Write `src/tools/mcp/adapter.test.ts` first (scenario "A call is one POST with fixed bytes and each answer maps"), then implement `src/tools/mcp/adapter.ts` and its export line in `src/tools/index.ts`

## 2. The surface

- [x] 2.1 Write `src/tools/mcp/surface.test.ts` first (the three surface scenarios: rows M1 to M17 and M10b; each surface also passes `checkAdapterSurface("mcp", ...)`), then implement `src/tools/mcp/surface.ts` and its export lines in `src/tools/index.ts`

## 3. Registration

- [x] 3.1 Write `src/tools/mcp/register.db.test.ts` first (scenario "The endpoint is immutable and a URL becomes an origin and an endpoint": rows G1 to G4 and U1 to U14; G1 starts with `assert.ok` on ledger row 540, so the missing table fails by assertion, not by an error), then create `src/db/migrations/0540_mcp_servers.sql` (design 3), implement `src/tools/mcp/register.ts` and add its export lines to `src/tools/index.ts`

## 4. Discovery

- [x] 4.1 Write `src/tools/mcp/discover.db.test.ts` (scenarios "discoveryRequest is the API's request and the real engine allows an admin" and "Each refusal sends nothing or stops at the failing request": cases Q1 to Q5 and rows D1 to D11) and `src/tools/mcp/egress-site.test.ts` (scenario "discover.ts is an inventoried site and no other file is added", and the MODIFIED scenario "Only request.ts is an egress site of runtimes"; the new `C-2a04f1cb`-style test also asserts that the four-path literal gives `[]`, which fails until `discover.ts` imports the gateway, so it cannot pass at red on the `src/runtimes/` filter alone) first, then implement `src/tools/mcp/discover.ts` (its value import of `bodyDigest` and `GatewayError` makes it the egress site), add its export lines to `src/tools/index.ts`, and add `src/tools/mcp/discover.ts` to the inventory literal of `test/arch/egress-sites.test.ts::C-76ead8ea the engine's egress sites are exactly the inventory`, `src/credentials/egress-site.test.ts::C-0c230dcb the credentials module is one inventoried egress site` and `src/runtimes/invoke/request.test.ts::C-2a04f1cb only request ts is an egress site of runtimes` (an inventoried file no one imports fails, so all land together)
- [ ] 4.2 (No green code: every name its tests call exists after 4.1, so red reports `tdd_exemption: already_satisfied`; green on arrival.) Write `src/tools/mcp/discover-fakes.db.test.ts` first (scenarios "Modern and legacy discovery through the fakes", "A legacy server that issues a session id is refused", "Rediscovery drifts an approved server, a hint change alone included" and "Exit 13 for MCP": rows F1 to F5 and L1)

## 5. Routes and main

- [ ] 5.0 Write `src/api/idempotency-stored.db.test.ts` first (scenario "The stored reply is read, not run": rows S1 to S7), then implement `storedIdempotentReply` in `src/api/idempotency.ts`; `src/api/idempotency.test.ts` stays green

- [ ] 5.1 Write `src/api/mcp-register-route.db.test.ts` first (scenario "Register by URL": rows T1 to T5), then implement the register route in `src/api/mcp-tool-routes.ts` and add its export lines to `src/api/index.ts`; `POST /api/v1/tool-servers/:id/discover` stays undefined in this task (5.2 adds it, so 5.2's red cannot pass early)
- [ ] 5.2 Write `src/api/mcp-discover-route.db.test.ts` first (scenario "Discover, refuse and replay": rows T6 to T15 with T14b; T15 calls `storedIdempotentReply` first), then implement the discover route in `src/api/mcp-tool-routes.ts`, calling `storedIdempotentReply` before `discoverMcp`
- [ ] 5.3 Write `src/main.mcp.test.ts` first (scenario "Main serves the routes and discovery works through it"), then edit `src/main.ts` (add `mcp: mcpCallAdapter` to the same `calls` object that holds `http: httpCallAdapter`, the discovery gateway, the routes after U53's) and regenerate `docs/api/openapi.json` with `pnpm run test test/support/openapi-docs.ts`; `src/main.conventions.test.ts::C-d150bfa4 the committed OpenAPI document equals the text the real engine serves` stays green, and so does U53's `src/main.openapi-tools.test.ts` (its check of `calls` allows other members)
