import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { OPENAPI_FILE, servedOpenApiText } from "../../test/support/openapi-docs.ts";

const GRANT_OPERATIONS: [string, string][] = [
  ["/api/v1/grants", "get"],
  ["/api/v1/grants", "post"],
  ["/api/v1/grants/reconfirmations", "get"],
  ["/api/v1/grants/{id}", "delete"],
  ["/api/v1/grants/{id}/confirm", "post"],
];

test("C-2fec7263 the served OpenAPI document lists the five grant routes with deploy_policy", async () => {
  let served = "not run";
  await assert.doesNotReject(async () => {
    served = await servedOpenApiText();
  }, "servedOpenApiText answers the rendered document");
  const document = JSON.parse(served) as {
    paths: Record<string, Record<string, { "x-ursitoare-action"?: string } | undefined>>;
  };
  for (const [path, method] of GRANT_OPERATIONS) {
    const pathItem = document.paths[path];
    assert.ok(
      pathItem !== undefined,
      `the document lists ${path}: ${JSON.stringify(Object.keys(document.paths))}`,
    );
    const operation = pathItem[method];
    assert.ok(operation !== undefined, `${path} carries the ${method} operation`);
    assert.equal(
      operation["x-ursitoare-action"],
      "deploy_policy",
      `${path} ${method} carries deploy_policy`,
    );
  }

  assert.ok(existsSync(OPENAPI_FILE), "docs/api/openapi.json exists");
  const committed = await readFile(OPENAPI_FILE, "utf8");
  assert.equal(
    committed,
    served,
    "docs/api/openapi.json differs from the served document; run node test/support/openapi-docs.ts",
  );
});
