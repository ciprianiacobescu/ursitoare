# Spec Delta

## Purpose
The durable runtime on DBOS 5.3.0: schema step, launch, `runs` queue, workflows, steps, boot wiring, access guard, e2e reset hooks. `CODE reason` means a `DurableError` with that `code` and `details.reason`.

## ADDED Requirements

### Requirement: Steps are observed, retried only on request, and need a workflow — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: An after-observer failure is retried instead of failing the step
- **WHEN** runStep runs with retries 2 and fn resolves a valid DurableJson but the after observer throws
- **THEN** fn has run exactly once, the step rejects with the observer's error unchanged and no second attempt of fn is made.
