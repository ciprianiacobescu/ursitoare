# M2 report: own interpreter on the DBOS TypeScript SDK

The orchestrator saved this from the implementer's final message, because the subagent's Write tool refuses report files. The evidence logs are in `core-dbos/evidence/`, and the machine-readable report is `.orchestration/runs/20261024-phase0-spikes/reports/M2.json`.

## Built
- **Engine:** one DBOS workflow per run and one DBOS step per node execution, on `@dbos-inc/dbos-sdk` 5.3.0.
- **Infrastructure:** Postgres 18 (compose project `us-m2`, port 55432), engine API on 18910, adapter `core-dbos/adapter.mjs`.
- **Node kinds implemented:** block, code (QuickJS, frozen `Date`, seeded `Math.random`), llm.extract, llm.generate, llm.decide, human.approval (`DBOS.recv` with a timeout), delegate (webhook, then `recv` keyed by correlation id), switch, wait and end.
- **Node kinds not implemented:** agent, foreach, subflow and human.form.
- **Policy:** a hook runs before every block and LLM call. A static lint finds exactly 3 outbound call sites, each after the policy check with a deny short-circuit. At runtime the number of policy decisions equals the number of outbound calls.

## Tests (harness RT-0…RT-6)

| Test | Result |
|---|---|
| RT-0, RT-2, RT-4, RT-5, RT-6 | Pass in every full-suite run |
| RT-1 at `--grace-ms 0` | 9/10 on the final tree; about 74% (31/42) across all runs |
| RT-1 at grace 5, 10 and 15 ms | 15/15 each |
| RT-1 at grace 30 ms | 10/10 |
| RT-3 | 10/10 (the payment was re-called once with the same idempotency key: duplicates=1, effects=1) |
| Full suite | 3/3 green at grace 0, 3/3 green at grace 30 |
| RT-2b (Postgres restarted while parked) | Pass with docker restart, with docker kill plus start, and with that plus an engine SIGKILL |

### RT-1 mechanism
The mock logs `classify` before it answers, and DBOS commits the step 0–2 ms later. A SIGKILL inside that window forces a genuine re-call.
- Every failure had the kill within about 3 ms of the log line.
- This window exists for any engine that checkpoints after the call.
- The re-issued call carries a byte-identical `X-Ursitoare-Call` header, so a gateway that dedupes on it would absorb the duplicate.

## Measurements
Taken under the measurement lock, 3 repetitions from stopped containers. The neighbours were 71 containers using about 7.9 GiB; an earlier run with 79 neighbours was 15–25% slower.

| Metric | Median [range] |
|---|---|
| Containers | 1 (Postgres) + 1 host Node process |
| Cold start | engine 0.8 s; full stack from stopped 3.2 s [3.2–3.4] |
| Idle RSS | engine 117.7 MiB [116.6–118.3]; Postgres 48.2 MiB (docker MemUsage) |
| After 100 runs at 4 concurrent | engine 205.2 MiB; Postgres 68.7 MiB |
| INV-1002 at 4 concurrent | p50 101.7 ms, p95 115.1 ms (delegate delay 50 ms) |
| Throughput | 2,306 runs/min at 4 concurrent [1,950–2,354]; 605/min sequential |

## Effort
- About 852 lines of code: engine 461, policy 32, adapter 88, tests 250, compose 21.
- The self-recorded "4.7 min to first green" was recorded after coding had started, so it is not usable. The orchestrator uses the agent's total wall time instead: 25.1 min and 56 tool calls.

## Debuggability
- `DBOS.listWorkflowSteps` and `dbos.operation_outputs` give each step's name, output, error and timing.
- DBOS does not store step inputs, so the interpreter records `{input, output, outcome, policy}` as each step's output.
- `forkWorkflow` from `classify` works: steps 0–3 are copied, so `extract` is not re-called; `classify`, `pay` and `archive` re-execute.
- **Fork safety:** the first version keyed idempotency on the new workflow id, so a fork paid twice (effects=2). Keying on the original run id fixed it, giving effects=1. Fork and replay safety therefore depends on idempotency keys tied to the lineage, not to the run id.

## Deviations
- `applicationVersion` is pinned to a constant. Otherwise the source-hash default orphans pending runs after a restart.
- Structured errors travel as JSON-encoded `Error` messages.
- The flow definition is passed as workflow input.
- The delegate wait reports `running`.
- The policy log records argument keys only.
- There is no L1–L3 validation in the engine.
- Taint labels are passed to policy but ignored by the stub.
- Some sweep logs were deleted; their summaries remain.

## Unresolved
- **RT-1 kill latency is asymmetric.** This engine is killed with a host SIGKILL (about 4 ms). A `docker kill` is about 100 ms, so it hides the race.
- License and stewardship were not examined.
- `rewindWorkflow` was not tried.
- Memory growth beyond 100 runs was not measured.
