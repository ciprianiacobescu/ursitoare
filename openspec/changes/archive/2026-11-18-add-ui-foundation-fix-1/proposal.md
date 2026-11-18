# Proposal: fix 1 for add-ui-foundation

## Why
The verifier found problems in `add-ui-foundation` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-22a9abae, F-7e9a81fb (blocker): e2e gate failed (+1 more): `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m6b_foundation::test_assert_layout_reports_the_numbers(chromium) | new tests failed: test_m6b_foundation::test_assert_layout_reports_the_numbers(chromium)

## Impact
The code and the tests of `add-ui-foundation`.
