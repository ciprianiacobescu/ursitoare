# M6 REPORT: Cedar policy spike

Status: **done**. Date: 2026-10-24. Cedar via `@cedar-policy/cedar-wasm` **4.14.0** (Cedar core 4.14.0, language 4.6), Node v26.8.1.

## 1. Verdict (D3 input, for the orchestrator to apply)

D3 (pre-registered): "Cedar is adopted if all policy scenarios pass and p99 in-process authorization latency is < 1 ms after warm-up."

| D3 clause | Result | Label |
|---|---|---|
| All policy scenarios pass | **88 of 88** pass (decision and deciding policy), plus 8 of 8 malformed policies rejected, 31 of 31 policies load-bearing (mutation check), strict validation clean | verified (section 3) |
| p99 < 1 ms with the request-relevant entity slice (about 4 entities per call, 31 policies) | **PASS** in both runs: p99 0.31 ms (run 2) and 0.36 ms (run 1) through `check()`; worst single round 0.43 ms (run 1). Headroom about 3x | verified (section 5.3) |
| p99 < 1 ms with the whole directory passed on every call (72 entities) | **Not reliably met; on the line.** p99 0.97 to 1.39 ms over the two full runs (run 1: 1.32 to 1.39 ms; run 2: 0.97 ms for V1 without schema, 1.04 to 1.30 ms for the typed V2/V3). p50 0.79 to 1.01 ms | verified (section 5.3) |
| p99 < 1 ms with a 50-entity call (the brief's "about 50 entities") | **Not met**: 1.28 ms (run 1) and 1.07 ms (run 2). These two figures come from the entity-scaling run (one request, 5,000 calls, one round), not from the 79-request mix of the table above | verified (section 5.4) |

How to read this: the Wasm API takes the entity set as a JS array on **every** call (only the policy set and the schema can be preparsed), and cost is dominated by entity count at about 16 to 17 microseconds per entity. The `< 1 ms` bound is met with a wide margin if the policy enforcement point (PEP) passes just the entities a request touches (principal, node, flow, tool, about 4 to 6). The engine has to build those entities per request anyway, because `Flow.version` and `Flow.reviewed` are per-version facts. The budget is roughly 30 to 45 entities per call, depending on host noise (24 entities: p99 0.79 ms in run 1, 0.62 ms in run 2).
Whether D3 is satisfied depends on which row you take as "the realistic set". I report all and make no choice for you. My recommendation is **adopt with the slicing contract written into the hook spec**. Fallback if slicing is rejected: OPA/Rego sidecar or hand-written checks, per D3.

Run-to-run spread (verified): the two full benchmark runs differ by 15 to 25% on the full-store figures and 10% on the sliced ones. Both ran on a busy shared host, not in a quiet window (section 5.1). That spread is the reason the full-store row cannot be called either a clear pass or a clear fail.

## 2. What was built (all under `policy-cedar/`)

* `schema/ursitoare.cedarschema`: generated from the catalogue (`npm run gen-schema`; a test fails on drift). Entities `User` (roles, team, parents = Role), `Role`, `Flow` (owner_team, version, reviewed), `Node` (flow, kind), `Tool` (effect); actions `invoke_tool`, `invoke_llm`, `approve_task`, `activate_flow`, `edit_flow`, plus `start_run` (an addition, see section 8). Context fields as requested (`args`, `taint`, `run_initiator`, `approvals`, `flow_capabilities`) plus `approvers_by_role` (section 7.1) and `tool` for `invoke_tool`.
* `policies/*.cedar`: 31 policies (18 org-wide, 3 for `invoice-intake`, 6 for a synthetic `support-triage`, 4 for a synthetic `sales-followup`; the synthetic flows give the set realistic volume and exercise more constructs).
* `src/engine.ts`: `PolicyEngine.check()` is the `policy.check(...)` hook. It builds the entity slice and context, calls the evaluator, and fails closed.
* `src/extractor.ts`: the static extractor. `src/extract-cli.ts` runs it on RF-1.
* 88 scenarios, 8 malformed policies, 117 tests, a benchmark, a bundle-size script. About 1,665 lines in total (src 1,204 + tests 257 + policies 204, counted with `wc -l`).
* The mapping of format-v0 concepts onto Cedar is in `README.md`.

## 3. Policies and scenarios

### 3.1 Strict validation (real output: `results/validate.txt`)

```
cedar-wasm npm 4.14.0; cedar lang 4.6; SDK 4.14.0; core 4.14.0
schema parse: success
real policy set: 31 policies, strict validation ok=true, validationErrors=0, warnings=0
```

Deliberately malformed policies, each rejected (excerpt):

```
M2 [validate] type error: Set<String> compared with String
    -> VALIDATION ERROR: the types String and Set<String> are not compatible
M3 [validate] undeclared attribute on the principal (roless)
    -> VALIDATION ERROR: attribute `roless` on entity type `User` not found
M4 [validate] optional attribute accessed without a `has` guard (args.amount)
    -> VALIDATION ERROR: unable to guarantee safety of access to optional attribute `args.amount` in context for Action::"invoke_tool"
M5 [validate] decimal compared with an integer literal using `>` (Cedar `>` is Long-only)
    -> VALIDATION ERROR: unexpected type: expected Long but saw decimal
M7 [validate] action does not apply to the resource type (activate_flow on a Node)
    -> VALIDATION WARNING (gate fails on warnings): unable to find an applicable action given the policy scope constraints
8/8 malformed policies rejected
```

M1 (syntax error) fails at parse; M6 (a context attribute that does not exist for the action) and M8 (unknown action) fail validation. The Wasm API exposes only `mode: "strict"`, which is what runs. **M7 is only a warning in Cedar**, not an error ("impossible policy"). The deploy gate must therefore fail on warnings as well; `validatePolicies()` does.

### 3.2 Scenario results (88 scenarios; real output: `results/scenarios.md`, `results/test-output.txt`)

Per-group results: A 10/10, B 14/14, C 6/6, D 15/15, E 5/5, F 8/8, G 30/30. Covered, as asked: per-step allowlist (A, G22, G25), argument constraints with amount, currency, separation of duties, URLs, refunds (B, G8 to G17, G26 to G30), taint (C, G23), role gating (D), activation-time lethal trifecta (E), LLM calls (F), default deny and forbid-overrides-permit (G, D4, C2, B7). "Deciding policy" is what Cedar reported as the determining policy; for `default_deny` no policy matched.

| ID | Group | Scenario | Expected | Actual | Deciding policy / reason | OK |
|---|---|---|---|---|---|---|
| A01 | step-allowlist | alice, node pay, erp.create_payment 2450 EUR, taint extracted | allow | allow | `permit:inv-pay-step` | yes |
| A02 | step-allowlist | same principal, node notify_rejection calls erp.create_payment | deny | deny | `default_deny` | yes |
| A03 | step-allowlist | same principal, llm.extract node calls erp.create_payment | deny | deny | `default_deny` | yes |
| A04 | step-allowlist | agent node (invoice-intake/triage_agent) calls erp.create_payment | deny | deny | `forbid:org-forbid-agent-consequential` | yes |
| A05 | step-allowlist | other flow (support-triage/refund) calls erp.create_payment | deny | deny | `default_deny` | yes |
| A06 | step-allowlist | ops-admin has no bypass: node archive calls erp.create_payment | deny | deny | `default_deny` | yes |
| A07 | step-allowlist | right node, wrong tool: node pay calls mail.send | deny | deny | `default_deny` | yes |
| A08 | step-allowlist | node notify_rejection mail.send to ap@example.com | allow | allow | `permit:inv-notify-step` | yes |
| A09 | step-allowlist | node notify_rejection mail.send to attacker@evil.test (arg constraint) | deny | deny | `default_deny` | yes |
| A10 | step-allowlist | node fetch_invoice reads invoices.get (read tools allowed anywhere) | allow | allow | `permit:org-read-tools` | yes |
| B01 | args | amount exactly 10000.00, no approvals (boundary: not > 10000) | allow | allow | `permit:inv-pay-step` | yes |
| B02 | args | amount 10000.01, no approvals | deny | deny | `forbid:org-payment-large-needs-sod` | yes |
| B03 | args | amount 20000, approved by bob (finance-approver != initiator alice) | allow | allow | `permit:inv-pay-step` | yes |
| B04 | args | amount 20000, only approver is the initiator (separation of duties) | deny | deny | `forbid:org-payment-large-needs-sod,org-payment-no-self-approval-record` | yes |
| B05 | args | amount 20000, no approvals at all | deny | deny | `forbid:org-payment-large-needs-sod` | yes |
| B06 | args | amount 20000, approval recorded under role finance-clerk only | deny | deny | `forbid:org-payment-large-needs-sod` | yes |
| B07 | args | amount 20000, approvals {initiator, bob} (defence-in-depth record rule) | deny | deny | `forbid:org-payment-no-self-approval-record` | yes |
| B08 | args | amount 20000, two approvers bob + carol | allow | allow | `permit:inv-pay-step` | yes |
| B09 | args | currency GBP | deny | deny | `forbid:org-payment-args` | yes |
| B10 | args | currency USD | allow | allow | `permit:inv-pay-step` | yes |
| B11 | args | currency 'usd' (lower case; policy is case-sensitive) | deny | deny | `forbid:org-payment-args` | yes |
| B12 | args | amount missing (required arg absent: fail closed) | deny | deny | `forbid:org-payment-args` | yes |
| B13 | args | amount 0.1+0.2 (more than 4 decimals: PEP refuses to round) | deny | deny | `request_error:decimal_precision:0.30000000000000004 needs more than 4 fractional digits` | yes |
| B14 | args | undeclared argument key (foo) on a catalogue tool | deny | deny | `request_error:unknown_arg:erp.create_payment@1.foo` | yes |
| C01 | taint | taint {untrusted}, mail.send at notify_rejection | deny | deny | `forbid:org-forbid-untrusted-egress` | yes |
| C02 | taint | taint {untrusted}, erp.create_payment 2450 EUR at pay | deny | deny | `forbid:org-forbid-untrusted-egress` | yes |
| C03 | taint | taint {untrusted}, read tool invoices.get | allow | allow | `permit:org-read-tools` | yes |
| C04 | taint | taint {extracted}, mail.send at notify_rejection | allow | allow | `permit:inv-notify-step` | yes |
| C05 | taint | taint {untrusted, extracted}, mail.send | deny | deny | `forbid:org-forbid-untrusted-egress` | yes |
| C06 | taint | taint {untrusted}, write tool crm.create_ticket (write is NOT covered by the rule) | allow | allow | `permit:sup-open-ticket-step` | yes |
| D01 | roles | finance-clerk start_run invoice-intake | allow | allow | `permit:org-start-run` | yes |
| D02 | roles | finance-clerk approve_task (run started by someone else) | deny | deny | `default_deny` | yes |
| D03 | roles | finance-approver bob approve_task (run started by alice) | allow | allow | `permit:org-approve-finance` | yes |
| D04 | roles | finance-approver bob approves his own run (forbid overrides permit) | deny | deny | `forbid:org-no-self-approval` | yes |
| D05 | roles | ops-admin activate_flow sales-followup (no trifecta) | allow | allow | `permit:org-activate-flow` | yes |
| D06 | roles | finance-clerk activate_flow | deny | deny | `default_deny` | yes |
| D07 | roles | user with no roles start_run | deny | deny | `default_deny` | yes |
| D08 | roles | approver role but wrong team (kim, support) approves finance flow | deny | deny | `default_deny` | yes |
| D09 | roles | sales-rep start_run on finance flow | deny | deny | `default_deny` | yes |
| D10 | roles | ops-admin edit_flow | allow | allow | `permit:org-edit-admin` | yes |
| D11 | roles | finance-clerk edit_flow (own team, but not a lead) | deny | deny | `default_deny` | yes |
| D12 | roles | finance-approver edit_flow in own team | allow | allow | `permit:org-edit-team-lead` | yes |
| D13 | roles | support-lead edit_flow on a finance flow | deny | deny | `default_deny` | yes |
| E01 | trifecta | ops-admin activates RF-1 shape (untrusted+private+send/pay), unreviewed | deny | deny | `forbid:org-trifecta-needs-review` | yes |
| E02 | trifecta | same, Flow.reviewed == true | allow | allow | `permit:org-activate-flow` | yes |
| E03 | trifecta | untrusted + private, no send/pay, unreviewed | allow | allow | `permit:org-activate-flow` | yes |
| E04 | trifecta | untrusted + send/pay, no private, unreviewed | allow | allow | `permit:org-activate-flow` | yes |
| E05 | trifecta | non-admin bob activates reviewed trifecta flow | deny | deny | `default_deny` | yes |
| F01 | llm | alice invoke_llm (profile default) on llm.decide node | allow | allow | `permit:org-llm-default-profiles` | yes |
| F02 | llm | alice (finance-clerk) asks for profile 'careful' | deny | deny | `default_deny` | yes |
| F03 | llm | bob (finance-approver) asks for profile 'careful' | allow | allow | `permit:org-llm-careful-profile` | yes |
| F04 | llm | llm.extract node call carries tools (defence in depth), even for bob | deny | deny | `forbid:org-llm-no-tools-on-structured-nodes` | yes |
| F05 | llm | agent node call carries tools | allow | allow | `permit:org-llm-default-profiles` | yes |
| F06 | llm | llm.extract node call with empty tools set (key present) | deny | deny | `forbid:org-llm-no-tools-on-structured-nodes` | yes |
| F07 | llm | alice asks for unknown profile 'exotic' | deny | deny | `default_deny` | yes |
| F08 | llm | no model_profile in args (engine default) | allow | allow | `permit:org-llm-default-profiles` | yes |
| G01 | default-deny | user without roles reads invoices.get | deny | deny | `default_deny` | yes |
| G02 | default-deny | tool unknown to the catalogue | deny | deny | `request_error:unknown_tool:nope.nothing@1` | yes |
| G03 | default-deny | unknown principal | deny | deny | `request_error:unknown_user:mallory` | yes |
| G04 | default-deny | hook claims kind=llm.extract for node pay (kind mismatch with directory) | deny | deny | `request_error:kind_mismatch:llm.extract!=block` | yes |
| G05 | default-deny | hook claims flow_version 9.9.9 (mismatch with directory 1.0.0) | deny | deny | `request_error:version_mismatch:9.9.9!=1.0.0` | yes |
| G06 | default-deny | flow_version matches (1.0.0) and kind matches (block) | allow | allow | `permit:inv-pay-step` | yes |
| G07 | forbid-overrides | http.post in sales-followup (forbid) by the owning sales-rep | deny | deny | `forbid:sales-no-http-post` | yes |
| G08 | args | http.get to https://docs.example.com/a (egress allowlist) | allow | allow | `permit:org-read-tools` | yes |
| G09 | args | http.get to https://evil.test/ (read effect, but URL not allowlisted) | deny | deny | `forbid:org-http-url-allowlist` | yes |
| G10 | args | slack.post_message to #sales-eu by sales-rep | allow | allow | `permit:sales-slack-step` | yes |
| G11 | args | slack.post_message to #general (like-pattern constraint) | deny | deny | `default_deny` | yes |
| G12 | args | support-agent refund 80.00 (cap 100) | allow | allow | `permit:sup-refund-step` | yes |
| G13 | args | support-agent refund 150.00 | deny | deny | `default_deny` | yes |
| G14 | args | support-lead refund 800.00 (cap 1000) | allow | allow | `permit:sup-refund-step` | yes |
| G15 | args | support-lead refund 1500.00 (hard cap forbid) | deny | deny | `forbid:sup-refund-hard-cap` | yes |
| G16 | args | support-agent opens an urgent ticket (lead-only) | deny | deny | `forbid:sup-ticket-urgent-lead-only` | yes |
| G17 | args | support-lead opens an urgent ticket | allow | allow | `permit:sup-open-ticket-step` | yes |
| G18 | args | support-agent closes a ticket at close_ticket (crm.update_ticket) | allow | allow | `permit:sup-close-ticket-step` | yes |
| G19 | args | sales-rep appends a sheet row at log_row | allow | allow | `permit:sales-log-row-step` | yes |
| G20 | args | sales-rep books a meeting at book_meeting | allow | allow | `permit:sales-calendar-step` | yes |
| G21 | args | sales-rep books a meeting from the wrong node (log_row) | deny | deny | `default_deny` | yes |
| D14 | roles | support-lead approves a support-owned approval node (run started by erin) | allow | allow | `permit:org-approve-support` | yes |
| D15 | roles | finance-approver bob approves a support-owned approval node | deny | deny | `default_deny` | yes |
| G22 | step-allowlist | delegate node archive calls n8n:archive-invoice (assumed effect send, clean taint) | allow | allow | `permit:inv-archive-step` | yes |
| G23 | taint | delegate node archive with taint {untrusted} (delegate is egress) | deny | deny | `forbid:org-forbid-untrusted-egress` | yes |
| G24 | args | support-agent sends a reply at send_reply (mail.send) | allow | allow | `permit:sup-send-reply-step` | yes |
| G25 | step-allowlist | support-agent sends mail from the wrong node (draft_reply) | deny | deny | `default_deny` | yes |
| G26 | args | http.get URL that smuggles the allowed domain into the path (https://evil.test/.example.com/x) | deny | deny | `forbid:org-http-url-allowlist` | yes |
| G27 | args | http.get URL with userinfo trick (https://docs.example.com@evil.test/) | deny | deny | `forbid:org-http-url-allowlist` | yes |
| G28 | args | http.get plain http:// to an allowed host | deny | deny | `forbid:org-http-url-allowlist` | yes |
| G29 | args | http.get https://example.com/a?x=1 (apex host, with query) | allow | allow | `permit:org-read-tools` | yes |
| G30 | default-deny | http.get with an unparseable URL (PEP refuses) | deny | deny | `request_error:Invalid URL` | yes |

88/88 scenarios match expectation (decision and deciding policy)

`npm test` result (full output in `results/test-output.txt`): `tests 117, pass 117, fail 0`. The 117 are: 90 in `scenarios.test.ts` (88 scenarios + 2 table checks), 12 in `validation.test.ts` (schema drift, schema parse, real set clean, 8 malformed, strict-mode call), 1 mutation check, 7 extractor tests, 7 limitation tests.

**Mutation check (verified).** For each of the 31 policies, the test removes it and re-runs all 88 scenarios; at least one decision or deciding policy must change. At first it reported 6 allow-policies that no scenario depended on (`sup-close-ticket-step`, `sales-log-row-step`, `sales-calendar-step`, `org-approve-support`, `inv-archive-step`, `sup-send-reply-step`); I added scenarios G18 to G25, D14 and D15 until it passed (the scenario count then was 83; G26 to G30 were added later for the URL finding). So every policy is exercised by at least one scenario.

### 3.3 Static extractor and RF-1 activation (real output: `results/extract-rf1.txt`)

```
activation context (flow_capabilities): {"reads_untrusted":true,"reads_private":true,"has_send_or_pay":true}
evidence: reads_untrusted: fetch_invoice:invoices.get@1, archive:n8n:archive-invoice
          reads_private:   fetch_invoice:invoices.get@1, lookup_vendor:erp.lookup_vendor@1
          has_send_or_pay: pay:erp.create_payment@1, archive:n8n:archive-invoice, notify_rejection:mail.send@1

activation decisions:
  principal=dave   Flow.reviewed=false -> DENY  forbid:org-trifecta-needs-review
  principal=dave   Flow.reviewed=true  -> ALLOW permit:org-activate-flow
  principal=alice  Flow.reviewed=true  -> DENY  default_deny
```

RF-1 as written is a lethal-trifecta flow (design 4.4 treats this as a validator *warning*). With this policy set an `ops-admin` cannot activate it until `Flow.reviewed == true`.

The extractor also emits the per-node expected requests. Replaying all 8 of them with INV-1001 values (2450 EUR, initiator alice) through the real policies gives 8 of 8 allow, e.g. `pay -> permit:inv-pay-step`, `notify_rejection -> permit:inv-notify-step`, `approval -> permit:org-approve-finance`. Static taint at `pay` is `[extracted]` (the value passed through `llm.extract` and `code`), so the taint forbid does not fire, which matches design 4.4. A unit test shows that a raw `invoices.get.raw_text` flowing into `mail.send` is labelled `untrusted` by the extractor and denied by Cedar, while the same value via `llm.extract` is `extracted` and allowed.

## 4. Policy hook behaviour that matters for the engine (all verified by tests)

* Decision log entry = `Decision {decision, reason, determining[], errors[], unconstrained_args?}`.
* Fail closed: unknown user/flow/node/tool, an argument key not in the catalogue, `kind` or `flow_version` disagreeing with the directory, a number with more than 4 decimals, or any Cedar evaluation error all give `deny`.
* The directory is the source of truth for node kind and flow version/reviewed. A caller cannot claim `kind: "block"` for an LLM node (scenarios G04, G05).

## 5. Latency (real output: `results/bench-output.txt` = run 2, `results/bench-output-run1.txt` = run 1, `results/bench.json` = run 2; sanity: `results/bench-sanity.txt`)

### 5.1 Machine context (verified)

Apple M4 Max, 16 cores, 128 GiB, macOS (Darwin 25.6.0, arm64), Node v26.8.1, run in-process (no Docker). **Not a quiet window**: 59 login sessions and other milestone work running at the same time. Load average (1, 5, 15 min) at the start of run 1: 8.9 / 11.7 / 22.3; at the start of run 2: 8.6 / 9.6 / 13.8. During the last part of run 2 (the 5,004-entity and policy-count scaling rows) the host load average spiked to about 400, so those rows of run 2 are contaminated and run 1 is used for them (section 5.4). Timing uses `process.hrtime.bigint()` around each call. Per variant: 3 rounds x 10,000 calls (V0: 3 x 2,000 because it is slow), 2,000 warm-up calls before round 1 and 200 before each later round. Reported: the round with the median p99, and the p99 range across rounds. `max` is the maximum over all rounds and includes GC and scheduler outliers.

Run 1 was taken before I hardened the HTTP allowlist (derived `url_host`, scenarios G26 to G30) and used 75 mix requests; run 2 is the final code and uses 79. The policy count (31) is the same.

The request mix is the scenario requests that reach the evaluator (run 2: 79, of which 34 allow and 45 deny; 7 more are rejected by the PEP before any Wasm call), rotated round-robin. `bench:sanity` shows that every benchmarked call is a real evaluation with the expected decision (0 Wasm failures, 0 evaluation errors, 0 mismatches in 5 configurations), so the numbers are not flattered by fast-failing requests.

Policy set: 31 policies. Full entity store: 72 entities (Role 6, User 10, Flow 4, Node 29, Tool 23). Sliced: about 4 entities per call on average (principal, node, flow, tool, plus run initiator when different).

### 5.2 Wasm init and parse times (run 2; run 1 within 10%)

| Item | Result |
|---|---|
| Wasm module load (`require` of the `nodejs` build, fresh process, n=7) | median **4.5 ms** (range 4.1 to 4.7; run 1: 4.6); RSS +11.7 MB |
| First `isAuthorized` call in that process (text policy, cold) | median 17.6 ms (run 1: 18.8) |
| `preparsePolicySet` (31 policies, once at start) | p50 1.69 ms, p95 1.85 ms |
| `checkParsePolicySet` (31 policies, text only) | p50 0.49 ms |
| `preparseSchema` | p50 1.80 ms |
| `validate` strict, 31 policies vs schema (deploy/CI time) | p50 4.26 ms, p95 4.53 ms |

### 5.3 Authorization latency, 10,000 calls after warm-up, per variant

"Wasm only" = `statefulIsAuthorized`/`isAuthorized` on a prebuilt request. "check()" = the whole PEP path (build entity slice and context, Wasm call, interpret). All times are per call. The last column repeats run 1 (p50 / p99) for comparison.

| Variant | Entities/call | Path | p50 | p95 | p99 | max | p99 range over rounds | Run 1 p50 / p99 |
|---|---|---|---|---|---|---|---|---|
| V0 `isAuthorized`, policies re-parsed each call, no schema | 72 | Wasm only | 2.44 ms | 2.67 ms | 2.76 ms | 4.80 ms | 2.74 ms to 2.85 ms | 3.41 ms / 4.18 ms |
| V0 | 72 | check() | 2.41 ms | 2.60 ms | 2.70 ms | 4.97 ms | 2.70 ms to 2.72 ms | 3.16 ms / 3.91 ms |
| V1 stateful (preparsed set), full store, no schema | 72 | Wasm only | 792 us | 893 us | 974 us | 3.85 ms | 954 us to 985 us | 943.1 us / 1.34 ms |
| V1 | 72 | check() | 797 us | 911 us | 978 us | 2.79 ms | 954 us to 990 us | 998.9 us / 1.34 ms |
| V2 stateful + schema parse, full store | 72 | Wasm only | 828 us | 967 us | 1.30 ms | 6.22 ms | 1.21 ms to 1.39 ms | 1.00 ms / 1.37 ms |
| V2 | 72 | check() | 836 us | 976 us | 1.04 ms | 4.04 ms | 1.03 ms to 1.04 ms | 1.03 ms / 1.37 ms |
| V3 stateful + schema + validateRequest, full store | 72 | Wasm only | 843 us | 975 us | 1.05 ms | 2.76 ms | 1.04 ms to 1.08 ms | 1.01 ms / 1.32 ms |
| V3 | 72 | check() | 841 us | 973 us | 1.04 ms | 39.49 ms | 1.03 ms to 1.06 ms | 1.01 ms / 1.39 ms |
| V4 stateful, sliced, no schema | ~4 | Wasm only | 119 us | 169 us | 206 us | 395 us | 205 us to 206 us | 137.1 us / 241.6 us |
| V4 | ~4 | check() | 122 us | 172 us | 211 us | 5.81 ms | 210 us to 214 us | 132.5 us / 244.0 us |
| V5 stateful + schema parse, sliced | ~4 | Wasm only | 142 us | 227 us | 289 us | 453 us | 288 us to 292 us | 185.9 us / 398.7 us |
| V5 | ~4 | check() | 149 us | 243 us | 305 us | 838 us | 302 us to 322 us | 164.3 us / 345.5 us |
| **V6 stateful + schema + validateRequest, sliced (recommended)** | ~4 | Wasm only | 151 us | 247 us | 312 us | 480 us | 309 us to 313 us | 178.5 us / 373.5 us |
| V6 | ~4 | check() | 152 us | 248 us | 313 us | 2.14 ms | 312 us to 317 us | 166.1 us / 355.9 us |

Reading the table:

1. Preparsing the policy set is worth about 1.6 to 2.5 ms per call (V0 p50 2.4 ms in run 2, 3.4 ms in run 1, vs V1 0.8 to 0.94 ms).
2. Schema-based context parsing plus request validation adds little (roughly 20 to 60 us: V4 to V6 sliced, V1 to V3 full) and buys type checking of the context, so keep it on.
3. **Entity count is the cost driver**: full store (72) vs slice (about 4) is 5.5x to 7x at p50 and about 3.4x at p99.
4. The PEP's own request construction is negligible: p50 1.0 us, p99 1.5 us in run 2 (0.6 and 1.1 us in run 1).
5. A few `check()` rows are slightly *faster* than the "Wasm only" row of the same variant (for example V0 and V6 in run 1). `check()` does strictly more work, so this is measurement noise, not a real effect: within each variant the "Wasm only" series runs first and the host load drifts between the two series. Treat the two paths as equal within about 10%. The conclusions rest on the 5x entity-count effect, which is far above that noise.

### 5.4 Scaling (config V6, Wasm only, 5,000 calls each, one round)

Entities in the call, run 1 (clean) and run 2:

| Entities in the call | Run 1 p50 | Run 1 p99 | Run 2 p50 | Run 2 p99 |
|---|---|---|---|---|
| 4 | 183 us | 316 us | 161 us | 259 us |
| 24 | 597 us | 790 us | 479 us | 623 us |
| 50 | 975 us | **1.28 ms** | 879 us | **1.07 ms** |
| 204 | 4.30 ms | 5.18 ms | 3.27 ms | 3.62 ms |
| 1,004 | 19.1 ms | 27.3 ms | 17.7 ms | 21.1 ms |
| 5,004 | 86.0 ms | 136.8 ms | (191 ms, host load spike, not usable) | (583 ms, not usable) |

Roughly linear, about 16 to 17 us per extra entity at p50 (run 1: 975 - 183 = 792 us over 46 entities; run 2: 879 - 161 = 718 us over 46).

Policies in the set (V6, 4 entities), run 1 only (run 2 rows were taken during the host load spike and are not usable):

| Policies | p50 | p95 | p99 | max |
|---|---|---|---|---|
| 31 | 170 us | 197 us | 269 us | 1.28 ms |
| 310 | 526 us | 658 us | 766 us | 1.61 ms |
| 1,550 | 2.15 ms | 2.86 ms | 3.25 ms | 4.15 ms |

Policy count is not a concern: about 1.3 us per policy; even 310 policies keep p99 under 0.8 ms (run 1).

### 5.5 Bundle size (real output: `results/size.txt`)

| Artefact | Size |
|---|---|
| `cedar_wasm_bg.wasm` raw | 4,446,668 bytes (4.24 MiB) |
| gzip -9 | 1,483,082 bytes (1.41 MiB) |
| brotli | 968,885 bytes (0.92 MiB) |
| `nodejs/cedar_wasm.js` glue | 19,584 bytes |
| Whole npm package (three builds: esm, nodejs, web) | 13,545,292 bytes (12.92 MiB) |
| What a Node deployment needs (`nodejs/` only) | 4,511,377 bytes (4.30 MiB) |

## 6. Reproduction

```bash
cd policy-cedar && npm install
npm run gen-schema -- --check ; npm run validate ; npm test ; npm run report:scenarios
npm run extract ; npm run size ; npm run bench:sanity ; npm run bench     # bench: 10 to 20 minutes
```

## 7. What Cedar could not express cleanly (and the workaround)

Labels: **V** = verified by a test or command in this directory, **I** = inferred from documentation or the language definition, not exercised.

1. **No quantifier over a set of records (V).** "`approvals` contains a `finance-approver` who is not the `run_initiator`" cannot be written on `Set<{approver, role}>`: Cedar has `contains`/`containsAll`/`containsAny` (whole-element equality) but no `exists`/`any`/`filter`, and no set size. `test/limits.test.ts` L3 shows the best literal attempt (`[{initiator, finance-approver}].containsAll(approvals)`) **false-allows** a run whose only approval has the wrong role. Workaround: the PEP also passes `approvers_by_role: {<role>?: Set<User>}`, a pure regrouping of `approvals` (no policy logic in the engine). Then Cedar's value-based set equality does the work: `ids has "finance-approver" && !ids.isEmpty() && ids != [context.run_initiator]` means "somebody other than the initiator". A second forbid uses the literal record (`approvals.contains({approver: run_initiator, role: finance-approver})`) as defence in depth. Cost: the schema gets one optional key per catalogue role (generated), and the PEP must build the regrouping.
2. **A policy that errors is skipped, so a failing `forbid` becomes an allow (V).** L1: with `permit` all plus an erroring `forbid`, raw Cedar answers `allow` with one entry in `diagnostics.errors`. Mitigations in place: strict validation removes the known causes (unguarded optional attributes, type errors), and `interpret()` treats **any** error as deny. A missing entity (for example the Tool not in the slice) is the same class (L2).
3. **Records are closed; arbitrary-JSON arguments are invisible (V).** `additionalAttributes` (open records) is rejected as experimental, and an undeclared key in `context.args` is a hard request error (L6). So `args` is the union of all catalogue input properties, all optional, and every policy must guard with `has` (the validator enforces it). `ToolArgs` also carries one PEP-derived attribute, `url_host` (item 15). Free-form `object` parameters (`http.post.json`) cannot be typed; the PEP drops them from the Cedar context and returns their names in `unconstrained_args` (L4). Policies cannot constrain request bodies. A typed action per tool (`invoke_tool` as an action group) would be stricter but multiplies actions; not tried.
4. **Numbers (V).** `Long` is integer only and `>` accepts only Long. Money is a `decimal` extension value: at most 4 fractional digits, compared with `.greaterThan(decimal("10000.0000"))` (M5 shows that `amount > 10000` does not type-check). The PEP converts JS numbers to decimal strings and **refuses to round** (0.1+0.2 is denied, B13). Alternative not used: integer minor units, which need a per-currency exponent (JPY 0, KWD 3).
5. **Strings are exact (V).** No `toLower`, no regex; `like` supports only `*` wildcards. `"usd"` is not `"USD"` (B11): normalise upstream (RF-1 does, in `normalize`). Currency allowlists, channel patterns (`like "#sales-*"`) and URL allowlists work.
6. **Per-request entity construction is the main latency lever (V, section 5).** There is no handle for a cached entity store in the Wasm API: entities are serialised JS to Rust on every call (about 17 us each). Workaround: slice. Cost to the engine: build principal, node, flow, tool entities per request from the control-plane store (0.6 us p50 in this implementation); keep Role entities out of the slice (parents may dangle, which worked here).
7. **`!(x has a) || x.a ...` is rejected by the strict validator (V).** Use `if x has a then ... else true` (used in `org-llm-default-profiles`). `x has a && x.a ...` is fine.
8. **A never-matching policy is only a warning (V).** See M7 in 3.1. The gate must fail on warnings.
9. **Policy ids (V).** The Wasm API names policies `policy0..n` when given text; `@id` annotations are not used as ids. Passing a `Record<id, text>` (split by `policySetTextToParts`, keyed by `@id`) fixes it.
10. **`diagnostics.reason` order is unstable between calls (V; observed as a flip in the mutation test).** Sort before logging; `interpret()` does.
11. **Every policy must constrain `action` (V).** Context shapes differ per action, so an unconstrained `forbid (principal, action, resource) when { context.tool... }` fails strict validation against `activate_flow`.
12. **Cedar is stateless (I, language definition).** Rules such as "at most 3 payments per run" or "cumulative spend per day" need the engine to compute counters and pass them in `context`. Not exercised here.
13. **Cedar cannot compute taint (V by design).** It only evaluates labels the engine supplies. Taint propagation is done by the engine at run time and approximated statically by the extractor.
14. **Preparsed policy sets and schemas live in Wasm thread-local storage (I, from the API doc comment).** With worker threads each worker must preparse its own copy. Not exercised.
15. **`like` has no host boundary, so a `like`-based URL allowlist is bypassable (V; found in review, test L7).** `*` also matches `/`, so `context.args.url like "https://*.example.com/*"` accepts `https://evil.test/.example.com/x`. There is no regex and no URL type. Workaround (shipped): the PEP parses the URL with the WHATWG `URL` parser (the one `fetch` uses) and passes a derived `url_host`; the policy compares `url_host == "example.com" || url_host like "*.example.com"` plus `url like "https://*"`. Scenarios G26 to G30 cover the path trick, the `user@host` trick, plain `http://`, an apex host and an unparseable URL. Residual risk: the PEP and the HTTP client must parse URLs identically. Any string-structure rule (paths, e-mail domains, channel names) needs the same treatment.
16. **Namespace (choice).** The schema uses the empty namespace for readable policies. A product schema would likely use `namespace Ursitoare { ... }`.

## 8. Deviations, assumptions and unresolved

Deviations from the brief (none changes a requested behaviour):
* Added action `start_run` (the brief says "finance-clerk may start runs" but lists no such action).
* `context.tool` carries the `Tool` for `invoke_tool` and the resource is the `Node` (the brief did not fix this).
* `args.url_host` is a PEP-derived attribute, not a catalogue parameter (item 15 in section 7).
* Added `context.approvers_by_role` (section 7.1) next to the requested `approvals`.
* `amount` is a Cedar `decimal`, not minor units (7.4). The threshold is the same as the M2/M3 stub: 20000 is denied without approval (B05); 10000.00 exactly is allowed (B01).
* Flow and node entity ids carry no version (`Flow::"invoice-intake"`, `Node::"invoice-intake/pay"`); the version is an attribute (README mapping).
* `human.form` and `wait`/`code`/`switch`/`subflow`/`end` produce no policy request in the extractor (`human.form` completion is not in the action list). Subflow calls are authorised when the subflow's own nodes run.

Unresolved, for the orchestrator or later milestones:
* **The v0 catalogue has no data-classification marker**, so `reads_private` comes from `config/private-blocks.json` (a heuristic over block-name patterns). The catalogue should gain a `data_class` per block or output field. Likewise **delegate targets have no `effect`**; the extractor assumes `send` and an untrusted result (configurable). These assumptions decide whether RF-1 is a trifecta flow (here it is, even without the delegate: `invoices.get` is untrusted and private, `erp.create_payment` is `pay`).
* The extractor's capabilities are flow-level, as in design 4.4: they do not show that untrusted data actually reaches the effect.
* Integration into the M2/M3 engines is not done (write scope is `policy-cedar/` only). The hook contract is `PolicyEngine.check()` and the slicing rule in section 1.
* Who sets `Flow.reviewed`, and how editing a reviewed flow resets it, is outside Cedar and not specified.
* The benchmark was not run in a quiet window (section 5.1). Two full runs differ by 15 to 25% on the full-store rows, and the load spike in the tail of run 2 contaminated its scaling rows. A third run on a quiet host would settle the full-store row (it is on the 1 ms line).
* Not exercised: Cedar entity tags, templates and template-linked policies, `isAuthorizedPartial` (partial evaluation), worker threads, native `cedar-policy` (Rust) via N-API as a faster alternative to Wasm.
