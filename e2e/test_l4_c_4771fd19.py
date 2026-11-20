# l4: generated test (l4/generated-test@1); rewritten by the harness
import os

import pytest
from playwright.sync_api import Page, expect

BASE_URL = os.environ["L4_E2E_BASE_URL"]


@pytest.mark.l4("C-4771fd19")
def test_home_page_heading_visible(page: Page):
    page.goto(BASE_URL)
    expect(page.get_by_role("heading", name="Ursitoare")).to_be_visible()