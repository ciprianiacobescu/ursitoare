# l4: generated test (l4/generated-test@1); rewritten by the harness
import os

import pytest
from playwright.sync_api import Page, Playwright

from conftest import login


def _me(request):
    response = request.get("/api/v1/me")
    return response


@pytest.mark.l4("C-79192192")
def test_alice_and_mallory_see_their_own_tenant(
    page: Page, playwright: Playwright, fresh_state, users
) -> None:
    base = os.environ["L4_E2E_BASE_URL"]

    assert len(users) == 4
    for name in ("alice", "mallory"):
        assert name in users
    for user in users.values():
        assert user.get("password")

    login(page, users["alice"])
    alice_me = _me(page.request)
    assert alice_me.status == 200
    alice_body = alice_me.json()
    assert alice_body["user"]["displayName"] == "Alice Example"
    assert alice_body["tenant"]["name"] == "E2E tenant"
    assert "read_self" in alice_body["capabilities"]

    other = page.context.browser.new_context(base_url=base)
    try:
        mallory_page = other.new_page()
        login(mallory_page, users["mallory"])
        mallory_me = _me(mallory_page.request)
        assert mallory_me.status == 200
        mallory_body = mallory_me.json()
        assert mallory_body["tenant"]["name"] == "Tenant B"
    finally:
        other.close()

    assert "Tenant B" not in str(alice_body)
    assert "E2E tenant" not in str(mallory_body)

    anon = playwright.request.new_context(base_url=base)
    try:
        response = anon.get("/api/v1/me")
        assert response.status == 401
        assert response.json()["error"]["code"] == "UNAUTHENTICATED"
    finally:
        anon.dispose()

    first = page.request.post("/auth/oidc/logout")
    assert first.status == 403
    assert first.json()["error"]["code"] == "OIDC_CSRF_INVALID"

    second = page.request.post(
        "/auth/oidc/logout", headers={"x-csrf-token": alice_body["csrfToken"]}
    )
    assert second.status == 200
    assert isinstance(second.json()["redirect"], str)

    assert _me(page.request).status == 401
