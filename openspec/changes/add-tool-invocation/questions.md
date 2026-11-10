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
| Q-002 | open | 2.2 | technical | src/interpreter/hooks/authorize.test.ts:293 — seen.events assertions expect 'authorize' and 'invoke' that the test never records |
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

---

## Q-002: src/interpreter/hooks/authorize.test.ts:293 — seen.events assertions expect 'authorize' and 'invoke' that the test never records

- **Status:** open
- **Blocking tasks:** 2.2
- **Kind:** technical
- **Asked:** 2026-11-10T23:38Z by glm, run r-20261110T2145Z-bb63, task 2.2

### Context
The test's own instrumentation writes 'authorize' and 'invoke' only into seen.phases (invokerFor, lines 146 and 154: seen.phases.push). seen.events is written only by the ops wrapper (line 179, always `step ${name}`) and by the effects gate (lines 188 and 196, 'before'/'after'). Yet the assertions expect the bare strings 'authorize' and 'invoke' inside seen.events: line 293-300 for the authorized run, lines 314-321 for the plain M5 run (which expects 'invoke' even with no authorize), and line 354 for the denial ('[step pay:post:notify, authorize]'). No object blockHookRunner receives can push those bare strings, so these assertions fail for every implementation; the actual events are ['step pay:post:notify', 'before', 'step pay:post:notify#done', 'after']. The green implementation is otherwise complete: contexts, taint ('untrusted' default and argsTaint), step values, authorize-before-before ordering, denial propagation past on_error and the HOOK_ERROR tool_failed mapping all pass (the file's other two tests and every other assertion pass, and the full suite is green).

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/interpreter/hooks/authorize.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-tool-invocation`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/interpreter/hooks/authorize.test.ts`: in `invokerFor` (lines 146 and 154) push each phase into seen.events as well, i.e. make the invoke callback `seen.events.push("invoke"); seen.phases.push("invoke");` and the authorize callback `seen.events.push("authorize"); seen.phases.push("authorize");`, which satisfies the events assertions at lines 293-300, 314-321 and 354 as written.
2. Edit `src/interpreter/hooks/authorize.test.ts`: drop 'authorize' and 'invoke' from the seen.events expectations at lines 293-300, 314-321 and 354 (the phases assertions at lines 301, 339 and 355 already assert that order).

### Clarifier suggestion
Edit `src/interpreter/hooks/authorize.test.ts`: in `invokerFor` (lines 146 and 154) push each phase into seen.events as well, i.e. make the invoke callback `seen.events.push("invoke"); seen.phases.push("invoke");` and the authorize callback `seen.events.push("authorize"); seen.phases.push("authorize");`, which satisfies the events assertions at lines 293-300, 314-321 and 354 as written.

### Answer
<!-- write below this line -->
