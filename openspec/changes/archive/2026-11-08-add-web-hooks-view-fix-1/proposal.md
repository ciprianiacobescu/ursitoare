# Proposal: fix 1 for add-web-hooks-view

## Why
The verifier found problems in `add-web-hooks-view` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-22a9abae, F-7e9a81fb (blocker): e2e gate failed (+1 more): `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m5_code_hooks::test_c_25335f88_alice_validates_test_runs_and_reads_demo_hooks(chromium), test_m5_code_hooks::test_c_6d33a627_alice_meets_the_x3_rejection(chromium) | new tests failed: test_m5_code_hooks::test_c_25335f88_alice_validates_test_runs_and_reads_demo_hooks(chromium), test_m5_code_hooks::test_c_6d33a627_alice_meets_the_x3_rejection(chromium)

## Impact
The code and the tests of `add-web-hooks-view`.
