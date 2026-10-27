# l4: generated test (l4/generated-test@1); rewritten by the harness
import json
import os
import socket
from urllib.parse import urlparse

import pytest
from playwright.sync_api import Page, expect

TRAVERSAL_PATHS = [
    "/../secret.txt",
    "/assets/../../secret.txt",
    "/%2e%2e/secret.txt",
    "/%2e%2e%2fsecret.txt",
    "/..%5csecret.txt",
    "/a%00b",
    "/.git/config",
    "/link.txt",
    "/%252e%252e/secret.txt",
]


def _decode_chunked(raw_body: bytes) -> bytes:
    out = bytearray()
    rest = raw_body
    while rest:
        line, sep, rest = rest.partition(b"\r\n")
        if not sep:
            break
        size_token = line.split(b";", 1)[0].strip()
        if not size_token:
            continue
        size = int(size_token, 16)
        if size == 0:
            break
        out.extend(rest[:size])
        rest = rest[size + 2 :]
    return bytes(out)


def _raw_http_get(base_url: str, raw_target: str) -> tuple[int, str]:
    parsed = urlparse(base_url)
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    host_header = f"{host}:{port}" if parsed.port else host
    request_bytes = (
        f"GET {raw_target} HTTP/1.1\r\n"
        f"Host: {host_header}\r\n"
        "Connection: close\r\n"
        "\r\n"
    ).encode("ascii")

    chunks: list[bytes] = []
    with socket.create_connection((host, port), timeout=5) as sock:
        sock.sendall(request_bytes)
        while True:
            data = sock.recv(4096)
            if not data:
                break
            chunks.append(data)

    raw_response = b"".join(chunks)
    header_bytes, _, body_bytes = raw_response.partition(b"\r\n\r\n")
    header_lines = header_bytes.decode("iso-8859-1").split("\r\n")
    status_parts = header_lines[0].split(" ", 2)
    status_code = int(status_parts[1])

    headers: dict[str, str] = {}
    for line in header_lines[1:]:
        if ":" in line:
            k, v = line.split(":", 1)
            headers[k.strip().lower()] = v.strip().lower()

    if "chunked" in headers.get("transfer-encoding", ""):
        body_bytes = _decode_chunked(body_bytes)

    return status_code, body_bytes.decode("utf-8", errors="replace")


@pytest.mark.l4("C-0548f9d4")
def test_static_file_traversal_forms_over_socket_return_not_found(page: Page) -> None:
    base_url = os.environ["L4_E2E_BASE_URL"].rstrip("/")

    home_response = page.goto(f"{base_url}/")
    assert home_response is not None
    assert home_response.status == 200
    expect(page.get_by_role("link", name="Ursitoare")).to_be_visible()

    for path in TRAVERSAL_PATHS:
        status, body = _raw_http_get(base_url, path)
        assert status == 404, f"Expected 404 for {path}, got {status}: {body}"
        payload = json.loads(body)
        assert payload.get("error", {}).get("code") == "NOT_FOUND", (
            f"Expected NOT_FOUND error code for {path}, got {payload}"
        )
        assert "secret" not in body.lower(), f"Body for {path} leaked secret content: {body}"
