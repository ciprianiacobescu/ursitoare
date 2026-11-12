# Proposal: fix 1 for add-web-grants

## Why
The verifier found problems in `add-web-grants` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-22a9abae, F-7e9a81fb (blocker): e2e gate failed (+1 more): `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m6_tool_pages::test_c_39cb580c_server_link_and_self_approval(chromium), test_m6_tool_pages::test_c_5f4e5a5b_grant_create_confirm_and_revoke(chromium) | new tests failed: test_m6_tool_pages::test_c_39cb580c_server_link_and_self_approval(chromium), test_m6_tool_pages::test_c_5f4e5a5b_grant_create_confirm_and_revoke(chromium)

## Impact
The code and the tests of `add-web-grants`.
