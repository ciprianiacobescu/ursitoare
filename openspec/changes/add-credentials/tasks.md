Tests follow `proposal.md` § Out of scope; fixtures are in `test-plan.md` and `test-plan-routes.md`.

## 1. The table

- [x] 1.1 Write `src/credentials/schema.test.ts` first (scenario "Migration 0480 stores references and no value"), then create `src/db/migrations/0480_credentials.sql` (its four constraints named as design.md § The table says)

## 2. The vault

- [x] 2.1 Write `src/gateway/vault-codec.test.ts` first (scenario "The codec matches hand-written byte vectors and never sends field 7"), then implement `encodePutCredentialRequest` and `decodePutCredentialResponse` in `src/gateway/vault.ts` and add its value export lines to `src/gateway/index.ts`
- [ ] 2.2 Write `src/gateway/vault.test.ts` first (scenario "The writer stores through the fake vault, counts key versions and maps every refusal"), then implement `createVaultWriter` in `src/gateway/vault.ts`

## 3. Provision

- [ ] 3.1 Write `src/credentials/provision.test.ts` (scenario "Provision puts first, stores the reference and refuses what is invalid, unknown or taken"), `src/credentials/echo.test.ts` (scenario "The echo shows the injected header and the fake never shows the value") and `src/credentials/egress-site.test.ts` (scenario "The inventory names the credentials module once": one test named `C-0c230dcb the credentials module is one inventoried egress site`, which fails by assertion at red because `vault-call.ts` does not exist) first, and change `test/arch/egress-sites.test.ts::C-76ead8ea the engine's egress sites are exactly the inventory` so its literal is `["src/credentials/vault-call.ts", "src/main.ts"]` (the frozen test of that scenario); then implement `CredentialsError` in `types.ts`, `validate.ts`, `vault-call.ts` (errors unmapped) and `provisionCredential`, `provisionCredentialTx` in `provision.ts`
- [ ] 3.2 Write `src/credentials/provision-failures.test.ts` first (scenario "Vault and insert failures write nothing and a later put counts on", rows F1 to F11), then map `GatewayError` to `CREDENTIALS_VAULT` in `vault-call.ts` and the insert's SQLSTATE 23505 and 23503 in `provision.ts` by `constraint` (design.md § Provision)

## 4. Rotate, list and resolve

- [ ] 4.1 Write `src/credentials/rotate.test.ts` first (scenario "Rotate moves the key version, refusals change nothing, list shows metadata"), then implement `rotateCredential` in `rotate.ts`, `listCredentials` in `store.ts` and the export lines of `src/credentials/index.ts`
- [ ] 4.2 Write `src/credentials/resolver.test.ts` first (scenario "The resolver answers per tenant and seedServiceId matches its vectors"), then implement `createServiceResolver` and `seedServiceId` in `resolver.ts`

## 5. The error code and the routes

- [ ] 5.1 Write `src/api/credential-codes.test.ts` first, with one test named `C-96e47324 registers EGRESS_UNAVAILABLE with its status and message` (`ERROR_CODES.EGRESS_UNAVAILABLE` deep-equals `{ status: 503, message: "The egress broker or vault is unavailable" }` and `isRegisteredCode("EGRESS_UNAVAILABLE")` is true; it fails by assertion at red; an in-place change keeps the old test id, which L4 does not count as a new trace), and change `src/api/error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message` (`EXPECTED_CODES` gains `EGRESS_UNAVAILABLE` 503; the name stays), then add the entry to `ERROR_CODES` in `src/api/error-codes.ts` (the MODIFIED requirement "Every error code is registered")
- [ ] 5.2 Write `src/api/credential-routes.test.ts` (scenario "Carol provisions and rotates, replays follow the key, alice is refused and tenant_b sees nothing", its fragment part as in `src/registry/policy.test.ts`), `src/api/credential-secrets.test.ts` (scenario "A canary value is found in no sink", seven sinks; the document is checked in 6.1) and `src/api/credential-deps.test.ts` (scenario "Null dependencies answer as the block routes do") first, then create `src/credentials/policy/credentials.cedar`, implement `registerCredentialRoutes` in `src/api/credential-routes.ts` and add its export lines to `src/api/index.ts`

## 6. Main, the document and the part

- [ ] 6.1 Write `src/main.credentials.test.ts` first (scenarios "Main registers the routes and the document agrees", which reads `docs/api/openapi.json` and is red until regenerated, and "Main wires the vault, the ids and the engine key"), then edit `src/main.ts` (build `vault` with `createVaultWriter` from `config.egress?.vault ?? null` and the existing `logger`; call `registerCredentialRoutes(server, { pool: pep.pool, vault, ids: systemIds, clock: pep.clock, engineKey: config.engineKey })` directly after `registerToolServerRoutes`) and run `node test/support/openapi-docs.ts`
- [ ] 6.2 Write `test/support/e2e-stack/tool-servers-part.test.ts` first (scenario "The part seeds once, re-seeds idempotently, survives a reset and runs in the crash cluster"), then implement `toolServersPart` and `SEED_TOOL_SERVER` in `test/support/e2e-stack/tool-servers-part.ts` and create `test/support/e2e-stack/parts/52-tool-servers.ts` (`export { toolServersPart as part } from "../tool-servers-part.ts";`)
