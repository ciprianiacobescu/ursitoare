"""The M6 tool pages: mocked answers for the server, grant and policy screens."""

import json
import re

import pytest
from playwright.sync_api import Page, Route, expect

from conftest import assert_accessible, login

DP = "sha256:" + "0123456789ab" + "c" * 52
DA = "sha256:" + "fedcba987654" + "d" * 52
IO = {"type": "object"}
SURF = {
    "tools": [
        {
            "name": "lookup_vendor",
            "effect": "read",
            "input": IO,
            "output": IO,
            "untrusted_result": False,
            "http": {"method": "POST", "path": "/blocks/erp.lookup_vendor@1"},
        },
        {
            "name": "create_payment",
            "effect": "pay",
            "input": IO,
            "output": IO,
            "unsafe_to_retry": True,
            "http": {"method": "POST", "path": "/blocks/erp.create_payment@1"},
        },
    ]
}
TOOLS = [
    {"name": "lookup_vendor", "effect": "read", "ref": None},
    {"name": "create_payment", "effect": "pay", "ref": None},
]
RAW = {
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
    "tools": TOOLS,
    "approvedSurface": None,
    "pendingSurface": SURF,
}
APPROVED = {
    **RAW,
    "state": "approved",
    "approvedDigest": DA,
    "approvedSurface": SURF,
    "pendingDigest": None,
    "pendingSurface": None,
    "pendingSubmittedBy": None,
    "tools": [
        {"name": "lookup_vendor", "effect": "read", "ref": "acme.lookup_vendor@1"},
        {"name": "create_payment", "effect": "pay", "ref": "acme.create_payment@1"},
    ],
}
ACCEPTED = {
    key: value
    for key, value in APPROVED.items()
    if key not in ("approvedSurface", "pendingSurface")
}
LISTITEM = {
    key: value
    for key, value in RAW.items()
    if key not in ("approvedSurface", "pendingSurface")
}
RAW_NS = {key: value for key, value in RAW.items() if key != "pendingSubmittedBy"}
RAW_D = {**RAW, "pendingSubmittedBy": "u_dave"}
RAW_2 = {**RAW_D, "pendingDigest": DA}
BLOCKS = [
    "acme.lookup_vendor@1",
    "acme.create_payment@1",
]

V = "599ac6e140250949aa9104d2e02c0da35508a8ec6227aa6cd452187caf2efdd8"
SRC = "forbid (principal, action, resource) when { false };"
POLICY_REC = {
    "tenantId": "tenant_a",
    "version": V,
    "source": SRC,
    "grantIds": ["grant_1"],
    "deployedBy": "u_carol",
    "deployedAt": "2026-11-06T10:00:00.000000Z",
}

INTERNAL = {"error": {"code": "INTERNAL", "message": "m"}}
FORBIDDEN = {
    "error": {
        "code": "FORBIDDEN",
        "message": "m",
        "details": {"decisionId": "dec_1"},
    }
}
HOLD = object()


def refused(reason: str, **details: object) -> dict[str, object]:
    payload: dict[str, object] = {"reason": reason}
    payload.update(details)
    return {"error": {"code": "OPERATION_REFUSED", "message": "m", "details": payload}}


def grant_record(**over: object) -> dict[str, object]:
    record: dict[str, object] = {
        "id": "grant_1",
        "subject": {"kind": "role", "role": "author"},
        "tool": "acme.create_payment@1",
        "scope": {"kind": "node", "flowId": "pay-run", "nodeId": "pay"},
        "args": [],
        "fingerprints": ["nf1_" + "a" * 64],
        "state": "active",
        "createdBy": "u_carol",
        "createdAt": "2026-11-06T10:00:00.000000Z",
        "revokedBy": None,
        "revokedAt": None,
    }
    record.update(over)
    return record


GRANT2 = grant_record(
    id="grant_2",
    subject={"kind": "user", "userId": "u_bob"},
    tool="acme.lookup_vendor@1",
    scope={"kind": "any_step"},
)
ITEM1 = {"grant": grant_record(), "status": "needs_reconfirm"}
ITEM1_ACTIVE = {"grant": grant_record(), "status": "active"}
ITEM2 = {"grant": GRANT2, "status": "active"}
ITEM2_REVOKED = {"grant": grant_record(**{**GRANT2, "state": "revoked"}), "status": "revoked"}


def block_item(ref: str, bound: bool) -> dict[str, object]:
    return {
        "ref": ref,
        "def": {"effect": "read"},
        "bound": bound,
        "contentHash": "a" * 64,
        "importedAt": "2026-11-06T10:00:00.000000Z",
    }


def _request_body(request: object) -> object:
    data = request.post_data
    if data is None:
        return None
    try:
        return json.loads(data)
    except json.JSONDecodeError:
        return data


def _header(hit: dict[str, object], name: str) -> str | None:
    headers = hit["headers"]
    if not isinstance(headers, dict):
        return None
    for key, value in headers.items():
        if isinstance(key, str) and key.lower() == name.lower():
            return value
    return None


def answer(page: Page, path: str, *replies: object, method: str = "GET") -> list[dict[str, object]]:
    pattern = re.compile(rf"/api/v1/{re.escape(path)}(?:\?.*)?$")
    hits: list[dict[str, object]] = []

    def handler(route: Route) -> None:
        if route.request.method.upper() != method:
            route.fallback()
            return
        hits.append(
            {
                "headers": route.request.headers,
                "body": _request_body(route.request),
            }
        )
        reply = replies[min(len(hits) - 1, len(replies) - 1)]
        if reply is HOLD:
            return
        status, body = reply
        route.fulfill(
            status=status,
            content_type="application/json",
            body=json.dumps(body),
        )

    page.route(pattern, handler)
    return hits


def solo_me(page: Page, base_url: str) -> str:
    response = page.request.get(f"{base_url}/api/v1/me")
    me = response.json()
    me["tenant"]["reviewProfile"] = "solo"
    page.route(
        re.compile(r"/api/v1/me(?:\?.*)?$"),
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(me),
        ),
    )
    return me["user"]["id"]


@pytest.mark.milestone("M6")
@pytest.mark.l4("C-95a4662e")
def test_c_95a4662e_server_detail_states_and_approval(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["carol"])
    answer(page, "tool-servers", (200, {"items": [], "next_cursor": None}))
    detail = answer(
        page,
        "tool-servers/acme",
        HOLD,
        (500, INTERNAL),
        (200, RAW_D),
        (200, RAW_2),
        (200, APPROVED),
    )
    approve = answer(
        page,
        "tool-servers/acme/surface/approve",
        (422, refused("digest_mismatch")),
        (200, {"server": ACCEPTED, "blocks": BLOCKS}),
        method="POST",
    )

    page.goto("/admin/tool-servers?server=acme")
    expect(page).to_have_title("Tool servers · Ursitoare")
    region = page.get_by_role("region", name="Surface", exact=True)
    button = region.get_by_role("button", name="Approve surface", exact=True)
    expect(region.get_by_role("status")).to_contain_text("Loading")
    expect(button).to_have_attribute("aria-disabled", "true")
    button.click(force=True)
    expect(page.get_by_role("dialog")).to_have_count(0)
    assert approve == []

    page.reload()
    expect(region.get_by_role("alert")).to_be_visible()
    expect(button).to_have_attribute("aria-disabled", "true")
    button.click(force=True)
    expect(page.get_by_role("dialog")).to_have_count(0)
    assert approve == []

    page.reload()
    expect(region).to_contain_text(
        "This server has not been approved. Its tools cannot be used yet. "
        "Pending surface 0123456789ab."
    )
    tools = page.get_by_role("table", name="Tools", exact=True)
    expect(tools.get_by_role("row")).to_have_count(3)
    lookup = tools.get_by_role("row").filter(has_text="lookup_vendor")
    expect(lookup).to_contain_text("read")
    expect(lookup).to_contain_text("trusted")
    expect(lookup).to_contain_text("POST /blocks/erp.lookup_vendor@1")
    payment = tools.get_by_role("row").filter(has_text="create_payment")
    expect(payment).to_contain_text("pay")
    expect(payment).to_contain_text("untrusted")
    expect(payment).to_contain_text("POST /blocks/erp.create_payment@1")
    expect(button).not_to_have_attribute("aria-disabled", "true")
    assert len(detail) == 3
    assert_accessible(page)

    button.click()
    dialog = page.get_by_role("dialog")
    expect(dialog).to_contain_text(
        "Once approved, the tools of acme can be used in flows that grants allow."
    )
    dialog.get_by_role("button", name="Approve surface", exact=True).click()
    expect(region.get_by_role("alert")).to_contain_text(
        "The surface changed while you were reading it. Reload the page and review it again."
    )
    expect(region).to_contain_text("Pending surface fedcba987654.")
    assert len(detail) == 4
    assert approve[0]["body"] == {"digest": DP, "selfApproval": False}

    button.click()
    dialog = page.get_by_role("dialog")
    expect(dialog.get_by_role("heading")).to_have_text("Approve surface fedcba987654?")
    dialog.get_by_role("button", name="Approve surface", exact=True).click()
    expect(region).to_contain_text("Surface approved.")
    expect(region).to_contain_text("acme · https://tools.fake.test · approved")
    approved_tools = page.get_by_role("table", name="Tools", exact=True)
    expect(approved_tools.get_by_role("row").filter(has_text="lookup_vendor")).to_contain_text(
        "acme.lookup_vendor@1"
    )
    expect(button).to_have_attribute("aria-disabled", "true")
    assert len(detail) == 5
    assert approve[1]["body"] == {"digest": DA, "selfApproval": False}
    assert_accessible(page)


@pytest.mark.milestone("M6")
@pytest.mark.l4("C-39cb580c")
def test_c_39cb580c_server_link_and_self_approval(
    page: Page, base_url: str, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["carol"])
    me_id = solo_me(page, base_url)
    raw_me = {**RAW, "pendingSubmittedBy": me_id}
    answer(page, "tool-servers", (200, {"items": [LISTITEM], "next_cursor": None}))
    detail = answer(
        page,
        "tool-servers/acme",
        (200, raw_me),
        (200, raw_me),
        (200, APPROVED),
        (200, RAW_NS),
        (200, APPROVED),
    )
    approve = answer(
        page,
        "tool-servers/acme/surface/approve",
        (200, {"server": ACCEPTED, "blocks": BLOCKS}),
        (422, refused("self_approval_required")),
        (200, {"server": ACCEPTED, "blocks": BLOCKS}),
        method="POST",
    )

    page.goto("/admin/tool-servers")
    expect(page).to_have_title("Tool servers · Ursitoare")
    page.get_by_role("link", name="acme", exact=True).click()
    expect(page).to_have_url(re.compile(r"/admin/tool-servers\?server=acme$"))
    region = page.get_by_role("region", name="Surface", exact=True)
    expect(region).to_contain_text(
        "You submitted this surface. Approving it is recorded as a self-approval."
    )
    box = region.get_by_role("checkbox", name="I approve my own surface", exact=True)
    expect(box).not_to_be_checked()
    assert len(detail) == 1
    assert_accessible(page)

    button = region.get_by_role("button", name="Approve surface", exact=True)
    button.click()
    expect(region.get_by_role("alert")).to_have_text(
        'Tick "I approve my own surface" to approve a surface you submitted.'
    )
    expect(page.get_by_role("dialog")).to_have_count(0)
    assert approve == []

    box.check()
    page.reload()
    box = region.get_by_role("checkbox", name="I approve my own surface", exact=True)
    expect(box).not_to_be_checked()
    assert len(detail) == 2
    box.check()
    button.click()
    dialog = page.get_by_role("dialog")
    dialog.get_by_role("button", name="Approve surface", exact=True).click()
    expect(region).to_contain_text("Surface approved.")
    expect(region).to_contain_text("acme · https://tools.fake.test · approved")
    assert len(detail) == 3
    assert approve[0]["body"] == {"digest": DP, "selfApproval": True}

    page.goto("/admin/tool-servers?server=acme")
    region = page.get_by_role("region", name="Surface", exact=True)
    button = region.get_by_role("button", name="Approve surface", exact=True)
    expect(
        region.get_by_role("checkbox", name="I approve my own surface", exact=True)
    ).to_have_count(0)
    button.click()
    dialog = page.get_by_role("dialog")
    dialog.get_by_role("button", name="Approve surface", exact=True).click()
    expect(region.get_by_role("alert")).to_contain_text(
        'You submitted this surface. Tick "I approve my own surface" to approve it.'
    )
    box = region.get_by_role("checkbox", name="I approve my own surface", exact=True)
    expect(box).not_to_be_checked()
    assert len(detail) == 4
    box.check()
    button.click()
    dialog = page.get_by_role("dialog")
    dialog.get_by_role("button", name="Approve surface", exact=True).click()
    expect(region).to_contain_text("Surface approved.")
    expect(region).to_contain_text("acme · https://tools.fake.test · approved")
    assert len(detail) == 5
    assert [hit["body"] for hit in approve] == [
        {"digest": DP, "selfApproval": True},
        {"digest": DP, "selfApproval": False},
        {"digest": DP, "selfApproval": True},
    ]
    assert_accessible(page)


@pytest.mark.milestone("M6")
@pytest.mark.l4("C-5f4e5a5b")
def test_c_5f4e5a5b_grant_create_confirm_and_revoke(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["carol"])
    answer(
        page,
        "blocks",
        (500, INTERNAL),
        (
            200,
            {
                "items": [
                    block_item("acme.lookup_vendor@1", True),
                    block_item("acme.create_payment@1", True),
                    block_item("erp.lookup_vendor@1", False),
                ],
                "next_cursor": None,
            },
        ),
    )
    grants = answer(
        page,
        "grants",
        (403, FORBIDDEN),
        (200, {"items": [ITEM1], "next_cursor": None}),
        (200, {"items": [ITEM1, ITEM2], "next_cursor": None}),
        (200, {"items": [ITEM1_ACTIVE, ITEM2], "next_cursor": None}),
        (200, {"items": [ITEM1_ACTIVE, ITEM2_REVOKED], "next_cursor": None}),
    )
    create = answer(
        page,
        "grants",
        (422, refused("user_unknown")),
        (201, GRANT2),
        method="POST",
    )
    confirm = answer(
        page,
        "grants/grant_1/confirm",
        (422, refused("revoked")),
        (200, grant_record()),
        method="POST",
    )
    revoke = answer(
        page,
        "grants/grant_2",
        (500, INTERNAL),
        (200, grant_record(**{**GRANT2, "state": "revoked"})),
        method="DELETE",
    )

    page.goto("/admin/grants")
    expect(page).to_have_title("Grants · Ursitoare")
    expect(page.get_by_role("alert").filter(has_text="dec_1")).to_be_visible()
    expect(page.get_by_role("alert")).to_have_count(2)
    select = page.get_by_label("Tool", exact=True)
    options = select.locator("option")
    expect(options).to_have_count(1)
    expect(options.nth(0)).to_have_text("Choose a tool")
    create_button = page.get_by_role("button", name="Create grant", exact=True)
    expect(create_button).to_have_attribute("aria-disabled", "true")
    page.get_by_label("Role or user", exact=True).fill("author")
    create_button.click(force=True)
    assert create == []
    assert_accessible(page)

    page.reload()
    table = page.get_by_role("table", name="Grants", exact=True)
    first = table.get_by_role("row").filter(
        has_text="role author · acme.create_payment@1 · pay-run / pay · needs_reconfirm"
    )
    expect(first).to_be_visible()
    assert len(grants) == 2
    expect(first.get_by_role("button", name="Revoke", exact=True)).to_be_visible()
    expect(
        first.get_by_role("button", name="Confirm for the newest version", exact=True)
    ).to_be_visible()
    select = page.get_by_label("Tool", exact=True)
    options = select.locator("option")
    expect(options).to_have_count(3)
    expect(options).to_have_text(
        ["Choose a tool", "acme.lookup_vendor@1", "acme.create_payment@1"]
    )
    assert_accessible(page)

    page.get_by_role("radio", name="User", exact=True).check()
    subject = page.get_by_label("Role or user", exact=True)
    subject.fill("u_bob")
    select.select_option(label="acme.lookup_vendor@1")
    create_button.click()
    expect(page.get_by_text("Error: That user does not exist.", exact=True)).to_be_visible()
    expect(subject).to_have_value("u_bob")
    assert len(create) == 1
    key = _header(create[0], "Idempotency-Key")
    assert key
    expected_body = {
        "subject": {"kind": "user", "userId": "u_bob"},
        "tool": "acme.lookup_vendor@1",
        "scope": {"kind": "any_step"},
        "args": [],
    }
    assert create[0]["body"] == expected_body

    create_button.click()
    expect(page.get_by_text("Grant created.", exact=True)).to_be_visible()
    expect(
        table.get_by_role("row").filter(
            has_text="user u_bob · acme.lookup_vendor@1 · any step · active"
        )
    ).to_be_visible()
    assert len(create) == 2
    assert _header(create[1], "Idempotency-Key") == key
    assert create[1]["body"] == expected_body
    expect(subject).to_have_value("")
    expect(page.get_by_role("radio", name="Role", exact=True)).to_be_checked()
    assert len(grants) == 3

    confirm_button = table.get_by_role("row").filter(
        has_text="role author · acme.create_payment@1 · pay-run / pay · needs_reconfirm"
    ).get_by_role("button", name="Confirm for the newest version", exact=True)
    confirm_button.click()
    expect(page.get_by_role("alert").filter(has_text="That grant is revoked.")).to_be_visible()
    assert len(grants) == 3
    assert len(confirm) == 1
    confirm_button.click()
    expect(page.get_by_text("Grant confirmed for the newest version.", exact=True)).to_be_visible()
    confirmed = table.get_by_role("row").filter(
        has_text="role author · acme.create_payment@1 · pay-run / pay · active"
    )
    expect(confirmed).to_be_visible()
    expect(
        confirmed.get_by_role("button", name="Confirm for the newest version", exact=True)
    ).to_have_count(0)
    assert len(confirm) == 2
    assert confirm[1]["body"] == {}
    assert len(grants) == 4

    revoke_button = table.get_by_role("row").filter(
        has_text="user u_bob · acme.lookup_vendor@1 · any step · active"
    ).get_by_role("button", name="Revoke", exact=True)
    revoke_button.click()
    expect(page.get_by_role("alert").first).to_be_visible()
    assert len(grants) == 4
    assert len(revoke) == 1
    revoke_button.click()
    expect(page.get_by_text("Grant revoked.", exact=True)).to_be_visible()
    revoked = table.get_by_role("row").filter(
        has_text="user u_bob · acme.lookup_vendor@1 · any step · revoked"
    )
    expect(revoked).to_be_visible()
    expect(revoked.get_by_role("button")).to_have_count(0)
    assert len(revoke) == 2
    assert len(grants) == 5
    expect(page.get_by_role("dialog")).to_have_count(0)
    assert_accessible(page)


@pytest.mark.milestone("M6")
@pytest.mark.l4("C-90aeb5ab")
def test_c_90aeb5ab_policy_loads_validates_and_deploys(
    page: Page, fresh_state: None, users: dict[str, dict[str, str]]
) -> None:
    login(page, users["carol"])
    policy = answer(
        page,
        "policies",
        HOLD,
        (500, INTERNAL),
        (200, {"current": None, "pendingGrants": 1}),
        (200, {"current": POLICY_REC, "pendingGrants": 0}),
    )
    validate = answer(
        page,
        "policies/validate",
        (
            200,
            {
                "ok": False,
                "policySetVersion": None,
                "problems": [
                    {
                        "stage": "parse",
                        "ids": [],
                        "message": "unexpected end of input",
                    }
                ],
            },
        ),
        (200, {"ok": True, "policySetVersion": V, "problems": []}),
        method="POST",
    )
    deploy = answer(
        page,
        "policies/deploy",
        (
            422,
            refused(
                "policy_invalid",
                problems=[{"stage": "policy", "ids": ["t-1"], "message": ""}],
            ),
        ),
        (201, POLICY_REC),
        method="POST",
    )

    page.goto("/admin/policies")
    expect(page).to_have_title("Policies · Ursitoare")
    validate_button = page.get_by_role("button", name="Validate", exact=True)
    deploy_button = page.get_by_role("button", name="Deploy", exact=True)
    expect(page.get_by_role("status")).to_contain_text("Loading")
    expect(validate_button).to_have_attribute("aria-disabled", "true")
    expect(deploy_button).to_have_attribute("aria-disabled", "true")
    validate_button.click(force=True)
    deploy_button.click(force=True)
    assert validate == []
    assert deploy == []

    page.reload()
    expect(page.get_by_role("alert").first).to_be_visible()
    expect(validate_button).to_have_attribute("aria-disabled", "true")
    validate_button.click(force=True)
    deploy_button.click(force=True)
    assert validate == []
    assert deploy == []

    page.reload()
    textarea = page.get_by_label("Hand-written Cedar", exact=True)
    expect(textarea).to_have_value("")
    expect(page.get_by_text("No policy deployed.", exact=True)).to_be_visible()
    expect(page.get_by_text("1 grant change is not deployed.", exact=True)).to_be_visible()
    expect(validate_button).not_to_have_attribute("aria-disabled", "true")
    expect(deploy_button).not_to_have_attribute("aria-disabled", "true")
    assert len(policy) == 3
    assert_accessible(page)

    textarea.fill("permit (")
    validate_button.click()
    expect(
        page.get_by_text("Not valid: parse: unexpected end of input", exact=True)
    ).to_be_visible()
    assert validate[0]["body"] == {"source": "permit ("}
    textarea.fill(SRC)
    validate_button.click()
    expect(page.get_by_text("Valid.", exact=True)).to_be_visible()
    assert validate[1]["body"] == {"source": SRC}

    deploy_button.click()
    expect(page.get_by_role("alert")).to_contain_text("Not valid: policy t-1")
    assert deploy[0]["body"] == {"source": SRC}
    assert len(policy) == 3
    deploy_button.click()
    expect(page.get_by_text("Deployed version 599ac6e14025.", exact=True)).to_be_visible()
    expect(page.get_by_text("Current version 599ac6e14025", exact=True)).to_be_visible()
    expect(page.get_by_text("All grant changes are deployed.", exact=True)).to_be_visible()
    assert deploy[1]["body"] == {"source": SRC}
    first_key = _header(deploy[0], "Idempotency-Key")
    second_key = _header(deploy[1], "Idempotency-Key")
    assert first_key and second_key and first_key != second_key
    assert len(policy) == 4
    assert_accessible(page)

