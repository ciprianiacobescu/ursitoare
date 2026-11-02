# Proposal: fix 1 for add-web-flow-editor

## Why
The verifier found problems in `add-web-flow-editor` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-22a9abae (blocker): e2e gate failed: `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_l4_c_0daf92cd::test_deep_link_not_found_shell(chromium), test_m0_skeleton::test_deep_link_returns_the_app(chromium)

## Impact
The code and the tests of `add-web-flow-editor`.
