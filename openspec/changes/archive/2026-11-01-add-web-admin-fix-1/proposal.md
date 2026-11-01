# Proposal: fix 1 for add-web-admin

## Why
The verifier found problems in `add-web-admin` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-22a9abae, F-7e9a81fb (blocker): e2e gate failed (+1 more): `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m2_admin::test_c_19381fcc_carol_creates_and_deletes_a_team(chromium), test_m2_admin::test_c_f7bbb238_carol_maps_a_group_and_the_log_shows_it_verified(chromium) | new tests failed: test_m2_admin::test_c_19381fcc_carol_creates_and_deletes_a_team(chromium), test_m2_admin::test_c_f7bbb238_carol_maps_a_group_and_the_log_shows_it_verified(chromium)

## Impact
The code and the tests of `add-web-admin`.
