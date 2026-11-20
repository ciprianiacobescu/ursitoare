# Proposal: fix 1 for add-home-dashboard

## Why
The verifier found problems in `add-home-dashboard` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-22a9abae (blocker): e2e gate failed: `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 2
- F-c17c0f0a (blocker): new test file ran no test: e2e/test_m6b_home.py

## Impact
The code and the tests of `add-home-dashboard`.
