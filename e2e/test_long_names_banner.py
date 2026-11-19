"""Long account names keep the banner compact and the sign-out button on one line."""

import json

import pytest
from playwright.sync_api import Page, expect

DISPLAY_NAME = "W" * 60
TENANT_NAME = "M" * 60
CAPABILITIES = [
    "read_self",
    "manage_users_roles",
    "read_audit",
    "register_tool_server",
    "deploy_policy",
    "read_flow",
    "read_run",
]


def _mock_ready_session(page: Page) -> None:
    body = {
        "user": {"id": "user-1", "displayName": DISPLAY_NAME, "email": None},
        "tenant": {"id": "tenant-1", "name": TENANT_NAME, "reviewProfile": "solo"},
        "capabilities": CAPABILITIES,
        "csrfToken": "t" + "A" * 42,
    }
    page.route(
        "**/api/v1/me",
        lambda route: route.fulfill(
            status=200, content_type="application/json", body=json.dumps(body)
        ),
    )


@pytest.mark.l4("C-c6a08479", "C-51d4764a", "C-0cbfa992")
@pytest.mark.parametrize("width,height", [(1366, 860), (900, 800)])
def test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line(
    page: Page, base_url: str, width: int, height: int
) -> None:
    page.set_viewport_size({"width": width, "height": height})
    _mock_ready_session(page)
    page.goto(base_url.rstrip("/") + "/")

    banner = page.get_by_role("banner")
    expect(banner).to_contain_text(DISPLAY_NAME)
    expect(banner).to_contain_text(TENANT_NAME)

    banner_height = banner.evaluate("(el) => el.getBoundingClientRect().height")
    assert abs(banner_height - 56) <= 1, (
        f"banner is {banner_height}px tall, expected 56px within 1"
    )

    account = page.get_by_role("group", name="Account", exact=True)
    paragraphs = account.locator("p").evaluate_all(
        "(els) => els.map((el) => [getComputedStyle(el).textOverflow,"
        " el.scrollWidth > el.clientWidth])"
    )
    assert paragraphs == [["ellipsis", True], ["ellipsis", True]]

    sign_out = page.get_by_role("button", name="Sign out", exact=True)
    box = sign_out.bounding_box()
    assert box is not None
    assert abs(box["height"] - 38) <= 1, (
        f"the Sign out button is {box['height']}px tall, expected 38px within 1"
    )
    assert box["x"] + box["width"] <= width
