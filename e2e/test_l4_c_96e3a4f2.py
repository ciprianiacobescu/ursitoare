# l4: generated test (l4/generated-test@1); rewritten by the harness
import os

import pytest
from playwright.sync_api import Page, expect


@pytest.mark.l4("C-96e3a4f2")
def test_earlier_skeleton_and_kit_journeys_still_pass(page: Page) -> None:
    base = os.environ["L4_E2E_BASE_URL"]

    page.goto(base)
    expect(page.locator("#main")).to_be_visible()
    nav = page.get_by_role("navigation")
    expect(nav).to_be_visible()

    hrefs: list[str] = []
    links = nav.get_by_role("link")
    for index in range(links.count()):
        href = links.nth(index).get_attribute("href")
        if href and href not in hrefs:
            hrefs.append(href)

    assert hrefs, "the shell still offers its journey links"

    for href in hrefs:
        page.goto(base + href)
        expect(page.locator("#main")).to_be_visible()
        expect(page.get_by_role("navigation")).to_be_visible()
        expect(page.locator("body")).not_to_contain_text("not implemented")
        expect(page.locator("body")).not_to_contain_text("Application error")
