"""The M1 web kit journey: capability-filtered navigation and its one notice."""

import json

import pytest
from playwright.sync_api import Page, Request, Route, expect

NOTICE = (
    "Some menu entries are hidden because your permissions could not be loaded. "
    "Authorization is unavailable right now. Try again in a moment."
)

CSRF_TOKEN = "csrf_" + "a" * 38


def _valid_me() -> dict[str, object]:
    return {
        "user": {"id": "user-1", "displayName": "Alice", "email": None},
        "tenant": {"id": "tenant-1", "name": "Tenant", "reviewProfile": "solo"},
        "capabilities": ["read_flow"],
        "csrfToken": CSRF_TOKEN,
    }


def _count_me_requests(page: Page) -> list[Request]:
    requests: list[Request] = []

    def record(request: Request) -> None:
        if request.url.endswith("/api/v1/me"):
            requests.append(request)

    page.on("request", record)
    return requests


def _open_expecting_me(page: Page, base_url: str):
    with page.expect_response(
        lambda response: response.url.endswith("/api/v1/me")
    ) as answer:
        response = page.goto(f"{base_url}/")
    assert response is not None
    assert response.status == 200
    return answer.value


@pytest.mark.milestone("M1")
@pytest.mark.l4("C-f6d2569a")
def test_c_f6d2569a_signed_out_nav_lists_home(
    page: Page, base_url: str, fresh_state: None
) -> None:
    requests = _count_me_requests(page)

    me_response = _open_expecting_me(page, base_url)
    assert me_response.status == 401

    navigation = page.get_by_role("navigation", name="Main")
    expect(navigation.get_by_role("link", name="Home")).to_be_visible()
    expect(page.get_by_text(NOTICE)).to_have_count(0)
    assert len(requests) == 1


@pytest.mark.milestone("M1")
@pytest.mark.l4("C-f6d2569a")
def test_c_f6d2569a_me_failure_shows_one_notice(
    page: Page, base_url: str, fresh_state: None
) -> None:
    requests = _count_me_requests(page)

    def answer(route: Route) -> None:
        route.fulfill(
            status=503,
            content_type="application/json",
            body=json.dumps(
                {"error": {"code": "AUTHZ_UNAVAILABLE", "message": "x"}}
            ),
        )

    page.route("**/api/v1/me", answer)

    me_response = _open_expecting_me(page, base_url)
    assert me_response.status == 503

    navigation = page.get_by_role("navigation", name="Main")
    expect(navigation.get_by_role("link", name="Home")).to_be_visible()

    notice_region = page.locator('[aria-live="polite"]')
    expect(notice_region).to_have_count(1)
    assert notice_region.get_attribute("role") is None
    expect(notice_region.get_by_text(NOTICE)).to_be_visible()

    notice_region.get_by_role("button", name="Dismiss").click()
    expect(page.get_by_text(NOTICE)).to_have_count(0)
    expect(page.get_by_role("main")).to_be_focused()

    assert len(requests) == 1


@pytest.mark.milestone("M1")
@pytest.mark.l4("C-f6d2569a")
def test_c_f6d2569a_me_success_keeps_the_nav(
    page: Page, base_url: str, fresh_state: None
) -> None:
    requests = _count_me_requests(page)

    def answer(route: Route) -> None:
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(_valid_me()),
        )

    page.route("**/api/v1/me", answer)

    me_response = _open_expecting_me(page, base_url)
    assert me_response.status == 200

    navigation = page.get_by_role("navigation", name="Main")
    expect(navigation.get_by_role("link", name="Home")).to_be_visible()
    expect(page.get_by_text(NOTICE)).to_have_count(0)
    assert len(requests) == 1
