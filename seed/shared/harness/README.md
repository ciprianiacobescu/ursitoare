# Ursitoare recovery harness (M1)

Engine-agnostic runner for **RT-0 .. RT-6** (design.md section 6). The **harness is the killer**: it starts a run through your adapter, polls the mocks' `/calls` endpoints until the trigger event is recorded, then calls `adapter.kill()` itself, restarts, drives the human signal, and asserts through the mocks' counters and `adapter.status()`. Engines never crash themselves.

```bash
shared/mocks/start-all.sh                      # mocks must be up (or pass --start-mocks)
node shared/harness/run.mjs --adapter <path-to-adapter.mjs> --tests RT-0,RT-1,RT-2,RT-3,RT-4,RT-5,RT-6
node shared/harness/run.mjs --list             # list tests
```

Exit code: `0` all selected tests passed, `1` any FAIL or ERROR, `2` usage / preflight problem (mocks down, bad adapter). Each run writes `shared/harness/results/<adapter.name>-<timestamp>.json` (no colons) with per-check evidence, notes, events and a mocks snapshot per test.

| flag / env | default | meaning |
|---|---|---|
| `--adapter PATH` | required | ES module whose default export is the adapter |
| `--tests LIST\|all` | all | e.g. `RT-0,RT-4` |
| `--timeout-ms N` / `HARNESS_TIMEOUT_MS` | 60000 | per-wait timeout (waiting for park / terminal / trigger). RT-5 uses at least 60 s for the final wait |
| `--grace-ms N` | 0 | RT-1 only: sleep this long after seeing `classify` before the kill (see RT-1 note) |
| `--start-mocks` | off | run `mocks/start-all.sh` if the mocks are down, `stop-all.sh` at the end |
| `--keep-engine` | off | do not call `adapter.stop()` at the end |
| `--results-dir DIR` | `shared/harness/results` | |
| `HARNESS_VERBOSE=1` | off | print the event log while running |
| `MOCK_LLM_URL`, `MOCK_TOOLS_URL`, `MOCK_N8N_URL` | `http://127.0.0.1:1890{1,2,3}` | where the harness reaches the mocks |

## Adapter contract (what M2 and M3 implement)

```js
export default {
  name,
  async start(),   // start engine processes/containers, resolve when ready
  async kill(),    // external SIGKILL / docker kill of the worker (and for RT-2 the server)
  async restart(),
  async startRun(flowPath, input) -> runId,
  async signal(runId, nodeId, payload),  // human approval: {decision:'approved'|'rejected'}
  async status(runId) -> {status:'running'|'waiting'|'completed'|'failed', node?, output?, error?}
}
```

Precise semantics (the harness relies on these):

* **`name`**: short string used in the results file name (`dbos-ts`, `conductor`).
* **`start()`**: bring up everything the engine needs (containers, DB, worker, callback receiver) and resolve only when `startRun` / `status` will work. Should start from a clean slate if that is cheap; it is called once, before the first test.
* **`kill(target?)`**: optional `target` is `'worker'` or `'server'`. It must be a **hard, external, unclean** kill (`process.kill(pid,'SIGKILL')`, `docker kill`), never a graceful stop, and must resolve once the victim is dead. Must be idempotent (killing something already dead is not an error). Adapters that cannot distinguish may ignore `target`.
  * `'worker'`: the process that executes steps **and hosts the delegate callback endpoint** (the URL the engine passes to mock-n8n as `callback_url`). RT-5 relies on this: it kills `'worker'` and then checks that mock-n8n saw failed callback attempts. If your callback receiver lives in another process, `kill('worker')` must take that down too.
  * `'server'`: the engine server / DB-backed engine core (Conductor server, the DBOS runtime process). For a single-process engine `'worker'` and `'server'` are the same. Do **not** kill the database volume; durable state must survive.
  * RT-1, RT-3, RT-5 call `kill('worker')`; RT-2 calls `kill('server')`.
* **`restart()`**: bring back **everything that is currently down** (also fine to restart all) and resolve when ready. Unfinished runs must resume by themselves (the harness does nothing but call `restart()`, then poll `status` and send the signal).
* **`startRun(flowPath, input)`**: `flowPath` is an absolute path to a Format v0 YAML (`shared/flows/rf-1-invoice-intake.yaml`, or `shared/harness/flows/rf-1-timeout-5s.yaml` for RT-4); `input` is `{invoice_id}`. Resolve with a run id as soon as the run is **created and durable** (it need not have started executing). Register or cache the definition as needed; note the RT-4 variant has a different `flow:` id (`invoice-intake-timeout-5s`) so name+version registries do not collide.
* **`signal(runId, nodeId, payload)`**: the harness sends `nodeId:'approval'` and payload `{decision:'approved'|'rejected', approver:'harness', comment:'...'}` (the three fields of the `human.approval` output). It only signals after `status` has reported `waiting`, and retries up to 5 times if the call throws.
* **`status(runId)`** returns:
  * `status`: `'running'` | `'waiting'` (parked on a human node) | `'completed'` | `'failed'`.
  * `node` (optional but recommended): while waiting, the parked node id (`'approval'`); when terminal, the id of the `end` node reached (`'done'` or `'rejected'` for RF-1; for `failed`, the failing node). If present the harness asserts it (`done` / `rejected`); if absent it infers the branch from mock counts and records a note.
  * `output` (optional): the end node's output (`{payment_id}` on `done`); if present the harness checks it equals the payment id the mock created.
  * `error` (required when `failed`): any JSON value; RT-6 requires `JSON.stringify(error)` to contain the string `policy_denied`.
  * Must **not throw for an unknown run**: return `{status:'failed', error:{code:'run_not_found'}}`. Transient errors while the engine is restarting are tolerated (the harness retries polling until its timeout).
* **`stop()`** (optional extension): clean shutdown at the end of the session; the harness calls it unless `--keep-engine`.

Note: RF-1's `rejected` end node has `status: completed`, so a rejected invoice is a `completed` run whose terminal node is `rejected`.

## Tests

All counts are absolute (mocks are reset before each test, and before each RT-0 sub-run). "Trigger" = the mock log entry the harness polls for (every 5 ms).

| id | scenario (harness actions) | assertions |
|---|---|---|
| RT-0 | Three runs in sequence: INV-1002 (auto-approve), INV-1003 (reject), INV-1001 (wait for `waiting`, signal approved) | each `completed`; terminal node `done` / `rejected` / `done`; `extract`=1 and `classify`=1; classify outcome `auto_approve` / `reject` / `needs_review`; payment effects 1 / 0 / 1 (amount, currency, vendor, reference match the fixture, e.g. `120.5 USD V-GLOBEX INV-1002`); `mail.send` effects 0 / 1 (subject has the invoice id) / 0; mock-n8n webhooks 1 / 0 / 1 |
| RT-1 | INV-1001. Trigger: mock-llm logged `classify`. `kill('worker')`, `restart()`, wait `waiting`, approve | `completed` / `done`; `extract`=1, `classify`=1; payment effects 1 |
| RT-2 | INV-1001. Wait `waiting`; `kill('server')`; `restart()` | still `waiting` after restart; approve; as RT-1 |
| RT-3 | INV-1002 with `erp_create_payment` delay 2000 ms. Trigger: mock-tools logged `erp.create_payment`. `kill('worker')` (asserted to land inside the delay), mock delay set to 0, `restart()` | `completed`; payment **effects = 1** (calls and duplicates are reported; duplicates >= 1 is fine) |
| RT-4 | INV-1001 on `flows/rf-1-timeout-5s.yaml`; wait `waiting`; never signal | terminal `completed` / `rejected` between 3.5 s and 15 s after parking; `mail.send` effects 1; payment calls 0 |
| RT-5 | INV-1002 with mock-n8n `DELEGATE_DELAY_MS=2000` (runtime override). Trigger: mock-n8n received the webhook. `kill('worker')`; wait for >= 2 failed callback attempts; `restart()` | `completed`; payment effects 1; mock-n8n `callbacks_delivered >= 1`, `gave_up = 0`, `callbacks_failed >= 2` while down. Webhook count is informational |
| RT-6 | INV-1004; wait `waiting`; approve | `failed` with `policy_denied` in `error`; `erp.create_payment` **calls = 0** and effects = 0 (denied before reaching mock-tools) |

Deviations from design wording, all extensions: RT-3 sets the delay at runtime via `POST /reset {"delays":...}` (the harness cannot restart mock-tools between tests) and clears it with `POST /config` after the kill; RT-5 raises `DELEGATE_DELAY_MS` to 2000 so the kill fits before the first callback attempt; RT-4 additionally bounds the timing.

### Timing caveats

* RT-4's 3.5 s lower bound is measured from the harness's first observation of `waiting`, not from the engine's real park time; an engine whose status lags (task polling) can shrink the measured window.
* RT-5: mock-n8n gives up 30 s after its first callback attempt (`gave_up`, test fails). If an engine restart takes more than about 25 s, start the mocks with a larger `CALLBACK_RETRY_WINDOW_MS` (env only, no runtime override).

### RT-1 is a race by design

The mock logs `classify` *before* answering. `kill()` fires a few ms after the log line, so it can land before or after the engine checkpoints the answer. Passing requires `classify`=1, so an engine that checkpoints slower than the harness polls (about 5 ms + kill latency) will show `classify`=2. That is a genuine at-least-once window, not a harness bug, but a docker-based `kill` that takes 100 ms makes it very unlikely, while `--grace-ms 30` pushes the kill to after the checkpoint when you want to separate "re-execution on crash" from "slow checkpoint". Evidence recorded: `kill(worker): issued N ms after the mock logged the trigger`. Report `--grace-ms` if you use it.

## Self-test adapters (prove the harness, not an engine)

* `fake-adapter.mjs`: `fake-engine.mjs` is a hard-coded RF-1 in plain JS (child process, per-run JSON journal under `.fake-state/`, resumes unfinished runs on start, idempotency key `<run_id>:pay`, policy stub denying `erp.create_payment@1` when `amount > 10000`, 5 s timeout detected from the flow file). Its callback listener uses an OS-assigned port persisted across restarts (the one deliberate departure from "only ports 18901-18903"; no fixed port is bound). **Expected: RT-0..RT-6 all pass.**
* `fake-adapter-volatile.mjs`: same fake, in-memory only. A kill loses every run. **Expected: RT-1, RT-2, RT-3, RT-5 fail/error** (durability tests may legitimately fail against a non-durable engine); RT-0, RT-4, RT-6 pass.
* Count-based negative controls on the durable fake: `FAKE_BUG=rerun-llm` (LLM results are not journaled) must fail RT-1/RT-2 on `extract`/`classify` counts; `FAKE_BUG=fresh-key` (idempotency key changes per attempt) must fail RT-3 on payment effects. Run: `FAKE_BUG=fresh-key node run.mjs --adapter ./fake-adapter.mjs --tests RT-3`.

## Writing an adapter: checklist

1. Send `X-Ursitoare-Call: <run_id>:<node_id>:<attempt>` on every LLM call (400 otherwise).
2. Use an `Idempotency-Key` for `effect != read` blocks that is stable across retries and restarts of the step.
3. The delegate callback receiver must be reachable at the `callback_url` you gave mock-n8n **after** `restart()` (same host:port), and must answer 2xx only after persisting the result.
4. `status().node` and `.output` make RT-0 stronger; add them if the engine can.
5. Keep ports to your allocation (M2: 18910 + Postgres 55432; M3: 18080, 18127, 18920).
