# Feedback — add-e2e-stack

<!-- l4:feedback v1
Ask for changes here while the unit's branch is open. The easy way is `l4 feedback add` (see `l4 feedback --help`).
An item is read only when its **Status** is `submitted`; `draft` items wait and `withdrawn` items are ignored.
Kinds: refactor · duplication · tests · config · behaviour (see docs/feedback.md).
Do not change item IDs. Commit and push to the l4/… branch: the harness takes submitted items at its next
verification round, turns them into a fix unit and checks that each one was addressed. -->

<!-- l4:feedback-index:start -->
| ID | Status | Kind | Where | Feedback |
|----|--------|------|-------|----------|
| FB-001 | submitted | behaviour | e2e/test_e2e_stack.py:17 | e2e/test_e2e_stack.py calls no pytest.skip |
<!-- l4:feedback-index:end -->

---

## FB-001: e2e/test_e2e_stack.py calls no pytest.skip

- **Status:** submitted
- **Kind:** behaviour
- **Where:** `e2e/test_e2e_stack.py:17-19`
- **Where:** `e2e/test_e2e_stack.py:40-42`
- **Lesson:** no
- **By:** CiprianSpot, 2026-10-27T01:31:37Z

### Code
`e2e/test_e2e_stack.py:17-19`
```python
def _require_fake_profile(profile: str) -> None:
    if profile != "fake":
        pytest.skip("the e2e stack tests need the fake profile")
```
`e2e/test_e2e_stack.py:40-42`
```python
def injected_fault(e2e_profile: str):
    if e2e_profile != "fake":
        pytest.skip("the injected fault needs the fake profile")
```

### Feedback
Remove the two profile guards: the pytest.skip in _require_fake_profile (drop the helper and its six calls) and the pytest.skip in the injected_fault fixture. L4 integrity rejects any skip call or marker that a harness commit adds (F-5758ac1b, rounds 1 and 2), so the spec sentence "call pytest.skip when it is not fake" cannot be met by any harness commit. Profile selection belongs to markers (e2e/pyproject.toml has `stack` with addopts -m "not stack"), and the stack-profile run is out of this unit scope (proposal.md). Keep the e2e_profile parameters, test names, l4 markers and every assertion as they are. The red gate runs only Node tests, so the red test is a Node test that reads the file text, for example under test/arch/.

### When / Then
- **When:** e2e/test_e2e_stack.py is read, and its tests run on the fake profile (E2E_PROFILE unset)
- **Then:** the file holds no pytest.skip or pytest.xfail call and no skip, skipif or xfail marker, every one of its tests runs and passes, and nothing else in the file changes

### Outcome
<!-- written by the harness -->
