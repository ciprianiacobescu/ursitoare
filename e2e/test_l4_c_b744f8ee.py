# l4: generated test (l4/generated-test@1); rewritten by the harness
import os

import pytest
from playwright.sync_api import Page, expect

from conftest import assert_accessible, assert_layout, login, watch_csp


@pytest.mark.l4("C-b744f8ee")
def test_carol_pages_are_laid_out_and_accessible(page: Page, fresh_state, users) -> None:
    base = os.environ["L4_E2E_BASE_URL"].rstrip("/")
    page.set_viewport_size({"width": 1366, "height": 860})
    watch_csp(page)
    login(page, users["carol"])

    page.goto("/")
    nav = page.get_by_role("navigation").first
    expect(nav).to_contain_text("Build")
    expect(nav).to_contain_text("Admin")
    expect(page.get_by_text("Review pending tool servers").first).to_be_visible()
    assert_layout(page)
    assert_accessible(page)

    hrefs = page.evaluate(
        "() => Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href'))"
    )
    paths = []
    for href in hrefs:
        if href.startswith(base):
            href = href[len(base):]
        if href.startswith("/admin") and href not in paths:
            paths.append(href)
    for extra in ("/admin/grants", "/admin/tool-servers?server=acme"):
        if extra not in paths:
            paths.append(extra)

    seen = set()
    for path in paths:
        page.goto(path)
        h1 = page.locator("h1").first
        expect(h1).to_be_visible()
        seen.add(h1.inner_text().strip())
        assert_layout(page)
        assert_accessible(page)

    expected = {
        "Users",
        "Roles and teams",
        "Group mappings",
        "Audit log",
        "Tool servers",
        "Grants",
        "Policies",
    }
    assert expected <= seen, f"missing headings: {expected - seen}; saw {seen}"
