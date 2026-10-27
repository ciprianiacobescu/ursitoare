"""Browser gate for the e2e stack: database health, control paths and fresh_state.

The records here are for the fake profile served by test/support/e2e-stack/main.ts.
"""

import json
import os
import urllib.error
import urllib.request

import pytest
from playwright.sync_api import Page

DEFAULT_CONTROL_URL = "http://127.0.0.1:39081"


def _require_fake_profile(profile: str) -> None:
    if profile != "fake":
        pytest.skip("the e2e stack tests need the fake profile")


def _control_url() -> str:
    return os.environ.get("E2E_CONTROL_URL") or DEFAULT_CONTROL_URL


def _opener() -> urllib.request.OpenerDirector:
    return urllib.request.build_opener(urllib.request.ProxyHandler({}))


def _request(method: str, url: str) -> tuple[int, str]:
    request = urllib.request.Request(url, method=method)
    try:
        with _opener().open(request, timeout=60) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8")


@pytest.fixture
def injected_fault(e2e_profile: str):
    if e2e_profile != "fake":
        pytest.skip("the injected fault needs the fake profile")
    url = f"{_control_url()}/faults"
    body = json.dumps({"method": "GET", "url": "/health", "status": 503}).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with _opener().open(request, timeout=60) as response:
        assert response.status == 204
    try:
        yield
    finally:
        delete = urllib.request.Request(url, method="DELETE")
        with _opener().open(delete, timeout=60) as response:
            assert response.status == 204


@pytest.mark.milestone("M0")
@pytest.mark.l4("C-0828b57f")
def test_health_reports_database_ok(page: Page, base_url: str, e2e_profile: str) -> None:
    _require_fake_profile(e2e_profile)
    response = page.goto(f"{base_url}/health")
    assert response is not None
    assert response.status == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["checks"]["db"] == "ok"


@pytest.mark.milestone("M0")
@pytest.mark.l4("C-0828b57f")
def test_control_paths_are_not_on_the_engine_port(
    base_url: str, e2e_profile: str
) -> None:
    _require_fake_profile(e2e_profile)
    for method, path in (
        ("POST", "/reset"),
        ("POST", "/faults"),
        ("DELETE", "/faults"),
    ):
        status, text = _request(method, f"{base_url}{path}")
        assert status == 404, f"{method} {path} is not served by the engine"
        assert json.loads(text)["error"]["code"] == "NOT_FOUND"


@pytest.mark.milestone("M0")
@pytest.mark.l4("C-67438cd6")
def test_injected_fault_fails_the_route(
    page: Page, base_url: str, e2e_profile: str, injected_fault: None
) -> None:
    _require_fake_profile(e2e_profile)
    response = page.goto(f"{base_url}/health")
    assert response is not None
    assert response.status == 503
    assert response.json()["error"]["code"] == "FAULT_INJECTED"


@pytest.mark.milestone("M0")
@pytest.mark.l4("C-67438cd6")
def test_fresh_state_clears_faults(
    page: Page,
    base_url: str,
    e2e_profile: str,
    injected_fault: None,
    fresh_state: None,
) -> None:
    _require_fake_profile(e2e_profile)
    response = page.goto(f"{base_url}/health")
    assert response is not None
    assert response.status == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["checks"]["db"] == "ok"


@pytest.mark.milestone("M0")
@pytest.mark.l4("C-ef0357b4")
def test_fresh_state_is_a_noop_on_the_stack_profile(
    e2e_profile: str, monkeypatch: pytest.MonkeyPatch, request: pytest.FixtureRequest
) -> None:
    _require_fake_profile(e2e_profile)
    monkeypatch.setenv("E2E_PROFILE", "stack")
    monkeypatch.setenv("E2E_CONTROL_URL", "http://127.0.0.1:1")
    assert request.getfixturevalue("fresh_state") is None


@pytest.mark.milestone("M0")
@pytest.mark.l4("C-ef0357b4")
def test_fresh_state_reports_an_unreachable_control_url(
    e2e_profile: str, monkeypatch: pytest.MonkeyPatch, request: pytest.FixtureRequest
) -> None:
    _require_fake_profile(e2e_profile)
    url = "http://127.0.0.1:1"
    monkeypatch.setenv("E2E_PROFILE", "fake")
    monkeypatch.setenv("E2E_CONTROL_URL", url)
    with pytest.raises(RuntimeError) as caught:
        request.getfixturevalue("fresh_state")
    assert url in str(caught.value)
