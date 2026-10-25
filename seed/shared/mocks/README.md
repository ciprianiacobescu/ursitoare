# Ursitoare Phase-0 mocks (M1)

Three deterministic, counting, externally observable mock services, run as **host Node processes** (no dependencies, Node >= 22; developed on 26.8).
Engines under test (M2 DBOS-TS, M3 Conductor) call these; the recovery harness (`shared/harness/`) reads their `/calls` endpoints to decide when to kill the engine.

| mock | port | purpose |
|---|---|---|
| mock-llm | **18901** | OpenAI-compatible `POST /v1/chat/completions`, deterministic answers from design section 5 |
| mock-tools | **18902** | `POST /blocks/<name>@<major>` for all 20 blocks of `shared/catalogue/blocks.v0.json` |
| mock-n8n | **18903** | `POST /webhook/<workflow>`, then a delayed, retrying callback |

## Start / stop

```bash
shared/mocks/start-all.sh      # starts all three, waits for /health, writes PID files + logs to shared/mocks/state/
shared/mocks/stop-all.sh       # SIGTERM via PID files (SIGKILL after 2 s)
node shared/mocks/selftest.mjs # hermetic self-test (35 checks); needs the ports free, so run stop-all.sh first
```

State files in `shared/mocks/state/` (git-ignored): `llm-calls.jsonl`, `tools-calls.jsonl`, `n8n-calls.jsonl` (truncated on every process start and on every `POST /reset`), `<mock>.pid`, `<mock>.log`.

Reachability: from host processes use `http://127.0.0.1:<port>`; from containers use `http://host.docker.internal:<port>`. The mocks bind `0.0.0.0` by default (containers need that); set `MOCK_HOST=127.0.0.1` if you only run host engines. They are unauthenticated and harmless, but do not leave them running on an untrusted network.

## Environment variables

| var | default | mock | meaning |
|---|---|---|---|
| `MOCK_LLM_PORT` / `MOCK_TOOLS_PORT` / `MOCK_N8N_PORT` | 18901 / 18902 / 18903 | each | listen port (keep the defaults; the harness assumes them; override its view with `MOCK_LLM_URL`, `MOCK_TOOLS_URL`, `MOCK_N8N_URL`) |
| `MOCK_HOST` | `0.0.0.0` | all | bind address |
| `MOCK_STATE_DIR` | `shared/mocks/state` | all | where JSONL logs and PID files go |
| `CATALOGUE_PATH` | `shared/catalogue/blocks.v0.json` | tools | catalogue to implement |
| `MOCK_LLM_MODE` | `mock` | llm | `ollama` forwards to Ollama (**demos only, never for measurements**) |
| `OLLAMA_URL` / `OLLAMA_MODEL` / `OLLAMA_TIMEOUT_MS` | `http://localhost:11434/v1/chat/completions` / `qwen3.5:2b` / 120000 | llm | ollama mode. Note qwen3.5 is a thinking model: it may spend its token budget on `reasoning` and return empty `content` |
| `DELAY_MS_<block_name_with_underscores>` | 0 | tools | e.g. `DELAY_MS_erp_create_payment=2000` (name = block name without `@major`, every non-alphanumeric char becomes `_`) |
| `MOCK_TOOLS_STRICT` | 1 | tools | `0` disables validation of request bodies against the block input schema |
| `DELEGATE_DELAY_MS` | 500 | n8n | delay between the 202 and the first callback attempt |
| `CALLBACK_RETRY_MS` / `CALLBACK_RETRY_WINDOW_MS` / `CALLBACK_ATTEMPT_TIMEOUT_MS` | 1000 / 30000 / 2000 | n8n | retry interval, total retry window from the first attempt (RT-5: "every 1 s for 30 s"), per-attempt timeout |

Every mock also has `GET /health`, `GET /calls`, `POST /reset`.

### Runtime overrides (extension to design section 5)

The harness runs RT-0..RT-6 in one process against already-running mocks, so env-only delays are not enough:

* `POST /reset` clears all state **and** resets runtime overrides to the env defaults. Optional JSON body: mock-tools `{"delays":{"erp_create_payment":2000}}`, mock-llm `{"delays":{"classify":500}}` (ms per node id, delays the LLM *response* after the call is logged), mock-n8n `{"delegate_delay_ms":2000}`.
* mock-tools `POST /config {"delays":{...}}` changes delays **without** clearing counters (RT-3 uses it to drop the delay after the kill).

## mock-llm (:18901)

`POST /v1/chat/completions` (also `/chat/completions`), non-streaming only (`stream:true` -> 400).

* **Required header** `X-Ursitoare-Call: <run_id>:<node_id>:<attempt>`. Missing or malformed (attempt must be a non-negative integer) -> `400`, not logged as a call (counted in `rejected`). `run_id` may itself contain `:`; the last two segments are attempt and node.
* **Call type** from `response_format.json_schema.schema`:
  * property `outcome` with an `enum` -> **decide**. Rules (design section 5), computed from the non-system messages, scanning for `vendor_status`, `is_large`, `amount` as JSON or `key: value` text: `vendor_status=blocked` -> `reject`; else `is_large=true` -> `needs_review` (if `is_large` is absent, `amount > 1000`); else `auto_approve`. Only if none of those keys is present does it fall back to an invoice id (INV-100x) in the messages. Keys are matched by name (with a left word boundary), so send exactly `vendor_status` / `is_large` / `amount`. Returns `{"outcome": ..., "rationale": "mock rule: ..."}`. If no signal is found, or the computed value is not in the schema enum, it answers **HTTP 422** with a JSON error (so a wiring bug is loud instead of a silent pick).
  * anything else -> **extract/generate**: fills the schema from the invoice fixtures when an `INV-1001..1004` id appears anywhere in the messages (property names `vendor_name|vendor|supplier`, `amount|total|total_amount`, `currency`, `due_date|due`, `invoice_id|invoice_number|id`, `vendor_status`, `is_large`); unknown properties get type defaults (`"n/a"`, `0`, `false`, `[]`, nested objects filled recursively, first enum value). With no invoice id found, everything is defaults.
* **Agent script**: if the request has `tools` and no `role:"tool"` message, it returns one `tool_calls` entry for the **first tool** with schema-valid placeholder arguments (`"placeholder"` strings, hints from an invoice id if present), `finish_reason:"tool_calls"`, `content:null`. Once a tool-result message exists it returns final JSON (the `response_format` schema filled as above, else `{"result":"done"}`).
* Response is a standard `chat.completion` envelope; the JSON answer is a **string** in `choices[0].message.content`.
* **Log timing:** the entry is appended to `llm-calls.jsonl` and memory *before* the response is sent. A harness that kills the engine "as soon as `classify` is recorded" therefore races the engine's checkpoint of the answer; see the RT-1 note in `shared/harness/README.md`.
* `GET /calls?run_id=&node_id=` -> `{run_id, total, rejected, counts:{<node_id>:n}, by_run:{<run_id>:{<node_id>:n}}, entries:[{seq, ts, run_id, node_id, attempt, call_header, kind: decide|extract|tool_call|agent_final|text|ollama_forward, status, outcome?, invoice_id?, ...}]}`. Counts include every logged call (retries, 422s) so duplicates are visible.
* `POST /reset`, `GET /health`, `GET /v1/models`.

## mock-tools (:18902)

`POST /blocks/<name>@<major>` (e.g. `/blocks/erp.create_payment@1`), body = the block's **input object** (the catalogue `input` schema; validated unless `MOCK_TOOLS_STRICT=0`, `400 invalid_input` otherwise). Response = the block's **output object** (verified schema-valid for all 20 blocks by `selftest.mjs`). Unknown block -> 404.

* Optional header `X-Ursitoare-Call: <run_id>:<node_id>:<attempt>` is recorded (and enables `GET /calls?run_id=`).
* **Idempotency:** blocks with `effect != read` (11 of them: `erp.create_payment`, `orders.refund`, `mail.send`, `slack.post_message`, `http.post`, `crm.create_ticket`, `crm.update_ticket`, `sheets.append_row`, `calendar.create_event`, `docs.create`, `erp.flag_vendor`) **require `Idempotency-Key`** -> otherwise `400 missing_idempotency_key` (counted as a call, `rejected`, no effect). The same key + block returns the identical stored output (header `x-mock-duplicate: true`) and increments `duplicates`; it does not increment `effects`. Result ids derive from the key, so they are deterministic. A different key is a new effect, even for the same payload; that is how double payment shows up.
* **Order of operations (matters for RT-3):** validate -> compute -> store idempotency record -> append log entry (`effect:true`) -> sleep `DELAY_MS_<name>` -> respond. A kill during the delay lands *after* the effect is committed and logged, and the engine never sees the response.
* **Fixtures:** `invoices.get` for INV-1001..1004, `raw_text` is e.g. `INVOICE INV-1002\nVendor: Globex\nTotal: 120.50 usd\nDue date: 2026-11-15\n...`; unknown invoice -> 404. `erp.lookup_vendor`: Acme GmbH `V-ACME` active (terms 30), Globex `V-GLOBEX` active (45), Blocked Co `V-BLOCKED` **blocked**; any other name -> active `V-<SLUG>`. `mail.read_inbox` returns one message with a prompt-injection body (taint demos).

  | Invoice | Vendor | Amount | Vendor status | decide outcome |
  |---|---|---|---|---|
  | INV-1001 | Acme GmbH | 2450.00 EUR | active | needs_review |
  | INV-1002 | Globex | 120.50 **usd** (lowercase; `normalize` uppercases) | active | auto_approve |
  | INV-1003 | Blocked Co | 300 EUR | blocked | reject |
  | INV-1004 | Acme GmbH | 20000.00 EUR | active | needs_review (RT-6) |
* `GET /calls?block=<name|name@major>&run_id=` -> `{calls, effects, duplicates, rejected, by_block:{"<name>@<major>":{calls,effects,duplicates,rejected}}, entries:[{seq, ts, block, effect_class, run_id, node_id, idempotency_key, input, status, effect:bool, duplicate:bool, delay_ms, output}]}`. **`calls` counts every request including rejected and duplicate ones; `effects` counts distinct committed effects.**
* `GET /blocks` (implemented blocks and effect classes), `GET /config`, `POST /config`, `POST /reset`, `GET /health`.

## mock-n8n (:18903)

`POST /webhook/<workflow>` with `{correlation_id, callback_url, payload}` -> **202** `{accepted, correlation_id, execution_id}` (missing `correlation_id` or `callback_url` -> 400). After `DELEGATE_DELAY_MS` (default 500 ms) it POSTs `{correlation_id, result:{archived:true, workflow, archive_id, payload}}` to `callback_url`.

* A callback attempt **fails** on connection error, 2 s timeout, or any non-2xx. It retries every 1 s until 30 s after the first attempt (design RT-5), then records `callback_gave_up`. The engine's callback endpoint must therefore answer 2xx only when it has durably accepted the result.
* `GET /calls?correlation_id=` -> `{webhook_calls, callback_attempts, callbacks_failed, callbacks_delivered, gave_up, pending, delegate_delay_ms, entries:[{type: webhook|callback_attempt|callback_gave_up, ...}]}`. A repeated webhook with the same `correlation_id` is delivered again and flagged `duplicate:true`.
* `POST /reset` cancels pending deliveries.

## What an engine integration must do

1. LLM nodes: POST to mock-llm with `response_format:{type:"json_schema", json_schema:{schema}}` and `X-Ursitoare-Call: <run_id>:<node_id>:<attempt>`. `llm.decide` schemas must contain `outcome` with the enum; pass the RF-1 `classify` input as `{vendor_status, amount, is_large}` anywhere in a non-system message.
2. Tool calls: POST the block input as JSON; for `effect != read` send an `Idempotency-Key` that is **stable across retries and restarts** of the same step (e.g. `<run_id>:<node_id>`). A key that changes per attempt will double-pay in RT-3.
3. Delegate: send `callback_url` pointing at a receiver that survives (or is restarted with) the engine and returns 2xx only after persisting the result.
