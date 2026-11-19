"""M6b kit restyle: tables, fields, forms and the confirm dialog with mocked answers (no sign-in)."""

import json
import re

import pytest
from playwright.sync_api import Page, Route, expect

from conftest import assert_accessible, assert_layout, watch_csp

ME = {
    "user": {"id": "user-1", "displayName": "Alice Example", "email": None},
    "tenant": {"id": "tenant-1", "name": "E2E tenant", "reviewProfile": "solo"},
    "capabilities": ["read_flow", "manage_users_roles"],
    "csrfToken": "csrf_" + "a" * 38,
}
FLOWS = {
    "items": [
        {
            "flowId": "demo-pay",
            "ownerTeam": "finance",
            "createdBy": "user-1",
            "createdAt": "2026-11-17T10:00:00.000000Z",
            "versionCount": 0,
            "latest": None,
        }
    ],
    "next_cursor": None,
}


def _user(user_id: str, name: str) -> dict:
    return {
        "userId": user_id,
        "kind": "human",
        "displayName": name,
        "email": user_id + "@example.invalid",
        "state": "active",
        "roles": [],
        "teams": [],
        "localRoles": [],
    }


USERS = {
    "items": [_user("user-1", "Alice Example"), _user("user-2", "Bob Example")],
    "next_cursor": None,
}


def _mock(page: Page, path: str, body: dict) -> None:
    def fulfil(route: Route) -> None:
        route.fulfill(status=200, content_type="application/json", body=json.dumps(body))

    page.route(re.compile(r"/api/v1" + re.escape(path) + r"(\?.*)?$"), fulfil)


def _open(page: Page, base_url: str, path: str, mocks: dict) -> list[str]:
    page.set_viewport_size({"width": 1366, "height": 860})
    violations = watch_csp(page)
    _mock(page, "/me", ME)
    for mocked, body in mocks.items():
        _mock(page, mocked, body)
    page.goto(base_url + path)
    return violations


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-40cb2e75")
def test_flows_form_is_bounded_and_keeps_its_focus_ring(page: Page, base_url: str) -> None:
    violations = _open(page, base_url, "/flows", {"/flows": FLOWS})
    name = page.get_by_label("Flow name", exact=True)
    expect(name).to_be_visible()
    expect(page.get_by_role("table", name="Flows", exact=True)).to_be_visible()
    assert name.evaluate("el => el.getBoundingClientRect().width") <= 640
    create = page.get_by_role("button", name="Create flow", exact=True)
    create.focus()
    page.keyboard.press("Shift+Tab")
    page.keyboard.press("Tab")
    expect(create).to_be_focused()
    style = create.evaluate(
        "el => { const s = getComputedStyle(el); return [parseFloat(s.outlineWidth), s.backgroundColor, s.color]; }"
    )
    assert style[0] >= 2
    assert style[1:] == ["rgb(29, 78, 216)", "rgb(255, 255, 255)"]
    create.click(force=True)
    error = page.locator(".ui-field-error").first
    expect(error).to_be_visible()
    assert error.evaluate("el => el.textContent") == "Error: Enter a flow name."
    hidden = error.evaluate(
        "el => { const s = el.querySelector('.ui-visually-hidden'); const c = getComputedStyle(s);"
        " return [c.position, Math.round(s.getBoundingClientRect().width)]; }"
    )
    assert hidden == ["absolute", 1]
    order = name.evaluate(
        "el => Array.from(el.closest('.ui-field').children).map(c => c.tagName + '.' + c.className)"
    )
    assert order == ["LABEL.ui-field-label", "INPUT.ui-input", "P.ui-field-hint", "P.ui-field-error"]
    assert_layout(page, max_banner_px=300)
    assert_accessible(page)
    assert violations == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-859c63d2")
def test_users_table_is_a_card_with_a_header_and_a_hover_row(page: Page, base_url: str) -> None:
    violations = _open(page, base_url, "/admin/users", {"/users": USERS})
    table = page.get_by_role("table", name="Users", exact=True)
    expect(table).to_be_visible()
    wrap = table.evaluate(
        "el => { const s = getComputedStyle(el.closest('.ui-table-wrap'));"
        " return [s.borderTopColor, s.borderTopLeftRadius, s.overflowX]; }"
    )
    assert wrap == ["rgb(208, 213, 221)", "8px", "auto"]
    header = page.get_by_role("columnheader", name="Name", exact=True).evaluate(
        "el => { const s = getComputedStyle(el); return [s.backgroundColor, s.fontWeight]; }"
    )
    assert header == ["rgb(244, 245, 247)", "600"]
    caption = table.evaluate(
        "el => { const c = el.querySelector('caption'); const s = getComputedStyle(c);"
        " return [Array.from(c.classList), c.textContent, s.fontWeight]; }"
    )
    assert "ui-table-caption" in caption[0]
    assert caption[1:] == ["Users", "600"]
    row = page.get_by_role("row", name=re.compile("Bob Example"))
    background = "el => getComputedStyle(el).backgroundColor"
    assert row.evaluate(background) == "rgba(0, 0, 0, 0)"
    row.hover()
    assert row.evaluate(background) == "rgb(239, 244, 255)"
    assert_layout(page, max_banner_px=300)
    assert_accessible(page)
    assert violations == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-5b9e6539")
def test_disable_dialog_is_centred_toned_and_returns_focus(page: Page, base_url: str) -> None:
    violations = _open(page, base_url, "/admin/users", {"/users": USERS})
    opener = page.get_by_role("button", name="Disable Bob Example", exact=True)
    opener.click()
    dialog = page.get_by_role("dialog")
    expect(dialog).to_be_visible()
    assert dialog.get_by_role("heading").count() == 1
    assert dialog.get_by_role("button").count() == 2
    box = dialog.bounding_box()
    assert box is not None
    assert abs(box["x"] + box["width"] / 2 - 683) <= 1
    assert box["width"] <= 512
    confirm = dialog.get_by_role("button", name="Disable user", exact=True)
    cancel = dialog.get_by_role("button", name="Cancel", exact=True)
    tone = confirm.get_attribute("data-tone")
    assert tone in ("primary", "danger")
    token = "--ui-color-accent" if tone == "primary" else "--ui-color-danger"
    resolve = (
        "(el, token) => { const p = document.createElement('span');"
        " p.style.backgroundColor = 'var(' + token + ')'; document.body.appendChild(p);"
        " const c = getComputedStyle(p).backgroundColor; p.remove(); return c; }"
    )
    background = "el => getComputedStyle(el).backgroundColor"
    assert confirm.evaluate(background) == confirm.evaluate(resolve, token)
    assert cancel.evaluate(background) == cancel.evaluate(resolve, "--ui-color-surface")
    page.keyboard.press("Escape")
    expect(page.get_by_role("dialog")).to_have_count(0)
    expect(opener).to_be_focused()
    assert_accessible(page)
    assert violations == []
