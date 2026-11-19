# Proposal: fix 1 for add-app-shell

## Why
The verifier found problems in `add-app-shell` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-22a9abae, F-7e9a81fb (blocker): e2e gate failed (+1 more): `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m6b_shell::test_sign_in_and_not_found_render_as_centred_cards(chromium) | new tests failed: test_m6b_shell::test_sign_in_and_not_found_render_as_centred_cards(chromium)

## Impact
The code and the tests of `add-app-shell`.
