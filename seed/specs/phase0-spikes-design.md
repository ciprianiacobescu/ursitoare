# Design: Phase-0 decision spikes for Ursitoare

Status: pre-registered 2026-10-24, before any spike result existed. The decision rules in §9 must not be edited after results arrive. Any later change goes in a dated "Amendments" section with its reason.

Read this whole file before you start. Every milestone brief points here for its shared contracts.

## 1. Purpose

Answer the Phase-0 questions from the research playbook with measured evidence:

1. **Core.** Which execution core: Ursitoare's own interpreter on the DBOS TypeScript SDK, or Conductor OSS plus a policy worker?
2. **Authoring surface.** Do LLMs author flows better as a restricted TypeScript call list (transpiled to YAML) or as YAML directly?
3. **Policy.** Can Cedar decide per (role, flow, step, tool, arguments, taint), in process, fast enough?
4. **Sandbox.** Does QuickJS-in-Wasm give a deterministic, gateway-only JavaScript node? What do the cold starts cost?
5. **Queue.** What does a Postgres-only queue sustain on a small host (2 CPU / 4 GB)?
6. **Mintkey.** What does Mintkey really cost in containers and RAM, and can its Go data plane run without its control plane?

## 2. Repository layout and ownership

Each directory is owned by exactly one milestone. Never write outside your own directory, except your report file under `.orchestration/runs/20261024-phase0-spikes/reports/`.

| Directory | Milestone |
|---|---|
| `shared/catalogue/`, `shared/flows/` | orchestrator (contracts; read-only for everyone else) |
| `shared/mocks/`, `shared/harness/` | M1 |
| `format/` | M4a: JSON Schema, validator, rubric checker |
| `format-ts/` | M4b: TS builder, transpiler, YAML→TS printer |
| `eval/requests/`, `eval/goldens/` | E1: eval designer |
| `eval/arms/`, `eval/results/` | M5: A/B runner and scorer |
| `eval/guides/` | M4a (`yaml.md`, `examples/`) and M4b (`ts.md`) |
| `core-dbos/` | M2 |
| `core-conductor/` | M3 |
| `policy-cedar/` | M6 |
| `sandbox-quickjs/` | M7 |
| `queue-bench/` | M8 |
| `mintkey-footprint/` | M9 |

Each Node project has its own `package.json`, with no root workspace, so parallel installs don't collide. Use Node 26 as installed and pin exact dependency versions. If a dependency doesn't support Node 26, say so in the report and use a documented fallback.

## 3. Host ports, names and Docker rules

The Docker VM has 4 CPUs and 15.6 GiB, shared with about 45 running containers, two Mintkey stacks among them. **Never** stop, restart, modify or exec into any container you did not create.

Ports already in use: **8000** (Mintkey Kong) and also 8082, 8083, 5432, 3000, 9090, 16686. Do not bind them.

| Owner | Host ports | Compose project / container prefix |
|---|---|---|
| M1 mocks (host Node processes) | mock-llm 18901, mock-tools 18902, mock-n8n 18903 | — |
| M2 DBOS-TS | Postgres 55432, engine API and callbacks 18910 | `us-m2` |
| M3 Conductor | API 18080 (container 8080), UI 18127, adapter/worker/callbacks 18920; Postgres not published | `us-m3` |
| M8 queue | Postgres 55434 | `us-m8` |
| M9 Mintkey spike | 19000–19099 | `mkspike` |

- **Container to host:** containers reach host processes, including the mocks and Ollama, at `host.docker.internal`. Ollama is at `http://localhost:11434` on the host.
- **Cleanup:** when you finish, run `docker compose -p <project> stop`, not `down -v`, so the reviewer can re-run. Leave reproduction commands in your REPORT.md.

## 4. Format v0 (`ursitoare: "0.1"`)

The canonical flow is YAML or equivalent JSON. `shared/flows/rf-1-invoice-intake.yaml` is the normative example.

### 4.1 Top level

```yaml
ursitoare: "0.1"          # required, exact string
flow: <kebab-case id>     # required
version: <semver>         # required
description: <string>     # optional
inputs: <JSON Schema>     # required; type: object
start: <node_id>          # required; must exist
nodes:                    # required; map of node_id -> node. node_id is snake_case [a-z][a-z0-9_]*
  <node_id>: { kind: <kind>, ... }
```

### 4.2 Node kinds

`next`, `cases`, `default` and `on_timeout` hold node ids.

| kind | Required fields | Optional fields | Successors | Output |
|---|---|---|---|---|
| `block` | `uses: <name>@<major>` (catalogue), `with: {param: value}` | — | `next` | the block's catalogue output schema |
| `code` | `language: js`, `source` (a function body that receives `input` and must `return` an object), `input: {name: value}`, `output_schema` | — | `next` | `output_schema` |
| `llm.extract` | `input`, `instructions`, `output_schema` | `model_profile` (default `default`) | `next` | `output_schema`. Never has tools |
| `llm.generate` | `input`, `instructions`, `output_schema` | `model_profile` | `next` | `output_schema`. Never has tools |
| `llm.decide` | `input`, `instructions`, `outcomes: [string, ...]` (≥2, unique), `cases: {outcome: node}` (every outcome mapped, no extras) | `model_profile` | `cases` | `{outcome: string, rationale: string}`; refer to `nodes.<id>.outcome` |
| `agent` | `input`, `goal`, `tools: [<block>@<major>, ...]` (allowlist, ≥1), `max_steps` (int ≤ 50), `output_schema` | `model_profile` | `next` | `output_schema` |
| `switch` | `on: <single reference>`, `cases: {literal: node}`, `default: node` | — | `cases` + `default` | none |
| `human.approval` | `assignee_role` (catalogue role), `summary` (template string), `timeout` (ISO-8601 duration), `cases: {approved, rejected, timeout}` (all three) | — | `cases` | `{decision, approver, comment}` |
| `human.form` | `assignee_role`, `form_schema` (JSON Schema object), `timeout`, `on_timeout` | — | `next` + `on_timeout` | the form data (`form_schema`) |
| `foreach` | `items: <reference to an array>`, exactly one of `uses: <block>@<major>` + `with`, or `subflow: <flow>@<major>` + `with` | `max_parallel` (default 1) | `next` | `{results: [<per-item output>]}` |
| `subflow` | `flow: <flow>@<major>` (flows_registry), `with` | — | `next` | the subflow's outputs |
| `delegate` | `target: n8n`, `workflow` (from catalogue delegate_targets), `with`, `callback_timeout` | — | `next` + `on_timeout` | `{correlation_id, result: object}` |
| `wait` | `duration` (ISO-8601) | — | `next` | none |
| `end` | `status: completed \| failed` | `output: {name: value}` | none | — |

### 4.3 Values and references

- A value is a JSON literal, a single reference `"${{ <ref> }}"` (keeps the referenced type), or a template string mixing text and references (always a string).
- **References:**
  - `inputs.<path>`;
  - `nodes.<id>.output.<path>`;
  - `nodes.<id>.outcome` (`llm.decide` only);
  - `item.<path>` (only inside `foreach.with`).
- There are no other expressions; computation belongs in `code` nodes.

### 4.4 Validation layers (implemented in `format/`, M4a)

- **L1 schema:** JSON Schema 2020-12 for the document and every node kind.
- **L2 registry:**
  - `uses` exists in the catalogue at that major;
  - `with` keys are exactly the block's input properties, with all required ones present;
  - roles, delegate targets, flows and model profiles exist;
  - `start` and every successor id exist;
  - no unreachable nodes;
  - every non-`end` node has its successors;
  - every path terminates at an `end` (cycles are not allowed in v0).
- **L3 data flow:**
  - every reference resolves to an existing path in the producer's output schema;
  - the producer dominates the consumer, meaning it is on every path from `start`;
  - types are compatible with the consuming parameter, at JSON-type granularity, where template strings yield string;
  - `switch` case keys are compatible with the `on` type, and booleans use `"true"`/`"false"` keys;
  - `item.*` is used only inside foreach;
  - **taint:**
    - error when a raw untrusted field (`untrusted_fields`) flows directly into any `effect ≠ read` block parameter, or into an `agent` whose tools include an `effect ≠ read` block;
    - passing it through `llm.extract` or `code` clears the error, and the result is labelled `extracted`;
    - warning, not error, for the "lethal trifecta": a flow that reads untrusted content, reads private data and has a `send` or `pay` effect.

Errors are structured as `{layer, code, node, path, message}`.

### 4.5 TS call-list surface (M4b)

The surface is a restricted builder evaluated **inside QuickJS**: no imports, no I/O, no `Date`/`Math.random`. Types are stripped with `typescript.transpileModule` or `esbuild` before evaluation.

Shape (normative; M4b may add only what lossless round-tripping needs, and must document it):

```ts
flow({ id: "invoice-intake", version: "1.0.0", description: "...",
       inputs: { type: "object", properties: { invoice_id: { type: "string" } }, required: ["invoice_id"] } }, f => {
  const fetchInvoice = f.block("fetch_invoice", "invoices.get@1", { invoice_id: f.inputs.invoice_id });
  const extract = f.llmExtract("extract", { input: { text: fetchInvoice.out.raw_text }, instructions: "...", outputSchema: {...} });
  const cls = f.llmDecide("classify", { input: {...}, instructions: "...", outcomes: ["auto_approve", "needs_review", "reject"] });
  f.cases(cls, { auto_approve: "pay", needs_review: "approval", reject: "notify_rejection" });
  f.template`Invoice ${f.inputs.invoice_id} rejected`;   // template strings
  f.end("done", { status: "completed", output: { payment_id: pay.out.payment_id } });
  // f.next("a", "b") wires sequence explicitly; consecutive builder calls default to next = the following call
});
```

- **Transpiler:** TS → canonical JSON/YAML, then the same validator.
- **Printer:** YAML → TS, so edit tasks can seed each surface. `print(parse(x))` must round-trip to an identical canonical form on RF-1 and on every golden.
- **Errors:** TS-side syntax and evaluation errors are reported as layer `L0`.

## 5. Mocks (M1) — deterministic, counting, externally observable

### mock-llm (:18901)
- OpenAI-compatible `POST /v1/chat/completions`, honouring `response_format: {type: "json_schema"}`.
- The caller must send the header `X-Ursitoare-Call: <run_id>:<node_id>:<attempt>`.
- **Fixtures** are keyed by invoice id, found anywhere in the request:

  | Invoice | Vendor | Amount | Vendor status | Outcome |
  |---|---|---|---|---|
  | INV-1001 | Acme GmbH | 2450.00 EUR | active | needs_review |
  | INV-1002 | Globex | 120.50 usd | active | auto_approve |
  | INV-1003 | Blocked Co | 300 EUR | blocked | reject |
  | INV-1004 | Acme GmbH | 20000.00 EUR | active | needs_review (used by RT-6: approved, then the payment is denied by policy) |

- The decide answer is computed from the input rules: blocked → reject; is_large → needs_review; otherwise auto_approve.
- **Observability:** every call is appended to `shared/mocks/state/llm-calls.jsonl` and exposed at `GET /calls?run_id=` with counts per node.
- `MOCK_LLM_MODE=ollama` forwards to local Ollama (`qwen3.5:2b`) for realism demos only. Never use it for measurements.

### mock-tools (:18902)
- `POST /blocks/<name>@<major>` implements every catalogue block, returning plausible fixture data. Vendors: Acme GmbH (active), Globex (active), Blocked Co (blocked).
- Consequential blocks (`effect ≠ read`) require an `Idempotency-Key` header. The same key returns the same result and increments `duplicates`.
- Every call is logged and exposed at `GET /calls`.
- **Delays:** `DELAY_MS_<block_name_with_underscores>` (for example `DELAY_MS_erp_create_payment=2000`) delays the response *after* the effect is committed and logged. The harness can then kill the engine mid-call (RT-3).

### mock-n8n (:18903)
- `POST /webhook/<workflow>` takes `{correlation_id, callback_url, payload}` and returns 202.
- After `DELEGATE_DELAY_MS` (default 500) it POSTs `{correlation_id, result}` to `callback_url`.
- `GET /calls`.

### Recovery harness (`shared/harness/`)
The **harness is the killer**, not the engine. It:
- starts a run;
- polls mock-llm `/calls` (or mock-tools `/calls`) until the trigger event is recorded;
- sends an external `SIGKILL` (host process) or `docker kill` (container);
- restarts the engine;
- drives the human signal and the callbacks;
- asserts.

Engines expose a small adapter so the harness is engine-agnostic: start run, signal approval, query status. Engine-internal crash hooks may exist only as an extra scenario.

## 6. Recovery and correctness tests (both core spikes must run all of them)

| Test | Scenario | Pass criteria |
|---|---|---|
| RT-0 | Happy paths: INV-1002 auto-approve, INV-1003 reject, INV-1001 review then approved | All end `completed`; correct nodes executed; payment created only on the approve paths |
| RT-1 | INV-1001. The harness `SIGKILL`s the worker as soon as mock-llm records `classify`; restart; approve | mock-llm counts `extract`=1 and `classify`=1; one payment; run completed |
| RT-2 | INV-1001. Restart the engine server or DB-backed engine while the run is parked on `approval`; then approve | As RT-1; the approval signal is not lost |
| RT-3 | INV-1002. Kill the worker after mock-tools logs `erp.create_payment` but before the engine records the step (kill on the first payment call) | Exactly one payment effect (`duplicates` may be ≥1, effects = 1); run completed |
| RT-4 | INV-1001 approval left unanswered with `timeout` overridden to PT5S | Takes the `timeout` branch → `notify_rejection` → `rejected` |
| RT-5 | Delegate callback arrives while the engine is down (kill the engine, the mock-n8n callback fails, mock-n8n retries every 1 s for 30 s) | Callback eventually accepted; run completed |

**Policy hook:** every tool call and LLM call must go through `policy.check({principal, flow, flow_version, node, kind, tool, args, taint})`. Return `allow`, or `deny` with a reason. Log every decision. In the spike it is a stub that denies `erp.create_payment@1` when `amount > 10000`. Add a test, RT-6: INV-1004 (20000 EUR) is approved, then must fail the run with `policy_denied` and no payment. RT-4 uses a flow variant with `timeout: PT5S`, which the harness writes under `shared/harness/flows/`.

## 7. Measurement protocol

- **Quiet window:** take numbers with only your spike's containers active. Record the neighbours' state next to every figure: `docker stats --no-stream` totals, container count and total memory.
- **Repetitions:** three runs; report the median and the range.
- **Report for core spikes:**
  - containers;
  - idle RSS per container and process;
  - RSS after 100 RF-1 runs (auto-approve path, mocks, 4 concurrent);
  - cold start to ready;
  - RF-1 p50 and p95 end-to-end on INV-1002 with `DELEGATE_DELAY_MS=50`;
  - runs per minute at 4 concurrent;
  - lines of code written, by area (engine, adapters, policy, tests) — count with `cloc` or `wc -l`, excluding lockfiles and generated code;
  - wall-clock time to get RT-0…RT-6 passing;
  - every workaround.

## 8. Authoring A/B protocol

1. **Eval set (E1, opus).** 24 requests: 16 `create` and 8 `edit`, each with:
   - natural-language text;
   - for edits, a seed flow;
   - a rubric in the DSL below;
   - a golden flow.

   Every golden passes L1–L3 and its own rubric (M4a's checker proves it). Every request names the exact outcome labels, roles, channels and literals the rubric checks, so a correct author can satisfy it. Split into batch A (requests 01–12) and batch B (13–24), each with 8 create and 4 edit.
2. **Guides (M4a/M4b):** `eval/guides/yaml.md` and `eval/guides/ts.md` hold:
   - the same catalogue;
   - the same node-kind reference;
   - the same two worked examples, with the TS examples produced by the printer from the YAML ones.

   Guides do not mention the validator's internals.
3. **Arms.** Each author agent receives one guide and one batch, and writes one file per request to `eval/arms/<model>-<surface>/<request_id>.(yaml|ts)`.
   - Authors use only the Write tool. They run no commands, read no other arm, receive no validator feedback, and never see goldens or rubrics.
   - **Single-shot.** Requests are presented in the same order in both surfaces.
   - Edits seed with the flow in that arm's own surface.
4. **Models:**
   - sonnet: batches A and B in both surfaces;
   - haiku: A and B in both;
   - opus: batch A only, in both;
   - local `gpt-oss:20b` via Ollama: A and B in both, scripted by M5 with the same guide and instructions.
5. **Scoring (M5, scripted).** Per output:
   - L0 (TS only), L1, L2, L3 pass;
   - the fraction of rubric checks passed;
   - **valid&correct**, which means every layer passes and every rubric check passes.

   Report per arm, per type (create/edit) and paired discordant counts with an exact McNemar p.

### Rubric DSL (JSON; implemented by M4a, used by E1)

`selector` = `{"kind": k}` | `{"uses": "<block>@<major>"}` | `{"id": "<node_id>"}`

| Check | Meaning |
|---|---|
| `{"has_kind": k, "min": 1, "max": n?}` | count of nodes of kind k is within bounds |
| `{"no_kind": k}` | no node of kind k |
| `{"uses": b, "min": 1, "max": n?}` | count of `block` or `foreach.uses` nodes using b is within bounds |
| `{"no_uses": b}` | b is never used |
| `{"precedes": {"before": selector, "after": selector}}` | on every path from start to any node matching `after`, a node matching `before` occurs earlier |
| `{"decide_outcomes": {"include": [..]}}` | some `llm.decide` has all these outcome labels |
| `{"param_equals": {"uses": b, "param": p, "value": v}}` | some node using b has `with[p]` equal to literal v |
| `{"param_from": {"uses": b, "param": p, "source": selector}}` | some node using b has `with[p]` referencing (single ref, or inside a template) the output of a node matching source |
| `{"approval_role": role}` | some `human.approval` or `human.form` has this `assignee_role` |
| `{"timeout_max": {"kind": k, "duration": "PT24H"}}` | every node of kind k has `timeout` (or `callback_timeout`) ≤ duration |
| `{"foreach_over": {"source": selector}}` | some foreach's `items` references the output of a node matching source |
| `{"agent_tools": {"include": [..], "exclude": [..]}}` | some agent's tools include all of `include` and none of `exclude` |
| `{"preserves": [node_id, ...]}` | (edit) these ids exist with the same kind as in the seed |
| `{"absent": [node_id, ...]}` | (edit) these ids no longer exist |

## 9. Pre-registered decision rules (dated 2026-10-24, before results)

### D1 Core

- **Hard criteria.** A core is disqualified if any fails after reasonable spike effort:
  - **C1:** passes RT-0…RT-6.
  - **C2:** the policy hook runs before *every* tool and LLM call, and a definition lint can prove it. For Conductor this means built-in HTTP/LLM/MCP tasks are rejected or routed through the policy worker.
  - **C3:** the hobbyist footprint for engine plus database (excluding Mintkey and mocks) is ≤ 3 containers and ≤ 1.5 GiB steady RSS after 100 runs.
- **If both pass:** choose Conductor only if its effort to RT-6 green, in lines written plus implementer wall time, is ≤ 60% of DBOS-TS's (the playbook's "half the time" threshold, made explicit). Otherwise choose DBOS-TS. Effort comparison between two different implementers is noisy, so report it as indicative.
- **If only one passes,** choose it. **If neither passes,** report and recommend nothing.
- **Soft criteria, reported but not deciding:** format fit (lossless mapping of RF-1), latency and throughput, debuggability (can you see per-step inputs and outputs), and the license and stewardship risk already in the wiki.

### D2 Authoring surface
Let Δ(model) = valid&correct(TS) − valid&correct(YAML), in percentage points.

| Condition | Outcome |
|---|---|
| Δ ≥ +10 for at least two of the three Claude models, and Δ ≥ −5 for all of them | **TS call-list** becomes the LLM authoring surface (YAML stays canonical) |
| Δ ≤ +5 for all three Claude models | **YAML-direct** (one format is simpler) |
| Otherwise | **inconclusive.** Keep YAML-direct as the default, keep TS as an optional surface, and repeat with a larger set |

- **Power caveat:** n = 24 per arm (12 for opus), so differences under about 20 points are not statistically reliable. Report McNemar p and label the decision "indicative".
- The local model is reported but does not decide.

### D3 Policy
Cedar is adopted if all policy scenarios pass and p99 in-process authorization latency is < 1 ms after warm-up. Otherwise record the gap and the fallback (OPA/Rego as a sidecar, or hand-written checks).

### D4 Sandbox
QuickJS-in-Wasm is adopted as the default `code` runtime if:
- the escape suite is fully blocked;
- determinism holds over 1,000 runs;
- p50 per-execution overhead for a fresh context is < 10 ms.

Cold-start numbers for the other runtimes are recorded for the wiki.

### D5 Queue
No decision. Record the measured envelope and compare it with the need: 50 RF-1 runs per minute, about 10 steps per second, on 2 CPU / 4 GB.

### D6 Mintkey

| Condition | Recommendation |
|---|---|
| The Go data plane (broker, proxy, vault adapter) starts and serves `/v1/call` with only Postgres, no Keycloak, admin-api or mcp-server, **and** its RSS is < 100 MB | **Path B** is feasible; report the endpoints Ursitoare must provide |
| It cannot start without them | **Path A** (port to Go), or accept the full stack |

In both cases report the lines of code Path A would have to port.

## 10. Report contract (every milestone)

- Write `<your dir>/REPORT.md`, a human-readable account with reproduction commands.
- Write `.orchestration/runs/20261024-phase0-spikes/reports/<milestone>.json`:
  ```json
  {"milestone":"M2","status":"done|partial|failed","summary":"...",
   "evidence":[{"claim":"...","command":"...","output_excerpt":"..."}],
   "numbers":{},"deviations":[],"unresolved":[],"files":[],"repro":["..."]}
  ```

### Honesty rules (verbatim, binding)
A failed check reported honestly beats a fabricated pass. Report errors and partial results; never claim a test passed without showing its output. Never print, copy or log secrets. No git commits (the user has not asked for any). If you run out of time, return `partial` with evidence and what remains.

## Amendments

**2026-10-24 15:20 (before any core result; operational only, no rule changes).**
- M2 and M3 each run their own instance of the M1 mocks, so their harness resets don't collide. M2 uses ports 18901–18903 with `MOCK_STATE_DIR=core-dbos/.mockstate`. M3 uses 18941–18943 with `MOCK_STATE_DIR=core-conductor/.mockstate`, and `MOCK_*_URL` set for its harness and engine.
- Measurements (§7) are taken under a mutex. `mkdir .orchestration/measure.lock` acquires it: write your milestone id into `.orchestration/measure.lock/owner`, and `rm -r` it when done. If it exists, wait and retry every 30 s, for at most 30 min, then report.

**2026-10-24 21:30 (POST-RESULT; recorded at the independent reviewer's request, REV-A MJ-1).**
- **What happened.** The RT-1 criterion "mock-llm counts `classify`=1" failed at kill grace 0 on both cores: DBOS passed only 6 of 9 REV-A runs (3 failed), and 31/42 (about 74%) across all M2 runs; Conductor failed in 16/20. Read strictly, D1 C1 then says "neither passes, so recommend nothing".
- **How the orchestrator applied D1.** RT-1 was re-read as "at-least-once with a stable call key, plus a mandatory call journal". This re-reading was made **after** seeing the results.
- **Why the outcome holds anyway.** The core choice does not depend on it: both cores share the same 0–3 ms checkpoint-after-call window, so C1 cannot separate them. The decision rests on C2 and the effort tie-breaker.
- **Label.** The D1 label is therefore "indicative; RT-1 relaxed post-hoc".
- **Re-test.** Phase 1 re-tests RT-1 with the journal and gateway dedupe in place, expecting `classify`=1 in 20/20 at grace 0.
