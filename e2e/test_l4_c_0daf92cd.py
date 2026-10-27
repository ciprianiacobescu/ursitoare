# l4: generated test (l4/generated-test@1); rewritten by the harness
import os
import pytest
from playwright.sync_api import Page, expect


@pytest.mark.l4("C-0daf92cd")
def test_deep_link_not_found_shell(page: Page) -> None:
    base_url = os.environ["L4_E2E_BASE_URL"].rstrip("/")
    response = page.goto(f"{base_url}/flows")
    assert response is not None
    assert response.status == 200

    banner = page.get_by_role("banner")
    expect(banner.get_by_role("link", name="Ursitoare")).to_be_visible()
    expect(page.get_by_role("heading", name="Page not found")).to_be_visible()
    expect(page).to_have_title("Page not found · Ursitoare")
