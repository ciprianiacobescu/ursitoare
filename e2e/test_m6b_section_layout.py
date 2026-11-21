"""The Section layout of the admin regions, measured in the browser (C-3802bfd0): a heading sits above its body."""

import pytest
from playwright.sync_api import Page, expect

from test_m6b_admin import (
    CAROL,
    FORBIDDEN,
    LISTITEM,
    SERVER,
    answer,
    grant_item,
    listing,
    open_page,
)

MEASURE = """(region) => {
  const heading = region.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]');
  const h = heading.getBoundingClientRect();
  const fontSize = parseFloat(getComputedStyle(heading).fontSize);
  const others = Array.from(region.children)
    .filter((child) => child !== heading && !child.contains(heading))
    .map((child) => { const r = child.getBoundingClientRect(); return { left: r.left, top: r.top }; });
  return { headingLeft: h.left, headingBottom: h.bottom, headingHeight: h.height, fontSize, others,
           headingIsChild: heading.parentElement === region };
}"""


def assert_section_layout(page: Page, name: str) -> None:
    region = page.get_by_role("region", name=name, exact=True)
    expect(region).to_be_visible()
    found = region.evaluate(MEASURE)
    assert found["headingIsChild"], name
    assert found["headingHeight"] < 2 * found["fontSize"], (name, found)
    assert found["others"], name
    for other in found["others"]:
        assert abs(other["left"] - found["headingLeft"]) <= 1, (name, found)
        assert other["top"] >= found["headingBottom"] - 0.5, (name, found)


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-3802bfd0")
def test_grants_regions_put_the_body_below_the_heading_with_rows(
    page: Page, base_url: str
) -> None:
    answer(page, "/people", CAROL)
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
        listing(grant_item("grant_2", {"kind": "user", "userId": "u_bob"}, {"kind": "any_step"}, "active")),
    )
    open_page(page, "/admin/grants")
    assert_section_layout(page, "New grant")


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-3802bfd0")
def test_grants_region_puts_the_body_below_the_heading_in_the_error_state(
    page: Page, base_url: str
) -> None:
    answer(page, "/blocks", FORBIDDEN, 403)
    answer(page, "/grants", FORBIDDEN, 403)
    open_page(page, "/admin/grants")
    assert_section_layout(page, "New grant")


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-3802bfd0")
def test_teams_region_puts_the_body_below_the_heading(page: Page, base_url: str) -> None:
    answer(page, "/roles", listing({"roleId": "author"}, {"roleId": "tenant_admin"}))
    answer(page, "/teams", listing({"teamId": "finance"}))
    open_page(page, "/admin/roles-and-teams")
    assert_section_layout(page, "Create team")


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-3802bfd0")
def test_mappings_region_puts_the_body_below_the_heading(page: Page, base_url: str) -> None:
    answer(page, "/roles", listing({"roleId": "author"}, {"roleId": "tenant_admin"}))
    answer(page, "/teams", listing({"teamId": "finance"}))
    answer(
        page,
        "/idp-group-map",
        listing(
            {
                "issuer": "http://idp.test/realms/u",
                "group": "ursitoare-authors",
                "roleId": "author",
                "teamId": None,
                "reviewedBy": "u_carol",
            }
        ),
    )
    answer(page, "/people", CAROL)
    open_page(page, "/admin/group-mappings")
    assert_section_layout(page, "Map a group")


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-3802bfd0")
def test_audit_regions_put_the_body_below_the_heading(page: Page, base_url: str) -> None:
    verify = {
        "ok": True,
        "checked": 2,
        "firstBadSeq": None,
        "reason": None,
        "anchorsChecked": False,
        "anchorsVerified": 0,
        "checkedAt": "2026-11-18T10:00:00.000000Z",
    }
    answer(page, "/people", CAROL)
    answer(page, "/audit/verify", verify)
    answer(page, "/audit", listing())
    open_page(page, "/admin/audit")
    assert_section_layout(page, "Chain verification")
    assert_section_layout(page, "Filter the audit log")


@pytest.mark.milestone("M6b")
@pytest.mark.l4("C-3802bfd0")
def test_surface_region_puts_the_body_below_the_heading(page: Page, base_url: str) -> None:
    answer(page, "/people", CAROL)
    answer(page, "/tool-servers", listing(LISTITEM))
    answer(page, "/tool-servers/acme", SERVER)
    open_page(page, "/admin/tool-servers?server=acme")
    assert_section_layout(page, "Surface")
