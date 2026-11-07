# Spec Delta

## Purpose
Regression scenarios for the durable-runtime capability, found by the verifier in add-dbos-runtime.

## ADDED Requirements

### Requirement: runStep turns a replayed step error into dbos_failed — feedback FB-001
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: runStep turns a replayed step error into dbos_failed
- **WHEN** a recovered or forked workflow replays a step whose fn had thrown, once a DurableError and once a plain Error carrying a code
- **THEN** runStep rejects with an error of the same name, message, code and details as on the first run, the DurableError is again instanceof DurableError, fn is not called again, and neither rejection is DURABLE_UNAVAILABLE dbos_failed
