# l4: generated test (l4/generated-test@1); rewritten by the harness
import os
import re
import pytest
from playwright.sync_api import Page, Route, expect


@pytest.mark.l4("C-87996887")
def test_landing_page_health_states(page: Page) -> None:
    base_url = os.environ["L4_E2E_BASE_URL"].rstrip("/")
    health_url = re.compile(r".*/health$")
    pending: list[Route] = []

    page.route(health_url, lambda route: pending.append(route))

    main = page.locator("main")

    with page.expect_request(health_url):
        page.goto(f"{base_url}/")

    expect(main).to_be_visible()
    loading_text = main.text_content()
    assert loading_text is not None and loading_text.strip() != ""

    pending.pop().fulfill(
        status=200,
        content_type="application/json",
        body='{"status": "ok", "checks": {}}',
    )
    expect(main).not_to_have_text(loading_text)
    healthy_text = main.text_content()
    assert healthy_text is not None and healthy_text.strip() != ""
    assert healthy_text != loading_text

    with page.expect_request(health_url):
        page.reload()
    expect(main).to_have_text(loading_text)
    pending.pop().fulfill(
        status=200,
        content_type="application/json",
        body='{"status": "fail"}',
    )
    expect(main).not_to_have_text(loading_text)
    unavailable_text = main.text_content()
    assert unavailable_text is not None and unavailable_text.strip() != ""
    assert unavailable_text != loading_text
    assert unavailable_text != healthy_text

    with page.expect_request(health_url):
        page.reload()
    expect(main).to_have_text(loading_text)
    pending.pop().fulfill(
        status=503,
        content_type="application/json",
        body='{"status": "fail"}',
    )
    expect(main).to_have_text(unavailable_text)

    with page.expect_request(health_url):
        page.reload()
    expect(main).to_have_text(loading_text)
    pending.pop().abort("failed")
    expect(main).to_have_text(unavailable_text)
