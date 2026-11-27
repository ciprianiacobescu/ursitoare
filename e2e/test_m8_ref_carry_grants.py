"""The M8 ref markers on the Grants page, with mocked answers."""

import json
import re
from urllib.parse import parse_qs, urlparse

import pytest
from playwright.sync_api import Locator, Page, Request, Route, expect

from conftest import assert_accessible, assert_layout, watch_csp

CSRF = "cs" + "rf_" + "a" * 38
ME = {
    "user": {"id": "user-1", "displayName": "Alice Example", "email": None},
    "tenant": {"id": "tenant-1", "name": "E2E tenant", "reviewProfile": "solo"},
    "capabilities": ["register_tool_server", "approve_tool_surface", "deploy_policy"],
    "csrfToken": CSRF,
}
ME2 = {**ME, "capabilities": ["register_tool_server", "deploy_policy"]}
CAROL = {"items": [{"userId": "u_carol", "displayName": "Carol Example", "kind": "human"}]}
EMPTY = (200, {"items": [], "next_cursor": None})
INTERNAL = {"error": {"code": "INTERNAL", "message": "m"}}
FORBIDDEN = {
    "error": {
        "code": "FORBIDDEN",
        "message": "m",
        "details": {"decisionId": "dec_1"},
    }
}
DP = "sha256:" + "0123456789ab" + "c" * 52
DA = "sha256:" + "fedcba987654" + "d" * 52

ROLE = {"kind": "role", "role": "author"}
BOB = {"kind": "user", "userId": "u_bob"}
ANY = {"kind": "any_step"}


def rec(id: str, adapter: str, origin: str, **over: object) -> dict[str, object]:
    record: dict[str, object] = {
        "id": id,
        "adapter": adapter,
        "origin": origin,
        "state": "pending",
        "registeredBy": "u_carol",
        "approvedDigest": None,
        "pendingDigest": None,
        "pendingSubmittedBy": None,
        "tools": [],
    }
    record.update(over)
    return record


def server(id: str, state: str, name: str, ref: str | None) -> dict[str, object]:
    over: dict[str, object] = {
        "state": state,
        "approvedDigest": DA,
        "tools": [{"name": name, "effect": "read", "ref": ref}],
    }
    if state == "drifted":
        over["pendingDigest"] = DP
    return rec(id, "http_openapi", "https://tools.fake.test", **over)


def grant_record(
    id: str = "grant_1",
    tool: str = "ledger.create_payment@1",
    subject: dict[str, object] | None = None,
    scope: dict[str, object] | None = None,
    args: list[dict[str, object]] | None = None,
    state: str = "active",
) -> dict[str, object]:
    return {
        "id": id,
        "subject": ROLE if subject is None else subject,
        "tool": tool,
        "scope": ANY if scope is None else scope,
        "args": [] if args is None else args,
        "fingerprints": [],
        "state": state,
        "createdBy": "u_carol",
        "createdAt": "2026-01-01T00:00:00Z",
        "revokedBy": None,
        "revokedAt": None,
    }


def item(
    id: str,
    tool: str,
    subject: dict[str, object],
    scope: dict[str, object],
    args: list[dict[str, object]] | None = None,
    state: str = "active",
) -> dict[str, object]:
    return {
        "grant": grant_record(id, tool, subject, scope, args, state),
        "status": state,
    }


S1 = server("ledger", "approved", "create_payment", "ledger.create_payment@2")
S2 = server("acme", "drifted", "lookup_vendor", "acme.lookup_vendor@1")
S3 = server("crm", "approved", "find_vendor", "crm.find_vendor@1")
ROWS = {
    "items": [
        item("grant_1", "ledger.create_payment@1", ROLE, ANY),
        item("grant_2", "ledger.create_payment@2", BOB, ANY),
        item("grant_3", "acme.lookup_vendor@1", ROLE, ANY),
        item("grant_4", "crm.find_customer@1", ROLE, ANY),
    ],
    "next_cursor": None,
}
ROW_TEXTS = (
    "ledger.create_payment@1",
    "ledger.create_payment@2",
    "acme.lookup_vendor@1",
    "crm.find_customer@1",
)


def _request_body(request: Request) -> object:
    data = request.post_data
    if data is None:
        return None
    try:
        return json.loads(data)
    except json.JSONDecodeError:
        return data


def answer(page: Page, path: str, *replies: object, method: str = "GET") -> list[dict[str, object]]:
    pattern = re.compile(rf"/api/v1/{re.escape(path)}(?:\?.*)?$")
    hits: list[dict[str, object]] = []

    def handler(route: Route) -> None:
        if route.request.method.upper() != method:
            route.fallback()
            return
        hits.append(
            {
                "url": route.request.url,
                "headers": route.request.headers,
                "body": _request_body(route.request),
            }
        )
        reply = replies[min(len(hits) - 1, len(replies) - 1)]
        status, body = reply
        route.fulfill(status=status, content_type="application/json", body=json.dumps(body))

    page.route(pattern, handler)
    return hits


def start(page: Page) -> list[str]:
    csp = watch_csp(page)
    page.set_viewport_size({"width": 1366, "height": 860})
    answer(page, "me", (200, ME2))
    answer(page, "people", (200, CAROL))
    return csp


def checked(page: Page) -> None:
    assert_layout(page)
    assert_accessible(page)


def queries(hits: list[dict[str, object]]) -> list[dict[str, list[str]]]:
    return [parse_qs(urlparse(str(hit["url"])).query) for hit in hits]


def row(page: Page, text: str) -> Locator:
    return (
        page.get_by_role("table", name="Grants", exact=True)
        .get_by_role("row")
        .filter(has_text=text)
    )


def marker(found: Locator) -> Locator:
    return found.locator('[data-slot="ref-marker"]')


def badge(found: Locator) -> Locator:
    return found.locator('[data-slot="badge"]')


@pytest.mark.milestone("M8")
@pytest.mark.l4("C-4b83877f")
def test_superseded_and_waiting_refs_are_marked_beside_the_badge(page: Page) -> None:
    csp = start(page)
    servers = answer(
        page,
        "tool-servers",
        (200, {"items": [S1], "next_cursor": "s2"}),
        (200, {"items": [S2, S3], "next_cursor": None}),
    )
    answer(page, "grants", (200, ROWS))
    answer(page, "blocks", EMPTY)

    page.goto("/admin/grants")

    superseded = marker(row(page, "ledger.create_payment@1"))
    expect(superseded).to_have_text("superseded")
    expect(superseded).to_have_attribute("data-state", "superseded")
    expect(marker(row(page, "acme.lookup_vendor@1"))).to_have_text("waiting for approval")
    expect(
        row(page, "role author · ledger.create_payment@1 · any step · active")
    ).to_contain_text("role author · ledger.create_payment@1 · any step · active")
    for text in ROW_TEXTS:
        expect(badge(row(page, text))).to_have_count(1)
    expect(badge(row(page, "ledger.create_payment@1"))).to_have_attribute(
        "data-tone", "success"
    )
    expect(marker(row(page, "ledger.create_payment@2"))).to_have_count(0)
    expect(marker(row(page, "crm.find_customer@1"))).to_have_count(0)
    assert queries(servers) == [
        {"limit": ["100"]},
        {"limit": ["100"], "cursor": ["s2"]},
    ]
    checked(page)
    assert csp == []


@pytest.mark.milestone("M8")
@pytest.mark.l4("C-b8363cd2")
def test_a_failed_server_read_shows_no_marker(page: Page) -> None:
    csp = start(page)
    servers = answer(page, "tool-servers", (403, FORBIDDEN))
    answer(page, "grants", (200, ROWS))
    answer(page, "blocks", EMPTY)

    with page.expect_response(re.compile(r"/api/v1/tool-servers(\?.*)?$")) as response:
        page.goto("/admin/grants")
    assert response.value.status == 403

    expect(
        row(page, "role author · ledger.create_payment@1 · any step · active")
    ).to_be_visible()
    expect(
        row(page, "role author · acme.lookup_vendor@1 · any step · active")
    ).to_be_visible()
    for text in ROW_TEXTS:
        expect(badge(row(page, text))).to_have_count(1)
    expect(page.locator('[data-slot="ref-marker"]')).to_have_count(0)
    expect(page.get_by_role("alert")).to_have_count(0)
    assert len(servers) == 1
    checked(page)
    assert csp == []


@pytest.mark.milestone("M8")
@pytest.mark.l4("C-b8363cd2")
def test_a_failed_server_read_adds_no_alert(page: Page) -> None:
    csp = start(page)
    answer(page, "tool-servers", (500, INTERNAL))
    answer(page, "grants", (403, FORBIDDEN))
    answer(page, "blocks", (403, FORBIDDEN))

    with page.expect_response(re.compile(r"/api/v1/tool-servers(\?.*)?$")) as response:
        page.goto("/admin/grants")
    assert response.value.status == 500

    expect(page.get_by_role("alert")).to_have_count(2)
    options = page.get_by_label("Tool", exact=True).locator("option").all_inner_texts()
    assert options == ["Choose a tool"]
    expect(page.get_by_role("button", name="Create grant", exact=True)).to_have_attribute(
        "aria-disabled", "true"
    )
    checked(page)
    expect(page.get_by_role("alert")).to_have_count(2)
    assert csp == []


@pytest.mark.milestone("M8")
@pytest.mark.l4("C-b8363cd2")
def test_an_unanswered_server_read_does_not_end_the_session(page: Page) -> None:
    csp = start(page)
    answer(
        page,
        "tool-servers",
        (401, {"error": {"code": "UNAUTHENTICATED", "message": "m"}}),
    )
    answer(page, "grants", (200, ROWS))
    answer(page, "blocks", EMPTY)

    with page.expect_response(re.compile(r"/api/v1/tool-servers(\?.*)?$")) as response:
        page.goto("/admin/grants")
    assert response.value.status == 401

    expect(
        row(page, "role author · ledger.create_payment@1 · any step · active")
    ).to_be_visible()
    expect(badge(row(page, "ledger.create_payment@1"))).to_have_count(1)
    checked(page)
    assert page.url.endswith("/admin/grants")
    expect(page.locator('[data-slot="ref-marker"]')).to_have_count(0)
    assert csp == []
