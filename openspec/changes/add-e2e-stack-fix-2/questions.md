# Questions — add-e2e-stack-fix-2

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
| Q-001 | open | 1.1 | technical | e2e/test_e2e_stack.py:17-19,40-42 — the red test requires editing this frozen test file |
<!-- l4:index:end -->

---

## Q-001: e2e/test_e2e_stack.py:17-19,40-42 — the red test requires editing this frozen test file

- **Status:** open
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-10-27T01:38Z by deepseek, run r-20261027T0132Z-6440, task 1.1

### Context
test/arch/e2e-stack.test.ts:8 asserts that e2e/test_e2e_stack.py contains no pytest.skip/pytest.xfail call and no _require_fake_profile. C-e23019c4 and FB-001 say to remove the two profile guards (the _require_fake_profile helper and its six calls, and the pytest.skip in injected_fault) while keeping every other statement. But e2e/** is a frozen test path in green: the harness restored my edit to e2e/test_e2e_stack.py (ledger guard.test_tamper, 'test path freeze'), so the red test cannot pass without unfreezing that file for this task.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `e2e/test_e2e_stack.py`, `test/arch/e2e-stack.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-e2e-stack-fix-2`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `e2e/test_e2e_stack.py`: delete the `_require_fake_profile` function definition (lines 17-19) and its six call lines, and delete the `if e2e_profile != "fake": pytest.skip("the injected fault needs the fake profile")` guard (lines 41-42) from the `injected_fault` fixture, keeping the `e2e_profile` parameters, test names, `@pytest.mark.l4` markers and all assertions unchanged.
2. Keep e2e/test_e2e_stack.py frozen and withdraw FB-001 / C-e23019c4 from this unit.

### Clarifier suggestion
Edit `e2e/test_e2e_stack.py`: delete the `_require_fake_profile` function definition (lines 17-19) and its six call lines, and delete the `if e2e_profile != "fake": pytest.skip("the injected fault needs the fake profile")` guard (lines 41-42) from the `injected_fault` fixture, keeping the `e2e_profile` parameters, test names, `@pytest.mark.l4` markers and all assertions unchanged.

### Answer
<!-- write below this line -->
