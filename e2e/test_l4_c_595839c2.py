# l4: generated test (l4/generated-test@1); rewritten by the harness
import os
import pytest
from playwright.sync_api import Page

PRESENT = [
    "@layer components",
    ".ui-button{",
    ".bg-accent{",
    "--ui-color-sidebar:",
    ".bg-quiet-surface{",
    "dialog{margin:auto}",
]

ABSENT = ["bg-white", "[#", "[rgb", "[hsl", "[oklch", "[color"]


@pytest.mark.l4("C-595839c2")
def test_build_emits_layers_kit_rules_and_token_utilities(page: Page):
    base_url = os.environ["L4_E2E_BASE_URL"].rstrip("/")
    page.goto(base_url)

    # index.html ships no inline styles
    assert page.locator("[style]").count() == 0

    # the page references exactly one stylesheet from this origin
    links = page.locator('link[rel="stylesheet"]')
    assert links.count() == 1
    href = links.first.get_attribute("href")
    assert href is not None
    css_url = href if href.startswith("http://") or href.startswith("https://") else base_url + href

    response = page.request.get(css_url)
    assert response.ok
    css = response.text()

    for needle in PRESENT:
        assert needle in css, f"CSS missing: {needle}"
    for needle in ABSENT:
        assert needle not in css, f"CSS contains forbidden: {needle}"