"""The M1 closing journey: sign-in, tenant isolation and sign-out through the offline fake provider."""

from urllib.parse import urlparse

import pytest
from playwright.sync_api import Browser, Page, Playwright, expect

from conftest import assert_accessible, login

DISABLED_TEXT = "Your account is disabled. Ask an administrator."


def _focus_by_tab(page: Page, button) -> None:
    expect(button).to_be_visible()
    for _ in range(15):
        if button.evaluate("(el) => el === document.activeElement"):
            return
        page.keyboard.press("Tab")
    assert button.evaluate("(el) => el === document.activeElement")


def _assert_focus_ring(button) -> None:
    style = button.evaluate(
        "(el) => { const s = getComputedStyle(el); return [s.outlineStyle, parseFloat(s.outlineWidth)]; }"
    )
    assert style[0] != "none"
    assert style[1] >= 2


@pytest.mark.milestone("M1")
@pytest.mark.l4("C-ee431615")
def test_c_ee431615_the_sign_in_page_shows_the_error_and_is_accessible(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    page.goto("/sign-in?error=OIDC_USER_DISABLED")

    expect(page.get_by_role("heading", name="Sign in", exact=True)).to_be_visible()
    expect(page.get_by_role("alert").filter(has_text=DISABLED_TEXT)).to_be_visible()
    expect(page.get_by_role("button", name="Sign in", exact=True)).to_have_count(1)
    assert_accessible(page)


@pytest.mark.milestone("M1")
@pytest.mark.l4("C-d115a25a")
def test_c_d115a25a_alice_signs_in_and_the_header_shows_user_and_tenant(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    with page.expect_response(
        lambda r: r.url.endswith("/api/v1/me") and r.status == 200
    ) as answer:
        login(page, users["alice"])

    assert "read_self" in answer.value.json()["capabilities"]
    banner = page.get_by_role("banner")
    expect(banner).to_contain_text("Signed in as Alice Example")
    expect(banner).to_contain_text("Tenant: E2E tenant")
    expect(banner.get_by_role("button", name="Sign out")).to_be_visible()
    assert_accessible(page)


@pytest.mark.milestone("M1")
@pytest.mark.l4("C-a699ddc9")
def test_c_a699ddc9_two_tenants_stay_apart(
    page: Page,
    browser: Browser,
    base_url: str,
    fresh_state: None,
    users: dict[str, dict[str, str]],
) -> None:
    login(page, users["alice"])
    context = browser.new_context(base_url=base_url)
    try:
        other = context.new_page()
        login(other, users["mallory"])
        banner = other.get_by_role("banner")
        expect(banner).to_contain_text(users["mallory"]["displayName"])
        expect(banner).to_contain_text("Tenant B")
        expect(banner).not_to_contain_text("E2E tenant")
        expect(banner).not_to_contain_text("Alice Example")
    finally:
        context.close()

    expect(page.get_by_role("banner")).to_contain_text("Alice Example")
    expect(page.get_by_role("banner")).to_contain_text("E2E tenant")


@pytest.mark.milestone("M1")
@pytest.mark.l4("C-c3f18eb0")
def test_c_c3f18eb0_a_request_without_a_session_is_unauthenticated(
    playwright: Playwright, base_url: str, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    request = playwright.request.new_context(base_url=base_url)
    try:
        response = request.get("/api/v1/me")
        assert response.status == 401
        assert response.json()["error"]["code"] == "UNAUTHENTICATED"
    finally:
        request.dispose()


@pytest.mark.milestone("M1")
@pytest.mark.l4("C-67c1baa1")
def test_c_67c1baa1_sign_out_ends_the_session(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["alice"])

    page.get_by_role("banner").get_by_role("button", name="Sign out").click()

    expect(page.get_by_role("button", name="Sign in", exact=True)).to_be_visible()
    assert urlparse(page.url).path == "/sign-in"
    assert page.request.get("/api/v1/me").status == 401


@pytest.mark.milestone("M1")
@pytest.mark.l4("C-6e84f9b2")
def test_c_6e84f9b2_a_post_without_the_csrf_header_is_refused(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["alice"])

    response = page.request.post("/auth/oidc/logout")
    assert response.status == 403
    assert response.json()["error"]["code"] == "OIDC_CSRF_INVALID"

    page.reload()
    expect(page.get_by_role("banner")).to_contain_text("Alice Example")


@pytest.mark.milestone("M1")
@pytest.mark.l4("C-4faae006")
def test_c_4faae006_the_return_path_is_kept(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["alice"], "/sign-in?error=SESSION_ENDED&return_to=%2Fflows")

    page.wait_for_url(lambda url: urlparse(url).path == "/flows")
    expect(page.get_by_role("banner")).to_contain_text("Alice Example")


@pytest.mark.milestone("M1")
@pytest.mark.l4("C-a76b8eac")
def test_c_a76b8eac_the_sign_in_and_sign_out_buttons_are_keyboard_reachable(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    page.goto("/sign-in")
    sign_in = page.get_by_role("button", name="Sign in", exact=True)
    _focus_by_tab(page, sign_in)
    _assert_focus_ring(sign_in)

    login(page, users["alice"])
    sign_out = page.get_by_role("banner").get_by_role("button", name="Sign out")
    _focus_by_tab(page, sign_out)
    _assert_focus_ring(sign_out)
