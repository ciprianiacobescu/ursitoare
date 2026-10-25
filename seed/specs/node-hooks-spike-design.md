# Design: spike NH, node hooks and next-node logic (decision D7)

Dated 2026-10-24. Everything in this file, including the §9 decision rules, was written **before any result**. Later changes go under "Amendments" at the end, dated and labelled pre- or post-result.

## 1. Questions
1. **Q1, compile time or runtime.** Can pre- and post-steps be expressed as ordinary format v0 nodes inserted at publish time, or must the interpreter run them?
2. **Q2, step granularity.** Should each hook be its own DBOS step, or should pure hooks be fused into the node's step? What does each cost?
3. **Q3, next-node logic.** Can "logic based on the next node" be expressed as post-hooks that see the resolved successor, plus pre-hooks selected by attributes of the node they wrap? Or is a separate edge or transition construct needed?
4. **Q4, safety.** Do hooks stay inside the existing guarantees?
   - The PEP sees final arguments.
   - Taint is never cleared.
   - Human decisions cannot be bypassed.
   - Redirects are closed and statically checkable.
5. **Q5, durability.** Under crashes, do hooks keep effects exactly once, and do completed hooks stay completed?

## 2. Layout, ports, names
- **Spike dir:** `~/gooseProjects/ursitoare-spikes/node-hooks/`.
  - Copy `core-dbos/src`, `package.json`, `package-lock.json` and `tsconfig.json` as the starting point, then extend.
  - **Do not modify** `core-dbos/`, `format/`, `shared/catalogue/`, `shared/flows/` or `shared/mocks/`.
  - New flows go in `node-hooks/flows/`.
- **Postgres:** compose project `us-hk`, container `us-hk-postgres`, image `postgres:18` (already pulled), host port `127.0.0.1:55436`, database `ursitoare`.
- **Engine:** one Node 26 process (API, DBOS worker and callback receiver) on `127.0.0.1:18930`, with `CALLBACK_BASE=http://127.0.0.1:18930`.
- **Mocks:** the shared M1 mocks on 18901–18903, with `MOCK_STATE_DIR=node-hooks/.mockstate`.
  - Start them with `DELEGATE_DELAY_MS=50`.
  - Use `POST /reset` (mock-tools accepts `{delays:{<block_with_underscores>: ms}}`; mock-n8n accepts `{delegate_delay_ms}`) between scenarios rather than restarting.
- **Docker rules (design add-phase0-spikes §3):**
  - never touch containers you did not create;
  - finish with `docker compose -p us-hk stop`, never `down -v`.
- **Measurement lock:** use the `.orchestration/measure.lock` mutex (add-phase0-spikes Amendment 15:20) for §8.

## 3. Format extension (spike draft `ursitoare: "0.2-draft"`)
The engine accepts `"0.1"` and `"0.2-draft"`. A v0.1 flow must run exactly as it does in D1; that is the regression scenario S01.

```yaml
ursitoare: "0.2-draft"
flow: invoice-intake-hooks
version: 1.0.0
inputs: {...}
start: fetch_invoice
hooks:                          # flow-level rules, in declaration order
  - id: audit_effects           # snake_case, unique among rules
    match:                      # selector over the WRAPPED node; fields AND-ed; omitted field = any; {} = every node
      kind: [block]             # node kinds
      effect: [pay, send]       # node effect class (see §3.3)
      nodes: [pay]              # node ids
      tags: [finance]           # node `tags`
    pre:  <hook>                # optional, at most one hook per phase per rule
    post: <hook>
nodes:
  pay:
    kind: block
    tags: [finance]             # optional, new node field
    uses: erp.create_payment@1
    with: {...}
    next: archive
    pre:  [<hook>, ...]         # node-level hooks, in order
    post: [<hook>, ...]
```

### 3.1 Hook definition
```yaml
id: normalize_args              # snake_case; unique within its node (node-level) or equal to the rule id (flow-level)
kind: code | block
when:                           # optional runtime selector; the hook runs only if it matches
  from: <selector>              # the node the run arrived from (pre and post)
  next: <selector>              # the resolved successor (post only)
  outcome: [<string>, ...]      # the node's outcome (post only)
input: {name: <value>}          # optional: format-v0 values and references (inputs.*, nodes.<id>.output.*, nodes.<id>.outcome)
# kind: code
source: |                       # function body; receives `ctx` (§3.2); returns an action object (§3.4) or nothing (= continue)
  ...
# kind: block
uses: slack.post_message@1      # catalogue block; `with` keys exactly its input properties
with: {...}                     # values may also reference `hook.input.*`, `hook.output.*`, `hook.node.*`, `hook.next.*`, `hook.from.*`
on_error: fail | continue       # default fail
routes: [<node_id>, ...]        # post code hooks only: the closed set of nodes this hook may redirect to
max_retries: <int 1..5>         # post code hooks only: enables the `retry` action
allow_effect_retry: true        # required for retry on a node whose effect is not read
```

Selectors (`match`, `when.from` and `when.next`) all use the same `{kind, effect, nodes, tags}` shape.

### 3.2 Hook context (`ctx` for code hooks, `hook.*` for block `with`)
```text
phase            "pre" | "post"
node             meta of the wrapped node
from             meta of the node the run arrived from (null at start)
next             pre:  meta of the single static successor when the node has exactly one
                       (block, code, llm.extract/generate, wait); otherwise null
                 post: meta of the resolved successor, after any earlier post-hook redirect
next_candidates  metas of every declared successor plus every hook route of this node
input            the node's effective input:
                   pre:  after earlier pre-hooks
                   post: the input actually used
output, outcome  post only; the output is after earlier post-hooks
attempt          1-based node attempt (counts retry actions)
feedback         the `feedback` of the retry action that caused this attempt, else null
args             the resolved hook `input` (code hooks)
```

- **meta** is `{id, kind, effect, tags}`.
- **Node "input" per kind:**

  | Kind | Input |
  |---|---|
  | block | resolved `with` |
  | code, llm.* | resolved `input` |
  | human.approval | `{summary}` |
  | delegate | resolved `with` |
  | switch | `{on}` |
  | wait | `{duration}` |
  | end | the resolved `output` map |

### 3.3 Effect class of a node
| Node | Effect |
|---|---|
| block | its catalogue `effect` (`read`, `write`, `send` or `pay`) |
| delegate | `send` |
| llm.*, code, switch, wait | `read` |
| human.* | `human` |
| end | `none` |

### 3.4 Actions and where they are allowed
| Action | Shape | Allowed | Forbidden (runtime `hook_action_forbidden`, plus static where possible) |
|---|---|---|---|
| continue | `{action:"continue"}` or no return | everywhere | — |
| mutate input | `{action:"continue", input:{...}}` | pre, on every kind | — |
| skip | `{action:"skip", output:{...}, outcome?}` | pre, on block with effect read, code, llm.* (decide needs `outcome`) | every node with effect ≠ read, human.*, delegate, wait, end, switch |
| mutate output | `{action:"continue", output:{...}}` | post, on block, code, llm.extract/generate, delegate | human.* (the decision is the human's), switch, wait, end, llm.decide (use redirect) |
| redirect | `{action:"redirect", to}` | post, only to a node in that hook's `routes`, on any non-end node except human.* | human.* (decisions route only through their own `cases`); `to` outside `routes` gives `hook_route_undeclared` |
| retry | `{action:"retry", input?, feedback?}` | post, on hooks with `max_retries`; nodes block (read, or any effect with `allow_effect_retry`), code, llm.* | human.*, delegate, switch, wait, end; exceeding `max_retries` gives `hook_retry_exhausted` |
| fail | `{action:"fail", reason}` | pre and post | — (the run fails with `hook_failed`, never `policy_denied`; hooks are authoring controls, the PEP stays the authority) |

### 3.5 Block hooks
- They always return continue. They cannot mutate, skip, retry or redirect.
- Their output is recorded in the step and the timeline. It **cannot be referenced** downstream in this draft.
- Every block hook call goes through `policy.check` with `kind: "hook"` and taint (§5).
- **Idempotency key:** `${keyBase}:${nodeId}#${phase}:${hookId}:a${attempt}`.
- `on_error: continue` records the error and proceeds. `fail` fails the run with `hook_error`.
- **Mock limitation.** mock-tools only answers HTTP 200 or 404, and only `invoices.get@1` and `orders.get@1` can produce a 404. Test `on_error` with an `invoices.get@1` hook and an unknown id.

## 4. Execution order (per node visit)
1. **Resolve the node's input** from the recorded scope, as in D1.
2. **Pre-hooks, outer to inner:**
   - matching flow rules, in declaration order;
   - then node-level `pre`, in order;
   - each is skipped unless its `when` matches.
   - Each hook is **its own DBOS step** named `<node>#pre:<hookId>` (flow rules: `<node>#pre:@<ruleId>`).
   - A mutated input feeds the next hook and the node.
   - `skip` stops the chain and records the node output **without running the node**. The node's record carries `skipped_by: <hookId>`. Post-hooks still run.
3. **The node step** (named `<node>`, as in D1).
   - The PEP check runs inside it on the **final** input.
   - The step output records `{input_original, input, output, outcome, policy, attempt}`.
4. **Resolve the successor** from the outcome, as in D1: `next`, `cases[outcome]`, `default` or `on_timeout`.
5. **Post-hooks, inner to outer** (onion order):
   - node-level `post` in order, then matching flow rules in **reverse** declaration order;
   - each step is named `<node>#post:<hookId>` or `<node>#post:@<ruleId>`;
   - `ctx.next` is the current successor; `redirect` changes it for later hooks;
   - mutated output feeds later hooks and becomes the recorded node output;
   - `retry` goes back to step 3 with attempt + 1, using the action's `input` if given, else the same input, and with `feedback`, then restarts the post chain. **Pre-hooks are not re-run on retry.**
6. **Record and move on.**
   - The recorded node output (what `nodes.<id>.output` resolves to) is the post-chain output.
   - The routing decision needs no separate step: it is a pure function of checkpointed step outputs.
   - Record `redirected_by` in an in-memory trace returned with the run status.
7. **Park nodes.**
   - `human.approval`: pre-hooks run before the task is opened, and may mutate `summary`. Post-hooks run after the decision **including the timeout exit**, with `ctx.outcome = "timeout"`.
   - `delegate`: pre-hooks run before the webhook; post-hooks run after the callback or the timeout.
8. **`end`.** Pre-hooks may mutate the final output map. There are no post-hooks on `end`; run-level hooks are out of scope.
9. **Engine trace.** Inside each hook step, before it returns, the engine appends `{run, node, phase, hook, attempt, ts}` to `.state/hook-exec.jsonl`. Tests use this to count real hook executions, as opposed to replays.

**Fused mode (measurement only, `HOOK_MODE=fused`).** Pure code hooks without `routes` or `max_retries` run **inside** the node's step instead of as their own steps. Block hooks stay separate steps. Fused mode is used only for §8.

## 5. Taint through hooks
- Nodes keep D1's labels unchanged, so the baseline does not move. That includes D1's relabel of code and llm.* output as `extracted:`.
- **Hooks never clear or relabel taint**, following architecture §8.7.
  - A pre-hook's mutated input carries `taint(node input) ∪ taintOf(hook input refs)`.
  - A post-hook's mutated output carries the node output taint ∪ `taint(node input)` ∪ `taintOf(hook input refs)`.
  - A block hook's policy request carries `taintOf(with)`, where `hook.input.*` maps to the node input taint and `hook.output.*` to the node output taint.
- `policy.check` logs `taint`, so tests read it from the policy log (`POLICY_LOG=node-hooks/.state/policy-decisions.jsonl`).

## 6. Static checker (`node-hooks/src/check.ts`, run at run start; failure gives `invalid_flow` with codes)
| Code | Rule |
|---|---|
| `H_SCHEMA` | Hook fields and kinds are well-formed; ids are unique; selectors use known fields; `routes` and `max_retries` appear only on post code hooks |
| `H_BLOCK` | A block hook's `uses` is in the catalogue, and its `with` keys are exactly the block's input properties, with the required ones present |
| `H_ROUTE_TARGET` | Every route exists, and is not the wrapped node itself |
| `H_ROUTE_HUMAN` | No `routes` on hooks wrapping human.*, and no `routes` on `end` |
| `H_RETRY_SCOPE` | `max_retries` is not allowed on human.*, delegate, switch, wait or end; on a node with effect ≠ read it needs `allow_effect_retry` |
| `H_CYCLE` | The **augmented graph** (declared successors ∪ hook routes) is acyclic |
| `H_DOMINANCE` | On the augmented graph, every `nodes.<p>` reference in a node's fields, or in a hook's `input` or `with`, names a producer `p` that dominates the consumer. For post-hooks on `p` itself, `p` counts as available |
| `W_NO_MATCH` | Warning: a flow rule matches no node |

The checker is independent of `format/`. §7 cross-checks it.

## 7. Desugaring probe (Q1)
For each case, hand-write the **best plain v0 equivalent**:
- inserted `code` nodes before or after;
- rewired references;
- an inserted `switch` for a redirect.

Run it through `cd format && npx tsx src/cli.ts validate <file> --json` and record the result verbatim.

| Case | From | Expected question |
|---|---|---|
| D-a | S02, pre mutate input | Does it desugar cleanly? |
| D-b | S04, pre skip (cache) | Needs a merge: which v0 error appears? |
| D-c | S05, post retry | Needs a cycle: which v0 error appears? |
| D-d | S06, post redirect | Becomes a `switch`: valid? |
| D-e | S14, unsafe redirect | Does the v0 validator flag what `H_DOMINANCE` flags? |
| D-f | S09, flow rule with `match: {}` | How many nodes and references does the expansion add for RF-1? |

## 8. Measurements (Q2)
- **Setup:**
  - RF-1, INV-1002 (auto-approve path: 8 node visits), `DELEGATE_DELAY_MS=50`;
  - variants with one flow rule `match: {}`;
  - mode `separate` and mode `fused`.

  | Variant | Hooks |
  |---|---|
  | H0 | none |
  | H1 | 1 pre + 1 post pure code hook (return continue) on every node, so 2 per node |
  | H2 | 2 pre + 2 post, so 4 per node |
- **Per variant and mode:**
  - 5 warm-up runs, then 30 sequential runs (p50 and p95 end-to-end, start to completed);
  - 100 runs at 4 concurrent (p50, p95, runs/min);
  - steps per run (`listWorkflowSteps` length);
  - Postgres `xact_commit` delta per run (`pg_stat_database`, sequential, averaged);
  - engine RSS after the concurrent batch.
- **Record:**
  - host load: `docker ps | wc -l`, `uptime`;
  - D1's comparison point: p50 101.7 ms and 2,306 runs/min at 4 concurrent, on a different day and with different neighbours, so the comparison is indicative only.

## 9. Pre-registered decision rules
- **R1 (Q1, compile time or runtime).**
  - If D-b **or** D-c cannot be expressed as a valid v0 flow without duplicating downstream nodes, hooks are a **runtime construct** of the interpreter. The static checker (§6) validates the augmented graph.
  - If every case D-a…D-e desugars to a valid v0 flow, hooks are **publish-time sugar**, expanded before validation.
- **R2 (Q2, step granularity).**
  - Keep **every hook a separate step** if, in mode `separate`:
    - the median added cost per hook execution, (H2 p50 − H0 p50) ÷ hook executions per run, is ≤ 3 ms sequential;
    - **and** H2 at 4 concurrent keeps ≥ 500 runs/min (10× the D5 need of 50 RF-1 runs/min).
  - Otherwise fuse pure code hooks without `routes` or `max_retries` into the node step, and keep block, route and retry hooks separate. That requires fused mode to pass C1–C4 too.
- **R3 (Q3, next-node logic).**
  - If S06, S07, S08 and S15 all pass using only post-hook `ctx.next` / `when.next`, pre-hook `ctx.from` / `when.from` and flow-rule `match`, **no separate transition or edge construct** is added.
  - If any of them needs something these cannot express, add an edge construct and say what for.
- **R4 (Q4, safety).** If any of S13, S16, S17, S18 or S19 fails, hooks are **blocked for Phase 1** until it is fixed. "Fails" means the hook:
  - bypasses the PEP;
  - follows an undeclared route;
  - clears taint;
  - performs a forbidden action on a human or effect node.
- **R5 (Q5, durability).** If any C scenario shows an effect count above the expected value, or a completed hook step executed again after recovery (from `hook-exec.jsonl`), the separate-step design is **rejected as specified**, and the report says why.
- **R6 (scope signal).** If more than 25% of scenarios need an engine change beyond §3–§6 to pass, the hook model is too complex for v0.2. The report proposes a smaller cut.

## 10. Scenario matrix
**Dimensions:**
- **Position:** pre, post, both, onion.
- **Hook kind:** code, block read, block effect.
- **Action:** continue, mutate input, mutate output, skip, retry, redirect, fail.
- **Next-node logic:** post `ctx.next` / `when.next`, pre `ctx.from` / `when.from`, pre `next_candidates`.
- **Wrapped node:** block read, block pay, block send, llm.extract, llm.decide, code, human.approval, delegate, end.
- **Scope:** node-level, flow rule by kind, effect, tag or node id.
- **Fault:** none; internal crash before a named step; external SIGKILL during a block call; kill while parked.
- **Governance:** PEP on final arguments, taint, forbidden actions, closed routes, cycle, dominance.

**Excluded:**
- LLM-kind hooks;
- hooks on agent, foreach, subflow, human.form and wait (wait is allowed, but untested);
- run-level and tenant-injected hooks;
- cycles.

The flows are RF-1 variants unless stated otherwise. Invoices follow the M1 fixtures:

| Invoice | Path |
|---|---|
| INV-1002 | auto_approve, 120.50 usd |
| INV-1003 | reject, blocked vendor |
| INV-1001 | needs_review, 2450 EUR |
| INV-1004 | 20000 EUR, needs_review |

| # | Scenario | Setup | Expected observables |
|---|---|---|---|
| S01 | v0.1 regression | Unmodified RF-1 (`shared/flows/rf-1-invoice-intake.yaml`) for INV-1002, INV-1003 and INV-1001 (approve) | Terminal nodes done, rejected and done. Payments 1, 0 and 1. Step names equal D1's |
| S02 | pre mutate input, block read | `lookup_vendor` pre code: `vendor_name` → trimmed and canonicalised | mock-tools `erp.lookup_vendor` args show the mutated name. The node record has `input_original` ≠ `input` |
| S03 | post mutate output, llm.extract | `extract` post code: currency uppercased (INV-1002 `usd` → `USD`) | `nodes.extract.output.currency == "USD"`; the step record keeps the raw `usd`; pay args currency `USD` |
| S04 | pre skip (cache hit), block read | `lookup_vendor` pre code: if vendor is Globex, skip with a cached `{vendor_id, status, payment_terms_days}` | mock-tools `erp.lookup_vendor` calls = 0 for INV-1002; run done; `skipped_by` recorded; for INV-1001 calls = 1 |
| S05a | post retry succeeds | New flow F-RET: `search` (`kb.search@1`, top_k 1), post code `max_retries: 2`: if `passages.length < 2`, retry with `top_k: 2` and feedback | `kb.search` calls = 2; attempt 2 output has 2 passages; post hook exec = 2; run completed |
| S05b | post retry exhausted | F-RET variant whose condition never passes, `max_retries: 1` | Fails with `hook_retry_exhausted`; `kb.search` calls = 2 |
| S06 | **next-node redirect** | `classify` post code, `routes: [approval]`: if `ctx.next.effect == "pay"` and amount > 100, redirect to approval | INV-1002 parks at approval (the LLM said auto_approve); approve, then pay, then done; the trace shows `redirected_by`. INV-1003 is unaffected (next is notify, not pay) |
| S07 | **next-node block hook** | `classify` post block `slack.post_message@1` with `when: {next: {kind: [human.approval]}}` | INV-1001: slack effects = 1. INV-1002: slack calls = 0 |
| S08 | **previous-node logic** | `notify_rejection` pre code: subject depends on `ctx.from.id` (classify → "auto-rejected", approval → "rejected by reviewer") | INV-1003 and INV-1001 (reject) show the respective subjects in mock-tools `mail.send` args |
| S09 | flow selectors and onion order | Rules A `match: {effect: [pay, send]}` pre and post, B `match: {kind: [block]}` pre and post; node `pay` has node-level pre and post | Step order around pay: `pay#pre:@A`, `pay#pre:@B`, `pay#pre:<n>`, `pay`, `pay#post:<n>`, `pay#post:@B`, `pay#post:@A`. `lookup_vendor` has only B; `notify_rejection` (send) has A and B |
| S10a | hooks on park nodes | approval pre mutates summary (prefix `[large]`); approval post code records; archive (delegate) pre adds `source: "ursitoare"` to the payload; archive post sees `ctx.output.result` | INV-1001: the waiting event summary has the prefix; the n8n payload has `source`; both posts ran once; done |
| S10b | post on timeout exit | S10a with approval `timeout: PT5S`, unanswered | Post ran with `ctx.outcome == "timeout"`; then notify_rejection, then rejected |
| S11 | end pre mutate | `done` pre code adds `paid: true` to the output | Run output `{payment_id, paid: true}` |
| S12a | fail action | `lookup_vendor` post code: fail when status is blocked | INV-1003 fails with `hook_failed` (hook id in the error); notify `mail.send` calls = 0 |
| S12b | block hook `on_error: continue` | `fetch_invoice` post block `invoices.get@1` with a nonexistent id (404 from mock-tools), `on_error: continue` | Run done; the hook error is recorded in the step or trace |
| S13 | redirect outside routes | `classify` post code returns `redirect` to `pay` with `routes: [approval]` | Fails with `hook_route_undeclared`; payment calls = 0 |
| S14 | unsafe redirect | `extract` post code, `routes: [classify]`, redirects past lookup_vendor and normalize | **Static:** `H_DOMINANCE` rejects it at run start. With `HOOKS_SKIP_STATIC=1`, at runtime: `ref_unresolved` at classify, so the static rule is necessary |
| S14c | redirect cycle | `normalize` post code, `routes: [extract]` | **Static:** `H_CYCLE` |
| S15 | guard on every entry path | Flow rule `match: {effect: [pay]}` pre code (guard: vendor status active) combined with S06's redirect | Guard exec = 1 on the normal path (INV-1002 without S06) and = 1 on the redirect-then-approve path |
| S16a | PEP sees mutated args (raise) | `pay` pre code sets amount to 15000 for INV-1002 | Fails with `policy_denied`; payment calls = 0; the policy log shows amount ≥ 15000 in the request |
| S16b | PEP sees mutated args (lower) | `pay` pre code caps amount at 9000 for INV-1004 (20000), approve | **Allowed**; payment created with 9000; `input_original.amount == 20000` recorded. This is a documented risk, not a failure |
| S17 | taint through hooks | `fetch_invoice` post code "sanitises" `raw_text`; `fetch_invoice` post block `slack.post_message@1` with `text: ${{ hook.output.raw_text }}` | The policy log entry for the slack hook has taint containing `untrusted:fetch_invoice`. The recorded fetch_invoice taint still has `untrusted:fetch_invoice` |
| S18a | forbidden: skip a human gate | approval pre code returns skip with decision approved | Fails with `hook_action_forbidden`; payment calls = 0 |
| S18b | forbidden: rewrite a human decision | approval post code changes rejected to approved (INV-1001, reject) | Fails with `hook_action_forbidden`; payment calls = 0 |
| S18c | forbidden: skip an effect | pay pre code returns skip with a fake payment_id | Fails with `hook_action_forbidden` |
| S18d | static: routes on human | approval post with `routes` | Static `H_ROUTE_HUMAN` |
| S19 | block hook through the PEP | `lookup_vendor` post block `erp.create_payment@1` amount 20000 | Fails with `policy_denied` (hook kind); payment calls = 0; the lint (§11) shows every outbound call site after `policy.check` |
| C1 | crash after node, before post | S09 flow, INV-1002, `CRASH_BEFORE_STEP=pay#post:<n>` (internal, once) | After restart: payment calls = 1, effects = 1; `pay` executed once (mock); every pre-crash hook exec = 1; done |
| C2 | kill during an effect post-hook | `pay` post block `slack.post_message@1`; mock delay on slack 1500 ms; external SIGKILL once mock-tools logs the slack call | slack effects = 1 (duplicates ≥ 0); payment effects = 1; done |
| C3 | crash after a redirect | S06 flow, INV-1002, `CRASH_BEFORE_STEP=approval` (or the first step of approval) | After restart: parks at approval (same route); classify post exec = 1; approve, then done |
| C4 | crash between pre mutate and node | S16b-like pre on pay (cap 9000, INV-1004), `CRASH_BEFORE_STEP=pay` after approval | After restart: payment calls = 1 with amount 9000; pay pre exec = 1 |
| C5 | kill while parked with pre done | S10a, INV-1001, external SIGKILL while waiting at approval, restart, approve | approval pre exec = 1; done |
| C6 | retry on an effect node | New flow F-EFF: `send` (`mail.send@1`), post code `max_retries: 1`, `allow_effect_retry: true`, retry with a corrected subject; mock delay on mail.send in attempt 2, external kill during attempt 2 | mail.send effects = 2 (attempts 1 and 2, distinct keys), not 3; duplicates ≥ 1 after recovery; done |
| F1 | fork from a node with pre-hooks | Completed S09 run, INV-1002; `POST /runs/:id/fork-node {node: "pay"}` maps to the first `pay#pre:*` step id | Forked run done; pay pre-hooks exec +1 each; nodes before pay not re-executed (mock counts unchanged for them); payment effects stay 1, duplicates +1 (lineage key) |

Every scenario records:
- pass or fail;
- the assertion values;
- the step list (`id:name`);
- the hook-exec counts;
- the mock counters.

Also report **engine changes needed beyond §3–§6** per scenario (feeds R6).

## 11. Tests and lint
- `npm run check:static` runs the static checker against `flows/` and asserts the expected codes: S14, S14c, S18d, and a valid set.
- `npm run scenarios [-- --only S06,C3]` runs the matrix and writes `results/<ts>.json` and `results/<ts>.md`.
- `npm run lint`: an adapted copy of `core-dbos/tests/lint.mjs`. It proves that every outbound call site in `interpreter.ts` or `hooks.ts` sits after a `policy.check`, and it reports the new count.
- `npm run desugar` runs §7 and stores the validator outputs under `desugar/results/`.
- `npm run measure` runs §8 and writes `results/measure-<ts>.json`.
- `npm run typecheck`.

## 12. Report contract
- **`node-hooks/REPORT.md`** must contain:
  - Built;
  - the scenario results table;
  - the desugaring results;
  - measurements;
  - the decision-rule application, R1–R6, each with its evidence;
  - deviations;
  - unresolved;
  - repro.
- **`.orchestration/runs/20261024-node-hooks/reports/NH.json`**, in the add-phase0-spikes §10 shape.
- The honesty rules of add-phase0-spikes §10 apply verbatim:

  > A failed check reported honestly beats a fabricated pass. Report errors and partial results; never claim a test passed without showing its output. Never print, copy or log secrets. No git commits (the user has not asked for any). If you run out of time, return `partial` with evidence and what remains.

## Amendments

**2026-10-24, before results (implementer, operational).** `CRASH_BEFORE_STEP=<node id>` fires immediately before the node's own unit, after its pre-hooks, rather than at the start of the visit. C4 needs a crash between the pre-hook mutation and the node. For `human.approval`, it fires before `setEvent`.

**2026-10-25, POST-RESULT (orchestrator; recorded so R2 is not read as cleanly met).**
- **R2's precondition was adapted after the results.** R2's fallback requires "fused mode to pass C1–C4 too".
  - C1 cannot run as written in fused mode, because no `pay#post:*` step exists to crash before. The implementer wrote C1f (crash before the `pay` step) after seeing this; it passes.
  - C4f drops one mode-specific pre-crash assertion. C2 and C3 ran unchanged and pass.
  - C2f found that fused pure pre-hooks re-execute after a kill inside the node step. That is acceptable only because hooks are pure (QuickJS: no I/O, frozen `Date`, seeded `Math.random`).
- **R2's outcome is within host noise.**
  - The implementer measured 3.09 ms per hook execution against the 3 ms limit; the repetition range was 2.4–4.2 ms, at load average 8–11.
  - The orchestrator's single re-run, at load average 23–92, gave 17.0 ms per hook execution and 248 runs/min for H2 separate. That fails both of R2's conditions.
  - The direction is the same in both: fused pure hooks are far cheaper, because a separate hook step costs about 5.9 Postgres commits.
  - R2 is applied as pre-registered (fuse pure code hooks). Label: **indicative; precondition adapted post-result; absolute numbers load-sensitive.**
- **The X2 engine fix was made after a failure.** A skipped node's output taint is now exactly its input taint, plus a block's own `untrusted:` label, with no `extracted:` relabel. All final runs postdate the fix.
- **X3 is a finding the pre-registered R4 does not cover.** A declared route (`routes: [pay]` on `classify`) skipped the human approval: INV-1001 was paid 2,450 with no decision. The orchestrator reproduced this independently (probe V1). R4's literal conditions are not triggered. The architecture nevertheless treats **post-hook redirects into effect nodes as blocked for Phase 1** until a static rule and an exit test exist.
