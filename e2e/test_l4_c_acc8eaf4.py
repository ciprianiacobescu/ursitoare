# l4: generated test (l4/generated-test@1); rewritten by the harness
import os
import pytest
from playwright.sync_api import Page, expect


@pytest.mark.l4("C-acc8eaf4")
def test_route_table_and_titles(page: Page) -> None:
    base_url = os.environ["L4_E2E_BASE_URL"].rstrip("/")

    page.goto(f"{base_url}/not-found")
    expect(page).to_have_title("Page not found · Ursitoare")
    expect(page.get_by_role("heading", name="Page not found")).to_be_visible()

    page.goto(f"{base_url}/")
    expect(page).to_have_title("Ursitoare")
