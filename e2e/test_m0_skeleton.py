"""The M0 skeleton journey: the engine serves the built app with safe defaults."""

import json
import urllib.error
import urllib.request

import pytest
from playwright.sync_api import Page, expect

CONTENT_SECURITY_POLICY = (
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
    "connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; "
    "form-action 'self'; object-src 'none'"
)

SECURITY_HEADERS = {
    "content-security-policy": CONTENT_SECURITY_POLICY,
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
}


def _get(url: str) -> tuple[int, dict[str, str], str]:
    """Send a raw GET, keeping the path exactly as written (traversal forms included)."""
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    request = urllib.request.Request(url, method="GET")
    try:
        with opener.open(request, timeout=30) as response:
            headers = {name.lower(): value for name, value in response.headers.items()}
            return response.status, headers, response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        headers = {name.lower(): value for name, value in error.headers.items()}
        return error.code, headers, error.read().decode("utf-8")


def _assert_security_headers(headers: dict[str, str]) -> None:
    for name, value in SECURITY_HEADERS.items():
        assert headers.get(name) == value, f"{name} must be {value!r}"
    policy = headers.get("content-security-policy", "")
    assert "unsafe-inline" not in policy
    assert "unsafe-eval" not in policy


@pytest.mark.milestone("M0")
@pytest.mark.l4("C-3dda369f")
def test_security_headers_on_every_response(
    page: Page, base_url: str, fresh_state: None
) -> None:
    for path in ("/", "/health"):
        response = page.goto(f"{base_url}{path}")
        assert response is not None
        assert response.status == 200, f"GET {path} succeeds"
        _assert_security_headers(response.headers)


@pytest.mark.milestone("M0")
@pytest.mark.l4("C-3dda369f")
def test_unknown_api_path_is_json_404(
    page: Page, base_url: str, fresh_state: None
) -> None:
    response = page.goto(f"{base_url}/api/v1/does-not-exist")
    assert response is not None
    assert response.status == 404
    assert response.headers.get("content-type", "").startswith("application/json")
    body = response.json()
    assert body["error"]["code"] == "NOT_FOUND"


@pytest.mark.milestone("M0")
@pytest.mark.l4("C-3dda369f")
def test_encoded_traversal_is_refused(
    base_url: str, fresh_state: None
) -> None:
    status, headers, body = _get(f"{base_url}/%2e%2e%2f%2e%2e%2fetc/passwd")
    assert status == 404
    assert headers.get("content-type", "").startswith("application/json")
    assert json.loads(body)["error"]["code"] == "NOT_FOUND"


@pytest.mark.milestone("M0")
@pytest.mark.l4("C-3dda369f")
def test_landing_page_reports_engine_health(
    page: Page, base_url: str, fresh_state: None
) -> None:
    response = page.goto(f"{base_url}/")
    assert response is not None
    assert response.status == 200
    expect(page.get_by_role("heading", name="Ursitoare")).to_be_visible()
    expect(page.get_by_text("Engine healthy")).to_be_visible()


@pytest.mark.milestone("M0")
@pytest.mark.l4("C-60599e6f")
def test_shell_landmarks_and_skip_link(
    page: Page, base_url: str, fresh_state: None
) -> None:
    console_messages: list[str] = []
    page_errors: list[object] = []
    page.on("console", lambda message: console_messages.append(message.text))
    page.on("pageerror", lambda error: page_errors.append(error))

    response = page.goto(f"{base_url}/")
    assert response is not None
    assert response.status == 200

    expect(page.get_by_role("banner")).to_be_visible()
    navigation = page.get_by_role("navigation", name="Main")
    expect(navigation).to_be_visible()
    expect(page.get_by_role("main")).to_be_visible()
    expect(page.get_by_role("contentinfo")).to_be_visible()
    expect(page.get_by_role("heading", name="Ursitoare")).to_be_visible()

    skip_link = page.get_by_role("link", name="Skip to content")
    page.keyboard.press("Tab")
    expect(skip_link).to_be_focused()
    expect(skip_link).to_be_in_viewport()
    outline_style = skip_link.evaluate(
        "element => getComputedStyle(element).outlineStyle"
    )
    assert outline_style != "none", "the focused skip link has a visible outline"

    page.keyboard.press("Enter")
    expect(page.get_by_role("main")).to_be_focused()
    expect(navigation.get_by_role("link", name="Home")).to_be_visible()

    assert not any(
        "Content Security Policy" in message for message in console_messages
    ), "no console message mentions a Content Security Policy violation"
    assert page_errors == [], "no page error occurs"


@pytest.mark.milestone("M0")
@pytest.mark.l4("C-0daf92cd")
def test_deep_link_returns_the_app(
    page: Page, base_url: str, fresh_state: None
) -> None:
    response = page.goto(f"{base_url}/flows")
    assert response is not None
    assert response.status == 200

    expect(
        page.get_by_role("banner").get_by_role("link", name="Ursitoare")
    ).to_be_visible()
    expect(page.get_by_role("heading", name="Page not found")).to_be_visible()
    expect(page).to_have_title("Page not found · Ursitoare")
