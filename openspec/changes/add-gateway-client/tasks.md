Every test file starts with `assert.equal(typeof <function under test>, "function")`, wraps a call that reaches a scaffold stub (sync: `try`/`catch`; async: `p.then((v) => v, (e: unknown) => e)`), closes servers, fakes and clusters in `finally` or `t.after`, restores `mock.timers` in `finally`, uses `node:assert/strict` and has no `.`, `[` or `::` in test names. Red tests import from the file the Interfaces header names, never from an `index.ts` whose export line is a later task's. Fixtures: `test-plan.md` and `test-plan-edges.md`. No frozen test is changed. `src/main.ts` is shared with U47 and U49b, which edit it after; task 7.1 is this unit's only edit.

## 1. The permit

- [x] 1.1 Write `src/pdp/issued-permit.test.ts` first (scenario "Only a permit issued by this process is accepted"), then implement `BASE_EGRESS` and `issuedPermit` in `test/support/gateway-kit.ts` and `isIssuedPermit` in `src/pdp/permit.ts` and add its export line to `src/pdp/index.ts`, implementing requirement "isIssuedPermit is true only for a permit this process's PDP returned"

## 2. The configuration

- [ ] 2.1 Write `src/config/egress.test.ts` first (both config scenarios, through `loadConfig` and a map-backed `SecretReader`), then implement `loadEgressConfig` in `src/config/egress.ts`, add `egress?` to `AppConfig` and the call (after `loadOidcConfig`, the key added only when defined) to `loadConfig` in `src/config/config.ts`, and the export lines to `src/config/index.ts`, implementing requirement "The egress configuration is optional and read from URSITOARE_EGRESS_ variables"

## 3. The pure helpers

- [ ] 3.1 Write `src/gateway/helpers.test.ts` first (scenario "Vectors, call header and permit matching"), then implement `GatewayError` and the value of `GATEWAY_LIMITS` in `src/gateway/types.ts`, `bodyDigest` and `permitMatches` in `src/gateway/digest.ts`, `mintkeyTenantId` in `src/gateway/tenant.ts` and `callHeader` in `src/gateway/client.ts`, implementing requirement "Digests, tenant ids, call headers and permit matches are fixed"

## 4. The token

- [ ] 4.1 Write `src/gateway/token.test.ts` first (scenario "requestToken posts one issue request and holds the token privately"), then implement `recordingFetch` in `test/support/gateway-kit.ts` and `createGateway` and `requestToken` in `src/gateway/client.ts` (design decisions 4 and 6, the timer and size cap being task 5.3's), implementing requirement "requestToken issues a one-use token for an issued permit"

## 5. Send

- [ ] 5.1 Write `src/gateway/send-refusals.test.ts` first (scenario "send refuses before any network call"), then implement the checks of design decision 5 in `send` in `src/gateway/client.ts`, implementing requirement "send refuses everything the permit does not cover before the network"
- [ ] 5.2 Write `src/gateway/send-forward.test.ts` first (scenario "send forwards through the proxy and passes redirects through"; recording rows, then the real fake and an echo), then implement the call, the answer mapping and the spending of the token in `send`, implementing requirement "send forwards through the proxy and returns the answer unchanged"
- [ ] 5.3 Write `src/gateway/send-limits.test.ts` first (scenario "Size and time are bounded and a failed send is final"; a test-local `node:http` upstream behind the fake, `mock.timers`), then add the timer, the bounded read and the failure mapping to `src/gateway/client.ts`, implementing requirement "Size and time are bounded"
- [ ] 5.4 Write `src/gateway/logs.test.ts` first (scenario "Logs and errors carry no secret", asserting the lines of test-plan-edges.md § Logs), then implement `captureLogger` in `test/support/gateway-kit.ts` and add the `info` and `warn` log calls to `src/gateway/client.ts`, implementing requirement "Logs and errors carry no secret"

## 6. The start-up check

- [ ] 6.1 Write `src/gateway/self-check.test.ts` first (scenario "checkEgress closes on refusal and refuses an open issuer"), then implement `checkEgress` in `src/gateway/self-check.ts`, implementing requirement "The start-up self-check refuses an open issuer"

## 7. The composition root and the rule

- [ ] 7.1 Write `src/main.egress.test.ts` first (scenario "main refuses an open issuer and starts otherwise"), then edit the shared `src/main.ts`: import `checkEgress` from `./gateway/index.ts`, add `checkEgress?: typeof checkEgress` to `MainDeps` and call it as design decision 9 says, implementing requirement "main refuses an open issuer and starts otherwise"
- [ ] 7.2 Write `test/arch/egress-sites.test.ts` first (scenario "Only inventoried files import the gateway"; the frozen test is named `C-76ead8ea the engine's egress sites are exactly the inventory`), then implement `checkEgressSites` in `test/arch/egress-sites.ts` (the literal is exactly `["src/main.ts"]`; a type-only import is no site, design decision 10), implementing requirement "Only inventoried files import the gateway"

## 8. The part

- [ ] 8.1 Write `test/support/e2e-stack/egress-part.test.ts` first (scenario "The egress part starts in a crash cluster and closes completely"), then implement `egressPart` and `egressApi` in `test/support/e2e-stack/egress-part.ts` and create `test/support/e2e-stack/parts/45-egress.ts` (`export { egressPart as part } from "../egress-part.ts";`), implementing requirement "The egress part starts in the e2e stack and the crash cluster"
