import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { listDefinedRoutes } from "./route.ts";
import { buildServer } from "./server.ts";
import { registerWebApp } from "./web.ts";

const silentDestination: LogDestination = { write(): void {} };
const INDEX_HTML = "<!doctype html>\n<html><body><div id=\"root\"></div></body></html>\n";

test("C-c31ceb04 health and static are classified public routes", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "ursitoare-web-classify-"));
  const distDir = join(root, "dist");
  await mkdir(distDir, { recursive: true });
  await writeFile(join(distDir, "index.html"), INDEX_HTML, "utf8");

  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  t.after(async () => {
    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  assert.doesNotThrow(() => {
    registerWebApp(server, { distDir });
  });

  const routes = listDefinedRoutes(server);
  assert.deepEqual(
    routes.filter((route) => route.url === "/health"),
    [
      {
        method: "GET",
        url: "/health",
        auth: { kind: "public", reason: "health" },
        action: null,
        errors: [],
        schema: {},
        listener: "public",
      },
    ],
  );
  assert.deepEqual(
    routes.filter((route) => route.url === "/*"),
    [
      {
        method: "GET",
        url: "/*",
        auth: { kind: "public", reason: "static" },
        action: null,
        errors: ["NOT_FOUND", "WEB_NOT_BUILT"],
        schema: {},
        listener: "public",
      },
    ],
  );

  const health = await server.inject({ method: "GET", url: "/health" });
  assert.equal(health.statusCode, 200);
  assert.equal((health.json() as { status?: unknown }).status, "ok");

  const home = await server.inject({ method: "GET", url: "/" });
  assert.equal(home.statusCode, 200);
  assert.equal(home.body, INDEX_HTML);

  const missing = await server.inject({ method: "GET", url: "/api/v1/nope" });
  assert.equal(missing.statusCode, 404);
  assert.deepEqual(missing.json(), {
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
});
