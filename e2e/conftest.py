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

import pytest

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


def assert_accessible(page) -> None:
    """Stub (task 9.1 red step): implemented in the green step of this task."""
    raise NotImplementedError
