# l4: generated test (l4/generated-test@1); rewritten by the harness
import http.client
import json
import os
import urllib.parse
import pytest
from playwright.sync_api import Page, expect


@pytest.mark.l4("C-3dda369f")
def test_m0_journey(page: Page) -> None:
    base_url = os.environ["L4_E2E_BASE_URL"].rstrip("/")

    root_response = page.goto(f"{base_url}/")
    assert root_response is not None
    assert root_response.status == 200

    headers = {k.lower(): v for k, v in root_response.headers.items()}
    assert "content-security-policy" in headers
    csp = headers["content-security-policy"]
    assert "default-src" in csp
    assert "'self'" in csp
    assert "unsafe-inline" not in csp
    assert "unsafe-eval" not in csp
    assert headers.get("x-content-type-options", "").lower() == "nosniff"
    assert headers.get("x-frame-options", "").upper() in ("DENY", "SAMEORIGIN")
    assert bool(headers.get("referrer-policy", "").strip())

    expect(page.get_by_role("heading", name="Ursitoare")).to_be_visible()
    expect(page.get_by_text("Engine healthy")).to_be_visible()

    api_response = page.request.get(f"{base_url}/api/v1/does-not-exist")
    assert api_response.status == 404
    assert "application/json" in api_response.headers.get("content-type", "").lower()
    api_payload = api_response.json()
    assert isinstance(api_payload, dict)
    assert isinstance(api_payload.get("error"), dict)
    assert api_payload["error"].get("code") == "NOT_FOUND"

    parsed = urllib.parse.urlsplit(base_url)
    conn = http.client.HTTPConnection(parsed.hostname, parsed.port or 80, timeout=10)
    try:
        conn.request("GET", "/%2e%2e%2f%2e%2e%2fetc/passwd")
        traversal_response = conn.getresponse()
        traversal_status = traversal_response.status
        traversal_content_type = traversal_response.getheader("content-type", "")
        traversal_raw = traversal_response.read().decode("utf-8")
    finally:
        conn.close()

    assert traversal_status == 404
    assert "application/json" in traversal_content_type.lower()
    traversal_payload = json.loads(traversal_raw)
    assert isinstance(traversal_payload, dict)
