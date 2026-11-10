# Questions — add-tool-invocation

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
| Q-001 | accepted | 1.1 | technical | src/credentials/egress-site.test.ts:22 asserts the old two-path egress inventory |
<!-- l4:index:end -->

---

## Q-001: src/credentials/egress-site.test.ts:22 asserts the old two-path egress inventory

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-11-10T19:21Z by deepseek-free, run r-20261110T1839Z-5522, task 1.1

### Context
Line 22 asserts that `checkEgressSites(readSnapshot(), ["src/credentials/vault-call.ts", "src/main.ts"])` is `[]`. The spec `The gateway has one more inventoried caller` requires `src/runtimes/invoke/request.ts` to import `bodyDigest` from the gateway by value and to be the third inventory path, so with that import `checkEgressSites` reports exactly one `ARCH_EGRESS_SITE` for `src/runtimes/invoke/request.ts` unless the allowed list includes it. Both assertions therefore cannot pass; the red step updated only `test/arch/egress-sites.test.ts` and left this pre-existing frozen test on the two-path literal.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/credentials/egress-site.test.ts`, `test/arch/egress-sites.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-tool-invocation`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/credentials/egress-site.test.ts`: change line 22's allowed list to `["src/credentials/vault-call.ts", "src/main.ts", "src/runtimes/invoke/request.ts"]`, matching the three-path inventory of `test/arch/egress-sites.test.ts::C-76ead8ea`.

### Clarifier suggestion
Edit `src/credentials/egress-site.test.ts`: change line 22's allowed list to `["src/credentials/vault-call.ts", "src/main.ts", "src/runtimes/invoke/request.ts"]`, matching the three-path inventory of `test/arch/egress-sites.test.ts::C-76ead8ea`.

### Answer
<!-- write below this line -->
