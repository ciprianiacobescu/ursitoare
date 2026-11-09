# Questions — add-fake-tools

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
| Q-001 | accepted | 5.1 | technical | test/support/e2e-stack/tools-part.cluster.test.ts:68 P4 expects V-ACME for vendor_name "x" |
<!-- l4:index:end -->

---

## Q-001: test/support/e2e-stack/tools-part.cluster.test.ts:68 P4 expects V-ACME for vendor_name "x"

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 5.1
- **Kind:** technical
- **Asked:** 2026-11-09T13:58Z by deepseek-free, run r-20261109T1231Z-c5e4, task 5.1

### Context
P4 posts {"vendor_name":"x"} to /blocks/erp.lookup_vendor@1 and asserts the answer deep-equals { vendor_id: "V-ACME", status: "active", payment_terms_days: 30 }. design.md § Fixtures defines lookupVendor("x") as the slug row V-X (the samples edge rows E4-E10 use the same slug rule), and test-plan.md § Part rows P4 only requires status 200. The fake therefore answers V-X, so this assertion contradicts the spec and no implementation can satisfy both it and the fixture rules.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `test/support/e2e-stack/tools-part.cluster.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-fake-tools`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `test/support/e2e-stack/tools-part.cluster.test.ts`: change `const LOOKUP_OUTPUT = { vendor_id: "V-ACME", status: "active", payment_terms_days: 30 };` to `const LOOKUP_OUTPUT = { vendor_id: "V-X", status: "active", payment_terms_days: 30 };`
2. Edit `test/support/e2e-stack/tools-part.cluster.test.ts`: change `body: JSON.stringify({ vendor_name: "x" })` to `body: JSON.stringify({ vendor_name: "Acme GmbH" })`

### Clarifier suggestion
Edit `test/support/e2e-stack/tools-part.cluster.test.ts`: change `const LOOKUP_OUTPUT = { vendor_id: "V-ACME", status: "active", payment_terms_days: 30 };` to `const LOOKUP_OUTPUT = { vendor_id: "V-X", status: "active", payment_terms_days: 30 };`

### Answer
<!-- write below this line -->
