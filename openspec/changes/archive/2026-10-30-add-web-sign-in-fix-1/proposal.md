# Proposal: fix 1 for add-web-sign-in

## Why
The verifier found problems in `add-web-sign-in` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-22a9abae (blocker): e2e gate failed: `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m1_sign_in::test_c_4faae006_the_return_path_is_kept(chromium), test_m1_sign_in::test_c_ee431615_the_sign_in_page_shows_the_error_and_is_accessible(chromium)
- F-7e9a81fb (blocker): new tests failed: test_m1_sign_in::test_c_4faae006_the_return_path_is_kept(chromium), test_m1_sign_in::test_c_ee431615_the_sign_in_page_shows_the_error_and_is_accessible(chromium)

## Impact
The code and the tests of `add-web-sign-in`.
