# l4: generated test (l4/generated-test@1); rewritten by the harness
import os
import pytest
from playwright.sync_api import Page, expect


@pytest.mark.l4("C-ee431615")
def test_sign_in_page_shows_disabled_error_and_is_accessible(page: Page):
    base_url = os.environ["L4_E2E_BASE_URL"].rstrip("/")
    page.goto(f"{base_url}/sign-in?error=OIDC_USER_DISABLED")

    expect(page.get_by_role("heading", name="Sign in", exact=True)).to_be_visible()

    expect(page.get_by_role("alert")).to_contain_text(
        "Your account is disabled. Ask an administrator."
    )

    sign_in_buttons = page.get_by_role("button", name="Sign in", exact=True)
    expect(sign_in_buttons).to_have_count(1)
    expect(sign_in_buttons).to_be_visible()

    expect(page.locator("html")).to_have_attribute("lang", "en")
    expect(page.get_by_role("main")).to_be_visible()
