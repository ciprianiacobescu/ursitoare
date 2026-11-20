"""M6b flow workspace: two columns, section index, author names and owner-team suggestions."""

import json
import re

import pytest
from playwright.sync_api import Page, expect

from conftest import assert_accessible, assert_layout, watch_csp

HASH = "sha256:" + "a" * 64
HASH_PATH = HASH.replace(":", "%3A")
TEXT = 'ursitoare: "0.1"\nflow: demo-pay\n'
CANONICAL = {
    "ursitoare": "0.1",
    "flow": "demo-pay",
    "version": "1.0.0",
    "start": "pay",
    "nodes": {
        "pay": {"kind": "block", "uses": "erp.create_payment@1", "with": {}, "next": "done"},
        "done": {"kind": "end", "status": "completed"},
    },
}
VERSION = {
    "flowId": "demo-pay",
    "number": 1,
    "hash": HASH,
    "state": "validated",
    "surface": "yaml",
    "author": "user-1",
    "requestedBy": None,
    "createdAt": "2026-11-17T10:00:00.000000Z",
    "validatedAt": "2026-11-17T10:00:01.000000Z",
    "validationOk": True,
}
LINKS = [
    ("Editor", "#flow-editor"),
    ("Diagnostics", "#flow-diagnostics"),
    ("Graph", "#flow-panel-graph"),
    ("Versions", "#flow-versions"),
    ("Test run panel", "#flow-panel-test-run"),
    ("Dry run panel", "#flow-panel-dry-run"),
]


def answer(page: Page, path: str, body: dict) -> None:
    page.route(
        re.compile(r".*/api/v1" + re.escape(path) + r"(\?.*)?$"),
        lambda route: route.fulfill(
            status=200, content_type="application/json", body=json.dumps(body)
        ),
    )


def mock_me(page: Page) -> None:
    answer(
        page,
        "/me",
        {
            "user": {"id": "user-1", "displayName": "Alice Example", "email": None},
            "tenant": {"id": "tenant-1", "name": "E2E tenant", "reviewProfile": "solo"},
            "capabilities": ["read_flow", "test_flow", "dry_run_flow", "read_self"],
            "csrfToken": "csrf_" + "a" * 38,
        },
    )


def open_workspace(page: Page) -> list[str]:
    page.set_viewport_size({"width": 1366, "height": 860})
    violations = watch_csp(page)
    mock_me(page)
    answer(
        page,
        "/people",
        {"items": [{"userId": "user-1", "displayName": "Alice Example", "kind": "human"}]},
    )
    answer(
        page,
        "/flows/demo-pay",
        {
            "flowId": "demo-pay",
            "ownerTeam": "finance",
            "createdBy": "user-1",
            "createdAt": "2026-11-17T10:00:00.000000Z",
            "versionCount": 1,
            "latest": VERSION,
        },
    )
    answer(page, "/flows/demo-pay/versions", {"items": [VERSION], "next_cursor": None})
    answer(
        page,
        f"/flows/demo-pay/versions/{HASH_PATH}",
        {
            **VERSION,
            "text": TEXT,
            "canonical": CANONICAL,
            "result": {"ok": True, "errors": [], "warnings": [], "layers_run": ["L1", "L2", "L3"]},
        },
    )
    page.goto("/flows/demo-pay")
    expect(page.get_by_role("heading", name="Flow demo-pay", exact=True)).to_be_visible()
    expect(page.get_by_role("button", name="Open version 1", exact=True)).to_be_visible()
    expect(
        page.get_by_role("link", name="Open the graph on its own page", exact=True)
    ).to_be_visible()
    return violations


def region(page: Page, name: str):
    return page.get_by_role("region", name=name, exact=True)


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-592f8050")
def test_workspace_is_two_columns_with_every_panel_visible(page: Page) -> None:
    csp = open_workspace(page)
    for name in ["Edit the flow", "Diagnostics", "Graph", "Test run", "Dry run"]:
        expect(region(page, name)).to_be_visible()
    expect(page.locator("#flow-versions")).to_be_visible()

    def top(name: str) -> float:
        return region(page, name).bounding_box()["y"] + page.evaluate("window.scrollY")

    assert abs(top("Graph") - top("Edit the flow")) <= 8
    assert abs(top("Test run") - top("Dry run")) <= 8
    assert page.evaluate("document.documentElement.scrollHeight") <= 2600
    heading = region(page, "Diagnostics").get_by_role("heading").first.bounding_box()
    assert heading["y"] + heading["height"] <= 860
    drawing = page.locator("svg.flow-graph-svg").first.bounding_box()
    assert drawing["y"] < 860
    save = page.get_by_role("button", name="Save version", exact=True).bounding_box()
    assert save["y"] + save["height"] <= 860
    assert_layout(page, max_banner_px=72)
    assert_accessible(page)
    assert csp == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-c88ddf4d")
def test_jump_links_reach_their_panels_and_the_bar_sticks(page: Page) -> None:
    csp = open_workspace(page)
    index = page.get_by_role("list", name="On this page", exact=True)
    links = index.get_by_role("link")
    expect(links).to_have_count(6)
    for position, (label, href) in enumerate(LINKS):
        link = links.nth(position)
        assert link.inner_text().strip() == label
        assert link.get_attribute("href") == href
        assert page.locator(href).count() == 1
    assert page.get_by_role("navigation").count() == 1

    links.nth(5).click()
    assert page.url.endswith("/flows/demo-pay#flow-panel-dry-run")
    box = index.bounding_box()
    assert box["y"] == 0
    target = page.locator("#flow-panel-dry-run").bounding_box()
    assert target["y"] >= box["height"] - 1
    assert csp == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-a1593e86")
def test_tab_from_the_editor_names_authors_and_keeps_the_scroller(page: Page) -> None:
    csp = open_workspace(page)
    page.get_by_role("textbox", name="Flow text", exact=True).focus()
    page.keyboard.press("Tab")
    expect(page.get_by_role("button", name="Save version", exact=True)).to_be_focused()
    assert page.locator(".cm-scroller").first.evaluate("e => getComputedStyle(e).overflowX") == "auto"

    table = page.get_by_role("table", name="Versions", exact=True)
    for cell in ["Alice Example", "validated", "2026-11-17 10:00 UTC"]:
        expect(table.get_by_role("cell", name=cell, exact=True)).to_be_visible()
    expect(table.locator("time")).to_have_attribute("datetime", "2026-11-17T10:00:00.000000Z")
    assert csp == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-5368fc63")
def test_owner_team_is_prefilled_from_my_teams(page: Page) -> None:
    page.set_viewport_size({"width": 1366, "height": 860})
    csp = watch_csp(page)
    mock_me(page)
    answer(page, "/flows", {"items": [], "next_cursor": None})
    answer(page, "/me/teams", {"items": [{"id": "finance"}], "next_cursor": None})
    page.goto("/flows")

    owner = page.get_by_label("Owner team", exact=True)
    expect(owner).to_have_value("finance")
    owner.fill("ops")
    expect(owner).to_have_value("ops")
    assert page.locator("datalist option").count() == 1
    assert_layout(page, max_banner_px=72)
    assert_accessible(page)
    assert csp == []
