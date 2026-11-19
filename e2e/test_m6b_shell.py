"""M6b shell: the sign-in and not-found pages are cards in the shell."""

import pytest
from playwright.sync_api import Page, expect

from conftest import assert_accessible, assert_layout, watch_csp

DISABLED_TEXT = "Your account is disabled. Ask an administrator."


def _box(locator) -> dict:
    box = locator.bounding_box()
    assert box is not None
    return box


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-88a078f0")
def test_sign_in_and_not_found_render_as_centred_cards(page: Page, base_url: str) -> None:
    page.set_viewport_size({"width": 1366, "height": 860})
    violations = watch_csp(page)

    for path in ["/sign-in", "/sign-in?error=OIDC_USER_DISABLED"]:
        page.goto(base_url + path)
        expect(page.get_by_role("heading", name="Sign in")).to_be_visible()
        button = page.get_by_role("button", name="Sign in")
        expect(button).to_have_count(1)
        assert abs(_box(button)["width"] - 334) <= 1
        assert abs(_box(page.locator("main"))["x"]) <= 1
        card = _box(page.locator("main > div"))
        assert abs(card["width"] - 384) <= 1
        assert abs(card["y"] - 104) <= 1
        assert abs(card["x"] + card["width"] / 2 - 683) <= 1
        if "error" in path:
            alert = page.get_by_role("alert")
            expect(alert).to_have_count(1)
            expect(alert).to_contain_text(DISABLED_TEXT)
            assert page.locator("main > div").get_by_role("alert").count() == 1
        assert_layout(page, 72)
        assert_accessible(page)

    page.goto(base_url + "/no-such-page")
    expect(page.get_by_role("heading", name="Page not found")).to_be_visible()
    expect(page).to_have_title("Page not found · Ursitoare")
    link = page.get_by_role("link", name="Go to the landing page")
    assert link.get_attribute("href") == "/"
    assert abs(_box(page.locator("main"))["x"]) <= 1
    card = _box(page.locator("main > div"))
    assert abs(card["width"] - 448) <= 1
    assert abs(card["y"] - 128) <= 1
    assert abs(card["x"] + card["width"] / 2 - 683) <= 1
    assert_layout(page, 72)
    assert_accessible(page)
    assert violations == []
