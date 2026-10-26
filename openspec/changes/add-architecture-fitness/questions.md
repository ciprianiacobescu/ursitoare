# Questions — add-architecture-fitness

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
| Q-001 | accepted | 5.1 | technical | test/arch/repo.test.ts:30 networkViolation prepends the name to the full message |
| Q-002 | answered | none | verdict | Criterion C-851f3c7c (architecture-rules › Complete module graph as data › Inconsistent graphs are reported): accept as satisfied? |
| Q-003 | open | none | verdict | Criterion C-c63269ba (architecture-rules › Secret-pattern scan of repository files › Each kind is detected without echoing it): accept as satisfied? |
| Q-004 | open | none | verdict | Criterion C-eea53b80 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A violation in merged code stops the task): accept as satisfied? |
| Q-005 | open | none | verdict | Criterion C-8c4b4392 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A directory outside the graph stops the task): accept as satisfied? |
| Q-006 | open | none | verdict | Criterion C-ba84c521 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A false positive is fixed in the rule): accept as satisfied? |
| Q-007 | open | none | verdict | Finding F-a154400b: The module graph is duplicated: the rules ignore test/arch/modules.ts |
| Q-008 | open | none | verdict | Finding F-a985c7e4: task 2.1: modules.ts is not the graph the rules check |
| Q-009 | open | none | verdict | Finding F-ed69f6e7: The egress pin is not checked when a pinned module row is missing |
| Q-010 | open | none | verdict | Finding F-85a00370: A default import with all-type named specifiers is treated as type-only |
<!-- l4:index:end -->

---

## Q-001: test/arch/repo.test.ts:30 networkViolation prepends the name to the full message

- **Status:** accepted
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the answer would unfreeze test/arch/repo.test.ts of task 5.1 (delegate.unfreeze is false)
- **Blocking tasks:** 5.1
- **Kind:** technical
- **Asked:** 2026-10-26T17:20Z by deepseek, run r-20261026T1619Z-8dc6, task 5.1

### Context
networkViolation builds message: `${name} ${NETWORK_MESSAGE}`, so the assertions at lines 60 and 159 expect `node:https node:https is allowed only in observability, identity and gateway; call through src/gateway`. The require scenario at line 124 asserts the same violation's message equals NETWORK_MESSAGE (`node:https is allowed only ...`), and design.md's message table specifies the single message. No checkAll implementation can return both a doubled and a single message for the same require("node:https") violation, so the red test is internally contradictory.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `test/arch/repo.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-architecture-fitness`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `test/arch/repo.test.ts`: in `networkViolation`, rename parameter `name` to `_name` and change `message: `${name} ${NETWORK_MESSAGE}`` to `message: NETWORK_MESSAGE`.

### Clarifier suggestion
Edit `test/arch/repo.test.ts`: in `networkViolation`, rename parameter `name` to `_name` and change `message: `${name} ${NETWORK_MESSAGE}`` to `message: NETWORK_MESSAGE`.

### Answer
<!-- write below this line -->

---

## Q-002: Criterion C-851f3c7c (architecture-rules › Complete module graph as data › Inconsistent graphs are reported): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-851f3c7c (architecture-rules › Complete module graph as data › Inconsistent graphs are reported)

### Context
Criterion C-851f3c7c (architecture-rules › Complete module graph as data › Inconsistent graphs are reported) is needs human after round 2.

Scenario:
\- **WHEN** `checkGraphIntegrity` runs on `{ a: { allowed: ["b"] }, b: { allowed: ["a"] } }`, then on `{ a: { allowed: ["zzz"] } }`, then on `{ a: { allowed: ["a"] } }`, then on `{ a: { allowed: ["b", "b"] }, b: { allowed: [] } }`
\- **THEN** each call returns violations with code `ARCH_GRAPH_INVALID` at `test/arch/modules.ts:1`, and some message of each contains respectively `cycle`, `zzz`, `itself` and `twice`; each result also carries the egress-pin violations (these fixtures name no egress module), so the test asserts with `some`, not on the length

Why: judge fail counted as insufficient_evidence: counterexample unexecuted (not executed in M0: the verifier worktree is M1 (verifier 1.5))
Judge: fail
Tracing tests: test.arch.modules.test.ts::C-65b86cc0 C-851f3c7c: the shipped graph is consistent (passed, red_assertion); test.arch.modules.test.ts::C-70858a5b C-851f3c7c: the graph carries the version 3 edges (passed, red_assertion); test.arch.modules.test.ts::C-851f3c7c: inconsistent graphs are reported (passed, red_assertion, inadequate); test.arch.modules.test.ts::C-90199ce0 C-851f3c7c: the graph holds the 30 modules in roadmap order (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
reject The scenario's THEN says each of the four fixture results also carries the egress-pin violations because the fixtures name no egress module, and design decision 6 pins the modules with an egress value to exactly observability, identity and gateway. The implementation does not deliver that: checkGraphIntegrity loops over Object.entries(modules) and consults PINNED_EGRESS only for rows that are present, so a graph with no observability, identity or gateway row (every one of the four fixtures, and a copy of MODULES with the gateway row deleted) yields no pin violation at all. On { a: { allowed: ["zzz"] } } it returns exactly one violation, the unknown-name one, and nothing about the pin. The passing test cannot see this because it asserts only with some on the needle and with every on code, file and line, never that a pin violation is present. The judge's major finding therefore stands. WHEN checkGraphIntegrity runs on a graph that lacks a row for observability, identity or gateway, such as { a: { allowed: ["zzz"] } } or a copy of MODULES without the gateway row THEN in addition to its other violations it returns, for each missing pinned module, an ARCH_GRAPH_INVALID violation at test/arch/modules.ts:1 whose message names that module and says it must carry its pinned egress value.
---

## Q-003: Criterion C-c63269ba (architecture-rules › Secret-pattern scan of repository files › Each kind is detected without echoing it): accept as satisfied?

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: checked test/arch/secrets.ts:38 does not resolve
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-c63269ba (architecture-rules › Secret-pattern scan of repository files › Each kind is detected without echoing it)

### Context
Criterion C-c63269ba (architecture-rules › Secret-pattern scan of repository files › Each kind is detected without echoing it) is needs human after round 2.

Scenario:
\- **WHEN** `scanText("a.txt", text)` gets one line per kind, built at run time from a prefix and `"x".repeat(n)` (for example `"sk-" + "x".repeat(32)`, `"AKIA" + "X".repeat(16)`, `"-----BEGIN " + "RSA PRIVATE KEY" + "-----"`, and the minimum lengths of the other kinds in design.md), after two lines of prose
\- **THEN** it returns one `ARCH_SECRET` violation per secret line, at its line number, whose message is `<kind>-shaped text; build test values at run time` with the kind name (`pem_private_key`, `mintkey_agent_key`, `anthropic_key`, `sk_key`, `github_token`, `github_pat`, `aws_access_key`, `slack_token`), and does not contain the secret text

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: test.arch.secrets.test.ts::C-c63269ba: each secret kind is detected at its line without echoing the text (passed, red_assertion, inadequate)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-004: Criterion C-eea53b80 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A violation in merged code stops the task): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-eea53b80 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A violation in merged code stops the task)

### Context
Criterion C-eea53b80 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A violation in merged code stops the task) is needs human after round 2.

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

## Q-005: Criterion C-8c4b4392 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A directory outside the graph stops the task): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-8c4b4392 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A directory outside the graph stops the task)

### Context
Criterion C-8c4b4392 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A directory outside the graph stops the task) is needs human after round 2.

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

## Q-006: Criterion C-ba84c521 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A false positive is fixed in the rule): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-ba84c521 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A false positive is fixed in the rule)

### Context
Criterion C-ba84c521 (architecture-tree-blockers › A violation in a file this change may not change is a blocker › A false positive is fixed in the rule) is needs human after round 2.

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
---

## Q-007: Finding F-a154400b: The module graph is duplicated: the rules ignore test/arch/modules.ts

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
The judge raised a major finding in round 2, and no deterministic check confirms it (criterion C-65b86cc0).

Title: The module graph is duplicated: the rules ignore test/arch/modules.ts
Detail: The fix for F-35492b20 stopped rules.ts from importing modules.ts. Instead, rules.ts defines and exports its own literal MODULES, which is the default for checkGraphIntegrity, checkModuleGraph, checkNetwork and checkAll. modules.ts holds a second, independent copy. It is not a re-export, although the implementer's note says it is. A later unit that adds a module or edge in test/arch/modules.ts, as design decision 13 and the proposal say it should, changes nothing the rules read. modules.test.ts checks one copy, while checkGraphIntegrity() and the repo test check the other. rules.ts also exports MODULES, which is not in the Interfaces.
Suggested fix: Keep one source of truth: make modules.ts the only literal and have rules.ts import it, or make modules.ts `export { MODULES } from "./rules.ts"` if the base-replay constraint forbids the import.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-65b86cc0 as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-008: Finding F-a985c7e4: task 2.1: modules.ts is not the graph the rules check

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
The judge raised a major finding in round 2, and no deterministic check confirms it (criterion C-65b86cc0).

Title: task 2.1: modules.ts is not the graph the rules check
Detail: Task 2.1 makes test/arch/modules.ts the complete graph data file and builds checkGraphIntegrity on it. At head, checkGraphIntegrity defaults to a separate copy in rules.ts, so the data file has no effect on any rule.
Suggested fix: Have rules.ts take its default MODULES from test/arch/modules.ts.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-65b86cc0 as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-009: Finding F-ed69f6e7: The egress pin is not checked when a pinned module row is missing

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
The judge raised a major finding in round 2, and no deterministic check confirms it (criterion C-851f3c7c).

Title: The egress pin is not checked when a pinned module row is missing
Detail: checkGraphIntegrity checks the pin only for rows that are present. Deleting the `gateway` row, or any fixture without the three egress modules, reports no pin violation. This contradicts the C-851f3c7c THEN, which says each result carries the egress-pin violations, and design decision 6, which says the egress modules are exactly observability, identity and gateway.
Suggested fix: Also loop over PINNED_EGRESS and report a pinned module that is missing from `modules` or carries no egress value.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-851f3c7c as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-010: Finding F-85a00370: A default import with all-type named specifiers is treated as type-only

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
The judge raised a major finding in round 2, and no deterministic check confirms it (criterion C-a2eef903).

Title: A default import with all-type named specifiers is treated as type-only
Detail: namedBindingsAreTypeOnly ignores the default binding. `import https, { type Agent } from "node:https";` is therefore marked typeOnly, and checkNetwork skips it, although `https` is a value import. Design decision 3 makes a declaration type-only only when it has nothing but named specifiers, at least one, all `type`-modified. This bypasses the network and worker_threads rules.
Suggested fix: Return false from namedBindingsAreTypeOnly when the ImportClause has a default `name`.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-a2eef903 as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
