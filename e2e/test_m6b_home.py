"""M6b home: the signed-in dashboard of recent runs, recent flows and next steps."""

import json
import re
from datetime import datetime, timedelta, timezone

import pytest
from playwright.sync_api import Page, expect

from conftest import assert_accessible, assert_layout, watch_csp

HASH = "sha256:" + "ab".repeat(32)
ALICE = ["read_self", "read_flow", "read_run", "read_registry", "test_flow", "dry_run_flow"]
CAROL = [
    "read_self",
    "read_flow",
    "read_run",
    "read_registry",
    "manage_users_roles",
    "read_audit",
    "register_tool_server",
    "approve_tool_surface",
    "deploy_policy",
    "manage_credentials",
    "manage_tenant",
]

R1_ID = "run_01a1eb72-3179-7000-a94d-6c6eaf5d03ac"
R2_ID = "run_01a1eb70-0000-7000-8000-00000000be11"
R3_ID = "run_01a1eb6f-0000-7000-8000-00000000cafe"


def at(now: datetime, seconds_ago: float) -> str:
    return (now - timedelta(seconds=seconds_ago)).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def run(
    now: datetime,
    run_id: str,
    flow_id: str,
    state: str,
    user_id: str,
    created_ago: float,
    started_ago: float | None = None,
    ended_ago: float | None = None,
) -> dict:
    return {
        "id": run_id,
        "flowId": flow_id,
        "flowHash": HASH,
        "mode": "mock",
        "trigger": "test",
        "state": state,
        "ownerTeam": "finance",
        "principal": {"userId": user_id, "kind": "human"},
        "terminalNode": None,
        "error": None,
        "inputRef": None,
        "outputRef": None,
        "createdAt": at(now, created_ago),
        "startedAt": None if started_ago is None else at(now, started_ago),
        "endedAt": None if ended_ago is None else at(now, ended_ago),
    }


def version(
    now: datetime,
    flow_id: str,
    number: int,
    state: str,
    validation_ok: bool | None,
    created_ago: float,
) -> dict:
    return {
        "flowId": flow_id,
        "number": number,
        "hash": HASH,
        "state": state,
        "surface": "yaml",
        "author": "user-1",
        "requestedBy": None,
        "createdAt": at(now, created_ago),
        "validatedAt": None,
        "validationOk": validation_ok,
    }


def flow(now: datetime, flow_id: str, created_ago: float, latest: dict | None) -> dict:
    return {
        "flowId": flow_id,
        "ownerTeam": "finance",
        "createdBy": "user-1",
        "createdAt": at(now, created_ago),
        "versionCount": 0 if latest is None else latest["number"],
        "latest": latest,
    }


def fixtures() -> tuple[datetime, list[dict], list[dict]]:
    now = datetime.now(timezone.utc)
    runs = [
        run(now, R1_ID, "demo-pay", "completed", "user-1", 205, 200, 198.6),
        run(now, R2_ID, "demo-grants", "failed", "user-2", 7505, 7500, 7425),
        run(now, R3_ID, "demo-pay", "queued", "user-2", 90000),
    ]
    flows = [
        flow(now, "alpha-flow", 400000, version(now, "alpha-flow", 1, "draft", False, 400000)),
        flow(now, "demo-draft", 300, None),
        flow(now, "demo-pay", 90000, version(now, "demo-pay", 2, "validated", True, 3700)),
    ]
    return now, runs, flows


def page_body(items: list[dict], next_cursor: str | None = None) -> dict:
    return {"items": items, "next_cursor": next_cursor}


def server(server_id: str, state: str) -> dict:
    return {
        "id": server_id,
        "adapter": "fixture",
        "origin": "https://tools.fake.test",
        "state": state,
        "registeredBy": "user-1",
        "pendingDigest": None if state == "approved" else HASH,
        "approvedDigest": HASH if state == "approved" else None,
        "tools": [{"name": "lookup_vendor", "effect": "read", "ref": None}],
    }


def me_body(name: str, caps: list[str]) -> dict:
    return {
        "user": {"id": "user-1", "displayName": name, "email": None},
        "tenant": {"id": "tenant-1", "name": "E2E tenant", "reviewProfile": "solo"},
        "capabilities": caps,
        "csrfToken": "t" + "A" * 42,
    }


def answer(page: Page, pattern, status: int, body: dict) -> None:
    page.route(
        pattern,
        lambda route: route.fulfill(
            status=status, content_type="application/json", body=json.dumps(body)
        ),
    )


def mock_me(page: Page, name: str, caps: list[str]) -> None:
    answer(page, "**/api/v1/me", 200, me_body(name, caps))


def words(locator) -> str:
    return " ".join(locator.inner_text().split())


def _region(page: Page, name: str):
    return page.get_by_role("region", name=name, exact=True)


def _open(page: Page) -> list[str]:
    page.set_viewport_size({"width": 1366, "height": 860})
    violations = watch_csp(page)
    page.goto("/")
    return violations


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-c3d0d88f")
def test_alice_sees_recent_runs_recent_flows_and_her_next_step(page: Page) -> None:
    now, runs, flows = fixtures()
    mock_me(page, "Alice Example", ALICE)
    answer(page, re.compile(r".*/api/v1/runs\?.*"), 200, page_body(runs))
    answer(page, re.compile(r".*/api/v1/flows\?.*"), 200, page_body(flows))
    answer(
        page,
        re.compile(r".*/api/v1/people\?.*"),
        200,
        page_body([{"userId": "user-2", "displayName": "Bob Example", "kind": "human"}]),
    )
    me_requests: list[str] = []
    people_requests: list[str] = []
    page.on(
        "request",
        lambda request: me_requests.append(request.url)
        if request.url.endswith("/api/v1/me")
        else None,
    )
    page.on(
        "request",
        lambda request: people_requests.append(request.url)
        if "/api/v1/people" in request.url
        else None,
    )

    violations = _open(page)

    runs_region = _region(page, "Recent runs")
    flows_region = _region(page, "Recent flows")
    expect(runs_region.get_by_role("listitem")).to_have_count(3)
    expect(flows_region.get_by_role("listitem")).to_have_count(3)
    expect(runs_region.get_by_role("listitem").nth(1)).to_contain_text("by Bob Example")

    assert [words(runs_region.get_by_role("listitem").nth(i)) for i in range(3)] == [
        "completed Run af5d03ac of demo-pay 3 min ago · 1.4 s · by you",
        "failed Run 0000be11 of demo-grants 2 h ago · 1 min 15 s · by Bob Example",
        "queued Run 0000cafe of demo-pay 1 d ago · — · by Bob Example",
    ]
    assert [words(flows_region.get_by_role("listitem").nth(i)) for i in range(3)] == [
        "demo-draft No version yet finance · Updated 5 min ago",
        "demo-pay v2 · validated finance · Updated 1 h ago",
        "alpha-flow v1 · has errors finance · Updated 4 d ago",
    ]

    expect(runs_region.get_by_role("link", name="All runs", exact=True)).to_have_attribute(
        "href", "/runs"
    )
    for name, run_id in [
        ("Run af5d03ac of demo-pay", R1_ID),
        ("Run 0000be11 of demo-grants", R2_ID),
        ("Run 0000cafe of demo-pay", R3_ID),
    ]:
        expect(runs_region.get_by_role("link", name=name, exact=True)).to_have_attribute(
            "href", f"/runs/{run_id}"
        )
    expect(flows_region.get_by_role("link", name="All flows", exact=True)).to_have_attribute(
        "href", "/flows"
    )
    for flow_id in ["demo-draft", "demo-pay", "alpha-flow"]:
        expect(flows_region.get_by_role("link", name=flow_id, exact=True)).to_have_attribute(
            "href", f"/flows/{flow_id}"
        )

    steps = _region(page, "Next steps")
    expect(steps.get_by_role("link")).to_have_text(["Start a test run", "Review a failed run"])
    expect(steps.get_by_role("link", name="Start a test run", exact=True)).to_have_attribute(
        "href", "/flows/demo-pay"
    )
    expect(steps.get_by_role("link", name="Review a failed run", exact=True)).to_have_attribute(
        "href", f"/runs/{R2_ID}"
    )
    expect(steps).to_contain_text("demo-pay has a validated version 2. Run it with mocked tools.")
    expect(page.get_by_role("heading", name="Ursitoare", exact=True)).to_have_count(1)

    first_time = runs_region.get_by_role("listitem").first.locator("time")
    first_time.hover()
    expected_minute = (now - timedelta(seconds=200)).strftime("%Y-%m-%d %H:%M UTC")
    expect(page.get_by_role("tooltip")).to_have_text(expected_minute)

    expect(page.get_by_role("status")).to_have_count(1)
    expect(page.get_by_role("alert")).to_have_count(0)
    expect(page.locator("[aria-live]")).to_have_count(1)
    assert len(me_requests) == 1
    assert len(people_requests) == 1
    assert people_requests[0].endswith("ids=user-2")

    assert_layout(page, 72)
    assert_accessible(page)
    assert violations == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-7837c9f9")
def test_carol_sees_setup_steps_from_what_the_api_shows(page: Page) -> None:
    mock_me(page, "Carol Example", CAROL)
    answer(page, re.compile(r".*/api/v1/runs\?.*"), 200, page_body([]))
    answer(page, re.compile(r".*/api/v1/flows\?.*"), 200, page_body([]))
    answer(
        page,
        re.compile(r".*/api/v1/tool-servers\?.*"),
        200,
        page_body([server("acme", "pending"), server("beta", "approved"), server("gamma", "pending")]),
    )
    answer(page, re.compile(r".*/api/v1/policies$"), 200, {"current": None, "pendingGrants": 2})
    answer(
        page,
        re.compile(r".*/api/v1/users\?.*"),
        200,
        page_body(
            [
                {
                    "userId": "u1",
                    "kind": "human",
                    "displayName": "Uno",
                    "email": None,
                    "state": "active",
                    "roles": [],
                    "teams": [],
                    "localRoles": [],
                },
                {
                    "userId": "u2",
                    "kind": "human",
                    "displayName": "Dos",
                    "email": None,
                    "state": "active",
                    "roles": ["author"],
                    "teams": [],
                    "localRoles": [],
                },
                {
                    "userId": "u3",
                    "kind": "service",
                    "displayName": "Tres",
                    "email": None,
                    "state": "active",
                    "roles": [],
                    "teams": [],
                    "localRoles": [],
                },
            ]
        ),
    )

    violations = _open(page)

    steps = _region(page, "Next steps")
    expect(steps.get_by_role("link")).to_have_text(
        ["Give people a role", "Review pending tool servers", "Deploy grant changes"]
    )
    expect(steps.get_by_role("link", name="Give people a role", exact=True)).to_have_attribute(
        "href", "/admin/users"
    )
    expect(
        steps.get_by_role("link", name="Review pending tool servers", exact=True)
    ).to_have_attribute("href", "/admin/tool-servers")
    expect(steps.get_by_role("link", name="Deploy grant changes", exact=True)).to_have_attribute(
        "href", "/admin/policies"
    )
    expect(steps).to_contain_text(
        "1 active person has no role yet. Assign a role, or map an identity-provider group."
    )
    expect(steps).to_contain_text(
        "2 tool servers wait for their surfaces to be approved before flows can call their tools."
    )
    expect(steps).to_contain_text("2 grant changes are not deployed, so they are not in force yet.")

    expect(page.get_by_text("No runs yet", exact=True)).to_be_visible()
    expect(page.get_by_text("No flows yet", exact=True)).to_be_visible()
    expect(page.get_by_role("link", name="Browse flows", exact=True)).to_have_attribute(
        "href", "/flows"
    )
    expect(page.get_by_role("link", name="Go to flows", exact=True)).to_have_attribute(
        "href", "/flows"
    )

    assert_layout(page, 72)
    assert_accessible(page)
    assert violations == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-c8aaa647")
def test_a_failing_list_fails_alone_and_try_again_reads_it_again(page: Page) -> None:
    mock_me(page, "Alice Example", ALICE)
    run_hits: list[str] = []

    def runs_route(route) -> None:
        run_hits.append(route.request.url)
        if len(run_hits) == 1:
            route.fulfill(
                status=500,
                content_type="application/json",
                body=json.dumps({"error": {"code": "INTERNAL", "message": "m"}}),
            )
        else:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(page_body([])),
            )

    page.route(re.compile(r".*/api/v1/runs\?.*"), runs_route)
    answer(page, re.compile(r".*/api/v1/flows\?.*"), 200, {})

    violations = _open(page)

    runs_region = _region(page, "Recent runs")
    flows_region = _region(page, "Recent flows")
    expect(runs_region).to_contain_text("Recent runs could not be loaded.")
    expect(flows_region).to_contain_text("Recent flows could not be loaded.")
    expect(page.get_by_role("alert")).to_have_count(0)
    expect(page.get_by_role("status")).to_have_text("Engine healthy")
    expect(page.get_by_role("region", name="Next steps", exact=True)).to_have_count(0)
    assert_accessible(page)

    runs_region.get_by_role("button", name="Try again", exact=True).click()
    expect(page.get_by_text("No runs yet", exact=True)).to_be_visible()
    expect(page.get_by_text("Test-run a saved flow and it shows up here.", exact=True)).to_be_visible()
    expect(runs_region.get_by_role("link", name="Choose a flow to test", exact=True)).to_have_attribute(
        "href", "/flows"
    )
    expect(flows_region).to_contain_text("Recent flows could not be loaded.")
    assert len(run_hits) == 2
    assert_accessible(page)
    assert violations == []

    second = page.context.new_page()
    try:
        second.set_viewport_size({"width": 1366, "height": 860})
        second_violations = watch_csp(second)
        second_me: list[str] = []
        second.on(
            "request",
            lambda request: second_me.append(request.url)
            if request.url.endswith("/api/v1/me")
            else None,
        )
        mock_me(second, "Alice Example", ALICE)
        answer(
            second,
            re.compile(r".*/api/v1/runs\?.*"),
            401,
            {"error": {"code": "UNAUTHENTICATED", "message": "x"}},
        )
        answer(second, re.compile(r".*/api/v1/flows\?.*"), 200, page_body([]))
        second.goto("/")

        second_runs = _region(second, "Recent runs")
        expect(second_runs).to_contain_text("Your session has ended.")
        expect(
            second_runs.get_by_role("link", name="Sign in again", exact=True)
        ).to_have_attribute("href", "/sign-in?error=SESSION_ENDED&return_to=%2F")
        expect(second_runs.get_by_role("button", name="Try again", exact=True)).to_have_count(0)
        assert len(second_me) == 1
        assert_accessible(second)
        assert second_violations == []
    finally:
        second.close()


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-9517e900")
def test_the_signed_out_home_is_unchanged(page: Page) -> None:
    answer(page, "**/api/v1/me", 401, {"code": "SESSION_ENDED"})

    violations = _open(page)
    expect(page.get_by_role("status")).to_have_text("Engine healthy")
    assert words(page.locator("main")) == "Ursitoare Engine healthy"
    expect(page.get_by_role("region")).to_have_count(0)
    assert_accessible(page)

    page.unroute("**/api/v1/me")
    answer(
        page,
        re.compile(r".*/api/v1/.*"),
        200,
        me_body("Alice Example", ["read_self", "read_flow", "read_run"]),
    )
    page.goto("/")

    expect(_region(page, "Recent runs")).to_contain_text("Recent runs could not be loaded.")
    expect(_region(page, "Recent flows")).to_contain_text("Recent flows could not be loaded.")
    assert words(page.locator("main")) == (
        "Ursitoare Welcome, Alice Example. Engine healthy "
        "Recent runs All runs Recent runs could not be loaded. Try again "
        "Recent flows All flows Recent flows could not be loaded. Try again"
    )
    expect(page.get_by_role("alert")).to_have_count(0)
    assert_accessible(page)
    assert violations == []
