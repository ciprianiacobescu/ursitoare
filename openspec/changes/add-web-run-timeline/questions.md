# Questions — add-web-run-timeline

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
| Q-001 | open | 3.1 | technical | web/src/runs/timeline.test.ts:61-63: wrong expectation for started step in a live run |
<!-- l4:index:end -->

---

## Q-001: web/src/runs/timeline.test.ts:61-63: wrong expectation for started step in a live run

- **Status:** open
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-11-05T15:15Z by claude-sonnet, run r-20261105T1340Z-4a10, task 3.1

### Context
The test at line 54 expects stepStateLabel('started', 'queued' or 'running') to give { label: 'started', note: null }. The spec (C-95befb77: '{ label: "running", note: null } for started with queued, running'), design decision 5, and the test at line 83 ('block · running' for a running run) all require label 'running'. Both tests cannot pass.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `web/src/runs/timeline.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-web-run-timeline`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `web/src/runs/timeline.test.ts`: in the loop at lines 61-63, make `want` be `{ label: "running", note: null }` when state is "started" and runState is "queued" or "running".

### Clarifier suggestion
Edit `web/src/runs/timeline.test.ts`: in the loop at lines 61-63, make `want` be `{ label: "running", note: null }` when state is "started" and runState is "queued" or "running".

### Answer
<!-- write below this line -->
