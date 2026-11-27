# l4: generated test (l4/generated-test@1); rewritten by the harness
import os
import subprocess
import sys
from pathlib import Path

import pytest

TARGET = "e2e/test_m7_tool_review.py::test_discovery_settings_and_calls"


def _find_root() -> Path:
    starts = [Path.cwd(), Path(__file__).resolve().parent]
    seen = set()
    for start in starts:
        for candidate in (start, *start.parents):
            if candidate in seen:
                continue
            seen.add(candidate)
            if (candidate / "e2e" / "test_m7_tool_review.py").is_file():
                return candidate
    raise AssertionError("e2e/test_m7_tool_review.py was not found")


@pytest.mark.l4("C-9da14d6e")
def test_discovery_settings_and_calls_keeps_trust_out_of_bodies() -> None:
    base = os.environ["L4_E2E_BASE_URL"]
    root = _find_root()
    env = dict(os.environ)
    env["L4_E2E_BASE_URL"] = base
    proc = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            "-q",
            "--no-header",
            "-p",
            "no:cacheprovider",
            TARGET,
        ],
        cwd=root,
        env=env,
        capture_output=True,
        text=True,
        timeout=900,
    )
    output = (proc.stdout or "") + (proc.stderr or "")
    assert proc.returncode == 0, output[-4000:]
    assert "passed" in output, output[-4000:]
