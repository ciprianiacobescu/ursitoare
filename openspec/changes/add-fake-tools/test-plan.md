# Test plan for add-fake-tools

Ran in a scratch implementation on Node 24.22.2 (design.md § Verification); hash-derived values recomputed in Python. Tests send with `node:http` (own `Host`), compile output schemas with their own `Ajv2020({ strict: false, validateFormats: false })`, and close every fake in `finally`.

## Constants

- `K = "kv-tools-4d1c"`, `T_A = "4b8a2c1e-0000-8000-8000-000000000001"`, `S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01"`, `S2` the same ending `02`.
- `D_EMPTY = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`, `D_OBJ` (body `{}`) `= 44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a`, `D_ACME` (body `{"vendor_name":"Acme GmbH"}`) `= ad89878ead763441ddc3bdb920c15ac97d953890d73464b6cdfc28e7a14d36ad`, `D_MAIL` (body `MAIL_A`) `= cc6042abee0ce7229757b5cb64b915bd2c47f3e71a76a67567cf2fc94b09a099`.
- `MAIL_A = {"to":"a@x.test","subject":"s","body":"b"}`, `MAIL_B = {"to":"z@x.test","subject":"other","body":"c"}`. `m1(x)`, `m2`, `p1(q)`, `p2` are the messages and passages of design.md § Fixtures.

## Samples (scenario "All 20 outputs match their fixtures and fit their schemas")

Each row is sent once, in order, to one fake; a key is sent as `Idempotency-Key`. The answer is 200 and its body deep-equals the output.

| # | ref | input | key | output |
|---|---|---|---|---|
| 1 | `invoices.get@1` | `{"invoice_id":"INV-1001"}` | | `{"vendor_name":"Acme GmbH","invoice_id":"INV-1001","raw_text":"INVOICE INV-1001\nVendor: Acme GmbH\nTotal: 2450.00 EUR\nDue date: 2026-11-30\nPayment terms: net 30 days\nPlease remit to the account on file.","received_at":"2026-10-20T09:15:00Z"}` |
| 2 | `docs.fetch@1` | `{"url":"https://docs.example/policy"}` | | `{"content":"Fetched document for https://docs.example/policy. Quarterly policy: payments above 10000 require two approvers.","content_type":"text/plain"}` |
| 3 | `mail.read_inbox@1` | `{"mailbox":"ap@acme.example"}` | | `{"messages":[m1("ap@acme.example"), m2]}` |
| 4 | `http.get@1` | `{"url":"https://example.test/ping"}` | | `{"status":200,"body":"GET https://example.test/ping -> ok"}` |
| 5 | `erp.lookup_vendor@1` | `{"vendor_name":"Acme GmbH"}` | | `{"vendor_id":"V-ACME","status":"active","payment_terms_days":30}` |
| 6 | `crm.find_customer@1` | `{"email":"jane.doe@example.com"}` | | `{"customer_id":"C-86E0B9","name":"jane doe","tier":"bronze"}` |
| 7 | `orders.get@1` | `{"order_id":"o-1"}` | | `{"order_id":"o-1","customer_email":"jane.doe@example.com","total":149.9,"currency":"EUR","status":"shipped"}` |
| 8 | `kb.search@1` | `{"query":"refund window"}` | | `{"passages":[p1("refund window"), p2]}` |
| 9 | `calendar.find_slots@1` | `{"attendees":["a@x.test"],"duration_minutes":30}` | | the two slots of design.md |
| 10 | `erp.create_payment@1` | `{"vendor_id":"V","amount":1,"currency":"EUR","reference":"r"}` | `ik-01` | `{"payment_id":"PAY-57819766","status":"created"}` |
| 11 | `orders.refund@1` | `{"order_id":"o","amount":1,"reason":"r"}` | `ik-02` | `{"refund_id":"RF-93269173","status":"issued"}` |
| 12 | `mail.send@1` | `MAIL_A` | `ik-03` | `{"message_id":"msg-f58a35b6ca"}` |
| 13 | `slack.post_message@1` | `{"channel":"c","text":"t"}` | `ik-04` | `{"ts":"1760000000.041422"}` |
| 14 | `http.post@1` | `{"url":"https://example.test/hook","json":{"a":1}}` | `ik-05` | `{"status":200,"body":"POST https://example.test/hook -> accepted"}` |
| 15 | `crm.create_ticket@1` | `{"customer_id":"C","subject":"s","priority":"low","body":"b"}` | `ik-06` | `{"ticket_id":"T-3EF22E"}` |
| 16 | `crm.update_ticket@1` | `{"ticket_id":"T-1","status":"solved"}` | `ik-07` | `{"ticket_id":"T-1","status":"solved"}` |
| 17 | `sheets.append_row@1` | `{"sheet_id":"s","values":["a"]}` | `ik-08` | `{"row":118}` |
| 18 | `calendar.create_event@1` | `{"title":"t","start":"s","end":"e","attendees":["a"]}` | `ik-09` | `{"event_id":"ev-afffaa70"}` |
| 19 | `docs.create@1` | `{"title":"t","content":"c"}` | `ik-10` | `{"doc_id":"doc-f54d321f","url":"https://docs.example/doc-f54d321f"}` |
| 20 | `erp.flag_vendor@1` | `{"vendor_id":"V","reason":"r"}` | `ik-11` | `{"flag_id":"FLAG-2D5B04"}` |

Edge rows (reads, no key; same fake after the samples). Each answer is 200 unless stated.

| # | ref and input | output |
|---|---|---|
| E1 | `invoices.get@1` `INV-1003` | `vendor_name` `Blocked Co`, `raw_text` as row 1 with `INV-1003`, `Blocked Co`, `Total: 300 EUR`, `Due date: 2026-12-01`, `Payment terms: net 0 days` |
| E2, E3 | `invoices.get@1` `INV-9999`; `__proto__` | 404 `{"error":"invoice_not_found","invoice_id":"INV-9999"}`; the same with `"__proto__"` |
| E4 to E10 | `erp.lookup_vendor@1` `"  GLOBEX "`; `"Blocked Co"`; `"Initech Ltd."`; `""`; `"constructor"`; `"A very long vendor name indeed"`; `"__proto__"` | `V-GLOBEX` active 45; `V-BLOCKED` blocked 0; then active 30 with `V-INITECH-LTD-`, `V-UNKNOWN`, `V-CONSTRUCTOR`, `V-A-VERY-LONG-VEND`, `V--PROTO-` |
| E11 to E13 | `mail.read_inbox@1` `{"mailbox":"m","max":1}`; `max` 0; `max` 5 | `[m1("m")]`; `[m1("m")]`; `[m1("m"), m2]` |
| E14 to E16 | `kb.search@1` `{"query":"q","top_k":1}`; `top_k` 0; `top_k` 5 | `[p1("q")]`; `[p1("q")]`; `[p1("q"), p2]` |
| E17, E18 | `crm.find_customer@1` `bob_smith-jr@example.com`; `x@y.test` | `C-7676E4` `bob smith jr` silver; `C-5980CC` `x` bronze |

After the samples `calls()` holds 20 records (the counts of the spec); E1 to E18 add 18, E2 and E3 with status 404.

## Effect rows (scenario "Effects need a key and replay under it")

One fake; `mail.send@1` unless stated; `dup` is the `x-fake-tools-duplicate` header; the record is (`status`, `idempotencyKey`, `duplicate`).

| # | request | answer | record |
|---|---|---|---|
| 1 | `MAIL_A`, no key | 400 `{"error":"missing_idempotency_key","message":"mail.send@1 has effect=send; send an Idempotency-Key header"}`, no `dup` | 400, `null`, false |
| 2 | `MAIL_A`, key `""` | the same body | 400, `""`, false |
| 3 | `MAIL_A`, `ik-03` | 200 `{"message_id":"msg-f58a35b6ca"}`, dup `false` | 200, `ik-03`, false |
| 4 | `MAIL_B`, `ik-03` | 200 the same body, dup `true` | 200, `ik-03`, true; `input` is `MAIL_B` |
| 5 | `MAIL_A`, `ik-04` | 200 `{"message_id":"msg-a1ce271bb3"}`, dup `false` | 200, `ik-04`, false |
| 6 | `slack.post_message@1` `{"channel":"#ap","text":"hi"}`, `ik-03` | 200 `{"ts":"1760000000.062858"}`, dup `false` | 200, `ik-03`, false |
| 7, 8 | `erp.lookup_vendor@1` `{"vendor_name":"Globex"}`, `ik-r`, twice | 200 `{"vendor_id":"V-GLOBEX","status":"active","payment_terms_days":45}`, dup `false` both | 200, `ik-r`, false (twice) |
| 9, 10 | `erp.create_payment@1` `{"vendor_id":"V-ACME","amount":2450,"currency":"EUR","reference":"INV-1001"}`, then `{"vendor_id":"V-ACME","amount":1,"currency":"USD","reference":"x"}`, both `ik-01` | 200 `{"payment_id":"PAY-57819766","status":"created"}`, dup `false`, then the same body, dup `true` | 200, `ik-01`, false; 200, `ik-01`, true |
| 11 | `{}`, key `ik-03` (known from rows 3 and 4; the input fails the schema) | 400 `{"error":"invalid_input","block":"mail.send@1","details":[{"path":"/","keyword":"required"}]}`, no `dup` (the input checks run before the lookup, so it is no replay) | 400, `ik-03`, false; `input` `{}`; appended as R20 is, so `calls()` holds 11 records (`seq` 1 to 11); the kept output of row 3 is unchanged |

## Refusal rows (scenario "Refusals come first and only parseable calls to known blocks are recorded")

Fake with `strict` true; `L = /blocks/erp.lookup_vendor@1`; `J` = `content-type: application/json`; `pad(n)` is `{"vendor_name":"` plus `n - 18` letters `a` plus `"}`. "Rec" is the record the row adds (the `calls()` list below).

| # | request | status and body | Rec |
|---|---|---|---|
| R1 to R3 | `POST /blocks/nope@1`; `/blocks/__proto__`; `/blocks/toString`, body `{}` | 404 `{"error":"unknown_block","block":"nope@1"}`, `"__proto__"`, `"toString"` | |
| R4, R5 | `POST /blocks/%E0%A4%A`; `POST /blocks/` | 404 `unknown_block` with `block` `"%E0%A4%A"`; `""` | |
| R6, R7 | `POST /health`; `POST /blocks` | 404 `{"error":"not_found"}` | |
| R8 | `GET L` | 405 `{"error":"method_not_allowed"}`, `allow: POST` | |
| R9, R10 | `POST L`, `Host: other.fake.test`; `Host: tools.fake.test:443` | 421 `{"error":"misdirected_request"}` | |
| R11 | `POST L`, `Host: TOOLS.FAKE.TEST`, `{"vendor_name":"Globex"}` | 200 `V-GLOBEX` | 1 |
| R12 | `POST L`, body `{` | 400 `{"error":"invalid_json"}` | |
| R13 | `POST L`, empty body | 400 `invalid_input` `details` `[{"path":"/","keyword":"required"}]` | 2 |
| R14, R15 | `POST L`, body `[]`; `null` | 400 `invalid_input` `details` `[{"path":"/","keyword":"type"}]` | 3, 4 |
| R16 | `POST L`, `{"vendor_name":5}` | 400 `details` `[{"path":"/vendor_name","keyword":"type"}]` | 5 |
| R17 | `POST /blocks/crm.create_ticket@1`, key `k`, `{"customer_id":"C","subject":"s","priority":"urgent!","body":"b"}` | 400 `details` `[{"path":"/priority","keyword":"enum"}]` | 6 |
| R18 | `POST /blocks/calendar.find_slots@1`, `{"attendees":[1],"duration_minutes":30}` | 400 `details` `[{"path":"/attendees/0","keyword":"type"}]` | 7 |
| R19 | `POST /blocks/mail.send@1`, `{}`, no key | 400 `missing_idempotency_key` (the key check comes first) | 8 |
| R20 | `POST /blocks/mail.send@1`, `{}`, key `k` | 400 `invalid_input` `details` `[{"path":"/","keyword":"required"}]` | 9 |
| R21 | `POST L`, `pad(1048576)` | 200 `{"vendor_id":"V-AAAAAAAAAAAAAAAA","status":"active","payment_terms_days":30}` | 10 |
| R22 | `POST L`, `pad(1048577)` | 413 `{"error":"body_too_large"}` | |
| R23 | `POST /blocks/nope@1`, `pad(1048577)` | 404 `unknown_block` (the ref is checked before the size) | |

Every `invalid_input` body is `{"error":"invalid_input","block":<ref>,"details":<details>}`. After R1 to R23 `calls()` holds exactly the 10 records of the Rec column (`seq` 1 to 10, each row's ref and the status of its answer). Record 1 has `host` `tools.fake.test` and `input` `{"vendor_name":"Globex"}`; the others have `host` `127.0.0.1:<port>`; record 2 has `input` `{}` and `bodySha256` `D_EMPTY`, record 3 `[]`, record 4 `null`, record 5 `{"vendor_name":5}`; record 8 has `idempotencyKey` `null` and `input` `{}` with `bodySha256` `D_OBJ`, record 9 `k`; every record has `method` `POST` and `path` `/blocks/<ref>` as sent.

Non-strict fake (`startFakeTools({ strict: false })`): N1 `POST L` `{}` gives 200 `{"vendor_id":"V-UNKNOWN","status":"active","payment_terms_days":30}`; N2 body `[]` gives 400 `invalid_input` `[{"path":"/","keyword":"type"}]`; N3 `{"vendor_name":5}` gives 200 `{"vendor_id":"V-5","status":"active","payment_terms_days":30}`.

## Knob rows (scenario "Failure and delay knobs apply per block and are checked")

- K1: `failNext("mail.send@1", 503, 2)`; four `MAIL_A` sends with key `fk-1`, with `http.get@1` `{"url":"u"}` between the first and second. Answers 503, 200 (`{"status":200,"body":"GET u -> ok"}`), 503, 200, 200. A 503 body is `{"error":"injected_failure","status":503}` without `x-fake-tools-duplicate`; the third send answers `{"message_id":"msg-3b11d4d341"}` (dup `false`), the fourth the same (dup `true`). The `mail.send@1` records have statuses 503, 503, 200, 200 and `duplicate` false, false, false, true.
- K2: `failNext("erp.lookup_vendor@1", 500)`; body `{}` gives 500 `{"error":"injected_failure","status":500}` (before the schema check), record status 500; then `{"vendor_name":"Globex"}` gives 200.
- K3: `failNext("docs.fetch@1", 502, 5)` then `failNext("docs.fetch@1", 429)`; two `{"url":"u"}` calls give 429, then 200.
- K4: `setDelay("kb.search@1", 300)`, one `{"query":"q"}` call: 200, at least 280 ms elapsed by `performance.now()` (timer slack 20 ms; no upper bound).
- K5: `setDelay("kb.search@1", 30000)`; an unawaited `kb.search@1` call; an awaited `docs.fetch@1` call is 200; the `kb.search@1` call has not settled and its record is present (polled at 10 ms, bounded at 5000 ms); the test ends with `close()`.

Argument rows (`RangeError`, message): A1, A2 `setDelay("nope@1", 1)`, `setDelay("__proto__", 1)`: `unknown block ref: nope@1`, `unknown block ref: __proto__`; A3 to A5 `setDelay("mail.send@1", -1)`, `30001`, `1.5`: `delay must be an integer from 0 to 30000`; A6 `failNext("nope@1", 500)`: `unknown block ref: nope@1`; A7, A8 `failNext("mail.send@1", 399)`, `600`: `status must be an integer from 400 to 599`; A9, A10 `failNext("mail.send@1", 500, 0)`, `1001`: `times must be an integer from 1 to 1000`. A throwing call changes nothing.

## Egress rows (scenario "A credentialed service reaches the fake tools through the fake egress")

`startFakeEgress()`, `startFakeTools()`, `egress.addUpstream(FAKE_TOOLS_HOST, tools.origin)`, then `putCredential(egress.vaultUrl, egress.vaultAdmin, { tenantId: T_A, serviceId: S1, authScheme: 1, value: Buffer.from(K), headerName: FAKE_TOOLS_KEY_HEADER, callerActorId: "carol", targetUrl: FAKE_TOOLS_ORIGIN })` gives `grpcStatus` 0 and `keyVersion` 1. Each call takes a fresh token from `POST {brokerUrl}/v1/issue` (header `X-Mintkey-Service-Token: egress.brokerServiceToken`, body `{ agent_id: "alice", service_id, tenant_id: T_A, scope: "call", ttl_seconds: 60 }`) and goes to `{proxyUrl}/<service_id><fakeToolPath(ref)>` with `Authorization: Bearer <token>`.

| # | service, ref, extra headers, body | answer |
|---|---|---|
| C1 | `S1`, `erp.lookup_vendor@1`, `x-ursitoare-call: r_1:lookup:1`, `{"vendor_name":"Acme GmbH"}` | 200 `{"vendor_id":"V-ACME","status":"active","payment_terms_days":30}` |
| C2 | `S1`, `mail.send@1`, `x-ursitoare-call: r_1:notify:1`, `idempotency-key: ik-pro-1`, `x-fake-tools-key: forged`, `MAIL_A` | 200 `{"message_id":"msg-e2e024cf84"}`, dup `false` |
| C3 | as C2 with `x-ursitoare-call: r_1:notify:2`, no `x-fake-tools-key` | 200 the same body, dup `true` |
| C4 | `S2` (no credential), `erp.lookup_vendor@1`, `{"vendor_name":"Acme GmbH"}` | 502 `bad gateway: vault error\n` |

`tools.calls()` holds three records with `method` `POST`, `path` `/blocks/<ref>`, `host` `tools.fake.test`, `keyHeaderSeen` true, `status` 200: seq 1 `erp.lookup_vendor@1` (`effect` `read`, `callHeader` `r_1:lookup:1`, `idempotencyKey` `null`, `bodySha256` `D_ACME`, `duplicate` false), seq 2 `mail.send@1` (`send`, `r_1:notify:1`, `ik-pro-1`, `D_MAIL`, false), seq 3 `mail.send@1` (`r_1:notify:2`, `ik-pro-1`, `D_MAIL`, true), each `input` the body sent. `egress.requests()` holds three `allowed` records for S1 with `host` `tools.fake.test` and `headers["x-fake-tools-key"]` `[credential]`, then the `rejected` one of C4.

## Contract rows (scenario "The contract suite passes on the fake and fails on broken targets")

`fakeToolsContract(url, { host: FAKE_TOOLS_HOST })` returns, in order: (1) `a read answers its fixture`: lookup `Acme GmbH` is 200, `content-type` starting `application/json`, the `V-ACME` body; (2) `an unknown block is refused`: `/blocks/nope@1` is 404 `{"error":"unknown_block","block":"nope@1"}`; (3) `a foreign Host is refused`: `Host: not-tools.fake.test` is 421 `{"error":"misdirected_request"}`; (4) `an invalid input is refused with details`: `{}` to the lookup is 400 `invalid_input` with `details` `[{"path":"/","keyword":"required"}]`; (5) `an effect needs an idempotency key`: `MAIL_A` without a key is 400 `missing_idempotency_key`; (6) `an effect replays under the same key`: two sends with one fresh key give equal bodies and dup `false` then `true`; (7) `only POST is allowed`: `GET` on the lookup is 405 with `allow: POST`.

Targets: the fake (all pass); M1, a forwarding server that appends `-<n>` to every `idempotency-key` it relays (only check 6 fails, `an effect replays under the same key: ...`); M2, a forwarding server that sets `Host` to the fake's own `127.0.0.1:<port>` (only check 3 fails: `a foreign Host is refused: answered 200`); the closed port `http://127.0.0.1:1` (all fail with `<check name>: http://127.0.0.1:1 is unreachable (...)`).

## Part rows (scenario "The part registers its upstream, resets on beforeReset and closes in a crash cluster")

P1: `toolsPart.start` with an empty `handles` map rejects with an `E2eStackError`. P2: after `egressPart.start` (handle stored as `egress`), `toolsPart.start` returns `env` `{}`; after the credential of § Egress rows, C1 gives `tools.calls()` one record with `seq` 1; `toolsPart.beforeReset(ctx)` makes it `[]`; C1 again gives one record with `seq` 1; `toolsApi(new Map())` throws `E2eStackError` `STACK_PART_MISSING` with `details` `{ part: "tools" }`; `close()` twice resolves and the origin refuses connections. P3: the file text, the discovered order and the file-name order of the spec. P4: `startCrashCluster` over the discovered parts named `database`, `egress`, `tools`, with `tools` wrapped to capture `handle.api.tools.origin` (the cluster exposes no handles): the origin answers `POST /blocks/erp.lookup_vendor@1` `{"vendor_name":"x"}` with 200 while started and refuses connections after `close()`.

## README rows (scenario "The README names the fake accurately")

New row 22: ``| `fake-tools/` | `add-fake-tools` | The 20 test-catalogue blocks as loopback tool handlers (recorded calls, idempotent effects, delay and failure knobs), reached through the fake proxy as `tools.fake.test`; e2e part `50-tools` |``. New sentence (line 27): ``The files `global-setup.ts` and `e2e-stack/main.ts` began as bootstrap placeholders; `add-db-foundation` and `add-e2e-stack` replaced them.``
