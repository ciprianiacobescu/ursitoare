# Questions — add-taint-runtime

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
| Q-001 | accepted | 1.2 | technical | src/authoring/taint/runtime-references.test.ts:299 parses an unwrapped edge ref with scanTemplate |
| Q-002 | open | none | verdict | Criterion C-9dec3a38 (taint › Produced taint follows one per-kind rule for the validator and the runtime › The frozen taint tests stay green unchanged): accept as satisfied? |
<!-- l4:index:end -->

---

## Q-001: src/authoring/taint/runtime-references.test.ts:299 parses an unwrapped edge ref with scanTemplate

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 1.2
- **Kind:** technical
- **Asked:** 2026-11-07T10:02Z by deepseek-free, run r-20261107T0904Z-91c1, task 1.2

### Context
The test derives each edge's Ref with `scanTemplate(edge.ref)`, but `analyzeTaint` stores `edge.ref` as the bare `refToString` text (for example `nodes.normalize.output.amount`), which `scanTemplate` treats as plain text because it only parses `${{ ... }}`. So `ref` is always `undefined`, `referenceTaint` returns `["untrusted"]` by design, and the test fails on the first non-untrusted edge (`nodes.normalize.output.amount` expected `["extracted"]`). The spec scenario says `referenceTaint(ref, taintOf)` (with `ref` from `scanTemplate` on `edge.ref`) must equal `edge.taint`, and the frozen `src/authoring/taint/analyze.test.ts` requires `edge.ref` to stay unwrapped, so no implementation can satisfy both. With `parseRef(edge.ref)` the implementation matches all 30 node inputs and 50 edge taints.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/authoring/taint/analyze.test.ts`, `src/authoring/taint/runtime-references.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-taint-runtime`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/authoring/taint/runtime-references.test.ts`: change line 299 from `const seg = scanTemplate(edge.ref).find((candidate) => candidate.type === "ref");` to `const seg = scanTemplate("${{ " + edge.ref + " }}").find((candidate) => candidate.type === "ref");`
2. Edit `src/authoring/taint/runtime-references.test.ts`: import `parseRef` from `../format/index.ts` and change line 299 to `const ref = parseRef(edge.ref).ref;` (then use `ref` in the `referenceTaint` call).

### Clarifier suggestion
Edit `src/authoring/taint/runtime-references.test.ts`: change line 299 from `const seg = scanTemplate(edge.ref).find((candidate) => candidate.type === "ref");` to `const seg = scanTemplate("${{ " + edge.ref + " }}").find((candidate) => candidate.type === "ref");`

### Answer
<!-- write below this line -->

---

## Q-002: Criterion C-9dec3a38 (taint › Produced taint follows one per-kind rule for the validator and the runtime › The frozen taint tests stay green unchanged): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-9dec3a38 (taint › Produced taint follows one per-kind rule for the validator and the runtime › The frozen taint tests stay green unchanged)

### Context
Criterion C-9dec3a38 (taint › Produced taint follows one per-kind rule for the validator and the runtime › The frozen taint tests stay green unchanged) is needs human after round 2.

Scenario:
\- **WHEN** the 16 tests listed in `test-plan.md` § Frozen taint tests (the seven files `src/authoring/taint/{analyze,capabilities,closed,hooks,labels,sources,surface}.test.ts`) run on the implemented change
\- **THEN** all 16 pass, and none of the seven files is edited by this change

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: src.authoring.taint.runtime.test.ts::C-9dec3a38 the frozen taint tests are present and unchanged (passed, red_assertion, inadequate)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
