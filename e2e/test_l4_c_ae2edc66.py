# l4: generated test (l4/generated-test@1); rewritten by the harness
import os
import pytest
from playwright.sync_api import Page, expect


@pytest.mark.l4("C-ae2edc66")
def test_missing_assets_return_json_404_not_found(page: Page) -> None:
    base_url = os.environ["L4_E2E_BASE_URL"].rstrip("/")

    shell_response = page.goto(f"{base_url}/")
    assert shell_response is not None
    assert shell_response.status == 200
    expect(page.get_by_role("link", name="Ursitoare")).to_be_visible()

    for path in ("/assets/missing-Ab3dEf9Z.js", "/logo.png", "/app.JS"):
        response = page.request.get(f"{base_url}{path}")
        assert response.status == 404, f"expected 404 for {path}, got {response.status}"
        content_type = response.headers.get("content-type", "")
        assert content_type.startswith("application/json"), (
            f"expected application/json content-type for {path}, got {content_type!r}"
        )
        payload = response.json()
        assert isinstance(payload, dict)
        assert isinstance(payload.get("error"), dict)
        assert payload["error"].get("code") == "NOT_FOUND"
