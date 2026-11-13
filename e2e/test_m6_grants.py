"""The M6 closing journey: carol approves and grants, alice's dry run is denied, then reads and stubs."""

import json
import re

import pytest
from playwright.sync_api import Browser, Page, expect

from conftest import assert_accessible, login

DEMO_GRANTS = "\n".join(
    [
        'ursitoare: "0.1"',
        "flow: demo-grants",
        "version: 1.0.0",
        "inputs:",
        "  type: object",
        "  properties: { vendor_name: { type: string }, amount: { type: number } }",
        "  required: [vendor_name, amount]",
        "start: lookup",
        "nodes:",
        '  lookup: { kind: block, uses: acme.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: pay }',
        "  pay:",
        "    kind: block",
        "    uses: acme.create_payment@1",
        '    with: { vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ inputs.amount }}", currency: EUR, reference: demo }',
        "    next: done",
        '  done: { kind: end, status: completed, output: { payment_id: "${{ nodes.pay.output.payment_id }}" } }',
        "",
    ]
)
INPUT_TEXT = json.dumps({"vendor_name": "Acme GmbH", "amount": 12.5}, separators=(",", ":"))
FAKES_TEXT = json.dumps(
    {"pay": [{"output": {"payment_id": "P-1", "status": "created"}}]}, separators=(",", ":")
)
LINK_NAME = re.compile(r"^Open run [A-Za-z0-9_-]+$")
PARAGRAPH = (
    "Read steps call the real tools through the broker. Write, send and pay steps are checked "
    "by policy but answered by your fakes, one list per step."
)
EXAMPLE = '{"pay": [{"output": {"payment_id": "P-1", "status": "created"}}]}'
LOOKUP_TEXT = "lookup · allow · POST tools.fake.test/blocks/erp.lookup_vendor@1"
PAY_TEXT = "pay · allow · stubbed · POST tools.fake.test/blocks/erp.create_payment@1"
DENIED_TEXT = 'INTERPRETER_TOOL_DENIED: tool call of "lookup" is not permitted (policy) (at lookup)'


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


@pytest.mark.milestone("M6")
@pytest.mark.l4("C-02d224b2")
def test_alice_is_denied_then_reads_and_stubs(
    page: Page,
    browser: Browser,
    base_url: str,
    fresh_state: None,
    users: dict[str, dict[str, str]],
) -> None:
    # 1. carol approves the seeded server
    login(page, users["carol"])
    page.get_by_role("link", name="Tool servers", exact=True).click()
    row = page.get_by_role("table", name="Tool servers", exact=True).get_by_role("row")
    expect(row.filter(has_text="acme · https://tools.fake.test · pending")).to_be_visible()
    page.get_by_role("link", name="acme", exact=True).click()
    tools = page.get_by_role("table", name="Tools", exact=True)
    for name in ("lookup_vendor", "create_payment"):
        expect(tools.get_by_role("row").filter(has_text=name)).to_contain_text(
            f"POST /blocks/erp.{name}@1"
        )
        expect(tools.get_by_role("row").filter(has_text=name)).to_contain_text("trusted")
    region = page.get_by_role("region", name="Surface", exact=True)
    region.get_by_role("button", name="Approve surface", exact=True).click()
    dialog = page.get_by_role("dialog", name=re.compile(r"^Approve surface [0-9a-f]{12}\?$"))
    dialog.get_by_role("button", name="Approve surface", exact=True).click()
    expect(page.get_by_role("status").filter(has_text="Surface approved.")).to_be_visible()
    expect(tools).to_contain_text("acme.lookup_vendor@1")
    expect(tools).to_contain_text("acme.create_payment@1")
    assert_accessible(page)

    context = browser.new_context(base_url=base_url)
    try:
        alice = context.new_page()

        # 2. alice saves and validates demo-grants, then dry-runs it
        login(alice, users["alice"])
        alice.get_by_role("link", name="Flows", exact=True).click()
        alice.get_by_label("Flow name", exact=True).fill("demo-grants")
        alice.get_by_label("Owner team", exact=True).fill("finance")
        alice.get_by_role("button", name="Create flow", exact=True).click()
        expect(alice).to_have_title("Flow demo-grants · Ursitoare")
        alice.get_by_role("textbox", name="Flow text", exact=True).fill(DEMO_GRANTS)
        alice.get_by_role("button", name="Save version", exact=True).click()
        alice.get_by_role("button", name="Validate", exact=True).click()
        expect(alice.get_by_role("region", name="Diagnostics", exact=True)).to_contain_text(
            "Valid. 0 errors, 0 warnings. Layers run: L1, L2, L3."
        )
        panel = alice.get_by_role("region", name="Dry run", exact=True)
        expect(panel).to_contain_text(PARAGRAPH)
        expect(panel.locator("code")).to_have_text(EXAMPLE)
        run1 = _dry_run(alice)
        assert_accessible(alice)

        # 3. the first run is denied: no grant yet
        _open_run(alice, run1, "failed")
        expect(alice.get_by_text(DENIED_TEXT)).to_be_visible()
        decisions = alice.get_by_role("list", name="Policy decisions", exact=True)
        expect(decisions.get_by_role("listitem")).to_have_count(1)
        expect(decisions.get_by_role("listitem")).to_contain_text("lookup · deny")
        expect(decisions.get_by_role("listitem")).to_contain_text("Reasons")
        expect(decisions.get_by_role("listitem")).to_contain_text(
            "No grant or policy allows this call."
        )
        assert_accessible(alice)

        # 4. carol grants both tools
        page.get_by_role("link", name="Grants", exact=True).click()
        expect(page.get_by_text("Grant changes take effect when you deploy the policy.")).to_be_visible()
        page.get_by_label("Role or user", exact=True).fill("author")
        page.get_by_label("Tool", exact=True).select_option(label="acme.lookup_vendor@1")
        page.get_by_role("button", name="Create grant", exact=True).click()
        expect(page.get_by_text("Grant created.", exact=True)).to_be_visible()
        page.get_by_label("Role or user", exact=True).fill("author")
        page.get_by_label("Tool", exact=True).select_option(label="acme.create_payment@1")
        page.get_by_role("radio", name="One step", exact=True).check()
        page.get_by_label("Flow", exact=True).fill("demo-grants")
        page.get_by_label("Step", exact=True).fill("pay")
        page.get_by_role("button", name="Create grant", exact=True).click()
        grants = page.get_by_role("table", name="Grants", exact=True)
        expect(
            grants.get_by_role("row").filter(
                has_text="role author · acme.lookup_vendor@1 · any step · active"
            )
        ).to_be_visible()
        expect(
            grants.get_by_role("row").filter(
                has_text="role author · acme.create_payment@1 · demo-grants / pay · active"
            )
        ).to_be_visible()
        assert_accessible(page)

        # 5. carol deploys
        page.get_by_role("link", name="Policies", exact=True).click()
        expect(page.get_by_text("2 grant changes are not deployed.", exact=True)).to_be_visible()
        page.get_by_role("button", name="Deploy", exact=True).click()
        expect(page.get_by_role("status").filter(has_text=re.compile(r"^Deployed version [0-9a-f]{12}\.$"))).to_be_visible()
        expect(page.get_by_text("All grant changes are deployed.", exact=True)).to_be_visible()
        assert_accessible(page)

        # 6. alice dry-runs again: lookup reads, pay is stubbed
        alice.get_by_role("link", name="Flows", exact=True).click()
        alice.get_by_role("link", name="demo-grants", exact=True).click()
        run2 = _dry_run(alice)
        _open_run(alice, run2, "completed")
        steps = alice.get_by_role("list", name="Steps", exact=True)
        expect(steps.get_by_role("button")).to_have_text(["lookup", "pay", "done"])
        steps.get_by_role("button", name="lookup", exact=True).click()
        expect(alice.get_by_role("region", name="Output", exact=True)).to_contain_text(
            '"vendor_id": "V-ACME"'
        )
        steps.get_by_role("button", name="pay", exact=True).click()
        expect(alice.get_by_role("region", name="Output", exact=True)).to_contain_text(
            '"payment_id": "P-1"'
        )
        steps.get_by_role("button", name="done", exact=True).click()
        details = alice.get_by_role("region", name="Step details", exact=True)
        taint = details.get_by_role("term").filter(has_text="Taint")
        expect(taint).to_have_count(1)
        expect(details.locator("dt:has-text('Taint') + dd")).to_have_text("none")

        # 7. the decisions of the second run
        items = alice.get_by_role("list", name="Policy decisions", exact=True).get_by_role("listitem")
        expect(items).to_have_count(2)
        expect(items.nth(0)).to_contain_text(LOOKUP_TEXT)
        expect(items.nth(0)).not_to_contain_text("stubbed")
        expect(items.nth(1)).to_contain_text(PAY_TEXT)
        assert_accessible(alice)

        # 8. a hostile decisions answer is confined to its section
        alice.route(
            re.compile(rf"/api/v1/runs/{re.escape(run2)}/decisions(\?|$)"),
            lambda route: route.fulfill(
                status=200,
                content_type="application/json",
                body='{"items":[{"decisionId":5}],"next_cursor":null}',
            ),
        )
        alice.reload()
        expect(alice.get_by_role("status", name="Run state", exact=True)).to_have_text(
            "State: completed", timeout=20000
        )
        expect(alice.get_by_role("list", name="Steps", exact=True).get_by_role("button")).to_have_text(
            ["lookup", "pay", "done"]
        )
        expect(alice.get_by_text("Policy decisions could not be read.", exact=True)).to_be_visible()
        expect(alice.get_by_role("list", name="Policy decisions", exact=True)).to_have_count(0)
        expect(alice.get_by_role("alert")).to_have_count(0)
        assert_accessible(alice)
    finally:
        context.close()
