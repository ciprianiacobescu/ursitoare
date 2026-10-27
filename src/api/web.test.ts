import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { request } from "node:http";
import type { IncomingHttpHeaders } from "node:http";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import type { FastifyInstance } from "fastify";

import { sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import { buildServer } from "./server.ts";
import { DEFAULT_WEB_DIST, isWebBuilt, registerWebApp } from "./web.ts";

const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'";

const INDEX_HTML = "<!doctype html>\n<html><body><div id=\"root\"></div></body></html>\n";
const SECRET_TEXT = "text that only exists outside the web build";
const NOT_FOUND_BODY = { error: { code: "NOT_FOUND", message: "Route not found" } };
const WEB_NOT_BUILT_HINT = "run pnpm run build or set URSITOARE_WEB_DIST";

interface RawResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
}

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "ursitoare-web-"));
}

async function makeDist(
  root: string,
  files: Readonly<Record<string, string>> = {},
): Promise<string> {
  const distDir = join(root, "dist");
  await mkdir(distDir, { recursive: true });
  for (const [relative, content] of Object.entries(files)) {
    const target = join(distDir, relative);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  return distDir;
}

async function serve(distDir: string): Promise<FastifyInstance> {
  let server: FastifyInstance | undefined;
  await assert.doesNotReject(
    async () => {
      server = await buildServer({
        version: "0.0.0",
        ids: sequentialIds(1),
        logger: createLogger({ level: "silent" }),
        tracer: noopTracer,
      });
    },
    "buildServer must resolve",
  );
  const resolved = server;
  assert.ok(resolved !== undefined, "buildServer returns a server");
  assert.doesNotThrow(
    () => {
      registerWebApp(resolved, { distDir });
    },
    "registerWebApp must install the web app",
  );
  return resolved;
}

async function webBuilt(distDir: string): Promise<boolean> {
  let result: boolean | undefined;
  await assert.doesNotReject(
    async () => {
      result = await isWebBuilt(distDir);
    },
    "isWebBuilt must resolve",
  );
  assert.equal(typeof result, "boolean", "isWebBuilt answers a boolean");
  return result as boolean;
}

function assertSecurityHeaders(headers: Readonly<Record<string, unknown>>): void {
  assert.equal(headers["content-security-policy"], CONTENT_SECURITY_POLICY);
  assert.equal(headers["x-content-type-options"], "nosniff");
  assert.equal(headers["referrer-policy"], "no-referrer");
  assert.equal(headers["x-frame-options"], "DENY");
}

function errorCode(body: string): string {
  const parsed: unknown = JSON.parse(body);
  assert.ok(typeof parsed === "object" && parsed !== null, "the body is a JSON object");
  const error = (parsed as { error?: unknown }).error;
  assert.ok(typeof error === "object" && error !== null, "the body has an error object");
  const code = (error as { code?: unknown }).code;
  assert.equal(typeof code, "string");
  return code as string;
}

function rawRequest(port: number, path: string): Promise<RawResponse> {
  return new Promise<RawResponse>((resolvePromise, reject) => {
    const req = request(
      { host: "127.0.0.1", port, method: "GET", path },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        response.on("end", () => {
          resolvePromise({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

test("C-383b59d1 static files carry their type and cache policy and HEAD has an empty body", async (t) => {
  assert.equal(typeof registerWebApp, "function");
  const root = await tempRoot();
  const distDir = await makeDist(root, {
    "index.html": INDEX_HTML,
    "assets/index-Ab3dEf9Z.js": "console.log(1);\n",
    "favicon.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>",
  });
  const server = await serve(distDir);
  t.after(async () => {
    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  const index = await server.inject({ method: "GET", url: "/index.html" });
  assert.equal(index.statusCode, 200);
  assert.equal(index.headers["content-type"], "text/html; charset=utf-8");
  assert.equal(index.headers["cache-control"], "no-store");
  assert.equal(index.body, INDEX_HTML);

  const script = await server.inject({ method: "GET", url: "/assets/index-Ab3dEf9Z.js" });
  assert.equal(script.statusCode, 200);
  assert.equal(script.headers["content-type"], "text/javascript; charset=utf-8");
  assert.equal(script.headers["cache-control"], "public, max-age=31536000, immutable");
  assert.equal(script.body, "console.log(1);\n");

  const favicon = await server.inject({ method: "GET", url: "/favicon.svg" });
  assert.equal(favicon.statusCode, 200);
  assert.equal(favicon.headers["content-type"], "image/svg+xml");
  assert.equal(favicon.headers["cache-control"], "no-cache");

  const head = await server.inject({ method: "HEAD", url: "/assets/index-Ab3dEf9Z.js" });
  assert.equal(head.statusCode, 200);
  assert.equal(head.headers["content-type"], "text/javascript; charset=utf-8");
  assert.equal(head.headers["cache-control"], "public, max-age=31536000, immutable");
  assert.equal(head.body, "");
});

test("C-62803105 an unknown extension is served as octet-stream with nosniff", async (t) => {
  const root = await tempRoot();
  const distDir = await makeDist(root, {
    "index.html": INDEX_HTML,
    "data.bin": "opaque bytes",
  });
  const server = await serve(distDir);
  t.after(async () => {
    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  const response = await server.inject({ method: "GET", url: "/data.bin" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "application/octet-stream");
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.body, "opaque bytes");
});

test("C-133bb26a client routes and a directory fall back to index.html", async (t) => {
  const root = await tempRoot();
  const distDir = await makeDist(root, {
    "index.html": INDEX_HTML,
    "assets/index-Ab3dEf9Z.js": "console.log(1);\n",
  });
  const server = await serve(distDir);
  t.after(async () => {
    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  for (const url of ["/", "/flows", "/runs/r1/", "/t/ab.cd?x=1", "/assets"]) {
    const response = await server.inject({ method: "GET", url });
    assert.equal(response.statusCode, 200, `GET ${url} answers 200`);
    assert.equal(response.body, INDEX_HTML, `GET ${url} answers the index bytes`);
  }
});

test("C-ae2edc66 a missing asset-like path answers the JSON 404", async (t) => {
  const root = await tempRoot();
  const distDir = await makeDist(root, { "index.html": INDEX_HTML });
  const server = await serve(distDir);
  t.after(async () => {
    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  const home = await server.inject({ method: "GET", url: "/" });
  assert.equal(home.statusCode, 200, "the web app is registered and serves the index");
  assert.equal(home.body, INDEX_HTML);

  for (const url of [
    "/assets/missing-Ab3dEf9Z.js",
    "/logo.png",
    "/app.JS",
  ]) {
    const response = await server.inject({ method: "GET", url });
    assert.equal(response.statusCode, 404, `GET ${url} answers 404`);
    const contentType = response.headers["content-type"];
    assert.equal(typeof contentType, "string", `GET ${url} has a content type`);
    assert.ok(
      String(contentType).startsWith("application/json"),
      `GET ${url} answers JSON, not HTML`,
    );
    assert.deepEqual(JSON.parse(response.body), NOT_FOUND_BODY, `GET ${url} error envelope`);
  }
});

test("C-946ba56d unknown API and root paths answer the exact JSON 404", async (t) => {
  const root = await tempRoot();
  const distDir = await makeDist(root, { "index.html": INDEX_HTML });
  const server = await serve(distDir);
  t.after(async () => {
    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  const home = await server.inject({ method: "GET", url: "/" });
  assert.equal(home.statusCode, 200, "the web app is registered and serves the index");
  assert.equal(home.body, INDEX_HTML);

  const cases: { method: string; url: string }[] = [
    { method: "GET", url: "/api/v1/does-not-exist" },
    { method: "GET", url: "/API/v1/x" },
    { method: "GET", url: "/api" },
    { method: "GET", url: "/health/extra" },
    { method: "POST", url: "/api/v1/x" },
  ];

  for (const { method, url } of cases) {
    const response = await server.inject({ method, url });
    assert.equal(response.statusCode, 404, `${method} ${url} answers 404`);
    const contentType = response.headers["content-type"];
    assert.equal(typeof contentType, "string", `${method} ${url} has a content type`);
    assert.ok(
      String(contentType).startsWith("application/json"),
      `${method} ${url} answers JSON, not HTML`,
    );
    assert.deepEqual(JSON.parse(response.body), NOT_FOUND_BODY, `${method} ${url} error envelope`);
  }
});

test("C-a91f316f non-GET client routes answer 404 and a later specific route wins", async (t) => {
  const root = await tempRoot();
  const distDir = await makeDist(root, { "index.html": INDEX_HTML });
  const server = await serve(distDir);
  t.after(async () => {
    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  const home = await server.inject({ method: "GET", url: "/" });
  assert.equal(home.statusCode, 200, "the web app is registered and serves the index");
  assert.equal(home.body, INDEX_HTML);

  for (const { method, url } of [
    { method: "POST", url: "/flows" },
    { method: "PUT", url: "/flows" },
    { method: "DELETE", url: "/" },
  ]) {
    const response = await server.inject({ method, url });
    assert.equal(response.statusCode, 404, `${method} ${url} answers 404`);
    assert.deepEqual(JSON.parse(response.body), NOT_FOUND_BODY, `${method} ${url} error envelope`);
  }

  server.get("/api/v1/ping", async () => ({ ping: "pong" }));
  const ping = await server.inject({ method: "GET", url: "/api/v1/ping" });
  assert.equal(ping.statusCode, 200, "the route added after registerWebApp wins");
  assert.deepEqual(JSON.parse(ping.body), { ping: "pong" });
});

test("C-31ad3638 a missing build answers WEB_NOT_BUILT and is served once index.html appears", async (t) => {
  const root = await tempRoot();
  const distDir = join(root, "dist");
  const server = await serve(distDir);
  t.after(async () => {
    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  assert.equal(await webBuilt(distDir), false, "a missing directory is not a build");

  const missing = await server.inject({ method: "GET", url: "/" });
  assert.equal(missing.statusCode, 503);
  assert.equal(errorCode(missing.body), "WEB_NOT_BUILT");
  const parsed = JSON.parse(missing.body) as { error: { details?: { hint?: unknown } } };
  assert.equal(parsed.error.details?.hint, WEB_NOT_BUILT_HINT);
  assert.equal(missing.body.includes(distDir), false, "the body holds no directory path");
  assertSecurityHeaders(missing.headers);

  const health = await server.inject({ method: "GET", url: "/health" });
  assert.equal(health.statusCode, 200);

  await mkdir(distDir, { recursive: true });
  assert.equal(await webBuilt(distDir), false, "an empty directory is not a build");

  await writeFile(join(distDir, "index.html"), INDEX_HTML, "utf8");
  assert.equal(await webBuilt(distDir), true, "a directory with index.html is a build");

  const built = await server.inject({ method: "GET", url: "/" });
  assert.equal(built.statusCode, 200);
  assert.equal(built.body, INDEX_HTML);
  assertSecurityHeaders(built.headers);
});

test("C-56d1014e a directory that is not a web build serves no file", async (t) => {
  const root = await tempRoot();
  const distDir = await makeDist(root, { "secret.txt": SECRET_TEXT });
  const server = await serve(distDir);
  t.after(async () => {
    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  for (const url of ["/secret.txt", "/flows"]) {
    const response = await server.inject({ method: "GET", url });
    assert.equal(response.statusCode, 503, `GET ${url} answers 503`);
    assert.equal(errorCode(response.body), "WEB_NOT_BUILT");
    assert.equal(response.body.includes(SECRET_TEXT), false, `GET ${url} publishes no file`);
  }
});

test("C-2b18a36e DEFAULT_WEB_DIST is the repository's web/dist", () => {
  const expected = resolve(fileURLToPath(new URL("../../web/dist", import.meta.url)));
  assert.equal(isAbsolute(DEFAULT_WEB_DIST), true, "the default directory is absolute");
  assert.equal(DEFAULT_WEB_DIST, expected);
});

test("C-0548f9d4 raw socket traversal forms answer 404 and never read the secret", async (t) => {
  const root = await tempRoot();
  const secretPath = join(root, "secret.txt");
  await writeFile(secretPath, SECRET_TEXT, "utf8");
  const distDir = await makeDist(root, {
    "index.html": INDEX_HTML,
    "assets/index-Ab3dEf9Z.js": "console.log(1);\n",
  });
  await symlink(secretPath, join(distDir, "link.txt"));

  const server = await serve(distDir);
  t.after(async () => {
    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  await server.listen({ host: "127.0.0.1", port: 0 });
  const address = server.server.address();
  assert.ok(address !== null && typeof address !== "string", "the server listens on a port");
  const port = address.port;

  const home = await rawRequest(port, "/");
  assert.equal(home.status, 200, "the web app is registered and serves the index");
  assert.equal(home.body, INDEX_HTML);

  const paths = [
    "/../secret.txt",
    "/assets/../../secret.txt",
    "/%2e%2e/secret.txt",
    "/%2e%2e%2fsecret.txt",
    "/..%5csecret.txt",
    "/a%00b",
    "/.git/config",
    "/link.txt",
    "/%252e%252e/secret.txt",
  ];

  for (const path of paths) {
    const response = await rawRequest(port, path);
    assert.equal(response.status, 404, `GET ${path} answers 404`);
    assert.equal(errorCode(response.body), "NOT_FOUND", `GET ${path} error code`);
    assert.equal(
      response.body.includes(SECRET_TEXT),
      false,
      `GET ${path} does not publish the secret`,
    );
  }
});
