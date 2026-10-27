# l4: generated test (l4/generated-test@1); rewritten by the harness
import os
import pytest
from playwright.sync_api import Page, expect


@pytest.mark.l4("C-133bb26a")
def test_client_routes_return_index_html(page: Page) -> None:
    base_url = os.environ["L4_E2E_BASE_URL"].rstrip("/")
    paths = ["/", "/flows", "/runs/r1/", "/t/ab.cd?x=1", "/assets"]

    index_bytes: bytes | None = None
    for path in paths:
        response = page.goto(f"{base_url}{path}")
        assert response is not None, f"Expected a response for {path}"
        assert response.status == 200, f"Expected 200 for {path}, got {response.status}"

        body = response.body()
        if index_bytes is None:
            index_bytes = body
            assert len(index_bytes) > 0
        else:
            assert body == index_bytes, f"Expected {path} to return the bytes of index.html"

        expect(page.get_by_role("main")).to_be_visible()
        expect(page.get_by_role("link", name="Ursitoare")).to_be_visible()
