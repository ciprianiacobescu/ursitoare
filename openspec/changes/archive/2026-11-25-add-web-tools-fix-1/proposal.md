# Proposal: fix 1 for add-web-tools

## Why
The verifier found problems in `add-web-tools` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-22a9abae (blocker): e2e gate failed: `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m6b_admin::test_tool_servers_show_who_registered_outside_the_surface_region(chromium), test_m6b_section_layout::test_surface_region_puts_the_body_below_the_heading(chromium)

      Failing tests as the verifier recorded them:
      test_m6b_admin::test_tool_servers_show_who_registered_outside_the_surface_region[chromium] (assertion, e2e):
        >       expect(badge).to_have_count(1)
        E       AssertionError: Locator expected to have count '1'
        E       Actual value: 0
        E       Call log:
        E         - Expect "to_have_count" get_by_role("region", name="Surface", exact=True).locator("[data-slot=\"badge\"]") with timeout 5000ms
        E         - waiting for get_by_role("region", name="Surface", exact=True).locator("[data-slot=\"badge\"]")
        E           - waiting for navigation to finish...
        e2e/test_m6b_admin.py:355: AssertionError
      test_m6b_section_layout::test_surface_region_puts_the_body_below_the_heading[chromium] (other, e2e):
        >       assert_section_layout(page, "Surface")
        E           playwright._impl._errors.TimeoutError: Locator.evaluate: Timeout 30000ms exceeded.
        E           Call log:
        E             - waiting for get_by_role("region", name="Surface", exact=True)
        e2e/test_m6b_section_layout.py:148:
        e2e/.venv/lib/python3.12/site-packages/playwright/_impl/_connection.py:632: TimeoutError

## Impact
The code and the tests of `add-web-tools`.
