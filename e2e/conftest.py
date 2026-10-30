"""Shared fixtures for browser e2e tests (test-support file: only a task that names it may change it).

Two targets run the same tests (docs/testing.md):
- fake profile: the L4 e2e gate serves test/support/e2e-stack/main.ts offline (loopback only), and
  .github/workflows/e2e.yml runs the same on every push to main;
- stack profile: the real compose stack, once per milestone from M8 on (E2E_PROFILE=stack). Tests marked `stack` are
  deselected by default (e2e/pyproject.toml addopts); scripts/stack-e2e.sh selects them.
"""

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

import pytest
from playwright.sync_api import expect

DEFAULT_BASE_URL = "http://127.0.0.1:39080"
DEFAULT_CONTROL_URL = "http://127.0.0.1:39081"


@pytest.fixture(scope="session")
def base_url() -> str:
    """L4 exports the served origin as L4_E2E_BASE_URL; a local run may set E2E_BASE_URL."""
    return os.environ.get("L4_E2E_BASE_URL") or os.environ.get("E2E_BASE_URL") or DEFAULT_BASE_URL


@pytest.fixture(scope="session")
def e2e_profile() -> str:
    return os.environ.get("E2E_PROFILE", "fake")


def _reset_failure(url: str, status: int, body: str) -> RuntimeError:
    message = f"reset failed at {url}: HTTP {status}"
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return RuntimeError(message)
    error = payload.get("error") if isinstance(payload, dict) else None
    if isinstance(error, dict):
        message = (
            f"reset failed at {url}: {error.get('code')} "
            f"{json.dumps(error.get('details'))}"
        )
    return RuntimeError(message)


@pytest.fixture
def fresh_state() -> None:
    """Reset the fake stack before a test; the stack profile has nothing to reset here."""
    profile = os.environ.get("E2E_PROFILE", "fake")
    if profile == "stack":
        return
    url = os.environ.get("E2E_CONTROL_URL", DEFAULT_CONTROL_URL)
    request = urllib.request.Request(f"{url}/reset", method="POST")
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(request, timeout=60) as response:
            if not 200 <= response.status < 300:
                raise _reset_failure(
                    url, response.status, response.read().decode("utf-8")
                )
    except urllib.error.HTTPError as error:
        raise _reset_failure(url, error.code, error.read().decode("utf-8")) from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"could not reach the stack control URL {url}: {error}") from error


@pytest.fixture
def users(e2e_profile: str) -> dict[str, dict[str, str]]:
    """The seed users of the fake stack (passwords are the fake's per-start values)."""
    if e2e_profile != "fake":
        raise RuntimeError(
            f"the users fixture needs the fake profile, not {e2e_profile!r}"
        )
    url = os.environ.get("E2E_CONTROL_URL", DEFAULT_CONTROL_URL)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(f"{url}/seed", timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, json.JSONDecodeError) as error:
        raise RuntimeError(f"could not read the seed users at {url}/seed: {error}") from error
    found = payload.get("users") if isinstance(payload, dict) else None
    if not isinstance(found, dict):
        raise RuntimeError(f"the seed answer at {url}/seed has no users object")
    return found


def login(page, user: dict[str, str], path: str = "/sign-in") -> None:
    """Sign in through the engine's Sign in button and the fake provider's form."""
    page.goto(path)
    page.get_by_role("button", name="Sign in", exact=True).click()
    page.get_by_label("Username or email").fill(user["username"])
    page.get_by_label("Password").fill(user["password"])
    page.get_by_role("button", name="Sign In", exact=True).click()
    expect(page.get_by_role("banner")).to_contain_text(user["displayName"])


def _axe_source() -> str:
    """Read the installed axe-core bundle; never fetch it from the network."""
    bundle = (
        Path(__file__).resolve().parent.parent
        / "node_modules"
        / "axe-core"
        / "axe.min.js"
    )
    try:
        return bundle.read_text(encoding="utf-8")
    except OSError:
        pytest.fail("axe-core is not installed: run pnpm install")


AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]
AXE_BLOCKING_IMPACTS = ("serious", "critical")


def assert_accessible(page) -> None:
    """Run axe-core against the page, offline and without weakening its CSP."""
    if page.evaluate("typeof window.axe") == "undefined":
        page.evaluate(_axe_source())
    found = page.evaluate(
        """async (tags) => { const r = await window.axe.run(document, { runOnly: { type: "tag", values: tags } });
        return r.violations.map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.map((n) => n.target.join(" ")) })); }""",
        AXE_TAGS,
    )
    blocking = sorted(
        (v for v in found if v["impact"] in AXE_BLOCKING_IMPACTS),
        key=lambda v: v["id"],
    )
    if blocking:
        pytest.fail(
            "accessibility violations: "
            + "; ".join(
                f'{v["id"]} ({v["impact"]}): {", ".join(v["targets"][:3])}'
                for v in blocking
            ),
            pytrace=False,
        )
