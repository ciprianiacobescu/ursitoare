# core-dbos (M2): Ursitoare format-v0 interpreter on the DBOS TypeScript SDK

One Node process (HTTP API + DBOS worker + delegate-callback receiver) in front of one Postgres 18 container.
One DBOS workflow per run, one DBOS step per node execution. See `REPORT.md` for design, results and measurements.

## Prerequisites

Node 26 (TypeScript runs through Node's built-in type stripping, no build step), Docker, and the M1 mocks on 18901-18903.
Ports used: Postgres `55432` (compose project `us-m2`), engine API `18910`.

## Run

```bash
cd core-dbos
npm ci                                              # pinned: @dbos-inc/dbos-sdk 5.3.0, quickjs-emscripten 0.32.0, yaml 2.9.1, ajv 8.17.1
docker compose -p us-m2 up -d --wait                # Postgres 18, named volume us_m2_pgdata
cd .. && MOCK_STATE_DIR=$PWD/core-dbos/.mockstate shared/mocks/start-all.sh   # own mock instance
cd core-dbos && node src/main.ts                    # engine on :18910 (env: DBOS_DATABASE_URL, MOCK_*_URL, CALLBACK_BASE, ENGINE_PORT)
```

API:

| call | meaning |
|---|---|
| `POST /runs {flowPath, input, principal?}` | starts a run, returns `{runId, flow, flow_version, flow_hash}` (`runId` = DBOS workflow id) |
| `GET /runs/:id[?detail=1]` | `{status: running\|waiting\|completed\|failed, node, output, error, flow, flow_version, flow_hash}` |
| `GET /runs/:id/steps` | per-step list from DBOS (`DBOS.listWorkflowSteps`): id, name, recorded input/output envelope incl. the policy decision |
| `POST /runs/:id/signal/:node` | human approval payload `{decision, approver, comment}` (`DBOS.send`, durable) |
| `POST /callbacks/:correlation_id` | delegate callback `{correlation_id, result}`; 2xx only after the message is stored in Postgres |
| `POST /runs/:id/fork {step}` | `DBOS.forkWorkflow` from a step id (debug aid) |

## Tests

```bash
node shared/harness/run.mjs --adapter core-dbos/adapter.mjs --tests RT-0,RT-1,RT-2,RT-3,RT-4,RT-5,RT-6
node shared/harness/run.mjs --adapter core-dbos/adapter.mjs --tests RT-1 --grace-ms 30      # separates "slow checkpoint" from "re-execution"
node core-dbos/tests/rt2b.mjs [--kill] [--engine-restart]     # RT-2b: Postgres container restarted (or SIGKILLed) while parked
node core-dbos/tests/lint.mjs                                 # C2 static lint: policy before every outbound call
node core-dbos/tests/policy-coverage.mjs                      # C2 runtime check: #policy decisions == #outbound calls
node core-dbos/tests/sandbox.test.ts                          # QuickJS sanity (determinism, no host access, interrupt)
node core-dbos/tests/fork.mjs                                 # forkWorkflow from `classify` on a completed RF-1 run
core-dbos/tests/measure.sh 3                                  # design section 7 numbers, under the .orchestration/measure.lock mutex
npx tsc --noEmit                                              # typecheck
```

The adapter (`adapter.mjs`) starts Postgres if needed, drops and recreates the system database for a clean slate on `start()`,
spawns the engine, and `kill()` is `SIGKILL` on the engine process (worker and server are the same process).
`restart()` brings the engine (and Postgres, if down) back; DBOS recovers pending runs inside `DBOS.launch()`.

## Stop

```bash
shared/mocks/stop-all.sh   # or: MOCK_STATE_DIR=$PWD/core-dbos/.mockstate shared/mocks/stop-all.sh
docker compose -p us-m2 stop        # not down: keeps the volume
```
