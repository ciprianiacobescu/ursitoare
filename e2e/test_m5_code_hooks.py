"""The M5 closing journey: a code node with hooks, and the X3 hook route into an effect node."""

import json
import re

import pytest
from playwright.sync_api import Page, expect

from conftest import assert_accessible, login

DEMO_HOOKS = "\n".join(
    [
        'ursitoare: "0.1"',
        "flow: demo-hooks",
        "version: 1.0.0",
        "inputs:",
        "  type: object",
        "  properties: { vendor_name: { type: string }, amount: { type: number } }",
        "  required: [vendor_name, amount]",
        "start: lookup",
        "nodes:",
        '  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: normalize }',
        "  normalize:",
        "    kind: code",
        "    language: js",
        '    input: { amount: "${{ inputs.amount }}", status: "${{ nodes.lookup.output.status }}" }',
        '    source: "return { amount: Math.round(input.amount * 100) / 100, route: input.status === \'active\' ? \'pay\' : \'blocked\' };"',
        "    output_schema:",
        "      type: object",
        "      properties: { amount: { type: number }, route: { type: string, enum: [pay, blocked] } }",
        "      required: [amount, route]",
        "    next: route",
        '  route: { kind: switch, on: "${{ nodes.normalize.output.route }}", cases: { pay: pay }, default: blocked }',
        "  pay:",
        "    kind: block",
        "    uses: erp.create_payment@1",
        '    with: { vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ nodes.normalize.output.amount }}", currency: EUR, reference: demo }',
        "    pre:",
        '      - { id: guard, kind: code, source: "if (ctx.input.amount > 10000) return { action: \'fail\', reason: \'over limit\' };" }',
        "    post:",
        '      - { id: notify, kind: block, uses: slack.post_message@1, with: { channel: ap, text: "paid ${{ hook.output.payment_id }}" }, on_error: continue }',
        "    next: done",
        '  done: { kind: end, status: completed, output: { payment_id: "${{ nodes.pay.output.payment_id }}" } }',
        "  blocked: { kind: end, status: failed }",
        "",
    ]
)
DEMO_X3 = "\n".join(
    [
        'ursitoare: "0.1"',
        "flow: demo-x3",
        "version: 1.0.0",
        "inputs:",
        "  type: object",
        "  properties: { vendor_name: { type: string }, amount: { type: number } }",
        "  required: [vendor_name, amount]",
        "start: lookup",
        "hooks:",
        '  - { id: audit, match: { kind: [code] }, post: { kind: code, source: "return;" } }',
        "nodes:",
        '  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: classify }',
        "  classify:",
        "    kind: code",
        "    language: js",
        '    input: { amount: "${{ inputs.amount }}" }',
        '    source: "return { amount: input.amount };"',
        "    output_schema:",
        "      type: object",
        "      properties: { amount: { type: number } }",
        "      required: [amount]",
        "    post:",
        '      - { id: rush, kind: code, routes: [pay], source: "return { action: \'redirect\', to: \'pay\' };" }',
        "    next: review",
        "  review:",
        "    kind: code",
        "    language: js",
        '    input: { amount: "${{ nodes.classify.output.amount }}" }',
        '    source: "return { approved: input.amount < 10000 };"',
        "    output_schema:",
        "      type: object",
        "      properties: { approved: { type: boolean } }",
        "      required: [approved]",
        "    next: pay",
        "  pay:",
        "    kind: block",
        "    uses: erp.create_payment@1",
        '    with: { vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ nodes.classify.output.amount }}", currency: EUR, reference: demo }',
        "    next: done",
        '  done: { kind: end, status: completed, output: { payment_id: "${{ nodes.pay.output.payment_id }}" } }',
        "",
    ]
)
INPUT = {"vendor_name": "ACME", "amount": 12.5}
MOCKS_HOOKS = {
    "lookup": [{"output": {"vendor_id": "V-1", "status": "active"}}],
    "pay": [{"output": {"payment_id": "P-1", "status": "created"}}],
    "pay:post:notify": [{"output": {"ts": "1"}}],
}
INPUT_TEXT = json.dumps(INPUT, separators=(",", ":"))
MOCKS_TEXT = json.dumps(MOCKS_HOOKS, separators=(",", ":"))
STEP_NAMES = ["lookup", "normalize", "route", "pay", "done"]
LINK_NAME = re.compile(r"^Open run [A-Za-z0-9_-]+$")
NOTE = "This step's hook trace could not be read."
RULES_NOTE = "Flow rules are listed, not drawn: the graph cannot tell which nodes they match."


def _create_flow(page: Page, name: str) -> None:
    page.get_by_role("link", name="Flows", exact=True).click()
    page.get_by_label("Flow name", exact=True).fill(name)
    page.get_by_label("Owner team", exact=True).fill("finance")
    page.get_by_role("button", name="Create flow", exact=True).click()
    expect(page).to_have_title(f"Flow {name} · Ursitoare")


def _save_and_validate(page: Page, text: str) -> None:
    page.get_by_role("textbox", name="Flow text", exact=True).fill(text)
    page.get_by_role("button", name="Save version", exact=True).click()
    page.get_by_role("button", name="Validate", exact=True).click()


def _run_id(link) -> str:
    name = link.get_attribute("aria-label") or link.inner_text()
    assert LINK_NAME.match(name), name
    return name.removeprefix("Open run ")


def _select_step(page: Page, name: str) -> None:
    page.get_by_role("list", name="Steps", exact=True).get_by_role(
        "button", name=name, exact=True
    ).click()


@pytest.mark.milestone("M5")
@pytest.mark.l4("C-25335f88")
def test_c_25335f88_alice_validates_test_runs_and_reads_demo_hooks(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["alice"])
    assert_accessible(page)
    page.get_by_role("link", name="Flows", exact=True).click()
    assert_accessible(page)
    _create_flow(page, "demo-hooks")
    _save_and_validate(page, DEMO_HOOKS)

    diagnostics = page.get_by_role("region", name="Diagnostics", exact=True)
    expect(diagnostics.get_by_role("status")).to_contain_text(
        "Valid. 0 errors, 0 warnings. Layers run: L1, L2, L3, H."
    )

    graph = page.get_by_role("region", name="Graph", exact=True)
    expect(graph).to_contain_text("Flow graph: 6 nodes, 5 edges, 5 layers.")
    hooks = graph.get_by_role("list", name="Hooks", exact=True)
    expect(hooks.get_by_role("listitem")).to_have_count(1)
    expect(hooks).to_contain_text("pay: pre guard; post notify")
    expect(graph.get_by_role("list", name="Hook routes", exact=True)).to_have_count(0)
    expect(graph.get_by_role("list", name="Flow rules", exact=True)).to_have_count(0)
    assert_accessible(page)

    panel = page.get_by_role("region", name="Test run", exact=True)
    panel.get_by_role("textbox", name="Input (JSON)", exact=True).fill(INPUT_TEXT)
    panel.get_by_role("textbox", name="Mocks (JSON)", exact=True).fill(MOCKS_TEXT)
    panel.get_by_role("button", name="Start test run", exact=True).click()
    link = panel.get_by_role("link")
    expect(link).to_have_count(1)
    run_id = _run_id(link)
    link.click()

    expect(page).to_have_url(re.compile(rf"/runs/{re.escape(run_id)}$"))
    expect(page.get_by_role("status", name="Run state", exact=True)).to_have_text(
        "State: completed", timeout=20000
    )
    steps = page.get_by_role("list", name="Steps", exact=True)
    expect(steps.get_by_role("button")).to_have_text(STEP_NAMES)
    assert_accessible(page)

    _select_step(page, "normalize")
    details = page.get_by_role("region", name="Step details", exact=True)
    expect(details).to_contain_text("code")
    expect(details).to_contain_text("completed")
    expect(details).to_contain_text("Attempt")
    payload_in = page.get_by_role("region", name="Input", exact=True)
    expect(payload_in).to_contain_text('"amount": 12.5')
    expect(payload_in).to_contain_text('"status": "active"')
    expect(page.get_by_role("region", name="Output", exact=True)).to_contain_text(
        '"route": "pay"'
    )
    expect(page.get_by_role("region", name="Hooks", exact=True)).to_have_count(0)

    _select_step(page, "pay")
    pay_hooks = page.get_by_role("region", name="Hooks", exact=True)
    pay_list = pay_hooks.get_by_role("list", name="Hooks", exact=True)
    expect(pay_list.get_by_role("listitem")).to_have_count(2)
    expect(pay_list.get_by_role("listitem").nth(0)).to_contain_text(
        "pre:guard · code (fused) · completed · continue"
    )
    expect(pay_list.get_by_role("listitem").nth(1)).to_contain_text(
        "post:notify · block · completed"
    )
    assert_accessible(page)

    def rewrite_steps(route) -> None:
        response = route.fetch()
        body = response.json()
        for item in body["items"]:
            if item.get("nodeId") == "normalize":
                item["hooks"] = None
        route.fulfill(response=response, json=body)

    page.route(
        re.compile(rf"/api/v1/runs/{re.escape(run_id)}/steps(\?|$)"), rewrite_steps
    )
    page.goto(f"/runs/{run_id}")
    expect(page.get_by_role("list", name="Steps", exact=True)).to_be_visible()
    expect(page.get_by_role("list", name="Steps", exact=True).get_by_role("button")).to_have_text(
        STEP_NAMES
    )

    _select_step(page, "normalize")
    hooks = page.get_by_role("region", name="Hooks", exact=True)
    expect(hooks).to_contain_text(NOTE)
    expect(page.get_by_role("alert")).to_have_count(0)
    expect(hooks.get_by_role("list", name="Hooks", exact=True)).to_have_count(0)
    expect(page.get_by_role("region", name="Step details", exact=True)).to_contain_text("code")
    expect(page.get_by_role("region", name="Step details", exact=True)).to_contain_text(
        "completed"
    )
    assert_accessible(page)

    _select_step(page, "pay")
    hooks = page.get_by_role("region", name="Hooks", exact=True)
    pay_list = hooks.get_by_role("list", name="Hooks", exact=True)
    expect(pay_list.get_by_role("listitem")).to_have_count(2)
    expect(pay_list.get_by_role("listitem").nth(0)).to_contain_text(
        "pre:guard · code (fused) · completed · continue"
    )
    expect(pay_list.get_by_role("listitem").nth(1)).to_contain_text(
        "post:notify · block · completed"
    )
    expect(hooks.get_by_text(NOTE, exact=True)).to_have_count(0)
    assert_accessible(page)


@pytest.mark.milestone("M5")
@pytest.mark.l4("C-6d33a627")
def test_c_6d33a627_alice_meets_the_x3_rejection(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["alice"])
    assert_accessible(page)
    page.get_by_role("link", name="Flows", exact=True).click()
    assert_accessible(page)
    _create_flow(page, "demo-x3")
    _save_and_validate(page, DEMO_X3)

    diagnostics = page.get_by_role("region", name="Diagnostics", exact=True)
    expect(diagnostics.get_by_role("status")).to_contain_text(
        "Not valid. 1 error, 0 warnings. Layers run: L1, L2, L3, H."
    )
    issues = diagnostics.get_by_role("list", name="Issues", exact=True)
    expect(issues.get_by_role("listitem")).to_have_count(1)
    issue = issues.get_by_role("listitem").first
    expect(issue).to_contain_text("H_ROUTE_EFFECT")
    expect(issue).to_contain_text("Node classify · /nodes/classify/post/0/routes/0")
    guide = issue.get_by_role(
        "link", name="Guide for H_ROUTE_EFFECT (opens in a new tab)", exact=True
    )
    expect(guide).to_have_attribute(
        "href", re.compile(r"docs/authoring/diagnostics\.md#h_route_effect$")
    )

    panel = page.get_by_role("region", name="Test run", exact=True)
    expect(panel).to_contain_text("Save and validate a version to test-run it.")
    expect(panel.get_by_role("button", name="Start test run", exact=True)).to_have_count(0)

    graph = page.get_by_role("region", name="Graph", exact=True)
    routes = graph.get_by_role("list", name="Hook routes", exact=True)
    expect(routes.get_by_role("listitem")).to_have_count(1)
    expect(routes).to_contain_text("hook rush: classify may route to pay")
    rules = graph.get_by_role("list", name="Flow rules", exact=True)
    expect(rules.get_by_role("listitem")).to_have_count(1)
    expect(rules).to_contain_text("audit: match kind code; pre none; post rule.audit")
    expect(graph.get_by_text(RULES_NOTE, exact=True)).to_be_visible()

    paths = graph.locator("svg.flow-graph-svg path.hook-route")
    expect(paths).to_have_count(1)
    expect(paths).to_have_attribute("d", "M 112 168 L 112 328")
    dash = paths.evaluate("(element) => getComputedStyle(element).strokeDasharray")
    assert dash != "none", dash
    assert_accessible(page)
