"""The M7 registration and credential pages: mocked API answers, no sign-in."""

import json
import re

import pytest
from playwright.sync_api import Page, Request, Route, expect

from conftest import assert_accessible, assert_layout, watch_csp

CSRF = "csrf_" + "a" * 38
ME = {
    "user": {"id": "user-1", "displayName": "Alice Example", "email": None},
    "tenant": {"id": "tenant-1", "name": "E2E tenant", "reviewProfile": "solo"},
    "capabilities": ["register_tool_server", "manage_credentials"],
    "csrfToken": CSRF,
}
CAROL = {"items": [{"userId": "u_carol", "displayName": "Carol Example", "kind": "human"}]}
INTERNAL = {"error": {"code": "INTERNAL", "message": "m"}}
HOLD = object()
IO = {"type": "object"}
EMPTY = (200, {"items": [], "next_cursor": None})
CONFLICT = (409, {"error": {"code": "ALREADY_EXISTS", "message": "m"}})
DD = "sha256:" + "d" * 64
UNEXPECTED = "The engine hit an unexpected problem. Try again, and tell an administrator if it keeps happening."


def fields(f: str, m: str) -> tuple[int, dict[str, object]]:
    return (
        400,
        {
            "error": {
                "code": "VALIDATION_FAILED",
                "message": "m",
                "details": {"fields": [{"field": f, "message": m}]},
            }
        },
    )


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


CRM = rec("crm", "mcp", "https://mcp.fake.test")
LEDGER = rec("ledger", "http_openapi", "https://tools.fake.test")


def _request_body(request: Request) -> object:
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
        if reply is HOLD:
            return
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


@pytest.mark.milestone("M7")
@pytest.mark.l4("C-e3ab2add")
def test_register_mcp_server_and_code_block_detail(page: Page) -> None:
    csp = start(page)
    snips = rec(
        "snips",
        "code_block",
        "sandbox",
        tools=[{"name": "word_count", "effect": "read", "ref": None}],
    )
    answer(page, "tool-servers", EMPTY)
    posts = answer(
        page,
        "tool-registrations/mcp",
        fields("body/url", "loopback"),
        CONFLICT,
        (201, {"server": CRM, "endpoint": "/mcp2"}),
        method="POST",
    )
    answer(page, "tool-servers/crm", (200, detail(CRM)))
    answer(page, "tool-servers/snips", (200, detail(snips)))
    creds = answer(page, "credentials", EMPTY)
    form = page.get_by_role("form", name="New tool server", exact=True)

    page.goto("/admin/tool-servers")
    page.get_by_role("link", name="Register a tool server", exact=True).click()
    expect(page).to_have_url(re.compile(r"/admin/tool-servers/new$"))
    expect(page).to_have_title("Register a tool server · Ursitoare")
    expect(page.get_by_role("radio", name="MCP server", exact=True)).to_be_checked()
    under(
        page,
        "MCP URL",
        "Do not paste a URL that holds a key; store the key as a credential.",
    )
    checked(page)

    page.get_by_label("Server id", exact=True).fill("crm")
    page.get_by_label("MCP URL", exact=True).fill("http://mcp.fake.test/mcp")
    page.get_by_role("button", name="Register server", exact=True).click()
    expect(form).to_contain_text('Use https, or tick "Local network server" for an http address.')
    assert len(posts) == 0
    checked(page)

    page.get_by_label("MCP URL", exact=True).fill("https://mcp.fake.test/mcp")
    page.get_by_role("button", name="Register server", exact=True).click()
    expect(form).to_contain_text("This address is the engine itself; use the server's network address.")
    assert len(posts) == 1
    assert posts[0]["body"] == {"id": "crm", "url": "https://mcp.fake.test/mcp", "local": False}
    k1 = _header(posts[0], "Idempotency-Key")
    assert k1
    checked(page)

    page.get_by_role("button", name="Register server", exact=True).click()
    expect(form).to_contain_text("A tool server with this id already exists.")
    assert len(posts) == 2
    assert _header(posts[1], "Idempotency-Key") == k1

    page.get_by_label("MCP URL", exact=True).fill("https://mcp.fake.test/mcp2")
    page.get_by_role("button", name="Register server", exact=True).click()
    expect(page).to_have_url(re.compile(r"/admin/tool-servers\?server=crm$"))
    expect(region(page, "Credential")).to_contain_text("No credential stored.")
    assert len(posts) == 3
    assert posts[2]["body"] == {"id": "crm", "url": "https://mcp.fake.test/mcp2", "local": False}
    assert _header(posts[2], "Idempotency-Key") != k1
    assert len(creds) == 1
    checked(page)

    page.goto("/admin/tool-servers?server=snips")
    expect(region(page, "Credential")).to_contain_text("Code blocks need no credential.")
    expect(page.get_by_role("form", name="Credential", exact=True)).to_have_count(0)
    expect(page.get_by_label("Secret value", exact=True)).to_have_count(0)
    assert len(creds) == 1
    checked(page)
    assert csp == []


@pytest.mark.milestone("M7")
@pytest.mark.l4("C-0a8c70b3")
def test_register_openapi_preview_effects_and_retry(page: Page) -> None:
    csp = start(page)
    docj = {"openapi": "3.0.3", "paths": {}}
    doc = json.dumps(docj)

    def op(i: str | None, m: str, p: str, x: str | None = None) -> dict[str, object]:
        return {"operationId": i, "method": m, "path": p, "name": None, "excluded": x}

    pv = {
        "version": "3.0",
        "basePath": "/v1",
        "operations": [
            op("createPayment", "POST", "/payments"),
            op("listVendors", "GET", "/vendors"),
            op("getVendor", "GET", "/vendors/{id}"),
            op("exportVendors", "HEAD", "/export", "method_unsupported"),
            op(None, "GET", "/ping", "no_operation_id"),
        ],
    }
    previews = answer(
        page, "tool-registrations/openapi/preview", (500, INTERNAL), (200, pv), method="POST"
    )
    posts = answer(
        page,
        "tool-registrations/openapi",
        fields("body/origin", "private"),
        (201, LEDGER),
        method="POST",
    )
    answer(page, "tool-servers", EMPTY)
    answer(page, "tool-servers/ledger", (200, detail(LEDGER)))
    answer(page, "credentials", EMPTY)

    def eff(name: str):
        return page.get_by_role("combobox", name="Effect of " + name, exact=True)

    page.goto("/admin/tool-servers/new")
    page.get_by_role("radio", name="OpenAPI document", exact=True).check()
    page.get_by_label("Server id", exact=True).fill("ledger")
    page.get_by_label("Origin", exact=True).fill("https://tools.fake.test")
    page.get_by_label("OpenAPI document (JSON)", exact=True).fill(doc)
    page.get_by_role("button", name="Preview operations", exact=True).click()
    expect(page.get_by_role("alert").filter(has_text=UNEXPECTED)).to_be_visible()
    expect(page.get_by_role("table", name="Operations", exact=True)).to_have_count(0)
    assert len(previews) == 1
    checked(page)

    page.get_by_role("button", name="Preview operations", exact=True).click()
    table = page.get_by_role("table", name="Operations", exact=True)
    expect(table.get_by_role("row")).to_have_count(6)
    row = table.get_by_role("row").filter(has_text="createPayment")
    expect(row).to_contain_text("POST")
    expect(row).to_contain_text("/payments")
    expect(eff("createPayment").get_by_role("option")).to_have_text(
        ["Skip", "read", "write", "send", "pay"]
    )
    expect(table.get_by_role("row").filter(has_text="exportVendors")).to_contain_text(
        "Excluded: method_unsupported"
    )
    expect(eff("exportVendors")).to_have_count(0)
    last = table.get_by_role("row").last
    expect(last).to_contain_text("—")
    expect(last).to_contain_text("Excluded: no_operation_id")
    assert len(previews) == 2
    assert previews[1]["body"] == {"origin": "https://tools.fake.test", "local": False, "document": docj}
    checked(page)

    page.get_by_role("button", name="Register server", exact=True).click()
    under(page, "OpenAPI document (JSON)", "Choose an effect for at least one operation.")
    assert len(posts) == 0

    eff("createPayment").select_option("pay")
    eff("listVendors").select_option("read")
    page.get_by_role("button", name="Register server", exact=True).click()
    under(page, "Origin", 'Tick "Local network server" for a private address.')
    assert len(posts) == 1
    assert posts[0]["body"] == {
        "id": "ledger",
        "origin": "https://tools.fake.test",
        "local": False,
        "document": docj,
        "overlay": {
            "operations": {
                "createPayment": {"effect": "pay"},
                "listVendors": {"effect": "read"},
            }
        },
    }
    checked(page)

    page.get_by_role("button", name="Register server", exact=True).click()
    expect(page).to_have_url(re.compile(r"\?server=ledger$"))
    expect(region(page, "Credential")).to_contain_text("No credential stored.")
    assert len(posts) == 2
    checked(page)
    assert csp == []


@pytest.mark.milestone("M7")
@pytest.mark.l4("C-62f4785e")
def test_credential_stored_rotated_secret_never_shows(page: Page) -> None:
    csp = start(page)
    secret = "s3cr3t-key"
    rot = "r0tated-key"
    console: list[str] = []
    page.on("console", lambda message: console.append(message.text))

    def cred(id: str, server: str, v: int) -> dict[str, object]:
        return {
            "id": id,
            "toolServerId": server,
            "authScheme": "API_KEY_HEADER",
            "headerName": "x-api-key",
            "keyVersion": v,
        }

    answer(page, "tool-servers", EMPTY)
    answer(page, "tool-servers/crm", (200, detail(CRM)))
    gets = answer(
        page,
        "credentials",
        (500, INTERNAL),
        (200, {"items": [cred("cred_2", "shop", 1)], "next_cursor": "c1"}),
        EMPTY,
        (200, {"items": [cred("cred_1", "crm", 1)], "next_cursor": None}),
        (200, {"items": [cred("cred_1", "crm", 2)], "next_cursor": None}),
    )
    posts = answer(
        page,
        "credentials",
        CONFLICT,
        (201, {**cred("cred_1", "crm", 1), "value": secret}),
        method="POST",
    )
    rotates = answer(
        page, "credentials/cred_1/rotate", (200, cred("cred_1", "crm", 2)), method="POST"
    )
    section = region(page, "Credential")
    store = section.get_by_role("button", name="Store credential", exact=True)
    field = page.get_by_label("Secret value", exact=True)

    page.goto("/admin/tool-servers?server=crm")
    expect(section.get_by_role("alert")).to_be_visible()
    store.click(force=True)
    expect(store).to_have_attribute("aria-disabled", "true")
    assert len(posts) == 0
    checked(page)

    page.reload()
    expect(section).to_contain_text("No credential stored.")
    expect(section).to_contain_text(
        "A server that needs no key still needs a value here: enter any text."
    )
    expect(store).not_to_have_attribute("aria-disabled", "true")
    assert len(gets) == 3
    checked(page)

    page.get_by_role("radio", name="API key header", exact=True).check()
    page.get_by_label("Header name", exact=True).fill("x-api-key")
    field.fill(secret)
    store.click()
    expect(page.get_by_role("alert").filter(has_text="A credential is already stored for this server.")).to_be_visible()
    expect(field).to_have_value("")
    assert len(posts) == 1
    assert posts[0]["body"] == {
        "toolServerId": "crm",
        "authScheme": "API_KEY_HEADER",
        "headerName": "x-api-key",
        "value": secret,
    }
    k1 = _header(posts[0], "Idempotency-Key")
    assert k1

    field.fill(secret)
    store.click()
    expect(section).to_contain_text("Credential stored (key version 1).")
    expect(section.get_by_role("status")).to_have_text("Credential stored.")
    expect(section.get_by_role("button", name="Rotate credential", exact=True)).to_be_visible()
    expect(page.get_by_role("radio", name="API key header", exact=True)).to_be_checked()
    expect(page.get_by_label("Header name", exact=True)).to_have_value("x-api-key")
    expect(field).to_have_value("")
    assert secret not in page.locator("body").inner_text()
    assert len(posts) == 2
    assert _header(posts[1], "Idempotency-Key") != k1
    assert len(gets) == 4
    checked(page)

    field.fill(rot)
    section.get_by_role("button", name="Rotate credential", exact=True).click()
    expect(section.get_by_role("status")).to_have_text("Credential rotated.")
    expect(section).to_contain_text("Credential stored (key version 2).")
    expect(field).to_have_value("")
    body = page.locator("body").inner_text()
    assert secret not in body and rot not in body
    assert len(rotates) == 1
    assert rotates[0]["body"] == {
        "value": rot,
        "authScheme": "API_KEY_HEADER",
        "headerName": "x-api-key",
    }
    assert _header(rotates[0], "Idempotency-Key") is None
    assert len(gets) == 5
    assert not any(secret in m or rot in m for m in console)
    checked(page)
    assert csp == []


@pytest.mark.milestone("M7")
@pytest.mark.l4("C-c3420a43")
def test_replace_document_and_edit_code_from_detail(page: Page) -> None:
    csp = start(page)
    docj = {"openapi": "3.0.3", "paths": {}}
    doc = json.dumps(docj)

    def op(i: str, m: str, p: str, n: str) -> dict[str, object]:
        return {"operationId": i, "method": m, "path": p, "name": n, "excluded": None}

    pv2 = {
        "version": "3.0",
        "basePath": "/v1",
        "operations": [
            op("createPayment", "POST", "/payments", "create_payment"),
            op("listVendors", "GET", "/vendors", "list_vendors"),
        ],
    }
    ledger_d = {
        **detail(LEDGER),
        "state": "approved",
        "approvedDigest": DD,
        "tools": [{"name": "create_payment", "effect": "pay", "ref": "ledger.create_payment@1"}],
    }
    snips_d = detail(
        rec(
            "snips",
            "code_block",
            "sandbox",
            state="approved",
            approvedDigest=DD,
            tools=[{"name": "word_count", "effect": "read", "ref": "snips.word_count@1"}],
        )
    )
    snips_d["approvedSurface"] = {
        "tools": [
            {
                "name": "word_count",
                "description": "Counts words.",
                "effect": "read",
                "input": IO,
                "output": IO,
                "call": {"kind": "code", "source": "return { words: 1 };"},
            }
        ]
    }
    answer(page, "tool-servers", EMPTY)
    ledger_gets = answer(
        page,
        "tool-servers/ledger",
        (200, ledger_d),
        (200, {**ledger_d, "state": "drifted"}),
    )
    ledger_puts = answer(
        page,
        "tool-servers/ledger/openapi",
        (200, {**LEDGER, "state": "drifted"}),
        method="PUT",
    )
    previews = answer(page, "tool-registrations/openapi/preview", (200, pv2), method="POST")
    snips_gets = answer(
        page,
        "tool-servers/snips",
        (200, snips_d),
        (200, snips_d),
        (200, {**snips_d, "state": "drifted"}),
    )
    snips_puts = answer(
        page,
        "tool-servers/snips/code",
        (200, {**snips_d, "state": "drifted"}),
        method="PUT",
    )
    answer(page, "credentials", EMPTY)
    change = region(page, "Change registration")
    surface = region(page, "Surface")

    page.goto("/admin/tool-servers?server=ledger")
    expect(surface).to_contain_text("ledger · https://tools.fake.test · approved")
    expect(change.get_by_role("button", name="Replace document", exact=True)).to_be_visible()
    expect(change.get_by_role("button", name="Edit code", exact=True)).to_have_count(0)
    checked(page)

    change.get_by_role("button", name="Replace document", exact=True).click()
    form = page.get_by_role("form", name="Replace document", exact=True)
    expect(form.get_by_label("OpenAPI document (JSON)", exact=True)).to_be_visible()
    expect(form.get_by_label("Server id", exact=True)).to_have_count(0)
    checked(page)

    form.get_by_label("OpenAPI document (JSON)", exact=True).fill(doc)
    form.get_by_role("button", name="Preview operations", exact=True).click()
    table = page.get_by_role("table", name="Operations", exact=True)
    expect(table.get_by_role("row")).to_have_count(3)
    expect(
        page.get_by_role("combobox", name="Effect of createPayment", exact=True)
    ).to_have_value("pay")
    expect(
        page.get_by_role("combobox", name="Effect of listVendors", exact=True)
    ).to_have_value("")
    assert len(previews) == 1
    assert previews[0]["body"] == {"origin": "https://tools.fake.test", "local": False, "document": docj}
    checked(page)

    form.get_by_role("button", name="Save changes", exact=True).click()
    expect(surface).to_contain_text("ledger · https://tools.fake.test · drifted")
    expect(change.get_by_role("status")).to_have_text("Document replaced.")
    assert len(ledger_puts) == 1
    assert ledger_puts[0]["body"] == {
        "document": docj,
        "overlay": {"operations": {"createPayment": {"effect": "pay"}}},
    }
    assert len(ledger_gets) == 2
    checked(page)

    page.goto("/admin/tool-servers?server=snips")
    change.get_by_role("button", name="Edit code", exact=True).click()
    form = page.get_by_role("form", name="Edit code", exact=True)
    expect(form.get_by_label("Tool name", exact=True)).to_have_value("word_count")
    expect(form.get_by_label("Server id", exact=True)).to_have_count(0)
    expect(form.get_by_label("Description", exact=True)).to_have_value("Counts words.")
    expect(form.get_by_label("Input schema (JSON)", exact=True)).to_have_value(
        json.dumps(IO, indent=2)
    )
    expect(form.get_by_label("Output schema (JSON)", exact=True)).to_have_value(
        json.dumps(IO, indent=2)
    )
    expect(form.get_by_label("Source", exact=True)).to_have_value("return { words: 1 };")
    checked(page)

    form.get_by_label("Source", exact=True).fill("return { words: 2 };")
    form.get_by_role("button", name="Save changes", exact=True).click()
    expect(region(page, "Surface")).to_contain_text("snips · sandbox · drifted")
    expect(change.get_by_role("status")).to_have_text("Code saved.")
    assert len(snips_puts) == 1
    assert snips_puts[0]["body"] == {
        "tools": [
            {
                "name": "word_count",
                "description": "Counts words.",
                "input": IO,
                "output": IO,
                "source": "return { words: 2 };",
            }
        ]
    }
    assert len(snips_gets) == 3
    checked(page)
    assert csp == []
