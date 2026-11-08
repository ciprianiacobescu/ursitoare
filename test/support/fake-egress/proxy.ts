import http from "node:http";

import type { FakeState } from "./state.ts";

export function createProxyServer(_state: FakeState): http.Server {
  return http.createServer((req, res) => {
    req.resume();
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("404 page not found\n");
  });
}
