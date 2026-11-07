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
| Q-001 | open | 1.2 | technical | src/authoring/taint/runtime-references.test.ts:299 parses an unwrapped edge ref with scanTemplate |
<!-- l4:index:end -->

---

## Q-001: src/authoring/taint/runtime-references.test.ts:299 parses an unwrapped edge ref with scanTemplate

- **Status:** open
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
