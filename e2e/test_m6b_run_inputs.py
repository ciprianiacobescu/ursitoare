"""M6b run inputs: the form and the answer rows of the Test run and Dry run panels."""

import json
import re

import pytest
from playwright.sync_api import Page, expect

from conftest import assert_accessible, watch_csp

HASH = "sha256:" + "a" * 64
ENC = HASH.replace(":", "%3A")
MISMATCH = "The JSON no longer matches the form; it is used as written."
ROWS_MISMATCH = "The JSON no longer matches the answer rows; it is used as written."
BAD_JSON = "This is not valid JSON."
CANNOT_SHOW = "The input schema uses features the form cannot show, so enter the input as JSON."
ME = {
    "user": {"id": "user-1", "displayName": "Alice Example", "email": None},
    "tenant": {"id": "tenant-1", "name": "E2E tenant", "reviewProfile": "solo"},
    "capabilities": ["read_self", "read_flow", "read_run", "test_flow", "dry_run_flow"],
    "csrfToken": "t" + "A" * 42,
}
VERSION = {
    "flowId": "demo-pay",
    "number": 1,
    "hash": HASH,
    "state": "validated",
    "surface": "yaml",
    "author": "user-1",
    "requestedBy": None,
    "createdAt": "2026-11-06T10:00:00.000000Z",
    "validatedAt": "2026-11-06T10:00:01.000000Z",
    "validationOk": True,
}
FLOW = {
    "flowId": "demo-pay",
    "ownerTeam": "finance",
    "createdBy": "user-1",
    "createdAt": "2026-11-06T10:00:00.000000Z",
    "versionCount": 1,
    "latest": VERSION,
}
RESULT = {"ok": True, "errors": [], "warnings": [], "layers_run": ["L1", "L2", "L3"]}
RUN = {
    "id": "run_1",
    "flowId": "demo-pay",
    "flowHash": HASH,
    "mode": "mock",
    "trigger": "test",
    "state": "queued",
    "ownerTeam": "finance",
    "principal": {"userId": "user-1", "kind": "human"},
    "createdAt": "2026-11-06T10:00:02.000000Z",
    "terminalNode": None,
    "error": None,
    "inputRef": None,
    "outputRef": None,
    "startedAt": None,
    "endedAt": None,
}
FIELDS = {
    "type": "object",
    "required": ["vendor_name", "amount"],
    "properties": {"amount": {"type": "number"}, "vendor_name": {"type": "string"}},
}
ONE = {
    "type": "object",
    "required": ["vendor_name"],
    "properties": {"vendor_name": {"type": "string"}},
}
ODD = {
    "type": "object",
    "properties": {"a": {"oneOf": [{"type": "string"}, {"type": "number"}]}},
}


def canonical(inputs: dict) -> dict:
    return {
        "flow": "demo-pay",
        "start": "lookup",
        "version": "1.0.0",
        "ursitoare": "0.1",
        "inputs": inputs,
        "nodes": {
            "pay": {"kind": "block", "next": "done", "uses": "erp.create_payment@1"},
            "done": {"kind": "end", "status": "completed"},
            "route": {
                "kind": "switch",
                "on": "${{ nodes.lookup.output.status }}",
                "cases": {"active": "pay"},
                "default": "blocked",
            },
            "lookup": {"kind": "block", "next": "route", "uses": "erp.lookup_vendor@1"},
            "blocked": {"kind": "end", "status": "failed"},
        },
    }


def fulfill(route, body, status: int = 200) -> None:
    route.fulfill(status=status, content_type="application/json", body=json.dumps(body))


def mock(page: Page, details: list, posts: list, refuse: list) -> None:
    reads = {"n": 0}

    def me(route):
        fulfill(route, ME)

    def people(route):
        fulfill(
            route,
            {"items": [{"userId": "user-1", "displayName": "Alice Example", "kind": "human"}]},
        )

    def flow(route):
        fulfill(route, FLOW)

    def versions(route):
        fulfill(route, {"items": [VERSION], "next_cursor": None})

    def detail(route):
        doc = details[min(reads["n"], len(details) - 1)]
        reads["n"] += 1
        fulfill(
            route,
            {
                **VERSION,
                "text": 'ursitoare: "0.1"\nflow: demo-pay\n',
                "canonical": doc,
                "result": RESULT,
            },
        )

    def validate(route):
        fulfill(route, {"version": VERSION, "result": RESULT})

    def post(route):
        segment = route.request.url.rstrip("/").split("/")[-1]
        if refuse and segment == "dry-run":
            body = refuse.pop(0)
            fulfill(route, body, 422)
            return
        posts.append((segment, route.request.post_data_json))
        fulfill(route, {"run": RUN})

    page.route(re.compile(r".*/api/v1/me(\?.*)?$"), me)
    page.route(re.compile(r".*/api/v1/people(\?.*)?$"), people)
    page.route(re.compile(r".*/api/v1/flows/demo-pay(\?.*)?$"), flow)
    page.route(re.compile(r".*/api/v1/flows/demo-pay/versions(\?.*)?$"), versions)
    page.route(re.compile(r".*/versions/" + ENC + r"(\?.*)?$"), detail)
    page.route(re.compile(r".*/versions/" + ENC + r"/validate$"), validate)
    page.route(re.compile(r".*/versions/" + ENC + r"/test$"), post)
    page.route(re.compile(r".*/versions/" + ENC + r"/dry-run$"), post)


def open_flow(page: Page, details: list, width: int = 1366, height: int = 860):
    page.set_viewport_size({"width": width, "height": height})
    csp = watch_csp(page)
    posts: list = []
    refuse: list = []
    mock(page, details, posts, refuse)
    page.goto("/flows/demo-pay")
    expect(page.get_by_role("heading", name="Flow demo-pay", exact=True)).to_be_visible()
    test_run = page.get_by_role("region", name="Test run", exact=True)
    dry_run = page.get_by_role("region", name="Dry run", exact=True)
    return test_run, dry_run, posts, refuse, csp


def box(locator) -> dict:
    found = locator.bounding_box()
    assert found is not None
    return found


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-92bb8bdc")
def test_the_form_and_the_input_json_stay_in_step(page: Page) -> None:
    test_run, _dry, posts, _refuse, csp = open_flow(page, [canonical(FIELDS)])
    vendor = test_run.get_by_role("textbox", name="Vendor name (required)", exact=True)
    amount = test_run.get_by_role("textbox", name="Amount (required)", exact=True)
    text = test_run.get_by_role("textbox", name="Input (JSON)", exact=True)
    group = test_run.get_by_role("group", name="Inputs", exact=True)
    expect(group.get_by_role("textbox")).to_have_count(2)
    expect(group.get_by_role("textbox").first).to_have_accessible_name("Vendor name (required)")
    expect(text).to_have_value("{}")
    vendor.fill("ACME")
    amount.fill("12.5")
    expect(text).to_have_value('{\n  "vendor_name": "ACME",\n  "amount": 12.5\n}')
    compact = '{"vendor_name":"Globex","amount":7}'
    text.fill(compact)
    expect(vendor).to_have_value("Globex")
    expect(amount).to_have_value("7")
    expect(text).to_have_value(compact)
    text.fill('{"vendor_name":')
    expect(test_run.get_by_text(BAD_JSON, exact=True)).to_have_count(1)
    expect(vendor).to_have_value("Globex")
    text.fill('{"foo":1}')
    expect(test_run.get_by_text(MISMATCH, exact=True)).to_have_count(1)
    test_run.get_by_role("button", name="Start test run", exact=True).click()
    expect(test_run.get_by_role("status")).to_have_text("Started test run run_1.")
    assert posts == [("test", {"input": {"foo": 1}, "mocks": {}})]
    assert csp == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-e9b281b6")
def test_a_missing_required_field_blocks_the_start(page: Page) -> None:
    test_run, _dry, posts, _refuse, csp = open_flow(page, [canonical(FIELDS)])
    vendor = test_run.get_by_role("textbox", name="Vendor name (required)", exact=True)
    amount = test_run.get_by_role("textbox", name="Amount (required)", exact=True)
    text = test_run.get_by_role("textbox", name="Input (JSON)", exact=True)
    start = test_run.get_by_role("button", name="Start test run", exact=True)
    vendor.fill("ACME")
    start.click()
    expect(amount).to_be_focused()
    expect(amount).to_have_attribute("aria-invalid", "true")
    expect(amount).to_have_accessible_description("Error: Required")
    assert posts == []
    amount.fill("abc")
    expect(amount).to_have_accessible_description("Error: Enter a number")
    expect(text).to_have_value('{\n  "vendor_name": "ACME"\n}')
    amount.fill("12.5")
    start.click()
    expect(test_run.get_by_role("status")).to_have_text("Started test run run_1.")
    assert posts == [
        ("test", {"input": {"vendor_name": "ACME", "amount": 12.5}, "mocks": {}})
    ]
    assert csp == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-6bc1b603")
def test_answer_rows_write_the_mocks_and_the_fakes(page: Page) -> None:
    test_run, dry_run, posts, refuse, csp = open_flow(page, [canonical(FIELDS)])
    names = test_run.get_by_role("button", name=re.compile(r"^Answers for ")).all_inner_texts()
    assert [n.strip() for n in names] == ["Answers for lookup", "Answers for pay"]
    mocks = test_run.get_by_role("textbox", name="Mocks (JSON)", exact=True)
    pay = test_run.get_by_role("button", name="Answers for pay", exact=True)
    expect(pay).to_have_attribute("aria-expanded", "false")
    pay.click()
    expect(pay).to_have_attribute("aria-expanded", "true")
    test_run.get_by_role("textbox", name="Output 1 for pay", exact=True).fill(
        '{"payment_id":"P-1","status":"created"}'
    )
    expect(mocks).to_have_value(
        json.dumps({"pay": [{"output": {"payment_id": "P-1", "status": "created"}}]}, indent=2)
    )
    test_run.get_by_role("button", name="Add an answer for pay", exact=True).click()
    test_run.get_by_role("textbox", name="Output 2 for pay", exact=True).fill("{")
    expect(test_run.get_by_text(BAD_JSON, exact=True)).to_have_count(1)
    test_run.get_by_role("button", name="Start test run", exact=True).click()
    expect(test_run.get_by_role("alert")).to_have_text(
        "Fix the answers that are not valid JSON before you start."
    )
    assert posts == []
    test_run.get_by_role("button", name="Remove output 2 for pay", exact=True).click()
    expect(test_run.get_by_role("textbox", name="Output 2 for pay", exact=True)).to_have_count(0)
    inputs = '{"vendor_name":"A","amount":1}'
    test_run.get_by_role("textbox", name="Input (JSON)", exact=True).fill(inputs)
    mocks.fill('{"lookup":[{"output":{"vendor_id":"V-1"}}]}')
    test_run.get_by_role("button", name="Answers for lookup", exact=True).click()
    expect(test_run.get_by_role("textbox", name="Output 1 for lookup", exact=True)).to_have_value(
        '{\n  "vendor_id": "V-1"\n}'
    )
    mocks.fill('{"pay":[{"error":{"code":"E","message":"m"}}]}')
    expect(test_run.get_by_text(ROWS_MISMATCH, exact=True)).to_have_count(1)
    test_run.get_by_role("button", name="Start test run", exact=True).click()
    expect(test_run.get_by_role("status")).to_have_text("Started test run run_1.")
    assert posts == [
        (
            "test",
            {
                "input": {"vendor_name": "A", "amount": 1},
                "mocks": {"pay": [{"error": {"code": "E", "message": "m"}}]},
            },
        )
    ]
    posts.clear()
    dry_run.get_by_role("button", name="Answers for pay", exact=True).click()
    dry_run.get_by_role("textbox", name="Output 1 for pay", exact=True).fill('{"payment_id":"P-1"}')
    dry_run.get_by_role("textbox", name="Input (JSON)", exact=True).fill(inputs)
    expect(dry_run.get_by_role("textbox", name="Fakes (JSON)", exact=True)).to_have_value(
        json.dumps({"pay": [{"output": {"payment_id": "P-1"}}]}, indent=2)
    )
    dry_run.get_by_role("button", name="Start dry run", exact=True).click()
    expect(dry_run.get_by_role("status")).to_have_text("Started dry run run_1.")
    assert posts == [
        (
            "dry-run",
            {
                "input": {"vendor_name": "A", "amount": 1},
                "fakes": {"pay": [{"output": {"payment_id": "P-1"}}]},
            },
        )
    ]
    refuse.append(
        {
            "error": {
                "code": "INVALID_REQUEST",
                "message": "The request is invalid.",
                "details": {"fields": [{"field": "body/fakes/lookup", "code": "not_an_effect", "message": "x"}]},
            }
        }
    )
    dry_run.get_by_role("textbox", name="Fakes (JSON)", exact=True).fill(
        '{"lookup":[{"output":{"a":1}}]}'
    )
    dry_run.get_by_role("button", name="Start dry run", exact=True).click()
    lookup = dry_run.get_by_role("button", name="Answers for lookup", exact=True)
    expect(lookup).to_have_attribute("aria-expanded", "true")
    expect(dry_run.get_by_text("x", exact=False).first).to_be_visible()
    assert csp == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-eba3df1e")
def test_validate_makes_the_panels_read_the_document(page: Page) -> None:
    test_run, _dry, _posts, _refuse, csp = open_flow(page, [canonical(ONE), canonical(FIELDS)])
    expect(test_run.get_by_role("textbox", name="Vendor name (required)", exact=True)).to_be_visible()
    expect(test_run.get_by_role("textbox", name="Amount (required)", exact=True)).to_have_count(0)
    page.get_by_role("button", name="Validate", exact=True).click()
    expect(test_run.get_by_role("textbox", name="Amount (required)", exact=True)).to_be_visible()
    assert csp == []
    page2 = page.context.new_page()
    test_run2, dry_run2, _p, _r, csp2 = open_flow(page2, [canonical(ODD)])
    for region in (test_run2, dry_run2):
        expect(region.get_by_text(CANNOT_SHOW, exact=True)).to_have_count(1)
        expect(region.get_by_role("group", name="Inputs", exact=True)).to_have_count(0)
    assert csp2 == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-41245171")
@pytest.mark.parametrize("width,height", [(1366, 860), (1024, 860), (390, 800)])
def test_the_panels_fit_the_screen(page: Page, width: int, height: int) -> None:
    test_run, dry_run, _posts, _refuse, csp = open_flow(page, [canonical(FIELDS)], width, height)
    group = test_run.get_by_role("group", name="Inputs", exact=True)
    expect(group).to_be_visible()
    first = box(group.get_by_role("textbox").nth(0))
    second = box(group.get_by_role("textbox").nth(1))
    outer = box(group)
    if width == 1024:
        assert abs(first["y"] - second["y"]) <= 1
        assert second["x"] > first["x"]
        assert outer["height"] <= 160
    else:
        assert second["y"] > first["y"]
        assert abs(first["x"] - second["x"]) <= 1
        assert outer["height"] <= 260
    for region in (test_run, dry_run):
        region.get_by_role("button", name="Answers for pay", exact=True).click()
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    assert_accessible(page)
    assert csp == []
