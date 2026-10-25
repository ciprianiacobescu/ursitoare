# NH report: node hooks and next-node logic (decision D7)

Spike NH, 2026-10-24. Spec of record: `openspec/changes/add-node-hooks-spike/design.md` (not edited). The Write tool refused this file, so it was written through a Bash heredoc, as instructed. Everything below comes from running the commands in "Repro". Raw outputs: `evidence/`, `results/`, `desugar/results/`.

## Verdict up front
- **Scenarios:** all 34 design-matrix rows pass in `separate` mode (37/37 with 3 extra probes), and 38/38 in `fused` mode (fused-aware variants of C1/C2/C4, see Deviations).
- **R1:** hooks are a **runtime construct** (D-b and D-c need duplication in plain v0).
- **R2:** `separate` misses the pre-registered threshold **narrowly** (3.09 ms per hook execution against a limit of 3 ms; per-rep range 2.4 to 4.2 ms on a noisy host), so the rule as written selects **fusing pure code hooks**. Throughput is not the problem (875 runs/min at 4 concurrent for H2, limit 500).
- **R3:** no separate edge construct is needed. **R4:** not triggered by its literal conditions, **but a gap was found**: a declared route can skip a human gate (X3). **R5:** not triggered. **R6:** not triggered (1 of 34).

## Built
`node-hooks/` copies `core-dbos/src` (D1, DBOS-TS 5.3.0, Postgres 18) and extends it.
- **Engine (`src/`):** `interpreter.ts` (visit = pre chain, node step with retry loop, successor, post chain), `hooks.ts` (metas, selectors, placement order, action validation), `check.ts` (static checker: H_SCHEMA, H_BLOCK, H_ROUTE_TARGET, H_ROUTE_HUMAN, H_RETRY_SCOPE, H_CYCLE, H_DOMINANCE, W_NO_MATCH), `faults.ts` (internal crash point, `hook-exec.jsonl`), `catalogue.ts`, plus changes to `refs.ts` (`hook.*` namespace), `sandbox.ts` (`ctx` parameter), `clients.ts` (explicit idempotency key), `main.ts` (port 18930, DB 55436, static check at run start, `fork-node`, `cancel`, trace in status).
- **Every hook is its own DBOS step** named `<node>#pre:<id>` / `<node>#post:<id>` (flow rules `@<ruleId>`), a sibling of the node step. `HOOK_MODE=fused` runs pure code hooks without `routes`/`max_retries` inside the node step (park nodes and `end` have no node step, so their hooks stay separate steps).
- **Infra:** compose project `us-hk` (container `us-hk-postgres`, `127.0.0.1:55436`), engine `127.0.0.1:18930`, shared mocks 18901 to 18903 with `MOCK_STATE_DIR=node-hooks/.mockstate`.
- **Tests:** `tests/scenarios.mjs` (34 matrix rows + X1 to X3), `tests/gen-flows.mjs` (45 flows in `flows/`), `tests/check-static.mjs`, `tests/lint.mjs`, `tests/measure.mjs`, `tests/stress-kill.mjs`, `tests/mutations.mjs`, `tests/d1-oracle.mjs`, `desugar/`.
- Size: `src/` is 1,188 lines against 493 in D1's `src/` (about 2.4x).

## Scenario results
Source: `results/*-final-separate.{json,md}` (37/37) and `results/*-final-fused.{json,md}` (38/38). Each record holds assertion expected/actual values, step lists, hook-exec counts, mock counters and engine changes.

| id | separate | fused | key observable asserted |
|---|---|---|---|
| S01 | PASS | PASS | RF-1 v0.1 for INV-1002/1003/1001: done/rejected/done, payments 1/0/1, **step list byte-equal to the real D1 engine's** (oracle captured by running unmodified `core-dbos` on port 18930, `oracle/d1-steps.json`) |
| S02 | PASS | PASS | mock got `GLOBEX`; `input_original` `Globex` differs from `input` |
| S03 | PASS | PASS | extract step keeps `usd`; normalize input and pay args see `USD` |
| S04 | PASS | PASS | INV-1002 lookup calls 0, `skipped_by` recorded; INV-1001 calls 1 |
| S05a | PASS | PASS | kb.search calls 2 (top_k 1, 2), 2 passages, post exec 2 |
| S05b | PASS | PASS | `hook_retry_exhausted`, calls 2 |
| S06 | PASS | PASS | INV-1002 parks at approval though the LLM said auto_approve; trace shows the redirect; INV-1003 unaffected |
| S07 | PASS | PASS | INV-1001 slack effects 1 with key `<run>:classify#post:notify_review:a1`; INV-1002 slack calls 0 |
| S08 | PASS | PASS | subjects `auto-rejected` / `rejected by reviewer` |
| S09 | PASS | PASS | order `@rule_a, @rule_b, pay_pre_note, pay, pay_post_note, @rule_b, @rule_a` (A=`rule_a`, B=`rule_b`), asserted by step list (separate) and hook-exec line order (both modes) |
| S10a | PASS | PASS | summary prefix `[large]`, n8n payload `source`, both posts once |
| S10b | PASS | PASS | `when.outcome=[timeout]` hook ran once, `[approved]` hook 0, then rejected |
| S11 | PASS | PASS | output `{payment_id, paid: true}` |
| S12a | PASS | PASS | `hook_failed` naming `lookup_vendor#post:stop_blocked`; mail.send calls 0 |
| S12b | PASS | PASS | run done; hook error in trace and step record (404) |
| S13 | PASS | PASS | `hook_route_undeclared`; payment calls 0 |
| S14 | PASS | PASS | HTTP 400 `invalid_flow` H_DOMINANCE (flags classify, approval, pay); with `HOOKS_SKIP_STATIC=1` `ref_unresolved` at classify |
| S14c | PASS | PASS | H_CYCLE |
| S15 | PASS | PASS | guard exec 1 on the normal path and 1 on redirect-then-approve |
| S16a | PASS | PASS | `policy_denied`; policy log reason names 15000; payment calls 0 |
| S16b | PASS | PASS | allowed; payment 9000; `input_original.amount` 20000 (documented risk) |
| S17 | PASS | PASS | slack hook policy entry has `untrusted:fetch_invoice`; extract policy entry still has it; policy decisions = outbound calls |
| S18a/b/c | PASS | PASS | `hook_action_forbidden`; payment calls 0 |
| S18d | PASS | PASS | H_ROUTE_HUMAN |
| S19 | PASS | PASS | `policy_denied` for a `kind: hook` call; payment calls 0; lint passes |
| C1 | PASS | n/a (C1f) | internal crash before `pay#post:pay_post_note`: payment 1/1, every hook exec 1, pre-crash execs not repeated |
| C2 | PASS | PASS | kill during slack call: slack effects 1 (calls 2, duplicates 1), payment 1/1 |
| C3 | PASS | PASS | crash before approval after redirect: parks at approval, classify post exec 1, trace keeps the redirect |
| C4 | PASS | n/a (C4f) | crash before `pay` after pre mutate: payment calls 1 amount 9000, pre exec 1 |
| C5 | PASS | PASS | kill while parked: still waiting, pre exec 1, done |
| C6 | PASS | PASS | mail.send effects 2 (keys `:send`, `:send:r2`), calls 3, duplicates 1 |
| F1 | PASS | PASS | fork starts at `pay#pre:@rule_a` (id 9); pre hooks +1 each; earlier nodes not re-run; payment effects 1, duplicates +1 |
| X1 | PASS | PASS | extra: `allow_effect_retry` on `pay` makes two payments (keys `:pay`, `:pay:r2`); a retry input raising the amount is denied by the PEP |
| X2 | PASS | PASS | extra: a skipped extract keeps `untrusted:` and gets no `extracted:` |
| X3 | PASS | PASS | extra: **gap confirmed**, see R4 |
| C1f, C2f, C4f | - | PASS | fused-only variants, see Deviations |

Engine changes needed beyond design sections 3 to 6, per scenario: **S14 only** (`ref_unresolved` carried no node id; D1 raised it without one, and the assertion says "at classify"). X2 forced a fix after it failed (skip taint, Deviation 4). All other rows: none. Test-support addition no scenario needed for its pass criterion: `POST /runs/:id/cancel`.

### Harness sensitivity (is anything vacuous?)
`tests/mutations.mjs` breaks the engine on purpose and reruns the guarding scenarios: skip allowed anywhere (S18a, S18c fail), block hooks bypass the PEP (S19 fails), post mutate clears taint (S17 fails), unstable hook key (C2 fails), routes not enforced (S13 fails), dominance disabled (S14 fails), hook code without a checkpoint (C1, S09 fail), retry ignoring `max_retries` (S05b fails). **8 of 8 mutations detected** (`results/mutations.json`).

## Desugaring probe (Q1)
Validator: `cd format && npx tsx src/cli.ts validate <file> --json`; verbatim outputs in `desugar/results/`; flows in `desugar/flows/`. Toolbox per section 7: inserted code nodes, rewired references, inserted switch.

| Case | Plain-v0 equivalent | Validator | Cost |
|---|---|---|---|
| D-a (S02) | one code node `canon_vendor`, one rewired reference | **valid** | +1 node |
| D-b (S04) | cache hit routes around `lookup_vendor`; classify and pay keep `nodes.lookup_vendor` | **invalid**: `L3_REF_NOT_DOMINATING` at classify and pay (v0 has no merge construct) | |
| D-b | valid only with the tail duplicated per path | **valid** | 11 to 19 nodes: normalize, classify, approval, pay, archive, done exist twice (two approval task ids) |
| D-c (S05) | retry as a loop back to `search` | **invalid**: `L2_CYCLE` | |
| D-c | attempts unrolled (3) | **valid** | 2 to 13 nodes, one `end` copy per attempt |
| D-d (S06) | inserted code node + switch on the `auto_approve` edge | **valid** | +2 nodes |
| D-e (S14) | switch jumping extract to classify | **invalid**: `L3_REF_NOT_DOMINATING`; flags the **same 5 consumer/producer pairs** as `H_DOMINANCE` (approval<-normalize, classify<-lookup_vendor, classify<-normalize, pay<-lookup_vendor, pay<-normalize) | |
| D-f (S09) | `match: {}` with no-op pre and post, expanded over RF-1 | **valid** (insertion only). A shared post node after approval was first **invalid** (`L3_REF_NOT_DOMINATING`: the timeout branch carries no output), so approval needs one post node per case | 11 to 34 nodes, 14 to 40 edges, 19 to 20 references. A mutating hook would also need typed echo outputs and rewiring of about 19 references |

Supplementary, outside section 7's toolbox (reported separately, not used for R1): a registered subflow makes D-b and D-c valid without duplicating downstream nodes (`d-b-subflow`, `d-c-subflow` validate), by hiding the wrapped node inside a child flow and registering one flow per hook. It changes node identity, needs a registry entry per hook, and this engine does not implement `subflow`, so it was validator-only.

## Measurements (Q2), taken under `.orchestration/measure.lock` (owner NH, released)
RF-1, INV-1002, `DELEGATE_DELAY_MS=50`, 5 warm-up, 30 sequential, 100 at 4 concurrent, 5 repetitions with a fresh engine each, variants interleaved. Table = median over repetitions (`results/measure-2026-10-24T20-50-25-515Z.json`). H1 has 15 hook executions per run (end has pre only; the delegate's post runs after its callback), H2 has 30.

| Variant / mode | seq p50 / p95 ms | 4-conc p50 / p95 ms | runs/min (4-conc) | steps/run | hook execs/run | xact_commit/run | engine RSS MiB |
|---|---|---|---|---|---|---|---|
| H0 | 94.8 / 107.8 | 103.4 / 114.9 | 2,295 | 11 | 0 | 101 | 210 |
| H1 separate | 138.5 / 156.5 | 162.3 / 178.2 | 1,462 | 26 | 15 | 197 | 207 |
| H1 fused | 105.0 / 117.7 | 135.2 / 153.8 | 1,745 | 13 | 15 | 112 | 208 |
| H2 separate | 187.6 / 212.4 | 272.5 / 304.9 | 875 | 41 | 30 | 279 | 207 |
| H2 fused | 113.8 / 122.9 | 131.7 / 155.3 | 1,765 | 15 | 30 | 130 | 225 |

- Added cost per hook execution, (variant p50 minus H0 p50) / execs: H2 separate **3.09 ms** (per rep 4.20, 3.09, 3.72, 2.90, 2.41; median of reps 3.09), H1 separate 2.91, H2 fused 0.63, H1 fused 0.68.
- About 5.9 extra Postgres commits per separate hook step.
- Host: 69 containers running, load average 11 at start and 8 at end (59 users logged in). D1's reference (p50 101.7 ms, 2,306 runs/min at 4 concurrent, different day and neighbours) is indicative only; H0 here is 95 ms and 2,295/min. A first dry run under load average 22 to 30 gave H0 150 ms and 4.56 ms per hook; it was discarded as a dry run and is not used.

## Decision rules
- **R1 (runtime construct).** D-b: the plain attempt is invalid (`L3_REF_NOT_DOMINATING`) and the valid form duplicates 6 downstream nodes. D-c: the loop is invalid (`L2_CYCLE`) and the valid form is unrolled with one consumer copy per attempt. By the rule's text, hooks are a **runtime construct** of the interpreter, validated by the section 6 checker on the augmented graph. D-a and D-d desugar cleanly and D-e is flagged identically, so a publish-time expansion works for those, not for skip-and-merge or retry.
- **R2 (granularity).** Separate: 3.09 ms per hook execution > 3 ms limit, while 875 runs/min >= 500. The rule is a conjunction, so it fails; the pre-registered fallback applies: **fuse pure code hooks without `routes`/`max_retries`; keep block, route and retry hooks as separate steps**. Fused mode must pass C1 to C4: C2 and C3 pass unchanged; C4 passes on the design's own observables (payment calls 1, amount 9000, pre exec 1; C4f differs only in dropping my extra pre-crash assertion, which is mode-specific); only C1 cannot be run as written, because no `pay#post:*` step exists to crash before, and the adapted C1f passes (Deviation 2). Caveat for the owner: the margin is 0.09 ms inside a 2.4 to 4.2 ms run-to-run spread, and separate hooks give 875 runs/min (17x the D5 need), so the rule is more conservative than the load requires. Fusing also costs something real (C2f: fused pure pre-hooks run twice after a kill inside the step).
- **R3 (no edge construct).** S06, S07, S08 and S15 all pass using only post `ctx.next`/`when.next`, pre `ctx.from`/`when.from` and flow-rule `match`. **No separate transition or edge construct is added.**
- **R4 (safety).** S13, S16, S17, S18, S19 all pass; their literal failure conditions (PEP bypass, undeclared route, taint cleared, forbidden action on a human or effect node) did not occur, so R4 does **not** block Phase 1 as written. **X3 shows a gap R4 does not cover:** a post hook on `classify` with `routes: [pay]` redirected INV-1001 (needs_review) straight to `pay`, skipping the human approval; the static checker accepts the flow and 2,450 EUR was paid with no decision. Closed routes stop undeclared targets, not declared ones that jump a gate. Recommended before Phase 1: a static rule rejecting a route that skips a `human.approval` node the declared edges would visit (or requiring an explicit platform-level acknowledgement), and a pay-side guard that hooks cannot bypass. Related, by design and documented: S16b (a pre-hook lowers a payment under the PEP limit) and X1 (`allow_effect_retry` makes a second real payment).
- **R5 (durability).** C1 to C6: no effect count above expected, no completed hook step executed again after recovery (C1 compares hook-exec counts before and after). Extra: 60 random SIGKILLs during S09 runs (`results/stress-kill-*.json`): all 60 completed, payment effects always 1, and **0** cases where a step whose checkpoint was already visible ran again. In 5 of 60 runs a hook step in flight at the kill ran twice, the unavoidable at-least-once window between the work and the checkpoint (the `hook-exec` line is written before the step returns); harmless for pure hooks, absorbed by the stable key for block hooks. The separate-step design is **not rejected** on R5. `hook-exec.jsonl` does not count a killed, never-finished execution (C2: slack called twice, one line).
- **R6 (scope).** 1 of 34 matrix rows (S14, 2.9%) needed an engine change beyond sections 3 to 6, far below 25%. The hook model is not too complex for v0.2. Counter-signal: the engine grew about 2.4x and hook semantics left many choices open (list below).

## Deviations (none edits design.md)
1. **Crash point placement (before results).** `CRASH_BEFORE_STEP=<node id>` fires immediately before the node's own unit (after its pre-hooks), not at the start of the visit, because C4 needs "between pre mutate and node". For `human.approval` it is before `setEvent`.
2. **Fused-mode variants (after seeing results).** In the fused probe C1 failed (engine did not crash: there is no `pay#post:*` step) and C4 failed (the fused pre hook had not run at the crash). C1 is inherent to fusing (no post step exists). C4's failure was only my own pre-crash assertion "the pre hook ran once before the crash", which is mode-specific; the design's observables (all after restart) hold. So I added C1f (crash before the `pay` step: every hook once), C4f (C4 with that assertion inverted: hook not yet run at the crash, run once after; payment 9000) and C2f (kill during the pay call: **fused pure pre-hooks of `pay` ran twice**, post-hooks once, payment effects 1). C2 and C3 run unchanged in fused mode. "Fused passes C1 to C4" therefore holds with C1 adapted; C2, C3 and C4 meet the design's observables.
3. **Test-flow bug fixed (before the final run).** S17's generated sanitise hook lacked the `sanitised: true` marker the assertion reads; the flow was fixed, the assertion untouched.
4. **X2 engine fix (after seeing it fail).** A skipped node's output taint was first `extracted(input) + input`; it is now exactly the input taint (plus a block's own `untrusted:` label), because a skip has not earned the `extracted:` relabel.
5. **`HOOKS_SKIP_STATIC=1` skips all hook checks**, not only dominance and cycle.
6. **S01 oracle stronger than the spec:** D1's real step lists, captured by running `core-dbos/src/main.ts` unmodified on port 18930 against a separate database `d1_oracle` in my own container, `POLICY_LOG` redirected so nothing was written inside `core-dbos/`.
7. Rule ids A and B are `rule_a`, `rule_b` (snake_case), so steps read `@rule_a`.
8. Measurement used 5 repetitions, not 1, because a first dry run was noisy.

Choices where the spec was silent (documented, none needed by a failing scenario unless stated): a hook's returned `input`/`output` **replaces** the whole value; skip and mutated outputs are validated against the node's output schema; retry exhaustion is `attempt - 1 >= max_retries` per visit; a retry after a skip executes the node for real; `ctx.outcome` is the decision for `human.approval`, `timeout` for a timed-out delegate, the matched key (or `default`) for `switch`; `on_error` also applies to code hooks and a policy deny is never swallowed by `continue`; unknown block, `no_case` and `bad_decision` fail before post-hooks; `trace` is rebuilt from replayed step records so it survives recovery (C3); `fork-node` forks the lowest step named `<node>` or `<node>#pre:*`.

## Unresolved
- **R2 is a coin-flip on this host.** A quieter machine or more repetitions could land either side of 3 ms. The owner may prefer to keep separate steps (875 runs/min, clear crash boundaries) and treat fusing as an optimisation for hot paths.
- **Gate bypass (X3)** needs a design decision and a static rule; not implemented.
- **`hook-exec` semantics:** it counts finished executions, not interrupted ones; a Phase-1 timeline should also record starts.
- Fused hooks re-run after a kill inside the node step (C2f): fine for pure hooks only, so purity must be enforced (the QuickJS sandbox already has no I/O, frozen `Date`, seeded `Math.random`).
- Not covered: LLM-kind hooks, run-level and tenant hooks, `wait` hooks (allowed, untested), cycles, `agent`/`foreach`/`subflow`/`human.form`, DBOS upgrades, memory growth beyond 100 runs. The `subflow` desugaring was validator-only. The 60-kill stress is a sample, not a proof.

## Repro
```bash
cd ~/gooseProjects/ursitoare-spikes
export MOCK_STATE_DIR=$PWD/node-hooks/.mockstate DELEGATE_DELAY_MS=50
shared/mocks/start-all.sh
cd node-hooks
npm ci && docker compose -p us-hk up -d --wait      # Postgres 18 on 127.0.0.1:55436
npm run typecheck && npm run lint && npm run check:static
node tests/gen-flows.mjs                              # regenerates flows/ (checked in)
node tests/d1-oracle.mjs                              # one-off: D1 step lists -> oracle/d1-steps.json
npm run scenarios                                     # 37 scenarios; add -- --only S06,C3 to filter; -- --hook-mode fused for fused
npm run desugar                                       # needs format/ (its own node_modules)
node tests/stress-kill.mjs 60
node tests/mutations.mjs
npm run measure -- 5                                  # takes .orchestration/measure.lock
# teardown
docker compose -p us-hk stop                          # never down -v
cd .. && shared/mocks/stop-all.sh                     # with the same MOCK_STATE_DIR
```
