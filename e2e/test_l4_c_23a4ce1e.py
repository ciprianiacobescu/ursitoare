# l4: generated test (l4/generated-test@1); rewritten by the harness
import os

import pytest
from playwright.sync_api import Page, expect

BASE_URL = os.environ["L4_E2E_BASE_URL"]


@pytest.mark.l4("C-23a4ce1e")
def test_sign_in_search_parsing(page: Page) -> None:
    page.route("**/auth/oidc/login*", lambda route: route.abort())

    def check(
        search: str,
        *,
        message: str | None,
        shows_error: bool,
        login_return: str,
    ) -> None:
        page.goto(f"{BASE_URL}/sign-in{search}")
        expect(page.get_by_role("button", name="Sign in")).to_be_visible()
        if shows_error:
            expect(page.locator('[role="alert"]')).to_be_visible()
        else:
            expect(page.locator('[role="alert"]')).to_have_count(0)
        if message is not None:
            expect(page.get_by_text(message)).to_be_visible()
        with page.expect_event("request") as request_info:
            page.get_by_role("button", name="Sign in").click()
        assert (
            request_info.value.url
            == f"{BASE_URL}/auth/oidc/login?return_to={login_return}"
        )

    check(
        "?error=OIDC_TOKEN_INVALID&return_to=%2Fruns%2F5",
        message="could not be trusted",
        shows_error=True,
        login_return="%2Fruns%2F5",
    )
    check("?error=%3Cscript%3E", message=None, shows_error=True, login_return="%2F")
    check("?error=__proto__", message=None, shows_error=True, login_return="%2F")
    check("?error=", message=None, shows_error=False, login_return="%2F")
    check("", message=None, shows_error=False, login_return="%2F")
    check("?return_to=%2Fsign-in", message=None, shows_error=False, login_return="%2F")
    check(
        "?error=SESSION_ENDED&error=OIDC_INTERNAL",
        message="session has ended",
        shows_error=True,
        login_return="%2F",
    )
