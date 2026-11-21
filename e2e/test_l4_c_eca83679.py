# l4: generated test (l4/generated-test@1); rewritten by the harness
import pytest
from playwright.sync_api import Page, expect

from conftest import assert_accessible, assert_layout, login, watch_csp


@pytest.mark.l4("C-eca83679")
def test_narrow_menu_reveals_navigation(page: Page, fresh_state, users, tmp_path) -> None:
    csp = watch_csp(page)
    login(page, users["carol"])

    page.set_viewport_size({"width": 900, "height": 800})
    page.goto("/")

    menu = page.get_by_role("button", name="Menu")
    expect(menu).to_be_visible()
    expect(menu).to_have_attribute("aria-expanded", "false")

    menu.click()

    expect(page.get_by_role("link", name="Audit log")).to_be_visible()

    assert_layout(page, 72)
    assert_accessible(page)
    assert csp == []

    shot = tmp_path / "carol-home-narrow.png"
    page.screenshot(path=str(shot), full_page=True)
    assert shot.exists() and shot.stat().st_size > 0
