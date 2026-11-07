# Spec Delta

## Purpose
The `sandbox` capability runs a pure JavaScript body in QuickJS (Wasm) on a worker-thread pool, under fixed limits, a frozen clock and seeded randomness, with no host function and no secret; every failure is a returned, never retried, typed fault.

## ADDED Requirements

### Requirement: The pool spawns workers lazily, one job each, and refuses bad options — regression 2
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Proxy getPrototypeOf traps escape option validation
- **WHEN** createWorkerSandbox receives an opts value that is a Proxy whose getPrototypeOf trap throws
- **THEN** it throws synchronously a SandboxError with code SANDBOX_INVALID, message opts could not be read and details option opts, and no other error escapes.
