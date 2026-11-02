"""The M3 flow editor journey: create, edit, save and validate against the real engine."""

import pytest
from playwright.sync_api import Page, expect

from conftest import assert_accessible, login

GOOD = "\n".join(
    [
        'ursitoare: "0.1"',
        "flow: demo-intake",
        "version: 1.0.0",
        "inputs:",
        "  type: object",
        "  properties:",
        "    url:",
        "      type: string",
        "  required: [url]",
        "start: fetch",
        "nodes:",
        "  fetch:",
        "    kind: block",
        "    uses: docs.fetch@1",
        "    with:",
        "      url: ${{ inputs.url }}",
        "    next: done",
        "  done:",
        "    kind: end",
        "    status: completed",
        "",
    ]
)
BAD = GOOD.replace("docs.fetch@1", "nope.missing@1")


@pytest.mark.milestone("M3")
@pytest.mark.l4("C-086f1719")
def test_c_086f1719_alice_creates_edits_saves_and_validates(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    console: list[str] = []
    page.on("console", lambda message: console.append(message.text))

    login(page, users["alice"])
    page.get_by_role("link", name="Flows", exact=True).click()
    expect(page).to_have_title("Flows · Ursitoare")
    assert_accessible(page)

    page.get_by_label("Flow name", exact=True).fill("demo-intake")
    page.get_by_label("Owner team", exact=True).fill("finance")
    page.get_by_role("button", name="Create flow", exact=True).click()
    expect(page).to_have_title("Flow demo-intake · Ursitoare")

    editor = page.get_by_role("textbox", name="Flow text", exact=True)
    editor.fill(BAD)
    page.get_by_role("button", name="Save version", exact=True).click()
    page.get_by_role("button", name="Validate", exact=True).click()

    region = page.get_by_role("region", name="Diagnostics", exact=True)
    expect(region.get_by_role("status")).to_contain_text("Not valid. 1 error")
    link = region.get_by_role(
        "link", name="Guide for L2_UNKNOWN_BLOCK (opens in a new tab)", exact=True
    )
    expect(link).to_have_attribute("href", __import__("re").compile(r"docs/authoring/diagnostics\.md#l2_unknown_block$"))
    expect(page.locator(".cm-lintRange-error").first).to_be_visible()
    expect(page.locator(".cm-scroller").first).to_have_css("overflow-x", "auto")
    assert_accessible(page)

    editor.fill(GOOD)
    page.get_by_role("button", name="Validate", exact=True).click()
    expect(region.get_by_role("status")).to_contain_text("Valid. 0 errors")

    editor.focus()
    page.keyboard.press("Tab")
    expect(page.get_by_role("button", name="Save version", exact=True)).to_be_focused()

    assert not [text for text in console if "Content Security Policy" in text]
