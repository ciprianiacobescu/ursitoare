"""M6b shell: the sign-in and not-found pages are cards in the shell."""

import json

import pytest
from playwright.sync_api import Page, expect

from conftest import assert_accessible, assert_layout, watch_csp

CAROL = [
    "read_self",
    "manage_users_roles",
    "read_audit",
    "register_tool_server",
    "deploy_policy",
    "read_flow",
    "read_run",
]
ALICE = ["read_self", "read_flow", "read_run"]
DISABLED_TEXT = "Your account is disabled. Ask an administrator."


def _box(locator) -> dict:
    box = locator.bounding_box()
    assert box is not None
    return box


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-88a078f0")
def test_sign_in_and_not_found_render_as_centred_cards(page: Page, base_url: str) -> None:
    page.set_viewport_size({"width": 1366, "height": 860})
    violations = watch_csp(page)

    for path in ["/sign-in", "/sign-in?error=OIDC_USER_DISABLED"]:
        page.goto(base_url + path)
        expect(page.get_by_role("heading", name="Sign in", exact=True)).to_be_visible()
        button = page.get_by_role("button", name="Sign in")
        expect(button).to_have_count(1)
        assert abs(_box(button)["width"] - 334) <= 1
        assert abs(_box(page.locator("main"))["x"]) <= 1
        card = _box(page.locator("main > div"))
        assert abs(card["width"] - 384) <= 1
        assert abs(card["y"] - 104) <= 1
        assert abs(card["x"] + card["width"] / 2 - 683) <= 1
        if "error" in path:
            alert = page.get_by_role("alert")
            expect(alert).to_have_count(1)
            expect(alert).to_contain_text(DISABLED_TEXT)
            assert page.locator("main > div").get_by_role("alert").count() == 1
        assert_layout(page, 72)
        assert_accessible(page)

    page.goto(base_url + "/no-such-page")
    expect(page.get_by_role("heading", name="Page not found")).to_be_visible()
    expect(page).to_have_title("Page not found · Ursitoare")
    link = page.get_by_role("link", name="Go to the landing page")
    assert link.get_attribute("href") == "/"
    assert abs(_box(page.locator("main"))["x"]) <= 1
    card = _box(page.locator("main > div"))
    assert abs(card["width"] - 448) <= 1
    assert abs(card["y"] - 128) <= 1
    assert abs(card["x"] + card["width"] / 2 - 683) <= 1
    assert_layout(page, 72)
    assert_accessible(page)
    assert violations == []


def _mock_me(page, name="Carol Example", tenant="E2E tenant", caps=None, status=200) -> None:
    caps = CAROL if caps is None else caps
    if status == 401:
        body = {"code": "SESSION_ENDED"}
    else:
        body = {
            "user": {"id": "user-1", "displayName": name, "email": None},
            "tenant": {"id": "tenant-1", "name": tenant, "reviewProfile": "solo"},
            "capabilities": caps,
            "csrfToken": "t" + "A" * 42,
        }
    page.route(
        "**/api/v1/me",
        lambda route: route.fulfill(
            status=status, content_type="application/json", body=json.dumps(body)
        ),
    )


def _open_as(page, base_url, width, height, path="/", **mock) -> list[str]:
    page.set_viewport_size({"width": width, "height": height})
    violations = watch_csp(page)
    _mock_me(page, **mock)
    page.goto(base_url + path)
    return violations


def _nav(page):
    return page.get_by_role("navigation", name="Main", exact=True)


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-1577878d")
@pytest.mark.parametrize("width,height", [(1366, 860), (1280, 720)])
def test_carols_navigation_is_grouped_and_the_banner_is_compact(
    page: Page, base_url: str, width: int, height: int
) -> None:
    violations = _open_as(page, base_url, width, height)
    expect(page.get_by_role("banner")).to_contain_text("Carol Example")
    expect(page.get_by_role("navigation")).to_have_count(1)
    nav = _nav(page)
    expect(nav.get_by_role("link")).to_have_text(
        ["Home", "Flows", "Runs", "Users", "Roles and teams", "Group mappings",
         "Audit log", "Tool servers", "Grants", "Policies"]
    )
    expect(nav.get_by_text("Build", exact=True)).to_be_visible()
    expect(nav.get_by_text("Admin", exact=True)).to_be_visible()
    expect(nav.get_by_role("list", name="Build", exact=True).get_by_role("link")).to_have_text(
        ["Flows", "Runs"]
    )
    expect(nav.get_by_role("list", name="Admin", exact=True).get_by_role("link")).to_have_text(
        ["Users", "Roles and teams", "Group mappings", "Audit log", "Tool servers",
         "Grants", "Policies"]
    )
    expect(nav.locator('[aria-current="page"]')).to_have_text(["Home"])
    expect(page.get_by_role("button", name="Menu", exact=True)).to_be_hidden()
    assert abs(_box(nav)["width"] - 240) <= 1
    assert abs(_box(page.locator("main"))["x"] - 240) <= 1
    last = _box(nav.get_by_role("link").last)
    assert last["y"] + last["height"] <= height
    assert_layout(page, 72)
    assert_accessible(page)
    assert violations == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-14067443")
def test_alice_and_a_signed_out_visitor_see_fewer_groups(page: Page, base_url: str) -> None:
    violations = _open_as(page, base_url, 1366, 860, caps=ALICE, name="Alice Example")
    nav = _nav(page)
    expect(nav.get_by_role("link")).to_have_text(["Home", "Flows", "Runs"])
    expect(nav.get_by_text("Build", exact=True)).to_be_visible()
    expect(page.get_by_text("Admin", exact=True)).to_have_count(0)
    expect(page.get_by_text("More", exact=True)).to_have_count(0)
    assert_layout(page, 72)
    assert_accessible(page)

    page.unroute("**/api/v1/me")
    _mock_me(page, status=401)
    page.goto(base_url + "/")
    expect(page.get_by_role("link", name="Sign in", exact=True)).to_be_visible()
    expect(page.get_by_role("navigation")).to_have_count(1)
    banner_nav = page.get_by_role("banner").get_by_role("navigation", name="Main", exact=True)
    expect(banner_nav.get_by_role("link")).to_have_text(["Home"])
    expect(_nav(page).get_by_role("list")).to_have_count(1)
    expect(page.get_by_text("Build", exact=True)).to_have_count(0)
    expect(page.get_by_text("Admin", exact=True)).to_have_count(0)
    expect(page.get_by_role("button", name="Menu", exact=True)).to_have_count(0)
    assert abs(_box(page.locator("main"))["x"]) <= 1
    nav_box = _box(_nav(page))
    assert nav_box["y"] + nav_box["height"] <= 56
    assert_layout(page, 72)
    assert_accessible(page)
    assert violations == []


_OUTLINE = (
    "(el) => [getComputedStyle(el).outlineStyle, parseFloat(getComputedStyle(el).outlineWidth)]"
)


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-2d3f3998")
def test_key_stops_keep_their_ring_and_script_focus_draws_none(page: Page, base_url: str) -> None:
    violations = _open_as(page, base_url, 1280, 720, caps=ALICE, name="Alice Example")
    stops = [
        page.get_by_role("link", name="Skip to content", exact=True),
        page.get_by_role("link", name="Ursitoare", exact=True),
        page.get_by_role("button", name="Sign out", exact=True),
        page.get_by_role("link", name="Home", exact=True),
    ]
    for stop in stops:
        page.keyboard.press("Tab")
        expect(stop).to_be_focused()
        style, width = stop.evaluate(_OUTLINE)
        assert style != "none"
        assert width >= 2

    page.goto(base_url + "/")
    page.keyboard.press("Tab")
    page.keyboard.press("Enter")
    main = page.locator("main")
    expect(main).to_be_focused()
    assert main.evaluate(_OUTLINE)[0] == "none"

    status = page.get_by_role("status")
    status.evaluate("(el) => el.focus()")
    expect(status).to_be_focused()
    assert status.evaluate(_OUTLINE)[0] == "none"

    page.unroute("**/api/v1/me")
    page.route("**/api/v1/me", lambda route: route.abort("failed"))
    page.goto(base_url + "/")
    page.get_by_role("button", name="Dismiss", exact=True).click()
    expect(main).to_be_focused()
    assert main.evaluate(_OUTLINE)[0] == "none"
    assert violations == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-51d4764a")
@pytest.mark.parametrize("width,height", [(1366, 860), (900, 800)])
def test_long_names_truncate_and_never_grow_the_banner(
    page: Page, base_url: str, width: int, height: int
) -> None:
    violations = _open_as(page, base_url, width, height, name="W" * 60, tenant="M" * 60)
    banner = page.get_by_role("banner")
    expect(banner).to_contain_text("W" * 60)
    expect(banner).to_contain_text("M" * 60)
    assert_layout(page, 72)
    account = page.get_by_role("group", name="Account", exact=True)
    cut = account.locator("p").evaluate_all(
        "(els) => els.map((el) => [getComputedStyle(el).textOverflow,"
        " el.scrollWidth > el.clientWidth])"
    )
    assert cut == [["ellipsis", True], ["ellipsis", True]]
    sign_out = _box(page.get_by_role("button", name="Sign out", exact=True))
    assert sign_out["x"] + sign_out["width"] <= width
    assert violations == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-425a9f46")
def test_the_menu_folds_below_1024_px(page: Page, base_url: str) -> None:
    violations = _open_as(page, base_url, 1023, 800)
    menu = page.get_by_role("button", name="Menu", exact=True)
    expect(menu).to_be_visible()
    expect(menu).to_have_attribute("aria-expanded", "false")
    expect(page.get_by_role("navigation")).to_have_count(0)

    page.set_viewport_size({"width": 1024, "height": 800})
    expect(menu).to_be_hidden()
    expect(page.get_by_role("navigation")).to_have_count(1)
    assert _nav(page).get_attribute("id") == "main-nav"

    page.set_viewport_size({"width": 900, "height": 800})
    expect(menu).to_have_attribute("aria-controls", "main-nav")
    menu.click()
    expect(menu).to_have_attribute("aria-expanded", "true")
    expect(_nav(page)).to_be_visible()
    assert_layout(page, 72)
    assert_accessible(page)
    menu.click()
    expect(menu).to_have_attribute("aria-expanded", "false")
    expect(page.get_by_role("navigation")).to_have_count(0)

    page.goto(base_url + "/no-such-page")
    menu.click()
    page.get_by_role("link", name="Home", exact=True).click()
    page.wait_for_url("**/")
    expect(menu).to_have_attribute("aria-expanded", "false")
    expect(page.get_by_role("navigation")).to_have_count(0)
    assert violations == []
