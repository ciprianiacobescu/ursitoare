"""Shared fixtures for browser e2e tests (test-support file: only a task that names it may change it).

Two targets run the same tests (docs/testing.md):
- fake profile: the L4 e2e gate serves test/support/e2e-stack/main.ts offline (loopback only), and
  .github/workflows/e2e.yml runs the same on every push to main;
- stack profile: the real compose stack, once per milestone from M8 on (E2E_PROFILE=stack). Tests marked `stack` are
  deselected by default (e2e/pyproject.toml addopts); scripts/stack-e2e.sh selects them.
"""

import os

import pytest

DEFAULT_BASE_URL = "http://127.0.0.1:39080"


@pytest.fixture(scope="session")
def base_url() -> str:
    """L4 exports the served origin as L4_E2E_BASE_URL; a local run may set E2E_BASE_URL."""
    return os.environ.get("L4_E2E_BASE_URL") or os.environ.get("E2E_BASE_URL") or DEFAULT_BASE_URL


@pytest.fixture(scope="session")
def e2e_profile() -> str:
    return os.environ.get("E2E_PROFILE", "fake")
