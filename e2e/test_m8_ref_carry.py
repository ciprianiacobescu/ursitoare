"""The M8 ref carry on the Servers page, with mocked answers."""

import json
import re

import pytest
from playwright.sync_api import Page, Request, Route, expect

from conftest import assert_accessible, assert_layout, watch_csp

CSRF = "cs" + "rf_" + "a" * 38
ME = {
    "user": {"id": "user-1", "displayName": "Alice Example", "email": None},
    "tenant": {"id": "tenant-1", "name": "E2E tenant", "reviewProfile": "solo"},
    "capabilities": ["register_tool_server", "approve_tool_surface", "deploy_policy"],
    "csrfToken": CSRF,
}
CAROL = {"items": [{"userId": "u_carol", "displayName": "Carol Example", "kind": "human"}]}
IO = {"type": "object"}
EMPTY = (200, {"items": [], "next_cursor": None})
DP = "sha256:" + "0123456789ab" + "c" * 52
DA = "sha256:" + "fedcba987654" + "d" * 52


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


def detail(r: dict[str, object]) -> dict[str, object]:
    return {**r, "approvedSurface": None, "pendingSurface": None}


LEDGER = rec("ledger", "http_openapi", "https://tools.fake.test")


def http(method: str, path: str) -> dict[str, object]:
    return {"kind": "http", "method": method, "path": path, "params": [], "body": False}


def T(name: str, effect: str, **over: object) -> dict[str, object]:
    t = {"name": name, "effect": effect, "input": IO, "output": IO, "http": {"method": "POST", "path": "/v1/" + name}}
    t.update(over)
    return t


CP1 = "ledger.create_payment@1"
LV1 = "ledger.list_vendors@1"
CP2 = "ledger.create_payment@2"
LV2 = "ledger.list_vendors@2"

OLD = {"tools": [T("create_payment", "pay"), T("list_vendors", "read")]}
NEW = {"tools": [T("create_payment", "pay", unsafe_to_retry=True), T("list_vendors", "write", untrusted_result=False)]}


def refs(n: int, lv: str) -> list[dict[str, object]]:
    return [
        {"name": "create_payment", "effect": "pay", "ref": f"ledger.create_payment@{n}"},
        {"name": "list_vendors", "effect": lv, "ref": f"ledger.list_vendors@{n}"},
    ]


DRIFT = {
    **LEDGER,
    "state": "drifted",
    "approvedDigest": DA,
    "pendingDigest": DP,
    "pendingSubmittedBy": "u_carol",
    "tools": refs(1, "read"),
    "approvedSurface": OLD,
    "pendingSurface": NEW,
}
ACCEPTED = {**LEDGER, "state": "approved", "approvedDigest": DP, "tools": refs(2, "write")}
DONE = {**ACCEPTED, "approvedSurface": NEW, "pendingSurface": None}
FIRST = {
    **LEDGER,
    "state": "pending",
    "approvedDigest": None,
    "approvedSurface": None,
    "pendingSurface": NEW,
    "tools": [
        {"name": "create_payment", "effect": "pay", "ref": None},
        {"name": "list_vendors", "effect": "write", "ref": None},
    ],
}
FIRST_DONE = {**DONE, "tools": refs(1, "write")}
ACCEPTED1 = {**LEDGER, "state": "approved", "approvedDigest": DP, "tools": refs(1, "write")}

ROLE = {"kind": "role", "role": "author"}
BOB = {"kind": "user", "userId": "u_bob"}
ANY = {"kind": "any_step"}
NODE = {"kind": "node", "flowId": "pay-run", "nodeId": "pay"}


def grant_record(id="grant_1", tool=CP1, subject=ROLE, scope=ANY, args=None, state="active"):
    if args is None:
        args = []
    return {
        "id": id,
        "subject": subject,
        "tool": tool,
        "scope": scope,
        "args": args,
        "fingerprints": [],
        "state": state,
        "createdBy": "u_carol",
        "createdAt": "2026-01-01T00:00:00Z",
        "revokedBy": None,
        "revokedAt": None,
    }


def item(id, tool, subject, scope, args=None, state="active"):
    if args is None:
        args = []
    return {"grant": grant_record(id, tool, subject, scope, args, state), "status": state}


ITEMS = [
    item("grant_1", CP1, ROLE, ANY),
    item("grant_2", CP1, BOB, ANY, [{"arg": "amount", "op": "lte", "value": 100}]),
    item("grant_3", CP1, ROLE, NODE),
    item("grant_4", CP1, ROLE, ANY, state="revoked"),
    item("grant_5", "acme.lookup_vendor@1", ROLE, ANY),
    item("grant_6", LV1, ROLE, ANY),
]
NOTICE = "Refs changed: ledger.create_payment@1 → ledger.create_payment@2, ledger.list_vendors@1 → ledger.list_vendors@2. Grants and flows still name the old refs."


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
        hits.append({"url": route.request.url, "headers": route.request.headers, "body": _request_body(route.request)})
        reply = replies[min(len(hits) - 1, len(replies) - 1)]
        status, body = reply
        route.fulfill(status=status, content_type="application/json", body=json.dumps(body))

    page.route(pattern, handler)
    return hits


def region(page: Page, name: str):
    return page.get_by_role("region", name=name, exact=True)


def start(page: Page) -> list[str]:
    csp = watch_csp(page)
    page.set_viewport_size({"width": 1366, "height": 860})
    answer(page, "me", (200, ME))
    answer(page, "people", (200, CAROL))
    others: list[str] = []

    def on_request(request: Request) -> None:
        if request.method.upper() in ("DELETE", "PUT", "PATCH") and "/api/v1/grants" in request.url:
            others.append(request.method.upper())

    page.on("request", on_request)
    # stash others on csp? We'll return others separately via closure not possible; store on page
    page._others = others  # type: ignore
    return csp


def checked(page: Page) -> None:
    assert_layout(page)
    assert_accessible(page)


def queries(hits: list[dict[str, object]]) -> list[dict[str, list[str]]]:
    from urllib.parse import parse_qs, urlparse
    out = []
    for h in hits:
        q = parse_qs(urlparse(h["url"]).query)
        out.append({k: v for k, v in q.items()})
    return out


def approve(page: Page) -> None:
    region(page, "Surface").get_by_role("button", name="Approve surface", exact=True).click()
    page.get_by_role("dialog").get_by_role("button", name="Approve surface", exact=True).click()


@pytest.mark.milestone("M8")
@pytest.mark.l4("C-8540a4f8")
def test_approving_bumped_refs_offers_the_copy(page: Page) -> None:
    csp = start(page)
    others = page._others
    # list + credentials
    answer(page, "tool-servers", (200, EMPTY))
    answer(page, "credentials", (200, EMPTY))
    detail_hits = answer(page, "tool-servers/ledger", (200, DRIFT), (200, DONE), method="GET")
    approves = answer(page, "tool-servers/ledger/surface/approve", (200, {"server": ACCEPTED, "blocks": []}), method="POST")
    grants = answer(page, "grants", (200, {"items": ITEMS, "next_cursor": None}))
    posts = answer(page, "grants", (201, grant_record(id="grant_n1", tool=CP2)), (422, {"error": {"code": "OPERATION_REFUSED", "message": "m", "details": {"reason": "arg_unknown"}}}), method="POST")

    page.goto("/admin/tool-servers?server=ledger")
    r = region(page, "Surface")
    expect(r).to_contain_text("ledger · https://tools.fake.test · drifted")
    expect(page.get_by_text(NOTICE, exact=True)).to_have_count(0)
    expect(r.get_by_role("button", name="Create the same grants for the new refs", exact=True)).to_have_count(0)
    checked(page)

    approve(page)
    expect(r.get_by_role("status").filter(has_text="Surface approved.")).to_be_visible()
    expect(r).to_contain_text("ledger · https://tools.fake.test · approved")
    expect(page.get_by_text(NOTICE, exact=True)).to_be_visible()
    copy = r.get_by_role("button", name="Create the same grants for the new refs", exact=True)
    expect(copy).to_be_visible()
    expect(copy).not_to_have_attribute("aria-disabled", "true")
    copied = r.get_by_role("list", name="Copied grants", exact=True)
    expect(copied).to_have_count(0)
    assert len(approves) == 1
    assert approves[0]["body"] == {"digest": DP, "selfApproval": False}
    assert len(detail_hits) == 2
    assert len(grants) == 0
    assert len(posts) == 0
    checked(page)

    copy.click()
    items = copied.get_by_role("listitem")
    expect(items).to_have_text([
        "Created ledger.create_payment@2 for role author · any step.",
        "Not created for user u_bob · any step: arg_unknown.",
        "Update the flow first: role author · pay-run / pay (ledger.create_payment@2).",
        "Effect changed: read → write; grant it again on the Grants page: role author · any step (ledger.list_vendors@2).",
    ])
    link = page.get_by_role("link", name="Deploy on Policies", exact=True)
    expect(link).to_have_attribute("href", "/admin/policies")
    expect(copy).not_to_have_attribute("aria-disabled", "true")
    expect(page.get_by_role("alert")).to_have_count(0)
    assert len(grants) == 1
    assert queries(grants) == [{"limit": ["100"]}]
    assert len(posts) == 2
    assert posts[0]["body"] == {"subject": ROLE, "tool": "ledger.create_payment@2", "scope": ANY, "args": []}
    assert posts[1]["body"] == {"subject": BOB, "tool": "ledger.create_payment@2", "scope": ANY, "args": [{"arg": "amount", "op": "lte", "value": 100}]}
    keys = [p["headers"].get("idempotency-key") for p in posts]
    assert all(keys) and keys[0] != keys[1]
    assert all(p["body"].get("tool") != "ledger.list_vendors@2" for p in posts)
    assert others == []
    checked(page)
    assert csp == []


@pytest.mark.milestone("M8")
@pytest.mark.l4("C-8540a4f8")
def test_first_approval_offers_nothing(page: Page) -> None:
    csp = start(page)
    answer(page, "tool-servers", (200, EMPTY))
    answer(page, "credentials", (200, EMPTY))
    detail_hits = answer(page, "tool-servers/ledger", (200, FIRST), (200, FIRST_DONE), method="GET")
    approves = answer(page, "tool-servers/ledger/surface/approve", (200, {"server": ACCEPTED1, "blocks": []}), method="POST")
    grants = answer(page, "grants", (200, {"items": ITEMS, "next_cursor": None}))

    page.goto("/admin/tool-servers?server=ledger")
    r = region(page, "Surface")
    approve(page)
    expect(r.get_by_role("status").filter(has_text="Surface approved.")).to_be_visible()
    expect(r).to_contain_text("ledger · https://tools.fake.test · approved")
    expect(page.get_by_text(re.compile(r"^Refs changed"))).to_have_count(0)
    copy = r.get_by_role("button", name="Create the same grants for the new refs", exact=True)
    expect(copy).to_have_count(0)
    assert len(approves) == 1
    assert len(detail_hits) == 2
    assert len(grants) == 0
    checked(page)
    assert csp == []


@pytest.mark.milestone("M8")
@pytest.mark.l4("C-8540a4f8")
def test_a_failed_grants_read_creates_nothing(page: Page) -> None:
    csp = start(page)
    answer(page, "tool-servers", (200, EMPTY))
    answer(page, "credentials", (200, EMPTY))
    detail_hits = answer(page, "tool-servers/ledger", (200, DRIFT), (200, DONE), method="GET")
    approves = answer(page, "tool-servers/ledger/surface/approve", (200, {"server": ACCEPTED, "blocks": []}), method="POST")
    grants = answer(page, "grants", (403, {"error": {"code": "FORBIDDEN", "message": "dec_1"}}))
    posts = answer(page, "grants", method="POST")

    page.goto("/admin/tool-servers?server=ledger")
    r = region(page, "Surface")
    approve(page)
    copy = r.get_by_role("button", name="Create the same grants for the new refs", exact=True)
    expect(copy).to_be_visible()
    copy.click()
    expect(r.get_by_role("alert")).to_have_count(1)
    expect(r.get_by_role("alert")).to_contain_text("dec_1")
    copied = r.get_by_role("list", name="Copied grants", exact=True)
    expect(copied).to_have_count(0)
    link = page.get_by_role("link", name="Deploy on Policies", exact=True)
    expect(link).to_have_count(0)
    expect(copy).not_to_have_attribute("aria-disabled", "true")
    assert len(grants) == 1
    assert len(posts) == 0
    checked(page)
    assert csp == []
