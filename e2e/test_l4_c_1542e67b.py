# l4: generated test (l4/generated-test@1); rewritten by the harness
import os
import time
import pytest
from playwright.sync_api import Page, Route, expect


@pytest.mark.l4("C-1542e67b")
def test_landing_page_reports_engine_health(page: Page) -> None:
    base_url = os.environ["L4_E2E_BASE_URL"].rstrip("/")
    held_routes: list[Route] = []
    mode = "hold"

    def handle_health(route: Route) -> None:
        if mode == "hold":
            held_routes.append(route)
        else:
            route.fulfill(
                status=503,
                content_type="application/json",
                body='{"status":"unavailable"}',
            )

    def fulfill_held_with_ok() -> None:
        deadline = time.monotonic() + 5.0
        while not held_routes:
            assert time.monotonic() < deadline, "Timed out waiting for held /health request"
            page.wait_for_timeout(10)
        while held_routes:
            held_routes.pop(0).fulfill(
                status=200,
                content_type="application/json",
                body='{"status":"ok"}',
            )

    page.route(f"{base_url}/health", handle_health)

    status = page.get_by_role("status")
    check_again = page.get_by_role("button", name="Check again")

    page.goto(f"{base_url}/")
    expect(status).to_contain_text("Checking engine health")

    fulfill_held_with_ok()
    expect(status).to_contain_text("Engine healthy")

    mode = "503"
    page.goto(f"{base_url}/")
    expect(status).to_contain_text("Engine unavailable")
    expect(check_again).to_be_visible()

    mode = "hold"
    check_again.click()
    expect(status).to_contain_text("Checking engine health")
    expect(check_again).to_be_visible()
    expect(check_again).to_have_attribute("aria-disabled", "true")
    expect(check_again).to_be_focused()

    fulfill_held_with_ok()
    expect(status).to_contain_text("Engine healthy")
    expect(check_again).to_have_count(0)
    expect(status).to_be_focused()
