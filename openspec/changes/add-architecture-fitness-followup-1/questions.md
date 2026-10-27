# Questions — add-architecture-fitness-followup-1

<!-- l4:questions v1
How to answer: write under "### Answer" and set **Status** to `answered`.
To accept the clarifier's suggestion as-is, set **Status** to `accepted`.
Status values: open · answered · accepted · answered-by-clarifier · dismissed · superseded
Kind values: technical · product · ambiguous · verdict · harness. For a `verdict` question, start the answer with `accept` or
`reject`, then give your reason; for a `harness` question, with `accept` or `retry`.
Do not change question IDs. Commit and push to the l4/… branch to resume the run. -->

<!-- l4:index:start -->
| ID | Status | Blocking | Kind | Question |
|----|--------|----------|------|----------|
| Q-001 | open | none | verdict | Criterion C-eea53b80 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A violation in merged code stops the task): accept as satisfied? |
| Q-002 | open | none | verdict | Criterion C-8c4b4392 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A directory outside the graph stops the task): accept as satisfied? |
| Q-003 | open | none | verdict | Criterion C-ba84c521 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A false positive is fixed in the rule): accept as satisfied? |
<!-- l4:index:end -->

---

## Q-001: Criterion C-eea53b80 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A violation in merged code stops the task): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-eea53b80 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A violation in merged code stops the task)

### Context
Criterion C-eea53b80 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A violation in merged code stops the task) is needs human after round 1.

Scenario:
\- **WHEN** `checkAll(readSnapshot())` returns the one violation `{ code: "ARCH_NETWORK_IMPORT", file: "src/api/x.ts", line: 3, message: "node:https is allowed only in observability, identity and gateway; call through src/gateway" }`
\- **THEN** the task ends with a blocker whose text is `formatViolation` of it, `src/api/x.ts:3: ARCH_NETWORK_IMPORT node:https is allowed only in observability, identity and gateway; call through src/gateway`, and the task's diff changes no file under `src/` or `test/support/`, no owner file and not `test/arch/modules.ts`, and adds no `skip`, `todo` or narrower pattern to a rule

Why: uncovered: no adequate discriminating test traces it
Judge: not_verifiable
Tracing tests: none
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-002: Criterion C-8c4b4392 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A directory outside the graph stops the task): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-8c4b4392 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A directory outside the graph stops the task)

### Context
Criterion C-8c4b4392 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A directory outside the graph stops the task) is needs human after round 1.

Scenario:
\- **WHEN** `checkAll(readSnapshot())` returns `ARCH_UNKNOWN_MODULE` for file `src/scratch` at line 1
\- **THEN** the blocker names `src/scratch`, line 1, the code `ARCH_UNKNOWN_MODULE` and its message, and `test/arch/modules.ts` gains no row

Why: uncovered: no adequate discriminating test traces it
Judge: not_verifiable
Tracing tests: none
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-003: Criterion C-ba84c521 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A false positive is fixed in the rule): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-ba84c521 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A false positive is fixed in the rule)

### Context
Criterion C-ba84c521 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A false positive is fixed in the rule) is needs human after round 1.

Scenario:
\- **WHEN** the reported violation is on code that a passing scenario of this change lists, for example a type-only `import type { Server } from "node:http";` in `src/api/server.ts`
\- **THEN** the implementer fixes the rule in `test/arch/rules.ts` or `test/arch/sources.ts` with a failing test first, and raises no blocker

Why: uncovered: no adequate discriminating test traces it
Judge: not_verifiable
Tracing tests: none
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
