"""FB-002: the tool servers list reloads after approve, replace and discovery."""

import json
import re

import pytest
from playwright.sync_api import Page, Route, expect

from conftest import assert_accessible, login

DP = "sha256:" + "0123456789ab" + "c" * 52
DA = "sha256:" + "fedcba987654" + "d" * 52
IO = {"type": "object"}
EMPTY = (200, {"items": [], "next_cursor": None})
BLOCKS = ["acme.lookup_vendor@1"]


def listing(*items: object) -> dict[str, object]:
    return {"items": list(items), "next_cursor": None}


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


def tool(name: str, effect: str) -> dict[str, object]:
    return {
        "name": name,
        "effect": effect,
        "input": IO,
        "output": IO,
        "untrusted_result": False,
        "http": {"method": "POST", "path": f"/blocks/erp.{name}@1"},
    }


def surface(*tools: dict[str, object]) -> dict[str, object]:
    return {"tools": list(tools)}


def answer(page: Page, path: str, *replies: object, method: str = "GET") -> list[object]:
    pattern = re.compile(rf"/api/v1/{re.escape(path)}(?:\?.*)?$")
    hits: list[object] = []

    def handler(route: Route) -> None:
        if route.request.method.upper() != method:
            route.fallback()
            return
        hits.append(route.request)
        reply = replies[min(len(hits) - 1, len(replies) - 1)]
        status, body = reply
        route.fulfill(status=status, content_type="application/json", body=json.dumps(body))

    page.route(pattern, handler)
    return hits


def table_row(page: Page, id: str):
    table = page.get_by_role("table", name="Tool servers", exact=True)
    return table.get_by_role("row").filter(has_text=id)


ACME_SURFACE = surface(tool("lookup_vendor", "read"))
ACME_PENDING = rec(
    "acme",
    "fixture",
    "https://tools.fake.test",
    state="pending",
    pendingDigest=DP,
    pendingSubmittedBy="u_carol",
    tools=[{"name": "lookup_vendor", "effect": "read", "ref": None}],
    pendingSurface=ACME_SURFACE,
)
ACME_DRIFTED = rec(
    "acme",
    "fixture",
    "https://tools.fake.test",
    state="drifted",
    approvedDigest=DA,
    pendingDigest=DP,
    pendingSubmittedBy="u_carol",
    tools=[{"name": "lookup_vendor", "effect": "read", "ref": "acme.lookup_vendor@1"}],
    approvedSurface=ACME_SURFACE,
    pendingSurface=ACME_SURFACE,
)
ACME_APPROVED = rec(
    "acme",
    "fixture",
    "https://tools.fake.test",
    state="approved",
    approvedDigest=DA,
    tools=[{"name": "lookup_vendor", "effect": "read", "ref": "acme.lookup_vendor@1"}],
    approvedSurface=ACME_SURFACE,
)
ACME_ACCEPTED = {
    key: value
    for key, value in ACME_APPROVED.items()
    if key not in ("approvedSurface", "pendingSurface")
}

LEDGER_SURFACE = surface(tool("create_payment", "pay"))
LEDGER_APPROVED = rec(
    "ledger",
    "http_openapi",
    "https://tools.fake.test",
    state="approved",
    approvedDigest=DA,
    tools=[{"name": "create_payment", "effect": "pay", "ref": "ledger.create_payment@1"}],
    approvedSurface=LEDGER_SURFACE,
)
LEDGER_DRIFTED = rec(
    "ledger",
    "http_openapi",
    "https://tools.fake.test",
    state="drifted",
    approvedDigest=DA,
    pendingDigest=DP,
    pendingSubmittedBy="u_carol",
    tools=[{"name": "create_payment", "effect": "pay", "ref": "ledger.create_payment@1"}],
    approvedSurface=LEDGER_SURFACE,
    pendingSurface=surface(tool("create_payment", "pay")),
)
PREVIEW = {
    "version": "3.0",
    "basePath": "/v1",
    "operations": [
        {
            "operationId": "createPayment",
            "method": "POST",
            "path": "/payments",
            "name": "create_payment",
            "excluded": None,
        }
    ],
}

CRM_SURFACE = surface(tool("find_vendor", "read"))
CRM_APPROVED = rec(
    "crm",
    "mcp",
    "https://mcp.fake.test",
    state="approved",
    approvedDigest=DA,
    tools=[{"name": "find_vendor", "effect": "read", "ref": "crm.find_vendor@1"}],
    approvedSurface=CRM_SURFACE,
)
CRM_DRIFTED = rec(
    "crm",
    "mcp",
    "https://mcp.fake.test",
    state="drifted",
    approvedDigest=DA,
    pendingDigest=DP,
    pendingSubmittedBy="u_carol",
    tools=[{"name": "find_vendor", "effect": "read", "ref": "crm.find_vendor@1"}],
    approvedSurface=CRM_SURFACE,
    pendingSurface=surface(tool("find_vendor", "read"), tool("log_note", "write")),
)
DISCOVERY = {
    "server": CRM_DRIFTED,
    "era": "modern",
    "protocolVersion": "2026-07-28",
    "excluded": [],
}


@pytest.mark.milestone("M7")
@pytest.mark.l4("C-44e0e2c0")
def test_approving_a_surface_reloads_the_server_list(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["carol"])
    listing_hits = answer(
        page,
        "tool-servers",
        (200, listing(ACME_PENDING)),
        (200, listing(ACME_APPROVED)),
    )
    answer(page, "tool-servers/acme", (200, ACME_PENDING), (200, ACME_APPROVED))
    answer(
        page,
        "tool-servers/acme/surface/approve",
        (200, {"server": ACME_ACCEPTED, "blocks": BLOCKS}),
        method="POST",
    )

    page.goto("/admin/tool-servers?server=acme")
    row = table_row(page, "acme")
    expect(row).to_contain_text("acme · https://tools.fake.test · pending")
    page.evaluate("window.__l4NoReload = true")

    region = page.get_by_role("region", name="Surface", exact=True)
    region.get_by_role("button", name="Approve surface", exact=True).click()
    dialog = page.get_by_role("dialog")
    dialog.get_by_role("button", name="Approve surface", exact=True).click()
    expect(page.get_by_role("status").filter(has_text="Surface approved.")).to_be_visible()

    expect(row).to_contain_text("acme · https://tools.fake.test · approved")
    expect(region).to_contain_text("acme · https://tools.fake.test · approved")
    assert len(listing_hits) == 2
    assert page.evaluate("window.__l4NoReload === true")
    assert_accessible(page)


@pytest.mark.milestone("M7")
@pytest.mark.l4("C-44e0e2c0")
def test_approving_a_drifted_surface_reloads_the_server_list(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["carol"])
    listing_hits = answer(
        page,
        "tool-servers",
        (200, listing(ACME_DRIFTED)),
        (200, listing(ACME_APPROVED)),
    )
    answer(page, "tool-servers/acme", (200, ACME_DRIFTED), (200, ACME_APPROVED))
    answer(
        page,
        "tool-servers/acme/surface/approve",
        (200, {"server": ACME_ACCEPTED, "blocks": BLOCKS}),
        method="POST",
    )

    page.goto("/admin/tool-servers?server=acme")
    row = table_row(page, "acme")
    expect(row).to_contain_text("acme · https://tools.fake.test · drifted")
    page.evaluate("window.__l4NoReload = true")

    region = page.get_by_role("region", name="Surface", exact=True)
    region.get_by_role("button", name="Approve surface", exact=True).click()
    dialog = page.get_by_role("dialog")
    dialog.get_by_role("button", name="Approve surface", exact=True).click()
    expect(page.get_by_role("status").filter(has_text="Surface approved.")).to_be_visible()

    expect(row).to_contain_text("acme · https://tools.fake.test · approved")
    expect(region).to_contain_text("acme · https://tools.fake.test · approved")
    assert len(listing_hits) == 2
    assert page.evaluate("window.__l4NoReload === true")
    assert_accessible(page)


@pytest.mark.milestone("M7")
@pytest.mark.l4("C-44e0e2c0")
def test_replacing_a_document_reloads_the_server_list(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["carol"])
    listing_hits = answer(
        page,
        "tool-servers",
        (200, listing(LEDGER_APPROVED)),
        (200, listing(LEDGER_DRIFTED)),
    )
    answer(page, "tool-servers/ledger", (200, LEDGER_APPROVED), (200, LEDGER_DRIFTED))
    answer(page, "tool-servers/ledger/openapi", (200, LEDGER_DRIFTED), method="PUT")
    answer(page, "tool-registrations/openapi/preview", (200, PREVIEW), method="POST")
    answer(page, "credentials", EMPTY)

    page.goto("/admin/tool-servers?server=ledger")
    row = table_row(page, "ledger")
    expect(row).to_contain_text("ledger · https://tools.fake.test · approved")
    page.evaluate("window.__l4NoReload = true")

    change = page.get_by_role("region", name="Change registration", exact=True)
    change.get_by_role("button", name="Replace document", exact=True).click()
    form = page.get_by_role("form", name="Replace document", exact=True)
    form.get_by_label("OpenAPI document (JSON)", exact=True).fill(
        json.dumps({"openapi": "3.0.3", "paths": {}})
    )
    form.get_by_role("button", name="Preview operations", exact=True).click()
    expect(page.get_by_role("table", name="Operations", exact=True)).to_be_visible()
    form.get_by_role("button", name="Save changes", exact=True).click()
    expect(change.get_by_role("status")).to_have_text("Document replaced.")

    expect(row).to_contain_text("ledger · https://tools.fake.test · drifted")
    expect(page.get_by_role("region", name="Surface", exact=True)).to_contain_text(
        "ledger · https://tools.fake.test · drifted"
    )
    assert len(listing_hits) == 2
    assert page.evaluate("window.__l4NoReload === true")
    assert_accessible(page)


@pytest.mark.milestone("M7")
@pytest.mark.l4("C-44e0e2c0")
def test_discovering_tools_again_reloads_the_server_list(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["carol"])
    listing_hits = answer(
        page,
        "tool-servers",
        (200, listing(CRM_APPROVED)),
        (200, listing(CRM_DRIFTED)),
    )
    answer(page, "tool-servers/crm", (200, CRM_APPROVED), (200, CRM_DRIFTED))
    answer(page, "tool-servers/crm/discover", (200, DISCOVERY), method="POST")
    answer(page, "credentials", EMPTY)

    page.goto("/admin/tool-servers?server=crm")
    row = table_row(page, "crm")
    expect(row).to_contain_text("crm · https://mcp.fake.test · approved")
    page.evaluate("window.__l4NoReload = true")

    discovery = page.get_by_role("region", name="Discovery", exact=True)
    discovery.get_by_role("button", name="Discover tools", exact=True).click()
    expect(discovery.get_by_role("status")).to_contain_text("Discovered")

    expect(row).to_contain_text("crm · https://mcp.fake.test · drifted")
    expect(page.get_by_role("region", name="Surface", exact=True)).to_contain_text(
        "crm · https://mcp.fake.test · drifted"
    )
    assert len(listing_hits) == 2
    assert page.evaluate("window.__l4NoReload === true")
    assert_accessible(page)
