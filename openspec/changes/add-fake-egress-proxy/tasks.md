Every test file starts with `assert.equal(typeof <function under test>, "function")`, wraps calls that reach a scaffold stub (async: `p.then((v) => v, (e: unknown) => e)`), closes its fakes in `finally`, uses `node:assert/strict` and has no `.`, `[` or `::` in test names. Fixtures: `test-plan.md`. No frozen test is changed. `index.ts`, `proxy.ts`, `vault.ts` and `state.ts` (all in `test/support/fake-egress/`) grow in the tasks that name them. Red tests import from the file that declares the name, never through a re-export line.

## 1. Pure pieces

- [x] 1.1 Write `test/support/fake-egress/wire.test.ts` first (the wire half of scenario "The vault stores a credential and counts key versions": `encodePutRequest` equals `REQ1` and `REQ2` of test-plan.md § Wire vectors byte for byte and `decodePutRequest` returns the inputs; `unframe` throws `WireError` for V22 to V24 and `decodePutRequest` for V25 and V26; `encodePutResponse` and `decodePutResponse` round-trip 1, 2 and 300), then implement `test/support/fake-egress/wire.ts`, implementing requirement "The vault stores a credential and counts key versions"
- [x] 1.2 Write `test/support/fake-egress/echo.test.ts` first (scenario "The echo upstream shows what it received"), then implement `startEchoUpstream` in `test/support/fake-egress/echo.ts` and add `export * from "./echo.ts"` to `test/support/fake-egress/index.ts`, implementing requirement "The echo upstream shows what it received"

## 2. The broker

- [ ] 2.1 Write `test/support/fake-egress/broker.test.ts` first (scenarios "Issue succeeds and is recorded" and "Issue refuses bad requests and bounds the TTL"; the signature is verified in the test with `crypto.verify` and `createPublicKey`), then implement `startFakeEgress` in `test/support/fake-egress/index.ts` (three loopback servers, copies of the records, plain `addUpstream`, `addCredentialless` and `clearRecords`, a basic `close()`) and create `test/support/fake-egress/state.ts` (an `emit` that records), `test/support/fake-egress/jwt.ts`, `test/support/fake-egress/broker.ts` and minimal `test/support/fake-egress/proxy.ts` and `test/support/fake-egress/vault.ts` that answer 404 and `grpc-status` 12 to everything, implementing requirement "The broker issues a bounded EdDSA token and records it"

## 3. The vault

- [ ] 3.1 Write `test/support/fake-egress/vault.test.ts` first (scenarios "The vault stores a credential and counts key versions", without its final proxy call, and "The vault refuses bad callers and bad messages", driven by raw bytes built from the hex and by `node:http2`), then implement `callVault` and `putCredential` in `test/support/fake-egress/vault-client.ts` and replace `test/support/fake-egress/vault.ts` with the h2c server (design decision 6), implementing requirements "The vault stores a credential and counts key versions"

## 4. The proxy

- [ ] 4.1 Write `test/support/fake-egress/proxy-forward.test.ts` (scenario "The proxy forwards through the echo upstream" and the call that injects `kv-secret-8e2b`) and `test/support/fake-egress/proxy-refusals.test.ts` (scenario "The proxy refuses on the injected clock") first, then replace `test/support/fake-egress/proxy.ts` with the handler of design decisions 3 and 4 and the `addUpstream` hit of decision 5, implementing requirements "The proxy forwards with the stored credential injected" and "The proxy refuses before it calls an upstream"
- [ ] 4.2 Write `test/support/fake-egress/proxy-pass-through.test.ts` first (scenarios "Streaming, redirects and upstream errors pass through" and "The credential-less route is fake-only"; the stream, the 302 and the 500 hold after 4.1, the 502 rows, the loopback target and the credential-less route fail at red), then extend `test/support/fake-egress/proxy.ts` with the loopback-target and 502 paths of design decision 5 and the credential-less lookup, implementing requirement "The proxy forwards with the stored credential injected"

## 5. Audit, secrets and lifecycle

- [ ] 5.1 Write `test/support/fake-egress/audit.test.ts` (scenario "Events reach the sink with the emitter's token") and `test/support/fake-egress/secrets.test.ts` (scenario "No secret is recorded and nothing is printed", exactly 6 sink posts) first, then extend `emit` in `test/support/fake-egress/state.ts` to post each event (design decision 7), implementing requirements "Audit events reach the sink with the emitter's token" and "No secret is recorded and nothing is printed"
- [ ] 5.2 Write `test/support/fake-egress/lifecycle.test.ts` first (scenario "Start, register, clear and close"), then add the argument checks of `addUpstream` and `addCredentialless` and the complete `close()` (design decision 11) in `test/support/fake-egress/index.ts`, implementing requirement "The fake starts on loopback, clears its records and closes completely"

## 6. The contract suite

- [ ] 6.1 Write `test/support/fake-egress/contract.test.ts` first (scenario "The contract suite passes on the fake and fails on broken targets": the names array, one `test(check.name, check.run)` per check on the fake, the two mutants, the closed port), then implement `egressContract` in `test/support/fake-egress/contract.ts` (using `fetch` and `putCredential`; every assertion message starts with the check name and a colon) and add `export * from "./contract.ts"` to `test/support/fake-egress/index.ts`, implementing requirement "The contract suite runs against base URLs"
