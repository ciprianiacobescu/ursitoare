# l4: generated test (l4/generated-test@1); rewritten by the harness
import os

import pytest
from playwright.sync_api import Page, expect


@pytest.mark.l4("C-20b4a37d")
def test_navigation_sits_in_banner_with_no_sidebar_when_signed_out(page: Page):
    base_url = os.environ["L4_E2E_BASE_URL"]
    page.goto(base_url)
    expect(page.get_by_role("link", name="Sign in")).to_be_visible()
    main_nav = page.get_by_role("navigation", name="Main")
    expect(main_nav).to_have_count(1)
    expect(page.locator("header").get_by_role("navigation", name="Main")).to_have_count(1)