## Purpose

The 20 test-catalogue blocks as loopback tool handlers behind `tools.fake.test`, and the e2e part `50-tools`.

## ADDED Requirements

### Requirement: The fake serves the 20 catalogue blocks with fixed outputs and records each call
`startFakeTools` SHALL listen on `127.0.0.1` port 0 and answer `POST /blocks/<ref>` for each of the 20 refs of the test catalogue with 200, `content-type: application/json; charset=utf-8` and the output of design.md § Fixtures for the input and, for an effect, the idempotency key; with `strict: true` (the default) every output SHALL be valid against the block's output schema (under `strict: false` an echoed member is copied as sent, so the output may be invalid by design). For a request that reaches a known block with a parseable body it SHALL append one `FakeToolCall` before it answers (`ref` percent-decoded, `path` as sent without the query, `host` lower-cased, `keyHeaderSeen` true for a non-empty `x-fake-tools-key` whose value is never stored); `calls()` SHALL return copies, filtered by `ref` and `callHeader` when given.

#### Scenario: A read call answers its fixture and is recorded
- **WHEN** after `startFakeTools()`, `POST {origin}/blocks/erp.lookup_vendor@1?x=1` is sent with body `{"vendor_name":"Acme GmbH"}` and headers `Host: tools.fake.test`, `X-Ursitoare-Call: r_1:lookup:1` and `x-fake-tools-key: kv-tools-4d1c`; then `POST {origin}/blocks/erp.lookup_vendor%401` with the same body and no extra header; then `calls()`, `calls({ ref: "erp.lookup_vendor@1" })`, `calls({ callHeader: "r_1:lookup:1" })` and `calls({ ref: "mail.send@1" })` are read and `calls()[0].input` is mutated
- **THEN** `FAKE_TOOLS_HOST` is `tools.fake.test`, `FAKE_TOOLS_ORIGIN` `https://tools.fake.test`, `FAKE_TOOLS_KEY_HEADER` `x-fake-tools-key`, `fakeToolPath("erp.lookup_vendor@1")` is `/blocks/erp.lookup_vendor@1` and `fakeToolPath("x y@1")` is `/blocks/x y@1`; both answers are 200 `{"vendor_id":"V-ACME","status":"active","payment_terms_days":30}` with `x-fake-tools-duplicate` `false`; `calls()` deep-equals `[{ seq: 1, ref: "erp.lookup_vendor@1", effect: "read", method: "POST", path: "/blocks/erp.lookup_vendor@1", host: "tools.fake.test", callHeader: "r_1:lookup:1", idempotencyKey: null, keyHeaderSeen: true, input: { vendor_name: "Acme GmbH" }, bodySha256: D_ACME, status: 200, duplicate: false }, { the same with seq: 2, path: "/blocks/erp.lookup_vendor%401", host: "127.0.0.1:<port>", callHeader: null, keyHeaderSeen: false }]`; the `ref` filter returns both records, the `callHeader` filter the first, the `mail.send@1` filter `[]`; a later `calls()[0].input` is still `{ vendor_name: "Acme GmbH" }`; no answer and no `JSON.stringify(calls())` contains `kv-tools-4d1c`

#### Scenario: All 20 outputs match their fixtures and fit their schemas
- **WHEN** the 20 rows of test-plan.md § Samples are sent in order to one fake (effects with their key), then the edge rows E1 to E18, and `loadTestCatalogue().blockRefs()` and `readCatalogueDocument().blocks` are read
- **THEN** each sample answer is 200 with the row's output, which also validates against that block's `output` schema compiled by the test's own Ajv; the sorted `blockRefs()` equal the sorted 20 sample refs; the edge answers equal the rows (E3, E8 and E10 are the prototype-name cases); `calls()` holds 38 records in `seq` order, the first 20 with status 200 and `effect` `read` 9 times, `write` 6, `send` 3 and `pay` 2, and E2 and E3 with status 404

### Requirement: An effect needs an idempotency key and replays under it
For a block whose effect is not `read`, a request with no `Idempotency-Key` or an empty one SHALL be 400 `missing_idempotency_key`, before the schema check. A request with a key not yet seen for that ref SHALL run the fixture and keep the output under `(ref, key)`; a later request with the same ref and key that passes the input checks (a JSON object and, with `strict` true, the schema) SHALL answer the kept output, whatever its input, with `x-fake-tools-duplicate: true` and a record with `duplicate` true; one that fails them is refused `invalid_input` as for a new key, appends a record with status 400 and `duplicate` false, and leaves the kept output as it was. The same key on another ref is independent; a read ignores the key.

#### Scenario: Effects need a key and replay under it
- **WHEN** rows 1 to 10 of test-plan.md § Effect rows are sent in order to one fake
- **THEN** each answer and record equal the row: rows 1 and 2 are 400 with the `message` `mail.send@1 has effect=send; send an Idempotency-Key header`; `ik-03` with `MAIL_B` replays `msg-f58a35b6ca` (`duplicate` true, `MAIL_B` recorded as `input`) while `slack.post_message@1` under `ik-03` is independent; a read under `ik-r` never has `duplicate` true; `PAY-57819766` replays on `ik-01`; `calls()` has 10 records

#### Scenario: A replay with invalid input is refused and the kept output stays
- **WHEN** row 11 of test-plan.md § Effect rows runs on a fresh fake: `MAIL_A` and `MAIL_B` under `ik-03`, then `{}` under `ik-03`, then `MAIL_A` under `ik-03` again
- **THEN** the `{}` request is 400 `invalid_input` with `details` `[{"path":"/","keyword":"required"}]` and no `x-fake-tools-duplicate`, recorded with status 400, `idempotencyKey` `ik-03`, `duplicate` false and `input` `{}`, so it is not a replay; the last request answers `msg-f58a35b6ca` with `duplicate` true; `calls()` holds 4 records

### Requirement: Refusals come first and only parseable calls to known blocks are recorded
The fake SHALL refuse, in this order and recording nothing: 421 `misdirected_request` for a `Host` (lower-cased, exact) other than `tools.fake.test` or `127.0.0.1:<port>`; 404 `not_found` outside `/blocks/`; 405 `method_not_allowed` with `allow: POST`; 404 `unknown_block` with `block` for a ref that is not an own key (percent-decoded, raw when decoding fails); 413 `body_too_large` above 1,048,576 bytes; 400 `invalid_json` for a non-blank body (its `trim()` is not empty; a blank body is `{}`) that is not JSON. It SHALL then record the call and answer 400 `missing_idempotency_key`, then 400 `invalid_input` `{ error, block, details: [{ path, keyword }] }` for a body that is not a JSON object and, with `strict` true, for the first schema error (`path` a JSON Pointer, `/` for the root; `keyword` the Ajv keyword). `strict: false` SHALL skip only the schema, and every fixture formula SHALL then read a member that is missing or of another type as design.md § Fixtures says (a text member through `s()`, a `max` or `top_k` that is not an integer as 2), so no JSON object makes a handler throw.

#### Scenario: Refusals come first and only parseable calls to known blocks are recorded
- **WHEN** the rows R1 to R24 of test-plan.md § Refusal rows are sent to one strict fake, then N1 to N8 to a fake started with `{ strict: false }`
- **THEN** each answer has its row's status and exact body (R8 also `allow: POST`; R11 records `host` `tools.fake.test`; R21, exactly 1,048,576 bytes, is 200 and R22, one byte more, 413; R24, a body of a space and a newline, is the 400 of R13); `calls()` holds exactly the 11 records of the table's list and none for a 404, 405, 413, 421 or `invalid_json` row; the non-strict fake answers N1 `V-UNKNOWN`, N2 400, N3 `V-5` and N4 to N8 as their rows say (`undefined` as a name, `nobody` without an `@`, two passages for `top_k` `"x"`, `V--TOSTRING-5-` for an object)

### Requirement: A catalogue that cannot be read rejects the start before any listener exists
`startFakeTools` SHALL read the catalogue once, before it listens, with `readCatalogueDocument(opts.catalogue)` (default: the checked-in catalogue) and, when that throws, SHALL reject with the loader's `CatalogueDataError` unchanged. The accepted catalogue is one that holds each of the 20 `FIXTURE_REFS` as an own block with `effect`, `input` and `output`, the `input` and `output` schemas each compiling under the fake's Ajv (the options of design.md decision 2); refs beyond the 20 are ignored and never served. After the read and before any listener opens, `startFakeTools` SHALL check the 20 refs in `FIXTURE_REFS` order and, at the first failure, SHALL reject with `new CatalogueDataError("CATALOGUE_INVALID", "<ref>: <reason>")` (no `details` member) where `<reason>` is `missing` (the ref is not an own block) or `schema does not compile` (any throw of `ajv.compile` for the `input` or the `output` schema: rows L5, L9). A block with a missing or ill-shaped `effect`, `input` or `output` is refused earlier by the loader, whose own `CatalogueDataError` (`/blocks/<ref>/<member>: ...`) SHALL pass on unchanged (row L8).

#### Scenario: A catalogue that cannot be read rejects the start and opens no listener
- **WHEN** rows L1 to L9 of test-plan-failures.md § Catalogue rows run: `startFakeTools` is awaited with `bad.json` (the text `{`), `missing.json` (never created), `TEST_CATALOGUE_PATH`, `nomail.json` (the checked-in catalogue without `mail.send@1`), `badschema.json` and `badout.json` (the `input`, resp. the `output`, of `erp.lookup_vendor@1` set to `{"type":5}`), `nooutput.json` (without the `output` of `mail.send@1`), no option and `extra.json` (one added block `extra.thing@1`), each with the number `T` of `"TCPServerWrap"` entries of `process.getActiveResourcesInfo()` read immediately before the call and immediately after it settles
- **THEN** L1 and L2 reject with a `CatalogueDataError` (no `details` member) with the code and message of their rows (`CATALOGUE_INVALID` starting `invalid JSON: `; `CATALOGUE_READ` `cannot read <dir>/missing.json: ENOENT: ...`); L3 resolves and `T` is one above its before while the fake is open, so the counter sees a listener; L4 rejects with `CATALOGUE_INVALID` `mail.send@1: missing`, L5 and L9 with `CATALOGUE_INVALID` `erp.lookup_vendor@1: schema does not compile`, L8 with the loader's own `/blocks/mail.send@1/output: expected an object schema`; `T` is equal before and after each rejection; L6 and L7 resolve with `T` one above its before (the extra block of L7 answers 404 `unknown_block`)

### Requirement: Delay and failure knobs apply per block and are checked
`setDelay(ref, ms)` SHALL make every recorded request of `ref` wait `ms` after its record is appended and before its answer. `failNext(ref, status, times)` SHALL make the next `times` (default 1) recorded requests of `ref` answer `status` with `{ error: "injected_failure", status }`, before the key and schema checks and without touching the idempotency memory; a later `failNext` for the ref replaces the earlier one. A client that aborts while its request waits SHALL leave that request's record and SHALL NOT change the answer to the next call. A ref that is not an own block, a delay outside the integers 0 to 30000, a status outside the integers 400 to 599 or `times` outside the integers 1 to 1000 SHALL throw `RangeError` and change nothing.

#### Scenario: Failure and delay knobs apply per block and are checked
- **WHEN** the rows K1 to K5 and A1 to A10 of test-plan.md § Knob rows run
- **THEN** each answer, record and message equals its row (K4: 200 after at least 280 ms; K5: the `docs.fetch@1` call is 200 while the 30 s call is unsettled and recorded); each argument row throws `RangeError`

#### Scenario: A client that aborts during a delay leaves its record and the next call is answered
- **WHEN** row K6 of test-plan-failures.md § Abort row runs: `setDelay("docs.fetch@1", 1000)`; `fetch` posts `{"url":"u"}` to `docs.fetch@1` with `AbortSignal.timeout(50)`; `calls()` is polled (10 ms steps, bounded at 5000 ms) until it holds a record; then `setDelay("docs.fetch@1", 0)` and the same post is sent with no signal
- **THEN** the first call rejects on the client with a `DOMException` named `TimeoutError`; the polled `calls()` holds one record: `seq` 1, `ref` `docs.fetch@1`, `status` 200, `duplicate` false, `input` `{ url: "u" }`; the second call answers 200 with the `docs.fetch@1` output for `u` and `calls()` then holds 2 records, `seq` 1 and 2

### Requirement: Reset, close and the records behave as one lifecycle
`reset()` SHALL empty calls, delays, failures and the idempotency memory and restart `seq` at 1. `close()` SHALL be idempotent, clear pending delays, destroy every connection and release the port; a request waiting in a delay SHALL get a connection error and keep its record, and `calls()` SHALL work after `close()`. A request already waiting in a delay when `reset()` runs SHALL still be answered when its delay ends and SHALL NOT be recorded again (its record went with the reset).

#### Scenario: Reset and close
- **WHEN** a fake holds a `mail.send@1` record with `ik-03`, `setDelay("docs.fetch@1", 30000)` and `failNext("http.get@1", 500)`; `reset()` runs; then `docs.fetch@1` `{"url":"u"}` (with an `AbortSignal.timeout(5000)`), `http.get@1` `{"url":"u"}` and `mail.send@1` `MAIL_A` with `ik-03` are sent; then `setDelay("mail.send@1", 30000)`, an unawaited `mail.send@1` `MAIL_A` with `ik-pend` is sent and its record is awaited (polled, bounded at 5000 ms); then `close()` is called twice and a new connection is opened
- **THEN** `calls()` after `reset()` is `[]`; the three calls answer 200 (the abort never fires), 200 and 200 with `duplicate` false and `seq` 1, 2, 3; the pending call's record has `idempotencyKey` `ik-pend`, status 200 and `seq` 4 before any answer; both `close()` calls resolve (under a 5000 ms guard), the pending request fails with a connection error, `calls()` holds 4 records and the new connection gets `ECONNREFUSED`

#### Scenario: A reset leaves a request that is waiting in a delay running
- **WHEN** `setDelay("kb.search@1", 300)`, an unawaited `kb.search@1` `{"query":"q"}` is sent, its record is awaited (polled, bounded at 5000 ms), `reset()` runs and the call is awaited
- **THEN** the call answers 200 `{"passages":[p1("q"), p2]}` and `calls()` is `[]`

### Requirement: A credentialed service reaches the fake tools through the fake egress
With the fake egress (U45) holding a credential for a service whose `target_url` is `FAKE_TOOLS_ORIGIN` and header `x-fake-tools-key`, and `addUpstream(FAKE_TOOLS_HOST, tools.origin)` registered, a call through the proxy to `/<service id>` plus `fakeToolPath(ref)` SHALL reach the handler with `host` `tools.fake.test` and `keyHeaderSeen` true, and a service with no credential SHALL not reach it.

#### Scenario: A credentialed service reaches the fake tools through the fake egress
- **WHEN** the setup and calls C1 to C4 of test-plan.md § Egress rows run
- **THEN** the credential is stored (`keyVersion` 1); C1 to C4 answer as the rows say (C4 is 502 `bad gateway: vault error`); `tools.calls()` deep-equals the three records of the section (`host` `tools.fake.test`, `keyHeaderSeen` true, `duplicate` false, false, true); `egress.requests()` shows `[credential]` for `x-fake-tools-key` in the three allowed records; the forged header value, `kv-tools-4d1c` and the broker token occur in no tool record

### Requirement: The contract suite runs against a base URL
`fakeToolsContract(baseUrl, { host })` SHALL return 7 checks (test-plan.md § Contract rows) that send requests to `baseUrl` with `Host: <host>`, each failing with an `assert.AssertionError` whose message starts with the check name and a colon, an unreachable URL included.

#### Scenario: The contract suite passes on the fake and fails on broken targets
- **WHEN** the checks are built for the fake's origin with host `tools.fake.test`, for mutants M1 and M2 (forwarding servers of § Contract rows) and for `http://127.0.0.1:1`, and each `run()` is awaited
- **THEN** the 7 names equal the list of the section in order; on the fake all 7 resolve; on M1 exactly `an effect replays under the same key` and on M2 exactly `a foreign Host is refused` rejects; on the closed port all 7 reject; each rejection is an `AssertionError` whose message starts with the check's name and a colon

### Requirement: The tools part registers its upstream, resets with the stack and closes
The part `tools` (file `parts/50-tools.ts`, after `45-egress`) SHALL, on `start`, resolve `egressApi(ctx.handles)` before opening any listener, then start the fake and register `FAKE_TOOLS_HOST` to its origin on the fake egress; SHALL return `env` `{}` and `api` `{ tools }`; SHALL call `tools.reset()` on `beforeReset`; SHALL close the fake on `close`; and SHALL start and close in a crash cluster with no engine. `toolsApi` SHALL throw `E2eStackError` `STACK_PART_MISSING` when the part has not started.

#### Scenario: The part registers its upstream, resets on beforeReset and closes in a crash cluster
- **WHEN** the rows P1 to P4 of test-plan.md § Part rows run
- **THEN** P1 rejects with an `E2eStackError` and opens no listener (`T` equal before and after); in P2 a call through the egress proxy reaches the fake (one record, `seq` 1), `beforeReset` empties `calls()`, the same call reaches it again with `seq` 1, `toolsApi(new Map())` throws `STACK_PART_MISSING` with `details` `{ part: "tools" }` and the origin refuses connections after `close()`; in P3 the file text equals `export { toolsPart as part } from "../tools-part.ts";`, `egress` precedes `tools` in the discovered names and `45-egress.ts` < `50-tools.ts` in file-name order; in P4 the crash cluster of `database`, `egress` and `tools` serves 200 on the captured origin and refuses connections after its `close()`

### Requirement: The support README names the fake accurately
`test/support/README.md` SHALL describe the `fake-tools/` row as the 20 loopback handlers behind `tools.fake.test` with the part `50-tools`, and SHALL no longer call `global-setup.ts` and `e2e-stack/main.ts` bootstrap placeholders.

#### Scenario: The README names the fake accurately
- **WHEN** `test/support/README.md` is read after the change
- **THEN** exactly one line starts with ``| `fake-tools/` | `add-fake-tools` |`` and it equals the row of test-plan.md § README rows; the sentence of that section is present once; the text `Bootstrap placeholders exist` occurs nowhere
