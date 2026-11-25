"""The M7 review page: discovery, tool settings, changes and calls, with mocked answers."""

import json
import re

import pytest
from playwright.sync_api import Page, Route, expect

from conftest import assert_accessible, assert_layout, login, watch_csp

DP = "sha256:" + "0123456789ab" + "c" * 52
DA = "sha256:" + "fedcba987654" + "d" * 52
IO = {"type": "object"}
EMPTY = (200, {"items": [], "next_cursor": None})

READ_NOTE = (
    "Read tools are called for real, even in a dry run. Check that each one changes nothing."
)


def refused(reason: str, **details: object) -> dict[str, object]:
    payload: dict[str, object] = {"reason": reason}
    payload.update(details)
    return {"error": {"code": "OPERATION_REFUSED", "message": "m", "details": payload}}


def rec(id: str, adapter: str, origin: str, **over: object) -> dict[str, object]:
    record: dict[str, object] = {
        "id": id,
        "adapter": adapter,
        "origin": origin,
        "local": False,
        "state": "pending",
        "registeredBy": "u_carol",
        "registeredAt": "2026-11-06T10:00:00.000000Z",
        "approvedDigest": None,
        "pendingDigest": None,
        "pendingSubmittedBy": None,
        "tools": [],
        "approvedSurface": None,
        "pendingSurface": None,
    }
    record.update(over)
    return record


CRM = rec("crm", "mcp", "https://mcp.fake.test")


def mcp(name: str, output: str, **hints: object) -> dict[str, object]:
    call: dict[str, object] = {
        "kind": "mcp",
        "endpoint": "/mcp",
        "name": name,
        "protocolVersion": "2026-07-28",
        "output": output,
    }
    if hints:
        call["hints"] = hints
    return call


def T(name: str, effect: str, call: dict[str, object], **over: object) -> dict[str, object]:
    tool: dict[str, object] = {
        "name": name,
        "effect": effect,
        "input": IO,
        "output": IO,
        "untrusted_result": True,
        "unsafe_to_retry": True,
        "call": call,
    }
    tool.update(over)
    return tool


def S(*tools: dict[str, object]) -> dict[str, object]:
    return {"tools": list(tools)}


def DET(state: str, approved: object, pending: object) -> dict[str, object]:
    surface = pending if pending is not None else approved
    tools: list[dict[str, object]] = []
    if isinstance(surface, dict):
        listed = surface.get("tools")
        if isinstance(listed, list):
            tools = [
                {"name": tool["name"], "effect": tool["effect"], "ref": None}
                for tool in listed
            ]
    return {
        **CRM,
        "state": state,
        "approvedSurface": approved,
        "pendingSurface": pending,
        "approvedDigest": DA if approved is not None else None,
        "pendingDigest": DP if pending is not None else None,
        "pendingSubmittedBy": "u_carol" if pending is not None else None,
        "tools": tools,
    }


def _request_body(request: object) -> object:
    data = request.post_data
    if data is None:
        return None
    try:
        return json.loads(data)
    except json.JSONDecodeError:
        return data


def _header(hit: dict[str, object], name: str) -> str | None:
    headers = hit["headers"]
    if not isinstance(headers, dict):
        return None
    for key, value in headers.items():
        if isinstance(key, str) and key.lower() == name.lower():
            return value
    return None


def answer(page: Page, path: str, *replies: object, method: str = "GET") -> list[dict[str, object]]:
    pattern = re.compile(rf"/api/v1/{re.escape(path)}(?:\?.*)?$")
    hits: list[dict[str, object]] = []

    def handler(route: Route) -> None:
        if route.request.method.upper() != method:
            route.fallback()
            return
        hits.append({"headers": route.request.headers, "body": _request_body(route.request)})
        reply = replies[min(len(hits) - 1, len(replies) - 1)]
        status, body = reply
        route.fulfill(status=status, content_type="application/json", body=json.dumps(body))

    page.route(pattern, handler)
    return hits


def cell(page: Page, calls: object, tool: str, index: int) -> object:
    return (
        calls.get_by_role("row")
        .filter(has=page.get_by_role("rowheader", name=tool, exact=True))
        .get_by_role("cell")
        .nth(index)
    )


def checked(page: Page) -> None:
    assert_layout(page)
    assert_accessible(page)


@pytest.mark.milestone("M7")
@pytest.mark.l4("C-9da14d6e")
def test_discovery_settings_and_calls(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    page.set_viewport_size({"width": 1366, "height": 860})
    csp = watch_csp(page)
    answer(page, "tool-servers", EMPTY)
    answer(page, "credentials", EMPTY)

    s1 = S(
        T(
            "find_vendor",
            "write",
            mcp("find_vendor", "structured", readOnly=True),
            description="Find a vendor.",
            input={
                "type": "object",
                "properties": {
                    "vendor_name": {
                        "type": "string",
                        "description": "Vendor to look up.",
                    }
                },
            },
        ),
        T(
            "log_note",
            "write",
            mcp("log_note", "text", readOnly=False, idempotent=True),
        ),
    )
    s2 = S(T("find_vendor", "read", mcp("find_vendor", "structured", readOnly=True)))
    reads = answer(
        page,
        "tool-servers/crm",
        (200, DET("pending", None, None)),
        (200, DET("pending", None, s1)),
        (200, DET("pending", None, s2)),
    )
    da1 = {
        "server": DET("pending", None, s1),
        "era": "modern",
        "protocolVersion": "2026-07-28",
        "excluded": [
            {"name": "route_ticket", "reason": "x_mcp_header"},
            {"name": "Find.Vendor", "reason": "not_listed"},
        ],
    }
    da2 = {
        "server": DET("pending", None, s2),
        "era": "modern",
        "protocolVersion": "2026-07-28",
        "excluded": [{"name": "log_note", "reason": "skipped"}],
    }
    posts = answer(
        page,
        "tool-servers/crm/discover",
        (422, refused("credential_missing")),
        (422, refused("name_collision", names="find_vendor,Find.Vendor")),
        (200, da1),
        (200, da2),
        method="POST",
    )

    login(page, users["carol"])
    page.goto("/admin/tool-servers?server=crm")
    section = page.get_by_role("region", name="Discovery", exact=True)
    expect(section).to_contain_text("Discover tools")
    expect(page.get_by_role("table", name="Tool settings", exact=True)).to_have_count(0)
    expect(page.get_by_role("heading", name="Changes", exact=True)).to_be_visible()
    expect(page.get_by_text("No pending surface to compare.", exact=True)).to_be_visible()
    checked(page)

    section.get_by_role("button", name="Discover tools", exact=True).click()
    alert = section.get_by_role("alert")
    expect(alert).to_contain_text("Store a credential for this server first.")
    assert len(posts) == 1
    assert posts[0]["body"] == {"tools": {}}
    first_key = _header(posts[0], "Idempotency-Key")
    assert first_key
    assert len(reads) == 1
    checked(page)

    section.get_by_role("button", name="Discover tools", exact=True).click()
    expect(section.get_by_role("alert")).to_contain_text(
        "Two server tools get the same tool name (find_vendor,Find.Vendor): give one a tool name."
    )
    settings = page.get_by_role("table", name="Tool settings", exact=True)
    expect(settings.get_by_role("row")).to_have_count(3)
    expect(
        settings.get_by_role("row").filter(has_text="find_vendor")
    ).to_have_count(1)
    expect(page.get_by_role("textbox", name="Tool name of find_vendor", exact=True)).to_have_count(1)
    expect(
        page.get_by_role("textbox", name="Tool name of Find.Vendor", exact=True)
    ).to_have_count(1)
    assert len(posts) == 2
    assert posts[1]["body"] == {"tools": {}}
    assert _header(posts[1], "Idempotency-Key") != first_key
    assert len(reads) == 1
    checked(page)

    page.get_by_role("textbox", name="Tool name of Find.Vendor", exact=True).fill("find_vendor_2")
    section.get_by_role("button", name="Discover again with these settings", exact=True).click()
    status = section.get_by_role("status").filter(has_text="Discovered")
    expect(status).to_have_text(
        "Discovered 2 tools over MCP 2026-07-28. "
        "Left out: route_ticket (x_mcp_header), Find.Vendor (not_listed)"
    )
    expect(settings.get_by_role("row")).to_have_count(3)
    expect(settings.get_by_role("row").filter(has_text="find_vendor")).to_contain_text("read-only")
    expect(settings.get_by_role("row").filter(has_text="log_note")).to_contain_text(
        "not read-only, idempotent"
    )
    expect(
        page.get_by_role("textbox", name="Tool name of Find.Vendor", exact=True)
    ).to_have_count(0)
    eff = page.get_by_role("combobox", name="Effect of find_vendor", exact=True)
    expect(eff.locator("option")).to_have_text(
        ["Proposed", "read", "write", "send", "pay", "Skip"]
    )
    expect(eff).to_have_value("")
    calls = page.get_by_role("table", name="Calls", exact=True)
    expect(cell(page, calls, "find_vendor", 0)).to_have_text("mcp find_vendor (2026-07-28)")
    expect(cell(page, calls, "find_vendor", 1)).to_have_text("write")
    expect(cell(page, calls, "find_vendor", 2)).to_have_text("unsafe to retry")
    expect(cell(page, calls, "find_vendor", 3)).to_have_text("untrusted")
    expect(cell(page, calls, "find_vendor", 4)).to_have_text("read-only")
    changes = page.get_by_role("list", name="Changes", exact=True)
    expect(changes.get_by_role("listitem")).to_contain_text(["added find_vendor", "added log_note"])
    find_item = changes.get_by_role("listitem").filter(has_text="added find_vendor")
    expect(find_item).to_contain_text("Description: Find a vendor.")
    expect(find_item).to_contain_text("Input vendor_name: Vendor to look up.")
    expect(
        changes.get_by_role("listitem").filter(has_text="added log_note")
    ).to_contain_text("Description: (none)")
    assert len(posts) == 3
    assert posts[2]["body"] == {"tools": {"Find.Vendor": {"name": "find_vendor_2"}}}
    assert _header(posts[2], "Idempotency-Key") not in (first_key, _header(posts[1], "Idempotency-Key"))
    assert len(reads) == 2
    checked(page)

    eff.select_option("read")
    page.get_by_role("combobox", name="Effect of log_note", exact=True).select_option("skip")
    section.get_by_role("button", name="Discover again with these settings", exact=True).click()
    expect(status).to_have_text(
        "Discovered 1 tools over MCP 2026-07-28. Left out: log_note (skipped)"
    )
    expect(cell(page, calls, "find_vendor", 1)).to_have_text("read")
    expect(eff).to_have_value("read")
    expect(settings.get_by_role("row")).to_have_count(2)
    expect(page.get_by_text(READ_NOTE, exact=True)).to_be_visible()
    assert len(posts) == 4
    assert posts[3]["body"] == {
        "tools": {
            "find_vendor": {"effect": "read"},
            "log_note": {"skip": True},
        }
    }
    assert _header(posts[3], "Idempotency-Key") not in (
        first_key,
        _header(posts[1], "Idempotency-Key"),
        _header(posts[2], "Idempotency-Key"),
    )
    assert len(reads) == 3
    checked(page)
    assert csp == []


@pytest.mark.milestone("M7")
@pytest.mark.l4("C-c8329b48")
def test_changes_and_calls_of_a_drifted_server(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    page.set_viewport_size({"width": 1366, "height": 860})
    csp = watch_csp(page)
    answer(page, "tool-servers", EMPTY)
    answer(page, "credentials", EMPTY)

    pf = T("find_vendor", "read", mcp("find_vendor", "structured", readOnly=False))
    pl = T(
        "log_note",
        "send",
        mcp("log_note", "text", readOnly=False),
        description="Log a note",
    )
    pp = T("ping", "write", mcp("ping", "text"))
    approved = S(
        T("find_vendor", "read", mcp("find_vendor", "structured", readOnly=True)),
        T("log_note", "write", mcp("log_note", "text", readOnly=False)),
        T("old_tool", "write", mcp("old_tool", "text")),
    )
    pending = S(pf, pl, pp)
    pending2 = S(pf, pl)
    reads = answer(
        page,
        "tool-servers/crm",
        (200, DET("drifted", approved, pending)),
        (200, DET("drifted", approved, pending2)),
    )
    posts = answer(
        page,
        "tool-servers/crm/discover",
        (
            200,
            {
                "server": DET("drifted", approved, pending),
                "era": "modern",
                "protocolVersion": "2026-07-28",
                "excluded": [],
            },
        ),
        method="POST",
    )

    login(page, users["carol"])
    page.goto("/admin/tool-servers?server=crm")
    section = page.get_by_role("region", name="Discovery", exact=True)
    changes = page.get_by_role("list", name="Changes", exact=True)
    items = changes.get_by_role("listitem")
    expect(items).to_contain_text(
        [
            "changed find_vendor: hints",
            "changed log_note: effect, description",
            "removed old_tool",
            "added ping",
        ]
    )
    log_item = items.filter(has_text="changed log_note: effect, description")
    expect(log_item).to_contain_text("Description before: (none)")
    expect(log_item).to_contain_text("Description after: Log a note")
    expect(items.filter(has_text="added ping")).to_contain_text("Description: (none)")

    calls = page.get_by_role("table", name="Calls", exact=True)
    expect(calls.get_by_role("row")).to_have_count(4)
    expect(cell(page, calls, "find_vendor", 1)).to_have_text("read")
    expect(cell(page, calls, "find_vendor", 4)).to_have_text("not read-only")
    expect(cell(page, calls, "log_note", 1)).to_have_text("send")
    expect(cell(page, calls, "ping", 4)).to_have_text("—")
    expect(page.get_by_text(READ_NOTE, exact=True)).to_be_visible()
    expect(page.get_by_role("combobox", name="Effect of log_note", exact=True)).to_have_value(
        "send"
    )
    expect(page.get_by_role("combobox", name="Effect of find_vendor", exact=True)).to_have_value(
        "read"
    )
    checked(page)

    section.get_by_role("button", name="Discover tools", exact=True).click()
    status = section.get_by_role("status").filter(has_text="Discovered")
    expect(status).to_have_text("Discovered 3 tools over MCP 2026-07-28.")
    expect(calls.get_by_role("row")).to_have_count(3)
    assert len(posts) == 1
    assert posts[0]["body"] == {"tools": {"find_vendor": {"effect": "read"}}}
    assert _header(posts[0], "Idempotency-Key")
    assert len(reads) == 2
    checked(page)
    assert csp == []
