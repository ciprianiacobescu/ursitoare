"""FB-001: the run page header meta is a wrapping row below the title, with gaps."""

import json
import re

import pytest
from playwright.sync_api import Page, expect

from conftest import assert_layout

HASH = "sha256:" + "ab" * 32

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
        "effectSeq": seq,
        "attempt": 1,
        "inputRef": f"{1000 + seq:064x}",
        "outputRef": None if out is None else f"{out:064x}",
        "error": None,
        "idemKey": None,
        "policyDecisionId": None,
        "taint": [],
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


def answer(page: Page, path: str, body: dict) -> None:
    def handle(route) -> None:
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


GEOMETRY = """
() => {
  const header = document.querySelector('.ui-page-header');
  const h1 = header.querySelector('h1');
  const meta = header.querySelector('.ui-page-header-meta');
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height };
  };
  return {
    h1: box(h1),
    fontSize: parseFloat(getComputedStyle(h1).fontSize),
    boxes: Array.from(meta.children).map(box),
  };
}
"""


@pytest.mark.l4("C-6027f26f")
def test_page_header_meta_wraps_below_the_title_with_gaps(page: Page) -> None:
    steps = [
        step(0, "lookup", "block", 1),
        step(1, "route", "switch", None),
        step(2, "pay", "block", 2),
        step(3, "done", "end", 3),
    ]
    mock_run(page, steps)

    for width in (1366, 390):
        page.set_viewport_size({"width": width, "height": 860})
        page.goto("/runs/run_1")

        heading = page.get_by_role("heading", name="Run run_1", exact=True)
        expect(heading).to_be_visible()
        expect(page.get_by_role("status", name="Run state")).to_be_visible()

        items = page.locator(".ui-page-header-meta .runs-meta-item")
        expect(items).to_have_count(5)
        for index, label in enumerate(["Flow ", "Mode ", "Started by ", "Started ", "Duration "]):
            expect(items.nth(index)).to_contain_text(label)

        geometry = page.evaluate(GEOMETRY)
        h1 = geometry["h1"]
        boxes = geometry["boxes"]
        assert len(boxes) == 6, f"at {width}px the meta holds the status and five items"

        for index, box in enumerate(boxes):
            assert box["top"] >= h1["bottom"] - 1, (
                f"at {width}px meta item {index} starts at or below the title's bottom edge: "
                f"{box['top']} vs {h1['bottom']}"
            )
        assert abs(boxes[0]["left"] - h1["left"]) <= 1, (
            f"at {width}px the first meta item starts at the title's left edge: "
            f"{boxes[0]['left']} vs {h1['left']}"
        )

        for first in range(len(boxes)):
            for second in range(first + 1, len(boxes)):
                left = boxes[first]
                right = boxes[second]
                if abs(left["top"] - right["top"]) <= 4:
                    gap = max(left["left"], right["left"]) - min(left["right"], right["right"])
                    assert gap >= 8, (
                        f"at {width}px meta items {first} and {second} keep at least 8px "
                        f"apart horizontally: {gap}"
                    )

        assert h1["height"] < 2 * geometry["fontSize"], (
            f"at {width}px the title is on one line: {h1['height']} vs {geometry['fontSize']}"
        )
        assert_layout(page)
