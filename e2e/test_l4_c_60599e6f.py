# l4: generated test (l4/generated-test@1); rewritten by the harness
import os
import pytest
from playwright.sync_api import Page, expect


@pytest.mark.l4("C-60599e6f")
def test_shell_landmarks_keyboard_and_csp(page: Page) -> None:
    base_url = os.environ["L4_E2E_BASE_URL"].rstrip("/")
    console_messages: list[str] = []
    page_errors: list[str] = []

    page.on("console", lambda msg: console_messages.append(msg.text))
    page.on("pageerror", lambda exc: page_errors.append(str(exc)))

    page.goto(f"{base_url}/")

    banner = page.get_by_role("banner")
    nav = page.get_by_role("navigation", name="Main")
    main = page.get_by_role("main")
    contentinfo = page.get_by_role("contentinfo")
    heading = page.get_by_role("heading", name="Ursitoare")

    expect(banner).to_be_visible()
    expect(nav).to_be_visible()
    expect(main).to_be_visible()
    expect(contentinfo).to_be_visible()
    expect(heading).to_be_visible()
    expect(nav.get_by_role("link", name="Home")).to_be_visible()

    page.keyboard.press("Tab")

    skip_link = page.get_by_role("link", name="Skip to content")
    expect(skip_link).to_be_focused()
    expect(skip_link).to_be_in_viewport()
    expect(skip_link).not_to_have_css("outline-style", "none")

    page.keyboard.press("Enter")
    expect(main).to_be_focused()

    assert not any(
        "Content Security Policy" in message for message in console_messages
    ), f"Console mentioned Content Security Policy: {console_messages}"
    assert page_errors == [], f"Unexpected page errors: {page_errors}"
