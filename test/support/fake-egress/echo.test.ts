import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { test } from "node:test";

import { startEchoUpstream } from "./echo.ts";
import type { EchoUpstream } from "./echo.ts";

interface Answer {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function send(origin: string, method: string, path: string, headers: Record<string, string>, body?: string): Promise<Answer> {
  return new Promise((resolve, reject) => {
    const req = http.request(origin + path, { method, headers, agent: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") });
      });
    });
    req.on("error", reject);
    req.end(body);
  });
}

function connectCode(port: number): Promise<string> {
  return new Promise((resolve) => {
    const s = net.connect(port, "127.0.0.1");
    s.on("connect", () => {
      s.destroy();
      resolve("connected");
    });
    s.on("error", (e: NodeJS.ErrnoException) => {
      resolve(e.code ?? "error");
    });
  });
}

test("C-fd7f2cf3 the echo upstream shows what it received", async () => {
  let echo: EchoUpstream | undefined;
  await assert.doesNotReject(async () => {
    echo = await startEchoUpstream();
  });
  assert.ok(echo !== undefined, "echo started");
  assert.match(echo.origin, /^http:\/\/127\.0\.0\.1:\d+$/);

  const first = await send(echo.origin, "POST", "/a%20b/c?x=%41&y", { "X-Caller": "2" }, "hello");
  assert.equal(first.status, 200);
  const seen = JSON.parse(first.body) as { method: string; path: string; query: string; headers: Record<string, string>; bodySha256: string };
  assert.equal(seen.method, "POST");
  assert.equal(seen.path, "/a%20b/c");
  assert.equal(seen.query, "x=%41&y");
  assert.equal(seen.headers["x-caller"], "2");
  assert.equal(seen.bodySha256, "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");

  const second = await send(echo.origin, "GET", "/redirect", {});
  assert.equal(second.status, 302);
  assert.equal(second.headers["location"], "/landing?from=echo");
  assert.equal(second.body, "");

  const port = Number(new URL(echo.origin).port);
  await Promise.all([echo.close(), echo.close()]);
  assert.equal(await connectCode(port), "ECONNREFUSED");
});
