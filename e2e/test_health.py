"""Bootstrap smoke test: the served engine answers GET /health."""

import pytest
from playwright.sync_api import Page


@pytest.mark.milestone("M0")
def test_health_reports_ok(page: Page, base_url: str) -> None:
    response = page.goto(f"{base_url}/health")
    assert response is not None
    assert response.status == 200
    body = response.json()
    assert body["status"] == "ok"
    assert isinstance(body["version"], str)
