# Spec Delta

## Purpose
The offline stack the browser e2e gate serves: the real engine on embedded Postgres, a loopback control listener, and parts added as one file.

## ADDED Requirements

### Requirement: e2e/test_e2e_stack.py calls no pytest.skip — feedback FB-001
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: e2e/test_e2e_stack.py calls no pytest.skip
- **WHEN** e2e/test_e2e_stack.py is read, and its tests run on the fake profile (E2E_PROFILE unset)
- **THEN** the file holds no pytest.skip or pytest.xfail call and no skip, skipif or xfail marker, every one of its tests runs and passes, and nothing else in the file changes
