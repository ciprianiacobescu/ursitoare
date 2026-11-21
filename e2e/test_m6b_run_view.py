"""M6b run view: a readable run page and runs list, on mocked answers (no sign-in)."""

import json
import re

import pytest
from playwright.sync_api import Page, expect

from conftest import assert_accessible, assert_layout, watch_csp

HASH = "sha256:" + "ab" * 32

PAYLOAD_SCRIPT = """
(() => {
  const state = { urls: [], inflight: 0, max: 0 };
  window.__payloads = state;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (!url.includes("/payloads/")) return original(input, init);
    state.urls.push(url.split("/payloads/")[1].split("?")[0]);
    state.inflight += 1;
    state.max = Math.max(state.max, state.inflight);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return await original(input, init);
    } finally {
      state.inflight -= 1;
    }
  };
})();
"""

RUN = {
    "id": "run_1",
    "flowId": "demo-pay",
    "flowHash": HASH,
    "mode": "mock",
    "trigger": "test",
    "state": "completed",
    "ownerTeam": "finance",
    "principal": {"userId": "user-1", "kind": "human"},
    "terminalNode": None,
    "error": None,
    "inputRef": None,
    "outputRef": None,
    "createdAt": "2026-11-17T10:00:00.000000Z",
    "startedAt": "2026-11-17T10:00:01.000000Z",
    "endedAt": "2026-11-17T10:00:03.500000Z",
}

OUTPUTS = {
    1: {"vendor_id": "V-1", "status": "active"},
    2: {"payment_id": "P-1", "status": "created"},
    3: {"payment_id": "P-1"},
}


def step(seq: int, node: str, kind: str, out: int | None) -> dict:
    return {
        "seq": seq,
        "nodeId": node,
        "kind": kind,
        "state": "completed",
        "outcome": None,
        "inputRef": f"{1000 + seq:064x}",
        "outputRef": None if out is None else f"{out:064x}",
        "error": None,
        "hooks": [],
        "startedAt": f"2026-11-17T10:00:0{seq + 1}.000000Z"
        if seq < 9
        else f"2026-11-17T10:00:{seq + 1}.000000Z",
        "endedAt": f"2026-11-17T10:00:0{seq + 1}.500000Z"
        if seq < 9
        else f"2026-11-17T10:00:{seq + 1}.500000Z",
    }


def page_body(items: list[dict]) -> dict:
    return {"items": items, "next_cursor": None}


def answer(page: Page, path: str, body: dict, record: list[str] | None = None) -> None:
    def handle(route) -> None:
        if record is not None:
            record.append(route.request.url)
        route.fulfill(status=200, content_type="application/json", body=json.dumps(body))

    page.route(re.compile(r".*/api/v1" + path + r"(\?.*)?$"), handle)


def payload_data(digest: str):
    number = int(digest, 16)
    if number == 1000:
        return {"vendor_name": "ACME", "amount": 12.5}
    if number in OUTPUTS:
        return OUTPUTS[number]
    return {"n": number}


def mock_payloads(page: Page) -> None:
    def handle(route) -> None:
        digest = route.request.url.split("/payloads/")[1].split("?")[0]
        body = {
            "sha256": digest,
            "mediaType": "application/json",
            "size": 10,
            "data": payload_data(digest),
        }
        route.fulfill(status=200, content_type="application/json", body=json.dumps(body))

    page.route(re.compile(r".*/api/v1/runs/run_1/payloads/[0-9a-f]{64}(\?.*)?$"), handle)


def mock_me(page: Page) -> None:
    answer(
        page,
        "/me",
        {
            "user": {"id": "user-1", "displayName": "Alice Example", "email": None},
            "tenant": {"id": "tenant-1", "name": "E2E tenant", "reviewProfile": "solo"},
            "capabilities": ["read_run", "read_flow"],
            "csrfToken": "csrf_" + "a" * 38,
        },
    )


def alice(page: Page) -> None:
    answer(
        page,
        "/people",
        {"items": [{"userId": "user-1", "displayName": "Alice Example", "kind": "human"}]},
    )


def mock_run(page: Page, steps: list[dict]) -> None:
    mock_me(page)
    answer(page, "/runs/run_1", RUN)
    answer(page, "/runs/run_1/steps", page_body(steps))
    answer(page, "/runs/run_1/decisions", page_body([]))
    mock_payloads(page)
    alice(page)
    page.add_init_script(PAYLOAD_SCRIPT)


def payload_urls(page: Page) -> list[str]:
    return page.evaluate("window.__payloads.urls")


def _region(page: Page, name: str):
    return page.get_by_role("region", name=name, exact=True)


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-b43a5bfb")
def test_run_page_header_previews_and_columns(page: Page) -> None:
    page.set_viewport_size({"width": 1366, "height": 860})
    violations = watch_csp(page)
    steps = [
        step(0, "lookup", "block", 1),
        step(1, "route", "switch", None),
        step(2, "pay", "block", 2),
        step(3, "done", "end", 3),
    ]
    mock_run(page, steps)
    page.goto("/runs/run_1")

    status = page.get_by_role("status", name="Run state")
    expect(status).to_have_text("State: completed")
    expect(status).to_have_attribute("data-tone", "success")
    expect(page.get_by_text("Started by Alice Example")).to_be_visible()
    expect(page.get_by_text("Duration 2.5 s")).to_be_visible()
    steps_list = page.get_by_role("list", name="Steps")
    expect(steps_list.get_by_role("button")).to_have_text(["lookup", "route", "pay", "done"])

    previews = page.locator("p.runs-preview")
    expect(previews).to_have_text(
        [
            '{"vendor_id":"V-1","status":"active"}',
            '{"payment_id":"P-1","status":"created"}',
            '{"payment_id":"P-1"}',
        ]
    )
    first = payload_urls(page)
    assert sorted(first) == [f"{n:064x}" for n in (1, 2, 3)]

    steps_list.get_by_role("button", name="lookup", exact=True).click()
    expect(_region(page, "Input")).to_contain_text('"vendor_name": "ACME"')
    expect(_region(page, "Output")).to_contain_text('"vendor_id": "V-1"')
    second = payload_urls(page)
    assert sorted(second) == sorted([*first, f"{1000:064x}"])

    details = _region(page, "Step details")
    started = details.locator("dt:has-text('Started') + dd time")
    expect(started).to_have_text("2026-11-17 10:00 UTC")
    expect(started).to_have_attribute("datetime", "2026-11-17T10:00:01.000000Z")
    ended = details.locator("dt:has-text('Ended') + dd time")
    expect(ended).to_have_attribute("datetime", "2026-11-17T10:00:01.500000Z")

    timeline_box = _region(page, "Timeline").bounding_box()
    details_box = details.bounding_box()
    assert timeline_box is not None and details_box is not None
    assert abs(details_box["y"] - timeline_box["y"]) <= 8
    assert details_box["x"] > timeline_box["x"] + timeline_box["width"] - 1

    page.locator("time", has_text="Started ").first.focus()
    expect(page.get_by_role("tooltip")).to_have_count(1)
    expect(page.get_by_role("tooltip")).to_have_text("2026-11-17 10:00 UTC")
    expect(page.get_by_role("status")).to_have_count(1)
    expect(page.get_by_role("alert")).to_have_count(0)

    assert_layout(page, max_banner_px=72)
    assert_accessible(page)
    assert violations == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-2836a3bc")
def test_previews_stop_at_fifty_and_run_four_at_a_time(page: Page) -> None:
    page.set_viewport_size({"width": 1366, "height": 860})
    violations = watch_csp(page)
    steps = [step(i, f"n{i:02d}", "block", 100 + i) for i in range(60)]
    mock_run(page, steps)
    page.goto("/runs/run_1")

    previews = page.locator("p.runs-preview")
    expect(previews).to_have_count(50, timeout=30000)
    expect(previews.last).to_have_text('{"n":149}', timeout=30000)
    expect(previews.first).to_have_text('{"n":100}')
    urls = payload_urls(page)
    assert len(urls) == 50
    assert len(set(urls)) == 50
    assert page.evaluate("window.__payloads.max") <= 4

    buttons = page.get_by_role("list", name="Steps").get_by_role("button")
    expect(buttons).to_have_count(60)
    buttons.nth(50).click()
    expect(_region(page, "Output")).to_contain_text('"n": 150')
    expect(previews).to_have_count(50)
    assert violations == []


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-6bfd6320")
def test_runs_list_shows_badges_duration_and_names(page: Page) -> None:
    page.set_viewport_size({"width": 1366, "height": 860})
    violations = watch_csp(page)
    run_a = {**RUN, "id": "run_a"}
    run_b = {
        **RUN,
        "id": "run_b",
        "state": "failed",
        "principal": {"userId": "usr_9", "kind": "service"},
        "endedAt": "2026-11-17T10:01:06.000000Z",
    }
    mock_me(page)
    answer(page, "/runs", page_body([run_a, run_b]))
    people: list[str] = []
    answer(
        page,
        "/people",
        {"items": [{"userId": "user-1", "displayName": "Alice Example", "kind": "human"}]},
        record=people,
    )
    page.goto("/runs")

    table = page.get_by_role("table", name="Runs", exact=True)
    expect(table).to_be_visible()
    expect(table.get_by_role("columnheader")).to_have_text(
        ["Run", "Flow", "Mode", "State", "Started", "Duration", "Started by"]
    )
    row_a = table.get_by_role("row").filter(has_text="run_a")
    expect(row_a).to_contain_text("Alice Example")
    expect(row_a).to_contain_text("2.5 s")
    expect(row_a.locator("[data-slot='badge']")).to_have_attribute("data-tone", "success")
    row_b = table.get_by_role("row").filter(has_text="run_b")
    expect(row_b).to_contain_text("usr_9")
    expect(row_b).to_contain_text("1 min 5 s")
    badge_b = row_b.locator("[data-slot='badge']")
    expect(badge_b).to_have_text("failed")
    expect(badge_b).to_have_attribute("data-tone", "danger")
    expect(page.get_by_role("link", name="Open run run_a", exact=True)).to_be_visible()

    caption = table.locator("caption")
    expect(caption).to_have_class("ui-table-caption ui-visually-hidden")
    assert caption.evaluate("e => getComputedStyle(e).position") == "absolute"
    assert caption.evaluate("e => e.getBoundingClientRect().width") == 32
    expect(page.get_by_role("heading", name="Runs", exact=True)).to_have_count(1)
    assert len(people) == 1
    assert people[0].endswith("ids=user-1%2Cusr_9")

    assert_layout(page, max_banner_px=72)
    assert_accessible(page)
    assert violations == []
