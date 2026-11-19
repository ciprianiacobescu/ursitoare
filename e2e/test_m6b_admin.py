"""The restyled admin and tool pages (M6b): mocked answers, no sign-in."""

import json
import re
from urllib.parse import parse_qs, urlparse

import pytest
from playwright.sync_api import Page, Route, expect

from conftest import assert_accessible, assert_layout, watch_csp

CSRF = "csrf_" + "a" * 38
ME = {
    "user": {"id": "user-1", "displayName": "Alice Example", "email": None},
    "tenant": {"id": "tenant-1", "name": "E2E tenant", "reviewProfile": "solo"},
    "capabilities": [
        "read_flow",
        "manage_users_roles",
        "read_audit",
        "register_tool_server",
        "deploy_policy",
    ],
    "csrfToken": CSRF,
}
CAROL = {"items": [{"userId": "u_carol", "displayName": "Carol Example", "kind": "human"}]}
INTERNAL = {"error": {"code": "INTERNAL", "message": "m"}}
FORBIDDEN = {
    "error": {"code": "FORBIDDEN", "message": "m", "details": {"decisionId": "dec_1"}}
}
DP = "sha256:" + "0123456789ab" + "c" * 52
SURF_IO = {"type": "object"}
SERVER = {
    "id": "acme",
    "adapter": "fixture",
    "origin": "https://tools.fake.test",
    "local": False,
    "state": "pending",
    "registeredBy": "u_carol",
    "registeredAt": "2026-11-06T10:00:00.000000Z",
    "approvedDigest": None,
    "pendingDigest": DP,
    "pendingSubmittedBy": "u_carol",
    "tools": [{"name": "lookup_vendor", "effect": "read", "ref": None}],
    "approvedSurface": None,
    "pendingSurface": {
        "tools": [
            {
                "name": "lookup_vendor",
                "effect": "read",
                "input": SURF_IO,
                "output": SURF_IO,
                "untrusted_result": False,
                "http": {"method": "POST", "path": "/blocks/erp.lookup_vendor@1"},
            }
        ]
    },
}
LISTITEM = {k: v for k, v in SERVER.items() if k not in ("approvedSurface", "pendingSurface")}


def listing(*items: object) -> dict[str, object]:
    return {"items": list(items), "next_cursor": None}


def answer(page: Page, path: str, body: object, status: int = 200) -> list[str]:
    """Mock one API path and return the list of request URLs it received."""
    pattern = re.compile(rf"/api/v1{re.escape(path)}(\?.*)?$")
    urls: list[str] = []

    def handler(route: Route) -> None:
        urls.append(route.request.url)
        route.fulfill(status=status, content_type="application/json", body=json.dumps(body))

    page.route(pattern, handler)
    return urls


def queries(urls: list[str]) -> list[dict[str, list[str]]]:
    return [parse_qs(urlparse(url).query) for url in urls]


def style(locator, prop: str) -> str:
    return locator.evaluate("(el, p) => getComputedStyle(el)[p]", prop)


def box(locator) -> dict[str, float]:
    found = locator.bounding_box()
    assert found is not None
    return found


def open_page(page: Page, path: str) -> list[str]:
    csp = watch_csp(page)
    page.set_viewport_size({"width": 1366, "height": 860})
    answer(page, "/me", ME)
    page.goto(path)
    return csp


def users(*pairs: tuple[str, str]) -> dict[str, object]:
    return listing(
        *(
            {
                "userId": uid,
                "kind": "human",
                "displayName": name,
                "email": uid + "@example.invalid",
                "state": "active",
                "roles": ["author"],
                "teams": ["finance"],
                "localRoles": [],
            }
            for uid, name in pairs
        )
    )


def mapping(group: str, reviewer: str, issuer: str, role: str | None, team: str | None):
    return {
        "issuer": issuer,
        "group": group,
        "roleId": role,
        "teamId": team,
        "reviewedBy": reviewer,
    }


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-1baa1083")
def test_users_page_hides_its_caption_toned_badge_and_red_disable_confirm(
    page: Page, base_url: str
) -> None:
    csp = watch_csp(page)
    page.set_viewport_size({"width": 1366, "height": 860})
    answer(page, "/me", ME)
    answer(page, "/users", users(("user-1", "Alice Example"), ("user-2", "Bob Example")))
    page.goto("/admin/users")

    table = page.get_by_role("table", name="Users", exact=True)
    expect(table).to_be_visible()
    expect(page.get_by_role("heading", name="Users", exact=True)).to_have_count(1)
    caption = table.locator("caption")
    expect(caption).to_have_class(re.compile(r"ui-table-caption ui-visually-hidden"))
    assert style(caption, "position") == "absolute"
    assert style(caption, "clip") == "rect(0px, 0px, 0px, 0px)"
    header = box(table.get_by_role("columnheader").first)
    assert header["y"] - box(table)["y"] <= 2

    row = page.get_by_role("row").filter(has_text="Bob Example")
    badge = row.locator('[data-slot="badge"]')
    expect(badge).to_have_count(1)
    expect(badge).to_have_text("Active")
    expect(badge).to_have_attribute("data-tone", "success")
    expect(row).to_contain_text("user-2")

    opener = page.get_by_role("button", name="Disable Bob Example", exact=True)
    opener.click()
    dialog = page.get_by_role("dialog")
    expect(dialog.get_by_role("heading")).to_have_count(1)
    confirm = dialog.get_by_role("button", name="Disable user", exact=True)
    expect(confirm).to_have_attribute("data-tone", "danger")
    assert style(confirm, "backgroundColor") == "rgb(180, 35, 24)"
    expect(dialog.get_by_role("button", name="Cancel", exact=True)).to_be_focused()
    page.keyboard.press("Escape")
    expect(page.get_by_role("dialog")).to_have_count(0)
    expect(opener).to_be_focused()

    assert_layout(page)
    assert_accessible(page)
    assert csp == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-23f3a934")
def test_teams_form_sits_beside_the_tables_at_1366_and_above_them_at_1100(
    page: Page, base_url: str
) -> None:
    answer(page, "/roles", listing({"roleId": "author"}, {"roleId": "tenant_admin"}))
    answer(page, "/teams", listing({"teamId": "finance"}))
    csp = open_page(page, "/admin/roles-and-teams")

    region = page.get_by_role("region", name="Create team", exact=True)
    teams = page.get_by_role("table", name="Teams", exact=True)
    expect(teams).to_be_visible()
    form = box(region)
    assert form["x"] + form["width"] <= box(teams)["x"]
    assert box(page.get_by_label("Team name", exact=True))["width"] <= 640
    expect(page.get_by_role("table", name="Roles", exact=True).locator("caption")).to_have_class(
        re.compile(r"ui-table-caption")
    )
    assert_layout(page)

    page.set_viewport_size({"width": 1100, "height": 860})
    form = box(region)
    assert form["y"] + form["height"] <= box(teams)["y"]
    assert_layout(page)
    assert_accessible(page)
    assert csp == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-5d8c406e")
def test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people(
    page: Page, base_url: str
) -> None:
    idp = "http://127.0.0.1:53086/realms/ursitoare"
    rows = [
        mapping("ursitoare-authors", "u_carol", "http://idp.test/realms/u", "author", None),
        mapping("ursitoare-admins", "operator:e2e-seed", "http://idp.test/realms/u", "tenant_admin", None),
        mapping("ursitoare-approvers", "operator:e2e-seed", idp, "approver", None),
        mapping("team-finance", "operator:e2e-seed", idp, None, "finance"),
    ]

    def mock(target: Page, people_status: int) -> list[str]:
        answer(target, "/me", ME)
        answer(target, "/roles", listing({"roleId": "author"}, {"roleId": "tenant_admin"}))
        answer(target, "/teams", listing({"teamId": "finance"}))
        answer(target, "/idp-group-map", listing(*rows))
        return answer(target, "/people", CAROL if people_status == 200 else INTERNAL, people_status)

    csp = watch_csp(page)
    page.set_viewport_size({"width": 1366, "height": 860})
    hits = mock(page, 200)
    page.goto("/admin/group-mappings")

    table = page.get_by_role("table", name="Group mappings", exact=True)
    authors = table.get_by_role("row").filter(has_text="ursitoare-authors")
    expect(authors).to_contain_text("Carol Example")
    expect(authors).not_to_contain_text("u_carol")
    expect(table.get_by_role("row").filter(has_text="ursitoare-admins")).to_contain_text(
        "operator:e2e-seed"
    )
    assert queries(hits) == [{"ids": ["u_carol"]}]
    expect(table.locator("caption")).to_have_class(
        re.compile(r"ui-table-caption ui-visually-hidden")
    )
    region = box(page.get_by_role("region", name="Map a group", exact=True))
    assert region["y"] + region["height"] <= box(table)["y"]
    wrap = page.locator(".ui-table-wrap")
    remove = page.get_by_role("button", name="Remove ursitoare-authors", exact=True)
    assert box(remove)["x"] + box(remove)["width"] <= box(wrap)["x"] + box(wrap)["width"]
    heights = [
        box(button)["height"]
        for button in page.get_by_role("button", name=re.compile(r"^Remove ")).all()
    ]
    assert len(heights) == 4
    assert max(heights) - min(heights) <= 1
    assert wrap.evaluate("el => el.scrollWidth <= el.clientWidth")
    assert box(table.get_by_role("cell", name="operator:e2e-seed", exact=True).first)["height"] <= 30
    assert box(table.get_by_role("cell", name="ursitoare-approvers", exact=True))["height"] <= 30
    assert_layout(page)
    assert_accessible(page)

    second = page.context.new_page()
    second_csp = watch_csp(second)
    second.set_viewport_size({"width": 1366, "height": 860})
    failing = mock(second, 500)
    with second.expect_response(re.compile(r"/api/v1/people")):
        second.goto("/admin/group-mappings")
    expect(
        second.get_by_role("row").filter(has_text="ursitoare-authors")
    ).to_contain_text("u_carol")
    assert len(failing) == 1
    assert_layout(second)
    assert_accessible(second)
    assert csp == [] and second_csp == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-effeb70f")
def test_audit_page_keeps_actor_ids_and_one_line_times(page: Page, base_url: str) -> None:
    verify = {
        "ok": True,
        "checked": 2,
        "firstBadSeq": None,
        "reason": None,
        "anchorsChecked": False,
        "anchorsVerified": 0,
        "checkedAt": "2026-11-18T10:00:00.000000Z",
    }
    events = [
        {
            "seq": "2",
            "at": "2026-11-18T09:15:00.123456Z",
            "eventType": "identity.group_mapped",
            "actor": {"kind": "user", "id": "u_carol"},
            "target": None,
            "payload": {"group": "ursitoare-authors", "issuer": "http://idp.test/realms/u" + "x" * 200},
        },
        {
            "seq": "3",
            "at": "2026-11-18T09:16:00.000000Z",
            "eventType": "identity.memberships_synced",
            "actor": {"kind": "system", "id": "oidc"},
            "target": {"kind": "user", "id": "usr_01a1ed71-e612-7000-849d-10aa1e127a47"},
            "payload": {"added": ["role:tenant_admin"], "removed": []},
        },
        {
            "seq": "4",
            "at": "2026-11-18T09:17:00.000000Z",
            "eventType": "registry.block_imported",
            "actor": {"kind": "system", "id": "e2e-seed"},
            "target": {"kind": "block", "id": "crm.find_customer@1"},
            "payload": {
                "effect": "read",
                "contentHash": "sha256:" + "9c8ac9e69cfce27f7177ef42301eda349f9b487bffe6835584c1c87e74cb9feb",
            },
        },
    ]
    people = answer(page, "/people", CAROL)
    answer(page, "/audit/verify", verify)
    answer(page, "/audit", listing(*events))
    csp = open_page(page, "/admin/audit")

    chain = page.get_by_role("region", name="Chain verification", exact=True)
    expect(chain.get_by_role("status")).to_contain_text("Audit chain verified")
    row = page.get_by_role("row").filter(has_text="identity.group_mapped")
    expect(row).to_contain_text("user: u_carol")
    expect(row).not_to_contain_text("Carol Example")
    assert people == []
    cell = page.get_by_role("cell", name="2026-11-18 09:15:00 UTC", exact=True)
    assert box(cell)["height"] <= 24
    assert page.locator(".ui-table-wrap").evaluate("el => el.scrollWidth <= el.clientWidth")
    first = box(chain)
    second = box(page.get_by_role("region", name="Filter the audit log", exact=True))
    assert abs(first["y"] - second["y"]) <= 1
    assert first["x"] + first["width"] <= second["x"]
    assert_layout(page)
    assert_accessible(page)
    assert csp == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-68a6b8c2")
def test_tool_servers_show_who_registered_outside_the_surface_region(
    page: Page, base_url: str
) -> None:
    people = answer(page, "/people", CAROL)
    answer(page, "/tool-servers", listing(LISTITEM))
    answer(page, "/tool-servers/acme", SERVER)
    csp = open_page(page, "/admin/tool-servers?server=acme")

    surface = page.get_by_role("region", name="Surface", exact=True)
    expect(surface).to_contain_text("acme · https://tools.fake.test · pending")
    badge = surface.locator('[data-slot="badge"]')
    expect(badge).to_have_count(1)
    expect(badge).to_have_text("pending")
    expect(badge).to_have_attribute("data-tone", "warning")
    registered = page.get_by_text("Registered by Carol Example", exact=True)
    expect(registered).to_be_visible()
    expect(surface.get_by_text("Registered by Carol Example", exact=True)).to_have_count(0)
    assert queries(people) == [{"ids": ["u_carol"]}]
    expect(
        page.get_by_role("table", name="Tool servers", exact=True).locator("caption")
    ).to_have_class(re.compile(r"ui-table-caption ui-visually-hidden"))
    approve = page.get_by_role("button", name="Approve surface", exact=True)
    assert style(approve, "backgroundColor") == "rgb(29, 78, 216)"
    approve.click()
    dialog = page.get_by_role("dialog")
    expect(dialog.get_by_role("heading", name="Approve surface 0123456789ab?")).to_be_visible()
    confirm = dialog.get_by_role("button", name="Approve surface", exact=True)
    expect(confirm).to_have_attribute("data-tone", "primary")
    assert style(confirm, "backgroundColor") == "rgb(29, 78, 216)"
    page.keyboard.press("Escape")
    assert_layout(page)
    assert_accessible(page)
    assert csp == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-3c7c4fbe")
def test_grants_error_state_has_two_alerts_and_one_option(page: Page, base_url: str) -> None:
    answer(page, "/blocks", FORBIDDEN, 403)
    answer(page, "/grants", FORBIDDEN, 403)
    csp = open_page(page, "/admin/grants")

    expect(page.get_by_role("alert")).to_have_count(2)
    options = page.get_by_label("Tool", exact=True).locator("option").all_inner_texts()
    assert options == ["Choose a tool"]
    expect(page.get_by_role("button", name="Create grant", exact=True)).to_have_attribute(
        "aria-disabled", "true"
    )
    assert_layout(page)
    assert_accessible(page)
    assert csp == []


def grant_item(grant_id: str, subject: dict[str, str], scope: dict[str, str], status: str):
    return {
        "grant": {
            "id": grant_id,
            "subject": subject,
            "tool": "acme.lookup_vendor@1",
            "scope": scope,
            "args": [],
            "fingerprints": ["nf1_" + "a" * 64],
            "state": "active",
            "createdBy": "u_carol",
            "createdAt": "2026-11-06T10:00:00.000000Z",
            "revokedBy": None,
            "revokedAt": None,
        },
        "status": status,
    }


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-3c7c4fbe")
def test_grants_rows_keep_subject_ids_and_show_status_badges_beside_the_form(
    page: Page, base_url: str
) -> None:
    people = answer(page, "/people", CAROL)
    answer(
        page,
        "/blocks",
        listing(
            {
                "ref": "acme.lookup_vendor@1",
                "def": {"effect": "read"},
                "bound": True,
                "contentHash": "a" * 64,
                "importedAt": "2026-11-06T10:00:00.000000Z",
            }
        ),
    )
    answer(
        page,
        "/grants",
        listing(
            grant_item("grant_2", {"kind": "user", "userId": "u_bob"}, {"kind": "any_step"}, "active"),
            grant_item(
                "grant_1",
                {"kind": "role", "role": "author"},
                {"kind": "node", "flowId": "pay-run", "nodeId": "pay"},
                "needs_reconfirm",
            ),
        ),
    )
    csp = open_page(page, "/admin/grants")

    table = page.get_by_role("table", name="Grants", exact=True)
    user_row = table.get_by_role("row").filter(has_text="user u_bob")
    expect(user_row).to_contain_text("user u_bob · acme.lookup_vendor@1 · any step · active")
    expect(user_row.locator('[data-slot="badge"]')).to_have_attribute("data-tone", "success")
    role_row = table.get_by_role("row").filter(has_text="role author")
    expect(role_row).to_contain_text(
        "role author · acme.lookup_vendor@1 · pay-run / pay · needs_reconfirm"
    )
    expect(role_row.locator('[data-slot="badge"]')).to_have_attribute("data-tone", "warning")
    expect(page.get_by_role("button", name="Revoke").first).to_be_visible()
    expect(page.get_by_role("button", name="Confirm for the newest version")).to_be_visible()
    expect(table.locator("caption")).to_have_class(
        re.compile(r"ui-table-caption ui-visually-hidden")
    )
    form = box(page.get_by_role("region", name="New grant", exact=True))
    assert form["x"] + form["width"] <= box(table)["x"]
    assert people == []
    assert_layout(page)
    assert_accessible(page)
    assert csp == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-403c66db")
def test_policies_page_has_no_status_once_loaded_and_a_bounded_editor(
    page: Page, base_url: str
) -> None:
    answer(page, "/policies", {"current": None, "pendingGrants": 1})
    csp = open_page(page, "/admin/policies")

    expect(page.get_by_text("No policy deployed.", exact=True)).to_be_visible()
    expect(page.get_by_text("1 grant change is not deployed.", exact=True)).to_be_visible()
    assert box(page.get_by_label("Hand-written Cedar", exact=True))["width"] <= 768
    deploy = page.get_by_role("button", name="Deploy", exact=True)
    assert style(deploy, "backgroundColor") == "rgb(29, 78, 216)"
    expect(page.get_by_role("status")).to_have_count(0)
    assert_layout(page)
    assert_accessible(page)
    assert csp == []
