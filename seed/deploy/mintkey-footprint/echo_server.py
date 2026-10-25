#!/usr/bin/env python3
"""Tiny upstream for the M9 spike. Listens on 0.0.0.0:19050.
Echoes method, path and header NAMES. For the injected credential header it only reports whether the
value equals the expected throwaway secret (read from MKSPIKE_UPSTREAM_SECRET) - the value itself is never printed/logged."""
import json, os, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SECRET = os.environ["MKSPIKE_UPSTREAM_SECRET"]
HDR = os.environ.get("MKSPIKE_INJECT_HEADER", "X-Mkspike-Upstream-Key")
LOG = os.path.join(os.path.dirname(__file__), "evidence", "echo-requests.jsonl")

class H(BaseHTTPRequestHandler):
    def _do(self):
        got = self.headers.get(HDR)
        rec = {"ts": time.strftime("%H:%M:%S"), "method": self.command, "path": self.path,
               "header_names": sorted(k for k in self.headers.keys()),
               "injected_header": HDR, "injected_present": got is not None,
               "injected_value_matches_secret": (got == SECRET) if got is not None else None,
               "authorization_header_present": self.headers.get("Authorization") is not None}
        body = json.dumps(rec).encode()
        with open(LOG, "a") as f: f.write(body.decode() + "\n")
        self.send_response(200); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
    do_GET = do_POST = do_PUT = do_DELETE = _do
    def log_message(self, *a): pass

if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 19050), H).serve_forever()
