"""M6b foundation: signed-out pages and the two browser helpers (no sign-in)."""

import pytest
from playwright.sync_api import Page, Route, expect

from conftest import assert_accessible, assert_layout, watch_csp


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-546ee64e")
@pytest.mark.parametrize("path", ["/", "/sign-in"])
def test_signed_out_pages_are_styled_clean_and_accessible(
    page: Page, base_url: str, path: str
) -> None:
    page.set_viewport_size({"width": 1366, "height": 860})
    violations = watch_csp(page)
    page.goto(base_url + path)
    heading = page.get_by_role("heading", level=1)
    expect(heading).to_be_visible()
    assert_layout(page, max_banner_px=300)
    size = heading.evaluate("el => parseFloat(getComputedStyle(el).fontSize)")
    assert size >= 24
    assert_accessible(page)
    assert violations == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-97e30a51")
def test_watch_csp_reports_a_violation(page: Page, base_url: str) -> None:
    violations = watch_csp(page)

    def probe(route: Route) -> None:
        route.fulfill(
            status=200,
            content_type="text/html",
            headers={"Content-Security-Policy": "default-src 'self'; style-src 'self'"},
            body="<!doctype html><title>probe</title><style>p { margin: 0 }</style><header>probe</header><p>x</p>",
        )

    page.route("**/csp-probe", probe)
    page.goto(base_url + "/csp-probe")
    page.wait_for_load_state("load")
    assert [v for v in violations if v.startswith("Content Security Policy violation: style-src")]


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-97e30a51")
def test_assert_layout_reports_the_numbers(page: Page, base_url: str) -> None:
    violations = watch_csp(page)
    page.set_viewport_size({"width": 1000, "height": 700})
    page.set_content(
        '<body style="margin:0"><header style="height:100px">h</header>'
        '<div style="width:1500px">w</div></body>'
    )
    with pytest.raises(AssertionError) as wide:
        assert_layout(page)
    assert "banner 100px is taller than 72px" in str(wide.value)
    assert "scrollWidth 1500 exceeds innerWidth 1000" in str(wide.value)
    page.set_content('<header style="height:100px">h</header>')
    assert_layout(page, max_banner_px=100)
    with pytest.raises(AssertionError) as tall:
        assert_layout(page, max_banner_px=99)
    assert str(tall.value) == "layout: banner 100px is taller than 99px"
    assert violations == []
