# Test plan: add-audit-sink

Every value was produced by running a throwaway implementation of `design.md` in a scratch copy of main@31968a29 on embedded Postgres (route, `main` with the fake, two stacks, Cedar, version and config rows). The 400 messages are Fastify's Ajv texts.

## Test files and ids

| File | Test (name starts with) | Scenario |
|---|---|---|
| `src/config/audit-sink.test.ts` | `C-f7e5a5bd loadAuditSinkConfig enabled unset and refused`; `C-dcbe2479 the engine reads no token file` | the two engine-config scenarios |
| `src/pdp/emit-audit-catalogue.test.ts` | `C-6cc6bc38 C-6b24d8a6 the catalogue lists 26 actions and emit_audit is no capability`; `C-7e0c5960 the schema holds 26 action lines and loads`  | The 25 actions, Capability flags, One fragment per action |
| `src/audit/sink-event.test.ts` | `C-a34b3a9b mapMintkeyEvent and refusalEvent rows` | The mapping of wire events |
| `src/audit/audit-sink-policy.test.ts` | `C-3cfdcf72 only the sink principal may emit` | The fragment permits the sink principal alone |
| `src/api/audit-sink-routes.test.ts` | `C-1ecd8eed` verifier rows; `C-1a4d0235` accepted; `C-bcfb29a1` redacted; `C-2e1e590c` refused; `C-1caab7b0` schema failures (each followed by the scenario title) | the five route scenarios |
| `src/api/audit-sink-faults.test.ts` | `C-91d895cc` a failing database; `C-4cbae683` a tenant policy denial | the two fault scenarios |
| `src/main.audit-sink.test.ts` | `C-87ad9e96` roles and port; `C-e5f9dd64` events from the fake | the two listener scenarios |
| `test/support/e2e-stack/internal-part.test.ts` | `C-cf9e4239 the internal part binds the fake's tokens and turns nothing on` | Two stacks in turn |

**Changed in place** (names in `proposal.md` § Impact and tasks 1.1 and 2.1): the two `actions.test.ts` tests filter `SINK_ACTION` out of the names they collect and assert its value (red by assertion, then green with and without the action; `capable.length` stays 21); they prove the 25 Phase-1 names, and the new test of task 2.1 proves the 26th name and the fifth non-capability one; the five tests of task 2.1 read the constants below. A grep of `src`, `test`, `e2e`, `web/src` and `docs` found three more copies of `VBASE` (mocked replies, see the proposal) and no other; the `src/` and `test/support` suites were run with the change and only these seven tests went red; `test/journeys`, `web/` and `e2e/` need the web build and were not run.

## Frozen literals

The schema text gains one line, so these constants change (each value is the `policySetVersion` of an engine that has no fragment):

| File | Constant | Old | New |
|---|---|---|---|
| `src/grants/policy-runtime.test.ts`, `src/grants/policy-deploy.test.ts` | `VBASE` | `599ac6e140250949aa9104d2e02c0da35508a8ec6227aa6cd452187caf2efdd8` | `2433057edffa0f02146bff18284251d9b23a0b1005ea151bcb6bf91d55bbda64` |
| `src/grants/policy-runtime.test.ts` | `VA` | `a06b41c582ccf2e65c778e4a8964dd2f391a3aff59666018d916118044068b63` | `e276cfc292ab396ea64d315bfad4b0797339397667d86c70dabff9ef8a48df55` |
| `src/grants/policy-runtime.test.ts` | `VB` | `2a012a8532beaa8ca7ebb464290c10cbbc9ae72d3b892afb09e8b8abcde6790e` | `f1283864ef4a5aee732f00c0b216956676c5be6ad050bd3530e2805b5cdb14c0` |
| `src/grants/policy-deploy-stays.test.ts` | `VG` | `f0c722021d80c6d32d648993da56c7978a89fe0af4a5497ddd7048ff3cae2f09` | `22bd3183868a700bae617f38600042d780338e02c66534e6e50037e7378fef44` |

## Fixtures

| Name | Content |
|---|---|
| `BT`, `PT`, `BT2`, `PT2`, `XT` | 64 `b`, `c`, `d`, `e`, `x` characters; `BT` and `PT` are bound to `tenant_a` and `BT2`, `PT2` to `tenant_b` with `bindSinkTokens(db.ownerPool, ctx, { broker, proxy })` after `seedTwoTenants(db)`; `XT` is bound to none |
| `UA`, `UB` | `mintkeyTenantId("tenant_a")` = `d7f4eeba-9f57-8892-b4bb-591d220496d4`, `mintkeyTenantId("tenant_b")` = `93baa9da-a394-803d-800c-bf45c3375469` |
| clock | `fixedClock("2026-11-25T10:00:00.000Z")` for the PEP and the sink |
| `GOOD` | `{ event_type: "token.issued", tenant_id: UA, actor_type: "agent", actor_id: "agent-1", target_type: "service", target_id: "svc-1", payload: { jti: "jti_1", scope: "call", exp_ts: 1 } }` |
| `GOOD2` | `GOOD` with `event_type` `proxy.hit` and `payload` `{ jti: "jti_2", upstream_status: 200 }` |
| server | `buildInternalServer({ ..., pep: { pool, engine, clock, publicBaseUrl: "http://127.0.0.1" } })`, `engine` from `createPolicyEngine({ srcDir: defaultSrcDir(), clock: systemClock, ids: sequentialIds(), logger })` (plus the deny scenario's tenant policy), then `installAuditSink(internal, { pool, clock, mintkeyTenantId })`; requests by `internal.inject` |
| `pool` | a wrapper over `db.appPool` that counts `connect` calls per request and rejects from the Nth call on when told to |
| logger | `createLogger({ level: "warn", destination })` collecting lines |
| rows | `listAuditEvents(db.appPool, ctx, { order: "asc", limit: 200 })`; decisions through `withTenantTx(db.appPool, ctx, tx => tx.query("SELECT principal, decision, reasons FROM ursitoare.policy_decision ORDER BY decision_id"))` (row-level security) |

Connect counts of one request: `BT` 3 (lookup, decision, append), `PT` 4, `XT` 2, a malformed header 0. A fresh engine's decision ids are `dec_00000000-0000-7000-8000-00000000000<n>` from `n` 0.

## Config

`loadConfig(env, reader)` with a reader that records its calls and throws; `DB` is `URSITOARE_DATABASE_URL` `postgres://ursitoare_app@db.internal:5432/ursitoare`:

| Row | Env | Result |
|---|---|---|
| A1, A2 | `{}`; `{ URSITOARE_AUDIT_SINK: "" }` | no `auditSink` key |
| A3 | the sink `enabled` and `DB` | `auditSink` equal to `{ enabled: true }` |
| A4 | the sink `Enabled`, `true`, `1`, `disabled`, ` enabled`, each with `DB` | `CONFIG_INVALID`, `URSITOARE_AUDIT_SINK: must be enabled or unset` |
| A5, A5b | the sink `enabled` without `DB`; the sink `yes` without `DB` | `…: requires URSITOARE_DATABASE_URL`; `…: must be enabled or unset` |
| A6 | A3 plus `URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE` `/nonexistent/broker` and `…_PROXY_TOKEN_FILE` `/nonexistent/proxy` | loads, no reader call |
| A7 | A3 plus `URSITOARE_AUDIT_SINK_BROKER_TOKEN` `abc123` | `CONFIG_INVALID` on that variable |

## Mapping

`mapMintkeyEvent(body, emitter, UA)` where `B` is `GOOD` (payload `{ scope: "call", jti: "jti_1", exp_ts: 1 }`); an `ok` result is `{ ok: true, event }` and the `event` is shown by its differences from M1:

| Row | Input | Result |
|---|---|---|
| M1 | `B`, broker | `event` `{ eventType: "token.issued", actor: { kind: "service", id: "agent-1" }, payload: { scope: "call", jti: "jti_1", exp_ts: 1, emitter: "broker", mintkey_actor_type: "agent" }, origin: "mintkey", target: { kind: "service", id: "svc-1" }, mk: { jti: "jti_1" } }` |
| M2, M3 | `proxy.hit` payload `{ jti: "jti_2", upstream_status: 200, outcome: "allowed" }`; `proxy.error` payload `{ jti: "jti_3", upstream_status: 502 }`, proxy | M1's shape with that type, `emitter` `proxy`, `mk.jti` `jti_2` and `jti_3` |
| M4 | `proxy.aud_mismatch_rejected`, `target_id` `""`, payload `{ jti: "jti_4", aud: "s1", url_service_id: "", mode: "strict" }` | ok, no `target`, `mk.jti` `jti_4` |
| M5 | `budget.exceeded`, `actor_type` `system`, no `actor_id`, no target, payload `{ limit: 5 }`, broker | ok, actor `mintkey-broker`, payload `{ limit: 5, emitter: "broker", mintkey_actor_type: "system" }`, no `target`, no `mk` |
| M6 | `B` with `tenant_id` `UA` in upper case | the same event as M1 |
| M7 | `B` with `tenant_id` `UB` | `{ ok: false, reason: "tenant_mismatch" }` |
| M8 | `event_type` `Token.Issued` | `{ ok: false, reason: "event_type" }` |
| M9, M10 | payload `{ api_key: "x" }`; `{ a: [{ password: 1 }] }` | ok, payload `{ redacted_keys: ["api_key"], emitter: "broker", mintkey_actor_type: "agent" }`; `{ a: [{}], redacted_keys: ["password"], emitter: "broker", mintkey_actor_type: "agent" }`, no `mk` |
| M20 | payload `{ token_ttl: 600, jti: "jti_1", nested: { client_secret: "s", ok: 1 } }` | ok, payload `{ jti: "jti_1", nested: { ok: 1 }, redacted_keys: ["client_secret", "token_ttl"], emitter: "broker", mintkey_actor_type: "agent" }`, `mk.jti` `jti_1` |
| M21 | proxy, payload `{ access_token: "t", list: [{ password: 1, n: 2 }, 3], client_secret: "s", api_key: "k", access_token2: "x" }` | ok, payload `{ list: [{ n: 2 }, 3], redacted_keys: ["access_token", "access_token2", "api_key", "client_secret", "password"], emitter: "proxy", mintkey_actor_type: "agent" }` |
| M22 | payload `{ v: 1 }` wrapped in 66 levels of `{ a: … }` | `{ ok: false, reason: "payload" }` |
| M23 | payload `{ Authorization: "Bearer x", cookie: "a=b", session_id: "s", private_key: "k", user_agent: "u" }` | ok, payload `{ user_agent: "u", redacted_keys: ["Authorization", "cookie", "private_key", "session_id"], emitter: "broker", mintkey_actor_type: "agent" }` |
| M11 to M13 | payload `jti` `"a b"`; 201 `j` characters; `5` | ok, the payload keeps it, no `mk` |
| M14 | payload `{ emitter: "x", mintkey_actor_type: "y", k: 1 }`, proxy | payload `{ emitter: "proxy", mintkey_actor_type: "agent", k: 1 }`, no `mk` |
| M15 | `target_type` `Service` | ok, no `target` |
| M16, M17 | `actor_id` `a` U+0001 `b`, proxy; `actor_id` of 201 `a`, broker | actor `mintkey-proxy`; `mintkey-broker` |
| M18, M19 | payload `{ n: "a" NUL "b" }`; `{ n: ` 33,000 `x }` | `{ ok: false, reason: "payload" }` |
| F1 | `refusalEvent("proxy", "payload", "proxy.hit")` | `{ eventType: "audit.sink_refused", actor: { kind: "service", id: "mintkey-proxy" }, payload: { reason: "payload", emitter: "proxy", event_type: "proxy.hit" } }` |
| F2, F3 | `refusalEvent("broker", "event_type", "Bad Type")`; `refusalEvent("broker", "tenant_mismatch", 5)` | the same with payload `{ reason: "event_type", emitter: "broker" }`; `{ reason: "tenant_mismatch", emitter: "broker" }` |

## Accepted rows

Sent with `BT` after `GOOD` and `GOOD2`:

| Row | Body | Row written (seq) |
|---|---|---|
| N1 | `GOOD` with `payload` `null` | 3: actor `agent-1`, the target, payload `{ emitter: "broker", mintkey_actor_type: "agent" }`, `mk` `{ traceId: null, requestId: null, jti: null }` |
| N2 | only `event_type`, `tenant_id`, `actor_type` | 4: actor `mintkey-broker`, target `null`, the same payload and `mk` |
| N3 | `GOOD` with `actor_id`, `target_id`, `target_type` `null` | 5: actor `mintkey-broker`, target `null`, the payload of `GOOD` plus `emitter` and `mintkey_actor_type`, `mk.jti` `jti_1` |

## Refused rows

| Row | Token, body | Reason |
|---|---|---|
| X1 | `BT`, `GOOD` with `tenant_id` `UB` | `tenant_mismatch` |
| X2 | `BT2`, `GOOD` (naming `UA`) | `tenant_mismatch` |
| X3, X4 | `BT`, `GOOD` with `event_type` `Token.Issued`; with `7` (Fastify's validator coerces it to `"7"`, which fails the pattern) | `event_type` |
| X5, X6 | `BT`, `GOOD` with `payload` `{ n: "a" NUL "b" }`; the raw JSON text with `"\ud800"` as a payload string | `payload` |
| X7, X8 | `BT`, `GOOD` with a payload nested 70 levels; a payload string of 40,000 `x` | `payload` |

## Schema failures

`BT` as the header; the 400 body is `{"error":{"code":"VALIDATION_FAILED","message":"Request validation failed","details":{"fields":[…]}}}`:

| Row | Body | `fields` or status |
|---|---|---|
| S1 | `{ tenant_id: UA, actor_type: "agent", payload: {} }` | `[{ field: "body/event_type", message: "must have required property 'event_type'" }]` |
| S2 | `GOOD` with `payload` `"text"` | `[{ field: "body/payload", message: "must be object,null" }]` |
| S3 | `GOOD` with `event_type` `{}` | `[{ field: "body/event_type", message: "must be string" }]` |
| S4 | `GOOD` with `event_type` `""` | `[{ field: "body/event_type", message: "must NOT have fewer than 1 characters" }]` |
| S5 | `GOOD` with `tenant_id` of 65 `t` characters | `[{ field: "body/tenant_id", message: "must NOT have more than 64 characters" }]` |
| S6 | the text `{not json` | `[{ field: "body", message: "malformed JSON" }]` |
| S7 | the text `[]` | `[{ field: "body", message: "must be object" }]` |
| S8 | `GOOD` with a payload string of 1,100,000 characters | 413 `{"error":{"code":"PAYLOAD_TOO_LARGE","message":"Payload too large"}}` |

## Fragment

The file `src/audit/policy/audit-sink.cedar` is exactly these three lines, each ended by a newline:

```
@id("audit-sink-emit-audit")
permit (principal in Role::"mintkey:sink", action == Action::"emit_audit", resource)
when { principal.kind == "service" };
```

An engine over `defaultSrcDir()`; `emit_audit` on `Tenant::"tenant_a"`; principals `{ tenantId: "tenant_a", userId, kind, roles, teams: [] }` through `userEntity`:

| Principal | Result |
|---|---|
| `mintkey-broker` and `mintkey-proxy`, `service`, roles `["mintkey:sink"]` | `allow`, reasons `["audit-sink-emit-audit"]`, errors `[]` |
| the same against `Tenant::"tenant_b"` | `deny`, reasons `["platform-cross-tenant-forbid"]` |
| `svc-1`, `service`, roles `["tenant_admin","author","approver","auditor"]`; `svc-1` with `[]`; `alice`, `human`, `["mintkey:sink"]`; `svc-1`, `service`, `["mintkey_sink"]` | `deny`, reasons `[]`, errors `[]` |
| the sink principal for `read_audit`; for `manage_tenant`; for `read_self` | `deny`; `deny`; `allow` with `["platform-read-self"]` |

The engine's `actions.length` is 26.

## Main

`main` with an injected config (`host` `127.0.0.1`, `port` 0, `logLevel` `silent`, `database` from the test database's endpoints, `internalPort` from `freePort()`), `signals` `new EventEmitter()` and a recording `inspectServers`, as in `src/main.credentials.test.ts`:

| Row | Config | Recorded route list, internal port |
|---|---|---|
| R1 | `api`, `auditSink` `{ enabled: true }` | the one route of the spec; connects, then `ECONNREFUSED` after `close()` |
| R2, R3 | `sandbox`; `worker`, each with the sink | `[]`; `ECONNREFUSED` |
| R4 | `api` without the sink | `[]`; `ECONNREFUSED` |
| R5 | `api` with the sink and `database` `{ app: null, owner: null }` | `[]`; `ECONNREFUSED`; `main` resolves |
| R6 | R1 again after R1 closed, in the same process | the list of R1 |

For the fake scenario the issue body is `{ agent_id: "ursitoare-engine", service_id: "11111111-1111-4111-8111-111111111111", tenant_id: UA, scope: "call" }` with the header `x-mintkey-service-token`; the proxy call is `GET <proxyUrl>/22222222-2222-4222-8222-222222222222/x` with `authorization: Bearer <token>`. `jti` matches `^jti_[A-Z0-9]{26}$` and `exp_ts` is an integer; `at` is the real clock and not asserted.

## STACK-ONLY

| Criterion | Step | Asserts |
|---|---|---|
| The real broker and proxy deliver their events to the engine's internal port (header, body, token, tenant UUID) and the engine accepts or refuses them as the specs say | `scripts/stack-e2e.d/60-conformance.sh` (`pytest e2e -m stack`, U61c): `e2e/test_stack_conformance.py::test_mintkey_events_reach_the_sink`, with `test/support/stack/sink-probe.ts` | after the probe, within 30 s `GET /api/v1/audit?event_type=token.issued` holds one row with `origin` `mintkey` in the signed-in tenant and `GET /api/v1/audit?event_type=audit.sink_refused` one row with reason `tenant_mismatch` |

This row is in no task's criteria and no spec. U61c's test also asserts one real proxy event (`proxy.hit` or `proxy.error`, same tenant, `origin` `mintkey`, 30 s; coordinator ruling Q2); that belongs to U61c's plan.
