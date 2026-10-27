# l4: generated test (l4/generated-test@1); rewritten by the harness
import os
import pytest
from playwright.sync_api import Page, expect


@pytest.mark.l4("C-2b18a36e")
def test_default_web_dist_serves_web_app(page: Page) -> None:
    base_url = os.environ["L4_E2E_BASE_URL"]
    page.goto(base_url)

    expect(page.get_by_role("link", name="Ursitoare")).to_be_visible()
    expect(page.get_by_role("navigation", name="Main")).to_be_visible()
    expect(page.get_by_role("main")).to_be_visible()
    expect(page.get_by_text("Ursitoare workflow engine")).to_be_visible()
