# l4: generated test (l4/generated-test@1); rewritten by the harness
import json
import os

import pytest
from playwright.sync_api import Page, expect

NOTICE = (
    "Some menu entries are hidden because your permissions could not be loaded. "
    "Authorization is unavailable right now. Try again in a moment."
)

ME_OK = {
    "user": {"id": "user-1", "displayName": "Alice", "email": None},
    "tenant": {"id": "tenant-1", "name": "Tenant", "reviewProfile": "solo"},
    "capabilities": ["read_flow"],
    "csrfToken": "csrf_" + "a" * 38,
}


@pytest.mark.l4("C-f6d2569a")
def test_nav_in_browser_signed_out_unavailable_and_ready(page: Page):
    base = os.environ["L4_E2E_BASE_URL"]
    state = {"mode": "401", "count": 0, "statuses": []}

    def handle(route):
        state["count"] += 1
        mode = state["mode"]
        if mode == "401":
            status = 401
            body = {"code": "UNAUTHENTICATED", "message": "Sign in required",
                    "error": {"code": "UNAUTHENTICATED", "message": "Sign in required"}}
        elif mode == "503":
            status = 503
            body = {"code": "AUTHZ_UNAVAILABLE", "message": "Authorization is unavailable",
                    "error": {"code": "AUTHZ_UNAVAILABLE", "message": "Authorization is unavailable"}}
        else:
            status = 200
            body = ME_OK
        state["statuses"].append(status)
        route.fulfill(status=status, content_type="application/json", body=json.dumps(body))

    page.route("**/api/v1/me", handle)

    def open_home(mode):
        state["mode"] = mode
        state["count"] = 0
        page.goto(base + "/")
        nav = page.get_by_role("navigation", name="Main")
        expect(nav.get_by_role("link", name="Home")).to_be_visible()
        page.wait_for_load_state("networkidle")
        assert state["count"] == 1

    notice = page.locator('[aria-live="polite"]').filter(has_text="Some menu entries are hidden")

    # signed out
    open_home("401")
    assert state["statuses"][-1] == 401
    expect(notice).to_have_count(0)
    expect(page.get_by_text(NOTICE)).to_have_count(0)

    # authorization unavailable
    open_home("503")
    expect(notice).to_have_count(1)
    expect(notice).to_contain_text(NOTICE)
    expect(notice).not_to_have_attribute("role", re_any := __import__("re").compile(".*"))
    notice.get_by_role("button", name="Dismiss").click()
    expect(page.get_by_text(NOTICE)).to_have_count(0)
    expect(page.locator("main")).to_be_focused()

    # ready
    open_home("200")
    expect(page.get_by_text(NOTICE)).to_have_count(0)
    expect(notice).to_have_count(0)
