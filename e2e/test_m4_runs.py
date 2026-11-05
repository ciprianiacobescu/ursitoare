"""The M4 closing journey: test-run a flow, follow the run on the timeline, and a team reader."""

import json
import os
import re
import urllib.request

import pytest
from playwright.sync_api import Browser, Page, expect

from conftest import assert_accessible, login

DEMO_PAY = "\n".join(
    [
        'ursitoare: "0.1"',
        "flow: demo-pay",
        "version: 1.0.0",
        "inputs:",
        "  type: object",
        "  properties:",
        "    vendor_name: { type: string }",
        "    amount: { type: number }",
        "  required: [vendor_name, amount]",
        "start: lookup",
        "nodes:",
        '  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: route }',
        '  route: { kind: switch, on: "${{ nodes.lookup.output.status }}", cases: { active: pay }, default: blocked }',
        "  pay:",
        "    kind: block",
        "    uses: erp.create_payment@1",
        '    with: { vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ inputs.amount }}", currency: EUR, reference: demo }',
        "    next: done",
        '  done: { kind: end, status: completed, output: { payment_id: "${{ nodes.pay.output.payment_id }}" } }',
        "  blocked: { kind: end, status: failed }",
        "",
    ]
)
INPUT = {"vendor_name": "ACME", "amount": 12.5}
MOCKS = {
    "lookup": [{"output": {"vendor_id": "V-1", "status": "active"}}],
    "pay": [{"output": {"payment_id": "P-1", "status": "created"}}],
}
INPUT_TEXT = json.dumps(INPUT, separators=(",", ":"))
MOCKS_TEXT = json.dumps(MOCKS, separators=(",", ":"))
STEP_NAMES = ["lookup", "route", "pay", "done"]
LINK_NAME = re.compile(r"^Open run [A-Za-z0-9_-]+$")


def _control_url() -> str:
    return os.environ.get("E2E_CONTROL_URL", "http://127.0.0.1:39081")


def _fault_request(method: str, body: dict | None = None) -> None:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(
        f"{_control_url()}/faults",
        data=data,
        method=method,
        headers={"Content-Type": "application/json"} if data is not None else {},
    )
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(request, timeout=60) as response:
        assert response.status == 204


def _create_flow(page: Page, name: str) -> None:
    page.get_by_role("link", name="Flows", exact=True).click()
    page.get_by_label("Flow name", exact=True).fill(name)
    page.get_by_label("Owner team", exact=True).fill("finance")
    page.get_by_role("button", name="Create flow", exact=True).click()
    expect(page).to_have_title(f"Flow {name} · Ursitoare")


def _start_run(page: Page) -> str:
    """Create demo-pay, save and validate it, start a test run; return the run id."""
    _create_flow(page, "demo-pay")
    panel = page.get_by_role("region", name="Test run", exact=True)
    expect(panel).to_contain_text("Save and validate a version to test-run it.")
    expect(panel.get_by_role("button", name="Start test run", exact=True)).to_have_count(0)

    page.get_by_role("textbox", name="Flow text", exact=True).fill(DEMO_PAY)
    page.get_by_role("button", name="Save version", exact=True).click()
    page.get_by_role("button", name="Validate", exact=True).click()
    expect(page.get_by_role("region", name="Diagnostics", exact=True)).to_contain_text("Valid. 0 errors")

    panel.get_by_role("textbox", name="Input (JSON)", exact=True).fill(INPUT_TEXT)
    panel.get_by_role("textbox", name="Mocks (JSON)", exact=True).fill(MOCKS_TEXT)
    panel.get_by_role("button", name="Start test run", exact=True).click()

    link = panel.get_by_role("link")
    expect(link).to_have_count(1)
    name = link.get_attribute("aria-label") or link.inner_text()
    assert LINK_NAME.match(name), name
    run_id = name.removeprefix("Open run ")
    expect(panel.get_by_role("status")).to_have_text(f"Started test run {run_id}.")
    expect(panel.get_by_role("link", name=f"Open run {run_id}", exact=True)).to_have_count(1)
    return run_id


@pytest.mark.milestone("M4")
@pytest.mark.l4("C-4ef9cb9c")
def test_c_4ef9cb9c_alice_test_runs_a_flow_and_follows_the_run(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["alice"])
    assert_accessible(page)
    page.get_by_role("link", name="Flows", exact=True).click()
    assert_accessible(page)
    run_id = _start_run(page)
    assert_accessible(page)

    page.get_by_role("link", name=f"Open run {run_id}", exact=True).click()
    expect(page).to_have_url(re.compile(rf"/runs/{re.escape(run_id)}$"))
    expect(page).to_have_title(f"Run {run_id} · Ursitoare")
    expect(page.get_by_role("heading", name=f"Run {run_id}", exact=True)).to_be_visible()
    expect(page.get_by_role("status", name="Run state", exact=True)).to_have_text(
        "State: completed", timeout=20000
    )
    steps = page.get_by_role("list", name="Steps", exact=True)
    expect(steps.get_by_role("button")).to_have_text(STEP_NAMES)

    pay = steps.get_by_role("button", name="pay", exact=True)
    pay.click()
    expect(pay).to_have_attribute("aria-expanded", "true")
    details = page.get_by_role("region", name="Step details", exact=True)
    expect(details).to_contain_text("block")
    expect(details).to_contain_text("completed")
    expect(details).to_contain_text("Idempotency key")
    payload_in = page.get_by_role("region", name="Input", exact=True)
    for line in ('"vendor_id": "V-1"', '"amount": 12.5', '"currency": "EUR"', '"reference": "demo"'):
        expect(payload_in).to_contain_text(line)
    expect(page.get_by_role("region", name="Output", exact=True)).to_contain_text('"payment_id": "P-1"')

    steps.get_by_role("button", name="route", exact=True).click()
    expect(details).to_contain_text("active")
    assert_accessible(page)

    try:
        _fault_request("POST", {"method": "GET", "url": f"/api/v1/runs/{run_id}", "status": 503})
        page.goto(f"/runs/{run_id}")
        alert = page.get_by_role("alert")
        expect(alert).to_contain_text("Something went wrong")
        expect(alert).to_contain_text("FAULT_INJECTED")
        expect(page.get_by_role("button", name="Try again", exact=True)).to_be_visible()
        assert_accessible(page)
    finally:
        _fault_request("DELETE")
    page.get_by_role("button", name="Try again", exact=True).click()
    expect(page.get_by_role("list", name="Steps", exact=True)).to_be_visible()

    page.get_by_role("link", name="Runs", exact=True).click()
    expect(page).to_have_title("Runs · Ursitoare")
    expect(page.get_by_role("heading", name="Runs", exact=True)).to_be_visible()
    table = page.get_by_role("table", name="Runs", exact=True)
    row = table.get_by_role("row").filter(has_text="demo-pay")
    expect(row).to_contain_text("mock")
    expect(row).to_contain_text("completed")
    expect(row.get_by_role("link", name=f"Open run {run_id}", exact=True)).to_be_visible()
    assert_accessible(page)

    page.goto("/runs/ghost")
    expect(page.get_by_role("alert")).to_contain_text("NOT_FOUND")
    assert_accessible(page)


@pytest.mark.milestone("M4")
@pytest.mark.l4("C-bffa668a")
def test_c_bffa668a_bob_reads_the_run_but_cannot_start_one(
    page: Page,
    browser: Browser,
    base_url: str,
    fresh_state: None,
    users: dict[str, dict[str, str]],
) -> None:
    login(page, users["alice"])
    run_id = _start_run(page)

    context = browser.new_context(base_url=base_url)
    try:
        bob = context.new_page()
        login(bob, users["bob"])
        bob.get_by_role("link", name="Runs", exact=True).click()
        table = bob.get_by_role("table", name="Runs", exact=True)
        table.get_by_role("link", name=f"Open run {run_id}", exact=True).click()
        expect(bob.get_by_role("status", name="Run state", exact=True)).to_have_text(
            "State: completed", timeout=20000
        )
        expect(bob.get_by_role("list", name="Steps", exact=True).get_by_role("button")).to_have_text(
            STEP_NAMES
        )
        expect(bob.get_by_role("button", name="Start test run", exact=True)).to_have_count(0)
        assert_accessible(bob)

        bob.get_by_role("link", name="Flows", exact=True).click()
        bob.get_by_role("link", name="demo-pay", exact=True).click()
        panel = bob.get_by_role("region", name="Test run", exact=True)
        expect(panel).to_contain_text("Only authors can start a test run.")
        expect(panel.get_by_role("button", name="Start test run", exact=True)).to_have_count(0)
        assert_accessible(bob)
    finally:
        context.close()
