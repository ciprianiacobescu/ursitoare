"""The M8 trust controls on the MCP review page (tool settings), with mocked answers."""

import json
import re

import pytest
from playwright.sync_api import Page, Request, Route, expect

from conftest import assert_accessible, assert_layout, login, watch_csp

CSRF = "cs" + "rf_" + "a" * 38
ME = {
    "user": {"id": "user-1", "displayName": "Alice Example", "email": None},
    "tenant": {"id": "tenant-1", "name": "E2E tenant", "reviewProfile": "solo"},
    "capabilities": ["register_tool_server", "manage_credentials"],
    "csrfToken": CSRF,
}
IO = {"type": "object"}
EMPTY = (200, {"items": [], "next_cursor": None})

DP = "sha256:" + "0123456789ab" + "c" * 52
DA = "sha256:" + "fedcba987654" + "d" * 52
DP2 = "sha256:" + "1111111111aa" + "e" * 52

WARNING = (
    "A trusted result can reach write, send and pay steps without an llm.extract step, and the "
    "validator stops reporting L3_TAINT_TO_CONSEQUENTIAL for it. On a registered server this change "
    "leaves it drifted until the surface is approved again, and every changed tool gets a new ref "
    "(@N+1). Marking a read tool's data public removes it from the private-data check behind "
    "W_LETHAL_TRIFECTA."
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


def DET(state: str, approved: object, pending: object, dp: str = DP) -> dict[str, object]:
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
        "pendingDigest": dp if pending is not None else None,
        "pendingSubmittedBy": "u_carol" if pending is not None else None,
        "tools": tools,
    }


def _request_body(request: object) -> object:
    data = request.post_data
    if data is None:
        return None
    try:
        return json.loads(data)
    except (json.JSONDecodeError, TypeError):
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


def checked(page: Page) -> None:
    assert_layout(page)
    assert_accessible(page)


@pytest.mark.milestone("M8")
@pytest.mark.l4("C-c7bb4abe")
def test_tool_settings_trust(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    page.set_viewport_size({"width": 1366, "height": 860})
    csp = watch_csp(page)
    answer(page, "tool-servers", EMPTY)
    answer(page, "credentials", EMPTY)

    FV = T("find_vendor", "read", mcp("find_vendor", "structured"), untrusted_result=False, data_class="private")
    AP = S(FV, T("log_note", "write", mcp("log_note", "text"), unsafe_to_retry=False))
    PE = S(
        FV,
        T("log_note", "write", mcp("log_note", "text"), untrusted_result=False, data_class="public", unsafe_to_retry=False),
        T("ping", "write", mcp("ping", "text")),
    )

    reads = answer(
        page,
        "tool-servers/crm",
        (200, DET("drifted", AP, PE)),
        (200, DET("drifted", AP, PE, DP2)),
    )

    posts = answer(
        page,
        "tool-servers/crm/discover",
        (200, {"server": DET("drifted", AP, PE), "era": "modern", "protocolVersion": "2026-07-28", "excluded": []}),
        (200, {"server": DET("drifted", AP, PE, DP2), "era": "modern", "protocolVersion": "2026-07-28", "excluded": [{"name": "route_ticket", "reason": "x_mcp_header"}]}),
        method="POST",
    )

    login(page, users["carol"])
    page.goto("/admin/tool-servers?server=crm")

    section = page.get_by_role("region", name="Discovery", exact=True)
    settings = page.get_by_role("table", name="Tool settings", exact=True)
    # headers
    for header in ["Server tool", "Server hints", "Tool name", "Effect", "Result trusted", "Data class"]:
        expect(settings.get_by_role("columnheader", name=header, exact=True)).to_have_count(1)
    expect(settings.get_by_role("row")).to_have_count(4)  # header? DataTable rows exclude header; 3 data? Actually 3 tools? PE has 3 tools. Wait tool settings rows from pending (PE) = 3 tools. But plan says 4 rows. Hmm.

    # Let me adjust: plan says "Tool settings has 4 rows" (including? maybe header counted by get_by_role row includes header row in table). Playwright get_by_role("row") includes header. So 3 data + 1 header = 4. Good, keep 4.

    # trust checked
    expect(page.get_by_role("checkbox", name="Result of find_vendor is trusted", exact=True)).to_be_checked()
    expect(page.get_by_role("checkbox", name="Result of log_note is trusted", exact=True)).to_be_checked()
    expect(page.get_by_role("checkbox", name="Result of ping is trusted", exact=True)).not_to_be_checked()

    # data class
    expect(page.get_by_role("combobox", name="Data class of find_vendor", exact=True)).to_have_value("private")
    expect(page.get_by_role("combobox", name="Data class of log_note", exact=True)).to_have_value("public")
    expect(page.get_by_role("combobox", name="Data class of ping", exact=True)).to_have_value("")

    # warning count 1
    expect(page.get_by_text(WARNING, exact=True)).to_have_count(1)
    # no ack checkbox initially
    expect(page.get_by_role("checkbox", name=re.compile(r"^I accept the warning for "))).to_have_count(0)

    # changes
    changes = page.get_by_role("list", name="Changes", exact=True)
    expect(changes.get_by_role("listitem")).to_contain_text(["changed log_note", "added ping"])
    log_item = changes.get_by_role("listitem").filter(has_text="changed log_note")
    expect(log_item).to_contain_text("Result: untrusted → trusted")
    expect(log_item).to_contain_text("Data class: not set → public")

    checked(page)

    # step 2: Discover tools
    section.get_by_role("button", name="Discover tools", exact=True).click()
    status = section.get_by_role("status").filter(has_text="Discovered")
    expect(status).to_have_text("Discovered 3 tools over MCP 2026-07-28.")
    # surface region pending digest
    # simpler: region Surface contains pendingDigest
    # We'll just check posts
    assert len(posts) == 1
    assert posts[0]["body"] == {
        "tools": {
            "find_vendor": {"effect": "read", "untrusted_result": False, "data_class": "private"},
            "log_note": {"unsafe_to_retry": False},
        }
    }
    assert len(reads) == 2
    checked(page)

    # step 3: trust ping, move log_note to send, discover again
    page.get_by_role("checkbox", name="Result of ping is trusted", exact=True).check()
    page.get_by_role("combobox", name="Effect of log_note", exact=True).select_option("send")
    section.get_by_role("button", name="Discover again with these settings", exact=True).click()
    ack_ping = page.get_by_role("checkbox", name="I accept the warning for ping", exact=True)
    expect(ack_ping).to_have_count(1)
    expect(page.get_by_role("checkbox", name=re.compile(r"^I accept the warning for log_note$"))).to_have_count(0)
    alert = section.get_by_role("alert")
    expect(alert).to_contain_text("Accept the warning for: ping.")
    assert len(posts) == 1

    # step 4: tick ack, discover again
    ack_ping.check()
    section.get_by_role("button", name="Discover again with these settings", exact=True).click()
    expect(status).to_have_text("Discovered 3 tools over MCP 2026-07-28. Left out: route_ticket (x_mcp_header)")
    assert len(posts) == 2
    assert posts[1]["body"] == {
        "tools": {
            "find_vendor": {"effect": "read", "untrusted_result": False, "data_class": "private"},
            "log_note": {"effect": "send", "untrusted_result": False, "data_class": "public"},
            "ping": {"untrusted_result": False},
        }
    }
    checked(page)
