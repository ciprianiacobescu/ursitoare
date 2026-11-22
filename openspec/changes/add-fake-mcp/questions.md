# Questions — add-fake-mcp

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
| Q-001 | open | 4.1 | technical | test/support/fake-mcp/records.test.ts:55-64: bl() builds the body with the wrong key order, so the Q6 digest cannot match |
<!-- l4:index:end -->

---

## Q-001: test/support/fake-mcp/records.test.ts:55-64: bl() builds the body with the wrong key order, so the Q6 digest cannot match

- **Status:** open
- **Blocking tasks:** 4.1
- **Kind:** technical
- **Asked:** 2026-11-22T15:55Z by claude-sonnet, run r-20261122T1423Z-2592, task 4.1

### Context
The test asserts the `bodySha256` of row Q6 is `330ac568c28779957a896987b35b90d5951c38d6b2dc24b4b5d9dc27e43f070a`, the value in test-plan-legacy.md. That digest was computed from the text `JSON.stringify({ jsonrpc: "2.0", id, method, params })` (test-plan.md line 8). The test's `bl()` builds the message as `{ jsonrpc, method }` and then adds `id` and `params`, so `method` comes before `id` and the bytes differ. The fake hashes the received body correctly, and Q1 to Q5 match. Q6 fails with `5b5ec006…`.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `test/support/fake-mcp/records.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-fake-mcp`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `test/support/fake-mcp/records.test.ts`: in `bl()` build `{ jsonrpc: "2.0" }`, then set `id` (when not null), then `method`, then `params` (when defined), so the key order is jsonrpc, id, method, params as in test-plan.md.

### Clarifier suggestion
Edit `test/support/fake-mcp/records.test.ts`: in `bl()` build `{ jsonrpc: "2.0" }`, then set `id` (when not null), then `method`, then `params` (when defined), so the key order is jsonrpc, id, method, params as in test-plan.md.

### Answer
<!-- write below this line -->
