"""The M7 closing journey: carol registers three tool servers, alice's dry run reads, runs and stubs."""

import json
import re

import pytest
from playwright.sync_api import Browser, Page, expect

from conftest import assert_accessible, assert_layout, login, watch_csp

DEMO_TOOLS = "\n".join(
    [
        'ursitoare: "0.1"',
        "flow: demo-tools",
        "version: 1.0.0",
        "inputs:",
        "  type: object",
        "  properties: { vendor_name: { type: string }, vendor_id: { type: string }, amount: { type: number } }",
        "  required: [vendor_name, vendor_id, amount]",
        "start: find",
        "nodes:",
        '  find: { kind: block, uses: crm.find_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: score }',
        '  score: { kind: block, uses: calc.risk_score@1, with: { amount: "${{ inputs.amount }}" }, next: pay }',
        "  pay:",
        "    kind: block",
        "    uses: ledger.create_payment@1",
        '    with: { vendor_id: "${{ inputs.vendor_id }}", amount: "${{ inputs.amount }}", currency: EUR, reference: demo }',
        "    next: done",
        '  done: { kind: end, status: completed, output: { status: "${{ nodes.find.output.status }}", band: "${{ nodes.score.output.band }}", payment_id: "${{ nodes.pay.output.payment_id }}" } }',
        "",
    ]
)
INPUT_TEXT = json.dumps(
    {"vendor_name": "Acme GmbH", "vendor_id": "V-ACME", "amount": 12.5}, separators=(",", ":")
)
FAKES_TEXT = json.dumps(
    {"pay": [{"output": {"payment_id": "P-7", "status": "created"}}]}, separators=(",", ":")
)
LINK_NAME = re.compile(r"^Open run [A-Za-z0-9_-]+$")

CALC_IN = json.dumps(
    {
        "type": "object",
        "properties": {"amount": {"type": "number"}},
        "required": ["amount"],
        "additionalProperties": False,
    },
    separators=(",", ":"),
)
CALC_OUT = json.dumps(
    {
        "type": "object",
        "properties": {"band": {"type": "string"}},
        "required": ["band"],
        "additionalProperties": False,
    },
    separators=(",", ":"),
)
SRC = 'return { band: input.amount > 1000 ? "high" : "low" };'

PAY_IN = {
    "type": "object",
    "properties": {
        "vendor_id": {"type": "string"},
        "amount": {"type": "number"},
        "currency": {"type": "string"},
        "reference": {"type": "string"},
    },
    "required": ["vendor_id", "amount", "currency", "reference"],
}
PAY_OUT = {
    "type": "object",
    "properties": {"payment_id": {"type": "string"}, "status": {"type": "string"}},
    "required": ["payment_id", "status"],
}
LOOK_IN = {
    "type": "object",
    "properties": {"vendor_name": {"type": "string"}},
    "required": ["vendor_name"],
}
LOOK_OUT = {
    "type": "object",
    "properties": {
        "vendor_id": {"type": "string"},
        "status": {"type": "string", "enum": ["active", "blocked"]},
        "payment_terms_days": {"type": "integer"},
    },
    "required": ["vendor_id", "status"],
}


def OP(operation_id: str, code: str, req: object, res: object) -> dict[str, object]:
    return {
        "post": {
            "operationId": operation_id,
            "requestBody": {"content": {"application/json": {"schema": req}}},
            "responses": {
                code: {"description": "ok", "content": {"application/json": {"schema": res}}}
            },
        }
    }


DOC = json.dumps(
    {
        "openapi": "3.0.3",
        "paths": {
            "/blocks/erp.create_payment@1": OP("createPayment", "201", PAY_IN, PAY_OUT),
            "/blocks/erp.lookup_vendor@1": OP("lookupVendor", "200", LOOK_IN, LOOK_OUT),
        },
    },
    separators=(",", ":"),
)


def _dry_run(page: Page) -> str:
    """Start a dry run from the editor's Dry run region; return the run id."""
    panel = page.get_by_role("region", name="Dry run", exact=True)
    panel.get_by_role("textbox", name="Input (JSON)", exact=True).fill(INPUT_TEXT)
    panel.get_by_role("textbox", name="Fakes (JSON)", exact=True).fill(FAKES_TEXT)
    panel.get_by_role("button", name="Start dry run", exact=True).click()
    link = panel.get_by_role("link")
    expect(link).to_have_count(1)
    name = link.get_attribute("aria-label") or link.inner_text()
    assert LINK_NAME.match(name), name
    run_id = name.removeprefix("Open run ")
    expect(panel.get_by_role("status")).to_have_text(f"Started dry run {run_id}.")
    return run_id


def _open_run(page: Page, run_id: str, state: str) -> None:
    page.get_by_role("link", name=f"Open run {run_id}", exact=True).click()
    expect(page).to_have_url(re.compile(rf"/runs/{re.escape(run_id)}$"))
    expect(page.get_by_role("status", name="Run state", exact=True)).to_have_text(
        f"State: {state}", timeout=20000
    )


def _checked(page: Page) -> None:
    assert_layout(page)
    assert_accessible(page)


def _cell(page: Page, tool: str, index: int):
    """The index-th cell (0 Call, 1 Effect, 2 Retry, 3 Result, 4 Server hints) of a tool's row in Calls."""
    calls = page.get_by_role("table", name="Calls", exact=True)
    return (
        calls.get_by_role("row")
        .filter(has=page.get_by_role("rowheader", name=tool, exact=True))
        .get_by_role("cell")
        .nth(index)
    )


def _approve(page: Page) -> None:
    surface = page.get_by_role("region", name="Surface", exact=True)
    surface.get_by_role("checkbox", name="I approve my own surface", exact=True).check()
    surface.get_by_role("button", name="Approve surface", exact=True).click()
    dialog = page.get_by_role("dialog", name=re.compile(r"^Approve surface [0-9a-f]{12}\?$"))
    dialog.get_by_role("button", name="Approve surface", exact=True).click()
    expect(page.get_by_role("status").filter(has_text="Surface approved.")).to_be_visible()


def _register(page: Page, kind: str) -> None:
    page.get_by_role("link", name="Register a tool server", exact=True).click()
    page.get_by_role("radio", name=kind, exact=True).check()


@pytest.mark.milestone("M7")
@pytest.mark.l4("C-eba5ac9e")
def test_carol_sets_up_three_servers_and_alice_dry_runs(
    page: Page,
    browser: Browser,
    base_url: str,
    fresh_state: None,
    users: dict[str, dict[str, str]],
) -> None:
    page.set_viewport_size({"width": 1366, "height": 860})
    csp = watch_csp(page)

    # 1. carol registers the MCP server and stores its credential
    login(page, users["carol"])
    page.get_by_role("link", name="Tool servers", exact=True).click()
    page.get_by_role("link", name="Register a tool server", exact=True).click()
    expect(page.get_by_role("radio", name="MCP server", exact=True)).to_be_checked()
    page.get_by_label("Server id", exact=True).fill("crm")
    page.get_by_label("MCP URL", exact=True).fill("https://mcp.fake.test/mcp")
    page.get_by_role("button", name="Register server", exact=True).click()
    expect(page).to_have_url(re.compile(r"\?server=crm$"))
    credential = page.get_by_role("region", name="Credential", exact=True)
    expect(credential).to_contain_text("No credential stored.")
    page.get_by_role("radio", name="Bearer token", exact=True).check()
    page.get_by_label("Secret value", exact=True).fill("e2e-crm-key")
    page.get_by_role("button", name="Store credential", exact=True).click()
    expect(credential).to_contain_text("Credential stored (key version 1).")
    _checked(page)

    # 2. carol discovers the tools, sets find_vendor to read and approves
    section = page.get_by_role("region", name="Discovery", exact=True)
    section.get_by_role("button", name="Discover tools", exact=True).click()
    settings = page.get_by_role("table", name="Tool settings", exact=True)
    expect(settings.get_by_role("row")).to_have_count(3)
    page.get_by_role("combobox", name="Effect of find_vendor", exact=True).select_option("read")
    section.get_by_role("button", name="Discover again with these settings", exact=True).click()
    expect(section.get_by_role("status").filter(has_text="Discovered")).to_have_text(
        "Discovered 2 tools over MCP 2026-07-28."
    )
    tools = page.get_by_role("table", name="Tools", exact=True)
    expect(tools.get_by_role("row").filter(has_text="find_vendor")).to_contain_text("read")
    expect(tools.get_by_role("row").filter(has_text="log_note")).to_contain_text("write")
    expect(_cell(page, "find_vendor", 0)).to_have_text(
        "mcp find_vendor (2026-07-28)", use_inner_text=True
    )
    expect(_cell(page, "find_vendor", 1)).to_have_text("read", use_inner_text=True)
    expect(_cell(page, "find_vendor", 2)).to_have_text("unsafe to retry", use_inner_text=True)
    expect(_cell(page, "find_vendor", 4)).to_have_text("read-only", use_inner_text=True)
    changes = page.get_by_role("list", name="Changes", exact=True)
    expect(changes.get_by_role("listitem")).to_contain_text(["added find_vendor", "added log_note"])
    _checked(page)
    _approve(page)
    expect(tools).to_contain_text("crm.find_vendor@1")
    expect(tools).to_contain_text("crm.log_note@1")
    expect(page.get_by_text("No pending surface to compare.", exact=True)).to_be_visible()
    _checked(page)

    # 3. carol registers the OpenAPI server
    _register(page, "OpenAPI document")
    page.get_by_label("Server id", exact=True).fill("ledger")
    page.get_by_label("Origin", exact=True).fill("https://tools.fake.test")
    page.get_by_label("OpenAPI document (JSON)", exact=True).fill(DOC)
    page.get_by_role("button", name="Preview operations", exact=True).click()
    operations = page.get_by_role("table", name="Operations", exact=True)
    pay_row = operations.get_by_role("row").filter(has_text="createPayment")
    expect(pay_row).to_contain_text("POST")
    expect(pay_row).to_contain_text("/blocks/erp.create_payment@1")
    page.get_by_role("combobox", name="Effect of createPayment", exact=True).select_option("pay")
    page.get_by_role("combobox", name="Effect of lookupVendor", exact=True).select_option("read")
    page.get_by_role("button", name="Register server", exact=True).click()
    expect(page).to_have_url(re.compile(r"\?server=ledger$"))
    credential = page.get_by_role("region", name="Credential", exact=True)
    page.get_by_role("radio", name="API key header", exact=True).check()
    page.get_by_label("Header name", exact=True).fill("x-fake-tools-key")
    page.get_by_label("Secret value", exact=True).fill("e2e-ledger-key")
    page.get_by_role("button", name="Store credential", exact=True).click()
    expect(credential).to_contain_text("Credential stored (key version 1).")
    expect(_cell(page, "create_payment", 0)).to_have_text(
        "POST /blocks/erp.create_payment@1", use_inner_text=True
    )
    expect(_cell(page, "create_payment", 1)).to_have_text("pay", use_inner_text=True)
    expect(_cell(page, "create_payment", 2)).to_have_text("unsafe to retry", use_inner_text=True)
    _checked(page)
    _approve(page)
    expect(page.get_by_role("table", name="Tools", exact=True)).to_contain_text(
        "ledger.create_payment@1"
    )
    _checked(page)

    # 4. carol registers the code block, approves it and grants three tools
    _register(page, "Code block")
    page.get_by_label("Server id", exact=True).fill("calc")
    page.get_by_label("Tool name", exact=True).fill("risk_score")
    page.get_by_label("Input schema (JSON)", exact=True).fill(CALC_IN)
    page.get_by_label("Output schema (JSON)", exact=True).fill(CALC_OUT)
    page.get_by_label("Source", exact=True).fill(SRC)
    page.get_by_role("button", name="Register server", exact=True).click()
    expect(page).to_have_url(re.compile(r"\?server=calc$"))
    expect(_cell(page, "risk_score", 0)).to_have_text("code (54 characters)", use_inner_text=True)
    expect(_cell(page, "risk_score", 1)).to_have_text("read", use_inner_text=True)
    expect(_cell(page, "risk_score", 2)).to_have_text("safe to retry", use_inner_text=True)
    expect(_cell(page, "risk_score", 3)).to_have_text("trusted", use_inner_text=True)
    _checked(page)
    _approve(page)
    expect(page.get_by_role("table", name="Tools", exact=True)).to_contain_text("calc.risk_score@1")

    page.get_by_role("link", name="Grants", exact=True).click()
    granted = ("crm.find_vendor@1", "calc.risk_score@1", "ledger.create_payment@1")
    for tool in granted:
        page.get_by_label("Role or user", exact=True).fill("author")
        page.get_by_label("Tool", exact=True).select_option(label=tool)
        page.get_by_role("button", name="Create grant", exact=True).click()
        grants = page.get_by_role("table", name="Grants", exact=True)
        expect(
            grants.get_by_role("row").filter(has_text=f"role author · {tool} · any step · active")
        ).to_be_visible()
    _checked(page)

    page.get_by_role("link", name="Policies", exact=True).click()
    expect(page.get_by_text("3 grant changes are not deployed.", exact=True)).to_be_visible()
    page.get_by_role("button", name="Deploy", exact=True).click()
    expect(
        page.get_by_role("status").filter(has_text=re.compile(r"^Deployed version [0-9a-f]{12}\.$"))
    ).to_be_visible()
    expect(page.get_by_text("All grant changes are deployed.", exact=True)).to_be_visible()
    _checked(page)
    assert csp == []

    context = browser.new_context(
        base_url=base_url, viewport={"width": 1366, "height": 860}
    )
    try:
        alice = context.new_page()
        csp_alice = watch_csp(alice)

        # 5. alice validates demo-tools and dry-runs it
        login(alice, users["alice"])
        alice.get_by_role("link", name="Flows", exact=True).click()
        alice.get_by_label("Flow name", exact=True).fill("demo-tools")
        alice.get_by_label("Owner team", exact=True).fill("finance")
        alice.get_by_role("button", name="Create flow", exact=True).click()
        expect(alice).to_have_title("Flow demo-tools · Ursitoare")
        alice.get_by_role("textbox", name="Flow text", exact=True).fill(DEMO_TOOLS)
        alice.get_by_role("button", name="Save version", exact=True).click()
        alice.get_by_role("button", name="Validate", exact=True).click()
        expect(alice.get_by_role("region", name="Diagnostics", exact=True)).to_contain_text(
            "Valid. 0 errors, 1 warning. Layers run: L1, L2, L3."
        )
        _checked(alice)
        run_id = _dry_run(alice)
        _open_run(alice, run_id, "completed")

        steps = alice.get_by_role("list", name="Steps", exact=True)
        details = alice.get_by_role("region", name="Step details", exact=True)
        output = alice.get_by_role("region", name="Output", exact=True)
        expect(steps.get_by_role("button")).to_have_text(["find", "score", "pay", "done"])
        for node, shown in (
            ("find", '"vendor_id": "V-ACME"'),
            ("score", '"band": "low"'),
            ("pay", '"payment_id": "P-7"'),
        ):
            steps.get_by_role("button", name=node, exact=True).click()
            expect(details.locator("dt:has-text('Node') + dd")).to_have_text(node)
            expect(output).to_contain_text(shown)
        expect(details.locator("dt:has-text('Taint') + dd")).to_have_text("none")
        steps.get_by_role("button", name="done", exact=True).click()
        expect(details.locator("dt:has-text('Node') + dd")).to_have_text("done")
        expect(details.locator("dt:has-text('Taint') + dd")).to_have_text("untrusted")

        items = alice.get_by_role("list", name="Policy decisions", exact=True).get_by_role(
            "listitem"
        )
        expect(items).to_contain_text(
            [
                "find · allow · POST mcp.fake.test/mcp",
                "score · allow",
                "pay · allow · stubbed · POST tools.fake.test/blocks/erp.create_payment@1",
            ]
        )
        expect(items.nth(1)).not_to_contain_text("Service")
        _checked(alice)
        assert csp_alice == []
    finally:
        context.close()
