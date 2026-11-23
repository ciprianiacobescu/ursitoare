import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { OPENAPI_FILE, servedOpenApiText } from "../test/support/openapi-docs.ts";

type Json = Record<string, unknown>;

const OPERATIONS: readonly (readonly [string, string, string])[] = [
  ["/api/v1/tool-registrations/openapi/preview", "post", "post_api_v1_tool_registrations_openapi_preview"],
  ["/api/v1/tool-registrations/openapi", "post", "post_api_v1_tool_registrations_openapi"],
  ["/api/v1/tool-servers/{id}/openapi", "put", "put_api_v1_tool_servers_id_openapi"],
];

function checkDocument(text: string): void {
  const doc = JSON.parse(text) as { paths: Record<string, Json> };
  for (const [path, method, operationId] of OPERATIONS) {
    const op = doc.paths[path]?.[method] as Json | undefined;
    assert.ok(op, `${method} ${path} is listed`);
    assert.equal(op["operationId"], operationId);
    assert.equal(op["x-ursitoare-action"], "register_tool_server");
  }
}

test("C-dcacef6b the served document holds the three OpenAPI tool operations", async () => {
  checkDocument(await servedOpenApiText());
});

test("C-dcacef6b the committed document holds the three OpenAPI tool operations", async () => {
  checkDocument(await readFile(OPENAPI_FILE, "utf8"));
});

test("C-dcacef6b main passes the http adapter in calls to createInvokePath", async () => {
  const source = await readFile(new URL("./main.ts", import.meta.url), "utf8");
  const code = source
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
  assert.match(code, /calls:\s*\{[^}]*\bhttp:\s*httpCallAdapter\b/);
});
