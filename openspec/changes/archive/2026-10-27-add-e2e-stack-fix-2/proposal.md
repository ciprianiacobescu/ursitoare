# Proposal: fix 2 for add-e2e-stack

## Why
Requested by CiprianSpot, 2026-10-27T01:31:37Z in FB-001 (behaviour, e2e/test_e2e_stack.py:17-19, e2e/test_e2e_stack.py:40-42): Remove the two profile guards: the pytest.skip in _require_fake_profile (drop the helper and its six calls) and the pytest.skip in the injected_fault fixture. L4 integrity rejects any skip call or marker that a harness commit adds (F-5758ac1b, rounds 1 and 2), so the spec sentence "call pytest.skip when it is not fake" cannot be met by any harness commit. Profile selection belongs to markers (e2e/pyproject.toml has `stack` with addopts -m "not stack"), and the stack-profile run is out of this unit scope (proposal.md). Keep the e2e_profile parameters, test names, l4 markers and every assertion as they are. The red gate runs only Node tests, so the red test is a Node test that reads the file text, for example under test/arch/.

    def _require_fake_profile(profile: str) -> None:
        if profile != "fake":
            pytest.skip("the e2e stack tests need the fake profile")
    def injected_fault(e2e_profile: str):
        if e2e_profile != "fake":
            pytest.skip("the injected fault needs the fake profile")

The verifier found problems in `add-e2e-stack` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-2596eba0 (major): Feedback FB-001 (behaviour): e2e/test_e2e_stack.py calls no pytest.skip

## Impact
The code and the tests of `add-e2e-stack`.
