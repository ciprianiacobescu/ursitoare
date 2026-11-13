"""The M6 browser test with mocked API answers: the run page's Policy decisions section.

It proves scenario "Try again reads the decisions after a failure, and an empty page says so":
a 500 answer leaves the run page working with a "Try again" button in the region, a retry
reads two decisions, and a reload of an empty page says that none were recorded.
"""

import json
import re

import pytest
from playwright.sync_api import Page, Route, expect

from conftest import assert_accessible, login

HASH = "sha256:" + "a" * 64
SERVICE_ID = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01"

RUN = {
    "id": "run_1",
    "flowId": "demo-grants",
    "flowHash": HASH,
    "mode": "stub",
    "trigger": "test",
    "state": "completed",
    "ownerTeam": "finance",
    "principal": {"userId": "u_alice", "kind": "human"},
    "terminalNode": "done",
    "error": None,
    "inputRef": None,
    "outputRef": None,
    "createdAt": "2026-11-06T10:00:00.000000Z",
    "startedAt": "2026-11-06T10:00:01.000000Z",
    "endedAt": "2026-11-06T10:00:02.000000Z",
}


def _permit(path: str) -> dict[str, object]:
    return {
        "method": "POST",
        "host": "tools.fake.test",
        "path": path,
        "serviceId": SERVICE_ID,
        "ttlSeconds": 60,
    }


def _decision(decision_id: str, node: str, reason: str, permit_path: str) -> dict[str, object]:
    return {
        "decisionId": decision_id,
        "nodeId": node,
        "resource": f'Block::"tenant_a/demo-grants/{node}"',
        "decision": "allow",
        "reasons": [reason],
        "permit": _permit(permit_path),
    }


DECISIONS = [
    _decision("dec_2", "lookup", "g-lookup", "/blocks/erp.lookup_vendor@1"),
    _decision("dec_3", "pay", "g-pay", "/blocks/erp.create_payment@1"),
]

ERROR_TEXT = "The engine hit an unexpected problem. Try again, and tell an administrator if it keeps happening."
LOOKUP_TEXT = "lookup · allow · POST tools.fake.test/blocks/erp.lookup_vendor@1"
PAY_TEXT = "pay · allow · POST tools.fake.test/blocks/erp.create_payment@1"
EMPTY_TEXT = "No policy decisions were recorded."


def _install_answers(page: Page) -> dict[str, list[object]]:
    """Route /api/v1/<path> (query ignored); each path counts its hits and answers hit n with reply n."""
    hits: dict[str, list[object]] = {}

    def answer(path: str, *replies: tuple[int, object]) -> None:
        pattern = re.compile(r"/api/v1/" + re.escape(path) + r"(\?|$)")

        def handle(route: Route) -> None:
            seen = hits.setdefault(path, [])
            seen.append(route.request)
            status, body = replies[min(len(seen), len(replies)) - 1]
            route.fulfill(status=status, content_type="application/json", body=json.dumps(body))

        page.route(pattern, handle)

    answer("runs/run_1", (200, RUN))
    answer("runs/run_1/steps", (200, {"items": [], "next_cursor": None}))
    answer(
        "runs/run_1/decisions",
        (500, {"error": {"code": "INTERNAL", "message": "m"}}),
        (200, {"items": DECISIONS, "next_cursor": None}),
        (200, {"items": [], "next_cursor": None}),
    )
    return hits


@pytest.mark.milestone("M6")
@pytest.mark.l4("C-f78faba7")
def test_decisions_try_again_reads_the_page(
    page: Page,
    base_url: str,
    fresh_state: None,
    users: dict[str, dict[str, str]],
) -> None:
    login(page, users["alice"])
    hits = _install_answers(page)

    page.goto("/runs/run_1")
    assert_accessible(page)

    expect(page.get_by_role("status", name="Run state", exact=True)).to_have_text(
        "State: completed"
    )
    expect(page.get_by_role("heading", name="Timeline", exact=True)).to_be_visible()

    region = page.get_by_role("region", name="Policy decisions", exact=True)
    expect(
        region.get_by_role("paragraph").filter(has_text="The engine hit an unexpected problem.")
    ).to_have_count(1)
    retry = region.get_by_role("button", name="Try again", exact=True)
    expect(retry).to_have_count(1)
    decisions = page.get_by_role("list", name="Policy decisions", exact=True)
    expect(decisions).to_have_count(0)
    expect(page.get_by_role("alert")).to_have_count(0)
    assert len(hits["runs/run_1/decisions"]) == 1

    retry.click()
    assert_accessible(page)
    items = page.get_by_role("list", name="Policy decisions", exact=True).get_by_role("listitem")
    expect(items).to_have_count(2)
    first = items.nth(0)
    expect(first).to_contain_text(LOOKUP_TEXT)
    expect(first).to_contain_text("Reasons")
    expect(first).to_contain_text("g-lookup")
    expect(first).to_contain_text("Service")
    expect(first).to_contain_text(SERVICE_ID)
    expect(first).to_contain_text("Token lifetime")
    expect(first).to_contain_text("60 s")
    expect(items.nth(1)).to_contain_text(PAY_TEXT)
    expect(region.get_by_role("button", name="Try again", exact=True)).to_have_count(0)
    assert len(hits["runs/run_1/decisions"]) == 2

    page.reload()
    assert_accessible(page)
    expect(region.get_by_role("paragraph").filter(has_text=EMPTY_TEXT)).to_have_count(1)
    expect(page.get_by_role("list", name="Policy decisions", exact=True)).to_have_count(0)
    expect(region.get_by_role("button", name="Try again", exact=True)).to_have_count(0)
    assert len(hits["runs/run_1/decisions"]) == 3
