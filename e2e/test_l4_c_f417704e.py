# l4: generated test (l4/generated-test@1); rewritten by the harness
import os

import pytest
from playwright.sync_api import Page, expect

from conftest import assert_accessible, assert_layout, watch_csp


@pytest.mark.l4("C-f417704e")
def test_signed_out_pages_are_styled(page: Page, tmp_path) -> None:
    base = os.environ["L4_E2E_BASE_URL"].rstrip("/")
    page.set_viewport_size({"width": 1366, "height": 860})
    csp = watch_csp(page)

    cases = [
        ("/", "signed-out-home.png"),
        ("/sign-in", "signed-out-sign-in.png"),
        ("/no-such-page", "signed-out-no-such-page.png"),
    ]
    for path, shot in cases:
        page.goto(base + path)
        if path == "/":
            status = page.get_by_role("status")
            expect(status).to_have_count(1)
            expect(status).to_have_text("Engine healthy")
        elif path == "/sign-in":
            expect(page.get_by_role("heading", name="Sign in")).to_be_visible()
        else:
            expect(page.get_by_role("heading", name="Page not found")).to_be_visible()
        assert_layout(page, 72)
        assert_accessible(page)
        target = tmp_path / shot
        page.screenshot(path=str(target), full_page=True)
        assert target.exists() and target.stat().st_size > 0

    assert csp == []
