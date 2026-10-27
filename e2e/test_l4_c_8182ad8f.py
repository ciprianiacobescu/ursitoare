# l4: generated test (l4/generated-test@1); rewritten by the harness
import os
import re
import pytest
from playwright.sync_api import Page, expect


@pytest.mark.l4("C-8182ad8f")
def test_composition_root_serves_web_app_health_and_api_404(page: Page) -> None:
    base_url = os.environ["L4_E2E_BASE_URL"].rstrip("/")

    root_response = page.goto(f"{base_url}/")
    assert root_response is not None
    assert root_response.status == 200
    root_headers = {k.lower(): v for k, v in root_response.headers.items()}
    assert "content-security-policy" in root_headers
    assert "default-src" in root_headers["content-security-policy"]

    expect(page).to_have_title(re.compile(r"Ursitoare"))
    expect(page.get_by_role("link", name="Ursitoare")).to_be_visible()
    expect(page.get_by_role("main")).to_be_visible()

    health_response = page.request.get(f"{base_url}/health")
    assert health_response.status == 200
    health_data = health_response.json()
    assert health_data.get("status") == "ok"

    health_headers = {k.lower(): v for k, v in health_response.headers.items()}
    assert health_headers.get("x-content-type-options") == "nosniff"
    assert "x-frame-options" in health_headers
    assert "referrer-policy" in health_headers
    security_headers = {
        "x-content-type-options",
        "x-frame-options",
        "referrer-policy",
        "cross-origin-resource-policy",
        "cross-origin-opener-policy",
        "permissions-policy",
        "content-security-policy",
        "strict-transport-security",
        "x-permitted-cross-domain-policies",
    }
    assert len(security_headers.intersection(health_headers.keys())) >= 4

    api_response = page.request.get(f"{base_url}/api/v1/x")
    assert api_response.status == 404
    api_data = api_response.json()
    assert api_data.get("error", {}).get("code") == "NOT_FOUND"
