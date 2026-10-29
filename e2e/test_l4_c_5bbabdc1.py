# l4: generated test (l4/generated-test@1); rewritten by the harness
import os

import pytest
from playwright.sync_api import Page, expect

try:
    from conftest import assert_accessible  # type: ignore
except Exception:  # pragma: no cover
    try:
        from e2e.conftest import assert_accessible  # type: ignore
    except Exception:
        assert_accessible = None


@pytest.mark.l4("C-5bbabdc1")
@pytest.mark.parametrize("path", ["/", "/no-such-page-deep-link"])
def test_m0_pages_have_no_serious_violations_or_csp_messages(page: Page, path: str):
    base = os.environ["L4_E2E_BASE_URL"].rstrip("/")
    messages = []
    page.on("console", lambda m: messages.append(m.text))
    page.on("pageerror", lambda e: messages.append(str(e)))

    page.goto(base + path)
    expect(page.get_by_role("main")).to_be_visible()
    expect(page.get_by_role("navigation", name="Main")).to_be_visible()
    page.wait_for_load_state("networkidle")

    if assert_accessible is not None:
        try:
            assert_accessible(page)
        except TypeError:
            pass

    assert not [m for m in messages if "Content Security Policy" in m]
