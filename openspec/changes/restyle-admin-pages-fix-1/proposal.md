# Proposal: fix 1 for restyle-admin-pages

## Why
The verifier found problems in `restyle-admin-pages` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-22a9abae, F-7e9a81fb (blocker): e2e gate failed (+1 more): `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m6b_admin::test_audit_page_keeps_actor_ids_and_one_line_times(chromium), test_m6b_admin::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people(chromium) | new tests failed: test_m6b_admin::test_audit_page_keeps_actor_ids_and_one_line_times(chromium), test_m6b_admin::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people(chromium)

## Impact
The code and the tests of `restyle-admin-pages`.
