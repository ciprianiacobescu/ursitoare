## Purpose

State what the implementer does when the merged tree breaks a rule in a file this change may not change, and the facts about the merged tree that the requirement "The current tree passes every rule" relies on.

## ADDED Requirements

### Requirement: A violation in a file this change may not change is a blocker
When `test/arch/repo.test.ts` reports a violation in a file this change may not change (anything under `src/`, anything under `test/support/`, an owner file, `test/arch/modules.ts`, or any other file the proposal does not list as implemented or created), the implementer SHALL NOT edit that file, SHALL NOT weaken, skip or narrow a rule, SHALL NOT change `test/arch/modules.ts`, and SHALL stop the task with a blocker that names the file, the line, the rule code and the message, so that the owning unit is fixed through feedback.

Decided by the orchestrator on 2026-10-25. Reason: this change may change none of those files, so the only other ways out (editing merged code, or loosening a rule or the graph) would merge unread and defeat the gate.

#### Scenario: A violation in merged code stops the task
- **WHEN** `checkAll(readSnapshot())` returns the one violation `{ code: "ARCH_NETWORK_IMPORT", file: "src/api/x.ts", line: 3, message: "node:https is allowed only in observability, identity and gateway; call through src/gateway" }`
- **THEN** the task ends with a blocker whose text is `formatViolation` of it, `src/api/x.ts:3: ARCH_NETWORK_IMPORT node:https is allowed only in observability, identity and gateway; call through src/gateway`, and the task's diff changes no file under `src/` or `test/support/`, no owner file and not `test/arch/modules.ts`, and adds no `skip`, `todo` or narrower pattern to a rule

#### Scenario: A directory outside the graph stops the task
- **WHEN** `checkAll(readSnapshot())` returns `ARCH_UNKNOWN_MODULE` for file `src/scratch` at line 1
- **THEN** the blocker names `src/scratch`, line 1, the code `ARCH_UNKNOWN_MODULE` and its message, and `test/arch/modules.ts` gains no row

#### Scenario: A false positive is fixed in the rule
- **WHEN** the reported violation is on code that a passing scenario of this change lists, for example a type-only `import type { Server } from "node:http";` in `src/api/server.ts`
- **THEN** the implementer fixes the rule in `test/arch/rules.ts` or `test/arch/sources.ts` with a failing test first, and raises no blocker

### Requirement: The merged tree meets the facts this change relies on
The test `repo.test.ts` SHALL be written against the facts below, which the orchestrator verified on the base branch on 2026-10-25 or which `add-engine-skeleton` must deliver; where that change's specification does not state a fact, this change relies on it, and a fact that does not hold is a blocker under the previous requirement.

#### Scenario: Facts verified on the base branch
- **WHEN** the immediate subdirectories of `src/` are listed on the base branch (orchestrator, 2026-10-25)
- **THEN** they are `api`, `config`, `core`, `db`, `observability` and `tenancy`, every one a key of `MODULES`, so no `ARCH_UNKNOWN_MODULE` is reported for them

#### Scenario: Facts that add-engine-skeleton delivers
- **WHEN** `add-engine-skeleton` is merged and the test "The merged tree is clean" runs
- **THEN** these hold, and `checkAll(readSnapshot())` is `[]`:
  - `src/main.ts` imports only the `index.ts` of modules and leaf files; `readSecretValue` in `src/config/secret.ts` and `toErrorResponse` in `src/api/errors.ts` are not exported from their indexes (its Interfaces) and no file outside their modules imports them (its design decision 1 and proposal § Impact, Import constraints);
  - `src/main.ts`, `src/api` and `src/observability` hold no value import of `node:http`, `node:net` or another module of design decision 7 (`node:net` appears only in the test `src/api/shutdown.test.ts`; its proposal § Impact, Import constraints);
  - `process.env` is read only in `src/config`, through `loadConfigFromProcess` (its design decision 2; requirement "Composition root keeps the bootstrap contracts": `startServer` reads no environment);
  - no non-test file under `src/` uses `console` (its fatal line goes through a bootstrap logger: requirement "Composition root keeps the bootstrap contracts" and design decision 12; the base `eslint.config.js` forbids `console` outside tests);
  - no non-test file under `src/` uses `require`, `createRequire` or `getBuiltinModule` (its proposal § Impact, Import constraints)
