Every test file starts with `assert.equal(typeof <function under test>, "function")`, wraps a call that reaches a scaffold stub (async: `p.then((v) => v, (e: unknown) => e)`), closes pools in `finally` and has no `.`, `[` or `::` in test names. Fixtures: `test-plan.md` and `test-plan-routes.md`. No frozen test changes (`src/identity/roles-policy.test.ts::C-a5d01d7a` and `src/api/session-auth.rbac.test.ts` stay green). Red tests import from the declaring file, never an `index.ts`.

## 1. The tables

- [ ] 1.1 Write `src/tools/schema.test.ts` first (scenario "Migration 0470 stores servers and surfaces with narrow update rights", with row 20, state `other` refused by `23514`), then create `src/db/migrations/0470_tool_registry.sql`, implementing its requirement

## 2. The pure pieces

- [ ] 2.1 Write `src/tools/origin.test.ts` first (scenario "Each of 29 inputs is accepted or refused with its reason"), then implement `validateOrigin` in `src/tools/origin.ts`, implementing its requirement
- [ ] 2.2 Write `src/tools/surface.test.ts` first (the digest and refs parts of "The digest ignores order and fills defaults, fixtureSurface matches the catalogue, and refs take the lowest fitting major": § Digests, § Refs), then implement `surfaceDigest`, `surfaceRefs`, `toolBlock`, `toolHash` in `src/tools/surface.ts`, implementing the digest and refs parts of its requirement
- [ ] 2.3 Write `test/support/tool-surface.test.ts` first (the `fixtureSurface` part of that scenario), then create `test/support/tool-surface.ts` and append its row (owner `add-tool-registry`) to `test/support/README.md`, implementing the `fixtureSurface` part of that requirement

## 3. The store

- [ ] 3.1 Write `src/tools/store.test.ts` first (scenario "Register stores a pending server and refuses what is invalid, taken or foreign"), then implement `ToolsError` in `types.ts`, `checkSurface` in `surface.ts` and `registerToolServer`, `registerToolServerTx`, `getToolServer`, `getToolServerDetail`, `listToolServers`, `assertTenant` in `src/tools/store.ts`, and add the export lines of `types.ts`, `origin.ts`, `surface.ts`, `store.ts` and `directory.ts` to `src/tools/index.ts`, implementing its requirement
- [ ] 3.2 Write `src/tools/approve.test.ts` first (scenarios "A team refuses the submitter, a solo tenant needs the flag, and every refusal writes nothing" and "Approval imports the bound blocks beside the unbound catalogue, and a repeat completes after a failed second step", whose `zeta` row submits a surface between the two transactions and expects `digest_mismatch`), then implement `approveSurface` in `store.ts` (transaction 2 locks the server row first and rechecks the newest digest), implementing "Approval needs another admin…" and "Approval writes immutable bound block versions…"
- [ ] 3.3 Write `src/tools/submit.test.ts` first (scenario "A submitted surface drifts an approved server and re-approval restores it"), then implement `submitSurface` in `store.ts`, implementing its requirement

## 4. The directory and the fragment

- [ ] 4.1 Write `src/tools/directory.test.ts` first (scenario "The directory answers an approved tool, a drifted one with its state, and null for everything else"), then implement `createToolDirectory` in `src/tools/directory.ts`, implementing its requirement
- [ ] 4.2 Write `src/tools/policy.test.ts` first (scenario "Only tenant admins of the tenant hold the two actions", in the shape of `src/registry/policy.test.ts`), then create `src/tools/policy/tools.cedar`, implementing its requirement

## 5. The routes

- [ ] 5.1 Write `src/api/tool-server-routes.test.ts` first (scenarios "Carol registers and reads, alice is refused and tenant_b sees nothing", "Approval over HTTP follows the tenant's profile and the approved blocks show as bound" and "A null pool or engine key answers as the block routes do"), then implement `registerToolServerRoutes` (the `local` body member; null `pool` and `engineKey` as design § Failure cases) in `src/api/tool-server-routes.ts` and add its export lines to `src/api/index.ts`, implementing "The routes register, list, read, submit and approve…"
- [ ] 5.2 Write `src/main.tools.test.ts` first (scenario "The committed document holds the five operations with their actions": it reads `docs/api/openapi.json`, red until regenerated), then edit `src/main.ts` (this unit's named edit: import `registerToolServerRoutes` from `./api/index.ts` and call it with `{ pool: pep.pool, clock: pep.clock, engineKey: config.engineKey }` directly after the `registerBlockRoutes(server, …)` call) and run `node test/support/openapi-docs.ts`, implementing its requirement
