"""The M2 closing journey: the admin screens against the real engine."""

import re

import pytest
from playwright.sync_api import Browser, Page, expect

from conftest import assert_accessible, login

GROUP_TEXT = "<i>ursitoare-auditors</i>"
DISABLE_DESCRIPTION = (
    "Alice Example can no longer sign in, and open sessions stop working while the account is disabled. "
    "Enabling it again restores the sessions that have not expired."
)


def _link(page: Page, name: str):
    return page.get_by_role("link", name=name, exact=True)


@pytest.mark.milestone("M2")
@pytest.mark.l4("C-f7bbb238")
def test_c_f7bbb238_carol_maps_a_group_and_the_log_shows_it_verified(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["carol"])
    for name in ("Users", "Roles and teams", "Group mappings", "Audit log"):
        expect(_link(page, name)).to_be_visible()

    _link(page, "Group mappings").click()
    expect(page).to_have_title("Group mappings · Ursitoare")
    table = page.get_by_role("table", name="Group mappings", exact=True)
    expect(table.get_by_role("row").filter(has_text="ursitoare-authors")).to_be_visible()
    assert_accessible(page)

    page.get_by_label("Group", exact=True).fill(GROUP_TEXT)
    page.get_by_label("Grant", exact=True).select_option(label="Role: auditor")
    page.get_by_role("button", name="Map group", exact=True).click()
    row = table.get_by_role("row").filter(has_text=GROUP_TEXT)
    expect(row).to_be_visible()
    expect(row).to_contain_text("Role: auditor")
    expect(row.locator("i")).to_have_count(0)

    _link(page, "Audit log").click()
    status = page.get_by_role("region", name="Chain verification").get_by_role("status")
    expect(status).to_contain_text("Audit chain verified")
    page.get_by_label("Event type", exact=True).fill("identity.group_mapped")
    page.get_by_role("button", name="Apply filter", exact=True).click()
    events = page.get_by_role("table", name="Audit events", exact=True)
    expect(events.get_by_role("row").filter(has_text="ursitoare-auditors")).to_be_visible()
    assert_accessible(page)


@pytest.mark.milestone("M2")
@pytest.mark.l4("C-652f54b7")
def test_c_652f54b7_alice_sees_a_403_page_with_the_decision_id(
    page: Page,
    browser: Browser,
    base_url: str,
    fresh_state: None,
    users: dict[str, dict[str, str]],
) -> None:
    login(page, users["alice"])
    page.goto("/admin/users")
    alert = page.get_by_role("alert").filter(has_text="Not allowed")
    expect(alert).to_be_visible()
    expect(alert).to_contain_text("Decision id:")
    expect(alert.get_by_role("button", name="Copy decision id", exact=True)).to_be_visible()
    expect(_link(page, "Users")).to_have_count(0)
    decision_id = alert.locator("p").filter(has_text="Decision id:").locator("code").inner_text()
    assert decision_id != ""
    assert_accessible(page)

    context = browser.new_context(base_url=base_url)
    try:
        other = context.new_page()
        login(other, users["carol"])
        _link(other, "Audit log").click()
        other.get_by_label("Event type", exact=True).fill("authz.denied")
        other.get_by_role("button", name="Apply filter", exact=True).click()
        events = other.get_by_role("table", name="Audit events", exact=True)
        expect(events.get_by_role("row").filter(has_text=decision_id)).to_be_visible()
        assert_accessible(other)
    finally:
        context.close()


@pytest.mark.milestone("M2")
@pytest.mark.l4("C-d118ea9b")
def test_c_d118ea9b_carol_disables_and_enables_alice(
    page: Page,
    browser: Browser,
    base_url: str,
    fresh_state: None,
    users: dict[str, dict[str, str]],
) -> None:
    context = browser.new_context(base_url=base_url)
    try:
        alice = context.new_page()
        login(alice, users["alice"])

        login(page, users["carol"])
        _link(page, "Users").click()
        heading = page.get_by_role("heading", name="Users", exact=True)
        table = page.get_by_role("table", name="Users", exact=True)
        own = table.get_by_role("row").filter(has_text="Carol Example")
        expect(own).to_contain_text("This is your account")
        expect(own.get_by_role("button")).to_have_count(0)
        row = table.get_by_role("row").filter(has_text="Alice Example")
        expect(row).to_contain_text("author · finance")
        assert_accessible(page)

        page.get_by_role("button", name="Disable Alice Example", exact=True).click()
        dialog = page.get_by_role("dialog")
        expect(dialog).to_contain_text(DISABLE_DESCRIPTION)
        dialog.get_by_role("button", name="Disable user", exact=True).click()
        expect(row).to_contain_text("Disabled")
        expect(heading).to_be_focused()

        alice.goto("/admin/users")
        expect(alice).to_have_url(
            re.compile(r".*/sign-in\?error=SESSION_ENDED&return_to=%2Fadmin%2Fusers$")
        )

        page.get_by_role("button", name="Enable Alice Example", exact=True).click()
        expect(row).to_contain_text("Active")
        expect(row).to_contain_text("author · finance")
        expect(heading).to_be_focused()
        assert_accessible(page)
    finally:
        context.close()


@pytest.mark.milestone("M2")
@pytest.mark.l4("C-19381fcc")
def test_c_19381fcc_carol_creates_and_deletes_a_team(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["carol"])
    _link(page, "Roles and teams").click()
    roles = page.get_by_role("table", name="Roles", exact=True)
    teams = page.get_by_role("table", name="Teams", exact=True)
    for role in ("approver", "auditor", "author", "tenant_admin"):
        expect(roles.get_by_role("row").filter(has_text=role)).to_be_visible()
    assert_accessible(page)

    page.get_by_label("Team name", exact=True).fill("ops")
    page.get_by_role("button", name="Create team", exact=True).click()
    expect(teams.get_by_role("row").filter(has_text="ops")).to_be_visible()

    page.get_by_role("button", name="Delete team ops", exact=True).click()
    page.get_by_role("dialog").get_by_role("button", name="Delete team", exact=True).click()
    expect(teams.get_by_role("row").filter(has_text="ops")).to_have_count(0)

    page.get_by_role("button", name="Delete team finance", exact=True).click()
    page.get_by_role("dialog").get_by_role("button", name="Delete team", exact=True).click()
    expect(
        page.get_by_text("This team is still the target of a group mapping. Remove that mapping first.")
    ).to_be_visible()
    expect(teams.get_by_role("row").filter(has_text="finance")).to_be_visible()
    assert_accessible(page)
