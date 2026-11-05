# Spec Delta

## Purpose
The interpreter walks a stored flow version as one durable run: references over recorded outputs, tools only through an invoker and an effect gate, one numbered step row per node visit, on DBOS or in memory.

## ADDED Requirements

### Requirement: An effectful block runs inside the effect gate in every mode — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: task 2.3: gate-step test does not observe the active durable step
- **WHEN** the block runtime runs node pay with an effectful tool, a gate answering { action: "invoke", idemKey: "ik_1" } and an invoker answering PAID, on WorkflowOps that record the running step
- **THEN** the gate and invoker calls are logged with that step, exactly `pay: before(CALL, CTX)`, `pay: invoke(CALL, CTX + idemKey ik_1)` and `pay#done: after(CALL, CTX + idemKey ik_1, { output: PAID })`, and executed is ["pay", "pay#done"].

### Requirement: A failing run ends failed with a RunError and leaks nothing — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Copied interpreter errors are remapped as tool failures
- **WHEN** a step of a node runtime rethrows a value whose code is an InterpreterErrorCode but which is not an instance of Error, as a replayed copy of a recorded step error may be
- **THEN** the visit and the block runtime keep that code, node and details in the failed row and the run error instead of mapping the value to INTERPRETER_TOOL_FAILED.
