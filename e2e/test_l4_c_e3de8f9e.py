# l4: generated test (l4/generated-test@1); rewritten by the harness
import json
import os

import pytest
from playwright.sync_api import Page, expect

ME = {
    "user": {"id": "user-1", "displayName": "<b>Alice</b>", "email": None},
    "tenant": {"id": "tenant-1", "name": "T <i>", "reviewProfile": "solo"},
    "capabilities": ["read_self"],
    "csrfToken": "t" + "A" * 42,
}


@pytest.mark.l4("C-e3de8f9e")
def test_header_shows_user_tenant_and_sign_out(page: Page) -> None:
    base = os.environ["L4_E2E_BASE_URL"].rstrip("/")
    mode = {"state": "failed"}

    def handle(route) -> None:
        request = route.request
        api = request.resource_type in ("fetch", "xhr") and request.url.startswith(base)
        if not api:
            route.continue_()
            return
        if mode["state"] == "failed":
            route.abort("failed")
        elif mode["state"] == "signed_out":
            route.fulfill(
                status=401,
                content_type="application/json",
                body=json.dumps({"code": "SESSION_ENDED"}),
            )
        else:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(ME),
            )

    page.route("**/*", handle)
    banner = page.get_by_role("banner")

    mode["state"] = "failed"
    page.goto(f"{base}/flows?tab=2")
    expect(banner.get_by_role("link", name="Sign in", exact=True)).to_have_count(0)
    expect(banner.get_by_role("button", name="Sign out", exact=True)).to_have_count(0)

    mode["state"] = "signed_out"
    page.goto(f"{base}/flows?tab=2")
    sign_in = banner.get_by_role("link", name="Sign in", exact=True)
    expect(sign_in).to_be_visible()
    expect(sign_in).to_have_attribute("href", "/sign-in?return_to=%2Fflows%3Ftab%3D2")
    expect(banner.get_by_role("button", name="Sign out", exact=True)).to_have_count(0)

    page.goto(f"{base}/")
    sign_in = banner.get_by_role("link", name="Sign in", exact=True)
    expect(sign_in).to_be_visible()
    expect(sign_in).to_have_attribute("href", "/sign-in")

    page.goto(f"{base}/sign-in")
    expect(banner.get_by_role("link", name="Sign in", exact=True)).to_have_count(0)
    expect(banner.get_by_role("button", name="Sign out", exact=True)).to_have_count(0)

    mode["state"] = "ready"
    page.goto(f"{base}/")
    account = banner.get_by_role("group", name="Account")
    expect(account).to_be_visible()
    expect(account).to_contain_text("Signed in as <b>Alice</b>")
    expect(account).to_contain_text("Tenant: T <i>")
    expect(account.get_by_role("button", name="Sign out", exact=True)).to_be_enabled()
    expect(banner.get_by_role("link", name="Sign in", exact=True)).to_have_count(0)
