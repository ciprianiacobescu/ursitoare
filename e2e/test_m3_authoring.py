"""The M3 closing journey: author a flow from YAML, read its graph, and a reader of the team."""

import pytest
from playwright.sync_api import Browser, Page, expect

from conftest import assert_accessible, login

GRAPH_GOOD = "\n".join(
    [
        'ursitoare: "0.1"',
        "flow: demo-graph",
        "version: 1.0.0",
        "inputs:",
        "  type: object",
        "  properties:",
        "    url:",
        "      type: string",
        "    mode:",
        "      type: string",
        "  required:",
        "    - url",
        "    - mode",
        "start: fetch",
        "nodes:",
        "  fetch:",
        "    kind: block",
        "    uses: docs.fetch@1",
        "    with:",
        "      url: ${{ inputs.url }}",
        "    next: route",
        "  route:",
        "    kind: switch",
        "    on: ${{ inputs.mode }}",
        "    cases:",
        "      fast: done",
        "    default: failed",
        "  done:",
        "    kind: end",
        "    status: completed",
        "  failed:",
        "    kind: end",
        "    status: failed",
        "",
    ]
)
GRAPH_BAD = GRAPH_GOOD.replace("docs.fetch@1", "nope.missing@1")
UNSAVED = "The graph shows a saved version. Save the flow text as a version in the editor to draw it."
NODES = ["fetch", "route", "done", "failed"]


def _create_flow(page: Page, name: str) -> None:
    page.get_by_role("link", name="Flows", exact=True).click()
    page.get_by_label("Flow name", exact=True).fill(name)
    page.get_by_label("Owner team", exact=True).fill("finance")
    page.get_by_role("button", name="Create flow", exact=True).click()
    expect(page).to_have_title(f"Flow {name} · Ursitoare")


def _expect_nodes(region) -> None:
    buttons = region.get_by_role("list", name="Nodes", exact=True).get_by_role("button")
    expect(buttons).to_have_text(NODES)


@pytest.mark.milestone("M3")
@pytest.mark.l4("C-2619a93b")
def test_c_2619a93b_alice_creates_a_flow_from_yaml_and_reads_its_graph(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["alice"])
    assert_accessible(page)
    page.get_by_role("link", name="Flows", exact=True).click()
    assert_accessible(page)
    _create_flow(page, "demo-graph")

    graph = page.get_by_role("region", name="Graph", exact=True)
    expect(graph).to_contain_text(UNSAVED)

    editor = page.get_by_role("textbox", name="Flow text", exact=True)
    editor.fill(GRAPH_BAD)
    page.get_by_role("button", name="Save version", exact=True).click()
    page.get_by_role("button", name="Validate", exact=True).click()
    _expect_nodes(graph)
    expect(graph).to_contain_text("Flow graph: 4 nodes, 3 edges, 3 layers.")
    diagnostics = page.get_by_role("region", name="Diagnostics", exact=True)
    expect(diagnostics).to_contain_text("Not valid. 1 error")
    expect(
        diagnostics.get_by_role(
            "link", name="Guide for L2_UNKNOWN_BLOCK (opens in a new tab)", exact=True
        )
    ).to_be_visible()

    editor.fill(GRAPH_GOOD)
    expect(graph).to_contain_text(UNSAVED)
    expect(graph.get_by_role("list", name="Nodes", exact=True)).to_have_count(0)
    page.get_by_role("button", name="Validate", exact=True).click()
    expect(diagnostics.get_by_role("status")).to_contain_text("Valid. 0 errors")
    _expect_nodes(graph)
    expect(page.get_by_role("link", name="Open version 2", exact=True)).to_be_visible()

    route = graph.get_by_role("button", name="route", exact=True)
    route.click()
    expect(route).to_have_attribute("aria-pressed", "true")
    details = page.get_by_role("region", name="Node details", exact=True)
    expect(details).to_contain_text("switch")
    expect(details).to_contain_text("done, failed")
    expect(details).to_contain_text('{"fast":"done"}')
    expect(details).to_contain_text("${{ inputs.mode }}")

    graph.get_by_role("button", name="done", exact=True).focus()
    page.keyboard.press("Enter")
    expect(details).to_contain_text("completed")

    page.locator("svg.flow-graph-svg g.flow-graph-node").filter(has_text="fetch").first.click()
    expect(details).to_contain_text("docs.fetch@1")
    assert_accessible(page)

    page.get_by_role("link", name="Open the graph on its own page", exact=True).click()
    expect(page).to_have_title("Graph of demo-graph · Ursitoare")
    expect(page.get_by_role("heading", name="Graph of demo-graph", exact=True)).to_be_visible()
    expect(page.get_by_text("Showing version 2.")).to_be_visible()
    _expect_nodes(page)
    assert_accessible(page)

    page.get_by_role("link", name="Back to the editor", exact=True).click()
    expect(page.get_by_role("heading", name="Flow demo-graph", exact=True)).to_be_visible()

    page.goto("/flows/ghost/graph")
    expect(page.get_by_role("alert")).to_contain_text("NOT_FOUND")
    assert_accessible(page)


@pytest.mark.milestone("M3")
@pytest.mark.l4("C-68b2dc11")
def test_c_68b2dc11_bob_reads_the_graph_but_cannot_save(
    page: Page,
    browser: Browser,
    base_url: str,
    fresh_state: None,
    users: dict[str, dict[str, str]],
) -> None:
    login(page, users["alice"])
    _create_flow(page, "demo-graph")
    page.get_by_role("textbox", name="Flow text", exact=True).fill(GRAPH_GOOD)
    page.get_by_role("button", name="Save version", exact=True).click()
    expect(page.get_by_role("link", name="Open version 1", exact=True)).to_be_visible()

    context = browser.new_context(base_url=base_url)
    try:
        bob = context.new_page()
        login(bob, users["bob"])
        bob.get_by_role("link", name="Flows", exact=True).click()
        table = bob.get_by_role("table", name="Flows", exact=True)
        expect(table.get_by_role("row").filter(has_text="demo-graph")).to_be_visible()
        bob.get_by_role("link", name="demo-graph", exact=True).click()

        graph = bob.get_by_role("region", name="Graph", exact=True)
        _expect_nodes(graph)
        graph.get_by_role("button", name="route", exact=True).click()
        expect(bob.get_by_role("region", name="Node details", exact=True)).to_contain_text("switch")

        bob.get_by_role("button", name="Save version", exact=True).click()
        expect(bob.get_by_text("You are not allowed to do this.")).to_be_visible()
        expect(bob.get_by_text("Decision id:")).to_be_visible()
        assert_accessible(bob)
    finally:
        context.close()
