#!/usr/bin/env python3
"""Minimal stand-in for admin-api's POST /v1/internal/audit/emit (the endpoint both Go services' auditq posts to).
Validates X-Mintkey-Service-Token against the two throwaway tokens, appends each accepted event to evidence/audit-sink.jsonl
(payload keys only, never values of tokens), answers 202. This is the FIRST endpoint Ursitoare must provide on Path B."""
import json, os, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
OK = {os.environ["MKSPIKE_PROXY_SERVICE_TOKEN"], os.environ["MKSPIKE_BROKER_SERVICE_TOKEN"]}
LOG = os.path.join(os.path.dirname(__file__), "evidence", "audit-sink.jsonl")
class H(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0)); body = self.rfile.read(n)
        if self.path != "/v1/internal/audit/emit": self.send_response(404); self.end_headers(); return
        if self.headers.get("X-Mintkey-Service-Token") not in OK: self.send_response(401); self.end_headers(); return
        ev = json.loads(body)
        with open(LOG, "a") as f: f.write(json.dumps({"ts": time.strftime("%H:%M:%S"), "event_type": ev.get("event_type"), "tenant_id": ev.get("tenant_id"), "actor_id": ev.get("actor_id"), "actor_type": ev.get("actor_type"), "target_type": ev.get("target_type"), "payload_keys": sorted((ev.get("payload") or {}).keys())}) + "\n")
        self.send_response(202); self.end_headers()
    def log_message(self, *a): pass
if __name__ == "__main__": ThreadingHTTPServer(("0.0.0.0", 19051), H).serve_forever()
