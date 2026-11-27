"""The M8 trust controls on the OpenAPI registration and Replace forms, with mocked answers."""

import json
import re

import pytest
from playwright.sync_api import Page, Request, Route, expect

from conftest import assert_accessible, assert_layout, watch_csp

CSRF = "cs" + "rf_" + "a" * 38
ME = {
    "user": {"id": "user-1", "displayName": "Alice Example", "email": None},
    "tenant": {"id": "tenant-1", "name": "E2E tenant", "reviewProfile": "solo"},
    "capabilities": ["register_tool_server", "manage_credentials"],
    "csrfToken": CSRF,
}
CAROL = {"items": [{"userId": "u_carol", "displayName": "Carol Example", "kind": "human"}]}
IO = {"type": "object"}
EMPTY = (200, {"items": [], "next_cursor": None})
DOCJ = {"openapi": "3.0.3", "paths": {}}
WARNING = (
    "A trusted result can reach write, send and pay steps without an llm.extract step, and the "
    "validator stops reporting L3_TAINT_TO_CONSEQUENTIAL for it. On a registered server this change "
    "leaves it drifted until the surface is approved again, and every changed tool gets a new ref "
    "(@N+1). Marking a read tool's data public removes it from the private-data check behind "
    "W_LETHAL_TRIFECTA."
)
REPLACE_HINT = "To change trust, paste the document again."


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
        hits.append({"headers": route.request.headers, "body": _request_body(route.request)})
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
    return csp


def checked(page: Page) -> None:
    assert_layout(page)
    assert_accessible(page)


def under(page: Page, label: str, text: str) -> None:
    expect(page.get_by_label(label, exact=True)).to_have_accessible_description(
        re.compile(re.escape(text))
    )


def eff(page: Page, name: str):
    return page.get_by_role("combobox", name="Effect of " + name, exact=True)


def dc(page: Page, name: str):
    return page.get_by_role("combobox", name="Data class of " + name, exact=True)


def trusted(page: Page, name: str):
    return page.get_by_role("checkbox", name="Result of " + name + " is trusted", exact=True)


def ack(page: Page, name: str):
    return page.get_by_role("checkbox", name="I accept the warning for " + name, exact=True)


def ticks(page: Page):
    return page.get_by_role("checkbox", name=re.compile(r"^I accept the warning"))


@pytest.mark.milestone("M8")
@pytest.mark.l4("C-f52c8d49")
def test_register_with_a_trusted_result(page: Page) -> None:
    csp = start(page)

    def op(
        operation_id: str, method: str, path: str, excluded: str | None = None
    ) -> dict[str, object]:
        return {
            "operationId": operation_id,
            "method": method,
            "path": path,
            "name": None,
            "excluded": excluded,
        }

    preview = {
        "version": "3.0",
        "basePath": "/v1",
        "operations": [
            op("createPayment", "POST", "/payments"),
            op("listVendors", "GET", "/vendors"),
            op("exportVendors", "HEAD", "/export", "method_unsupported"),
        ],
    }
    answer(page, "tool-servers", EMPTY)
    answer(page, "credentials", EMPTY)
    answer(page, "tool-registrations/openapi/preview", (200, preview), method="POST")
    posts = answer(page, "tool-registrations/openapi", (201, LEDGER), method="POST")
    answer(page, "tool-servers/ledger", (200, detail(LEDGER)))

    page.goto("/admin/tool-servers/new")
    page.get_by_role("radio", name="OpenAPI document", exact=True).check()
    page.get_by_label("Server id", exact=True).fill("ledger")
    page.get_by_label("Origin", exact=True).fill("https://tools.fake.test")
    page.get_by_label("OpenAPI document (JSON)", exact=True).fill(json.dumps(DOCJ))
    page.get_by_role("button", name="Preview operations", exact=True).click()

    table = page.get_by_role("table", name="Operations", exact=True)
    expect(table.get_by_role("row")).to_have_count(4)
    expect(table.get_by_role("columnheader")).to_have_text(
        ["Operation", "Method", "Path", "Effect", "Result trusted", "Data class"]
    )
    expect(trusted(page, "createPayment")).not_to_be_checked()
    under(page, "Result of createPayment is trusted", WARNING)
    expect(dc(page, "createPayment").get_by_role("option")).to_have_text(
        ["Not set", "public", "private"]
    )
    expect(dc(page, "createPayment")).to_have_value("")
    expect(page.get_by_text(WARNING, exact=True)).to_have_count(1)
    expect(trusted(page, "exportVendors")).to_have_count(0)
    expect(ticks(page)).to_have_count(0)
    checked(page)

    eff(page, "createPayment").select_option("pay")
    eff(page, "listVendors").select_option("read")
    trusted(page, "createPayment").check()
    dc(page, "createPayment").select_option("private")
    dc(page, "listVendors").select_option("public")
    page.get_by_role("button", name="Register server", exact=True).click()
    expect(ack(page, "createPayment")).to_be_visible()
    expect(ack(page, "createPayment")).not_to_be_checked()
    expect(ack(page, "listVendors")).not_to_be_checked()
    expect(ticks(page)).to_have_count(2)
    form = page.get_by_role("form", name="New tool server", exact=True)
    expect(form.get_by_role("alert")).to_have_text(
        "Accept the warning for: createPayment, listVendors."
    )
    assert len(posts) == 0
    checked(page)

    ack(page, "createPayment").check()
    ack(page, "listVendors").check()
    page.get_by_role("button", name="Register server", exact=True).click()
    expect(page).to_have_url(re.compile(r"\?server=ledger$"))
    assert len(posts) == 1
    assert posts[0]["body"] == {
        "id": "ledger",
        "origin": "https://tools.fake.test",
        "local": False,
        "document": DOCJ,
        "overlay": {
            "operations": {
                "createPayment": {
                    "effect": "pay",
                    "untrusted_result": False,
                    "data_class": "private",
                },
                "listVendors": {"effect": "read", "data_class": "public"},
            }
        },
    }
    checked(page)
    assert csp == []


def replace_page(page: Page):
    csp = start(page)
    create_payment = {
        "name": "create_payment",
        "effect": "pay",
        "input": IO,
        "output": IO,
        "call": http("POST", "/v1/payments"),
        "untrusted_result": False,
        "unsafe_to_retry": False,
        "data_class": "private",
    }
    list_vendors = {
        "name": "list_vendors",
        "effect": "read",
        "input": IO,
        "output": IO,
        "call": http("GET", "/v1/vendors"),
        "unsafe_to_retry": False,
    }
    ledger = {
        **detail(LEDGER),
        "state": "approved",
        "approvedDigest": "sha256:" + "d" * 64,
        "tools": [
            {"name": "create_payment", "effect": "pay", "ref": "ledger.create_payment@1"},
            {"name": "list_vendors", "effect": "read", "ref": "ledger.list_vendors@1"},
        ],
        "approvedSurface": {"tools": [create_payment, list_vendors]},
    }

    def op(operation_id: str, method: str, path: str, name: str) -> dict[str, object]:
        return {
            "operationId": operation_id,
            "method": method,
            "path": path,
            "name": name,
            "excluded": None,
        }

    preview = {
        "version": "3.0",
        "basePath": "/v1",
        "operations": [
            op("createPayment", "POST", "/payments", "create_payment"),
            op("listVendors", "GET", "/vendors", "list_vendors"),
        ],
    }
    answer(page, "tool-servers", EMPTY)
    answer(page, "credentials", EMPTY)
    gets = answer(
        page,
        "tool-servers/ledger",
        (200, ledger),
        (200, {**ledger, "state": "drifted"}),
    )
    puts = answer(
        page,
        "tool-servers/ledger/openapi",
        (200, {**LEDGER, "state": "drifted"}),
        method="PUT",
    )
    answer(page, "tool-registrations/openapi/preview", (200, preview), method="POST")

    surface = region(page, "Surface")
    change = region(page, "Change registration")
    page.goto("/admin/tool-servers?server=ledger")
    expect(surface).to_contain_text("ledger · https://tools.fake.test · approved")
    change.get_by_role("button", name="Replace document", exact=True).click()
    form = page.get_by_role("form", name="Replace document", exact=True)
    form.get_by_label("OpenAPI document (JSON)", exact=True).fill(json.dumps(DOCJ))
    form.get_by_role("button", name="Preview operations", exact=True).click()

    under(page, "OpenAPI document (JSON)", REPLACE_HINT)
    table = page.get_by_role("table", name="Operations", exact=True)
    expect(table.get_by_role("row")).to_have_count(3)
    expect(eff(page, "createPayment")).to_have_value("pay")
    expect(eff(page, "listVendors")).to_have_value("read")
    expect(trusted(page, "createPayment")).to_be_checked()
    expect(trusted(page, "listVendors")).not_to_be_checked()
    expect(dc(page, "createPayment")).to_have_value("private")
    expect(dc(page, "listVendors")).to_have_value("")
    expect(ticks(page)).to_have_count(0)
    expect(page.get_by_text(WARNING, exact=True)).to_have_count(1)
    checked(page)
    return csp, puts, gets, surface, form


@pytest.mark.milestone("M8")
@pytest.mark.l4("C-3a1c08af")
def test_replace_keeps_the_stored_trust(page: Page) -> None:
    csp, puts, gets, surface, form = replace_page(page)
    form.get_by_role("button", name="Save changes", exact=True).click()
    expect(surface).to_contain_text("ledger · https://tools.fake.test · drifted")
    assert len(puts) == 1
    assert puts[0]["body"] == {
        "document": DOCJ,
        "overlay": {
            "operations": {
                "createPayment": {
                    "effect": "pay",
                    "untrusted_result": False,
                    "unsafe_to_retry": False,
                    "data_class": "private",
                },
                "listVendors": {"effect": "read"},
            }
        },
    }
    assert len(gets) == 2
    checked(page)
    assert csp == []


@pytest.mark.milestone("M8")
@pytest.mark.l4("C-08abe836")
def test_replace_drops_the_retry_flag_on_an_effect_change(page: Page) -> None:
    csp, puts, gets, surface, form = replace_page(page)
    eff(page, "createPayment").select_option("send")
    eff(page, "listVendors").select_option("pay")
    form.get_by_role("button", name="Save changes", exact=True).click()
    expect(surface).to_contain_text("ledger · https://tools.fake.test · drifted")
    assert len(puts) == 1
    assert puts[0]["body"] == {
        "document": DOCJ,
        "overlay": {
            "operations": {
                "createPayment": {
                    "effect": "send",
                    "untrusted_result": False,
                    "data_class": "private",
                },
                "listVendors": {"effect": "pay"},
            }
        },
    }
    assert len(gets) == 2
    checked(page)
    assert csp == []
