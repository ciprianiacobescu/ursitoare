import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { OPENAPI_FILE, servedOpenApiText } from "../../test/support/openapi-docs.ts";

const IDS_PATTERN = "^[A-Za-z0-9_-]{1,64}(,[A-Za-z0-9_-]{1,64}){0,49}$";

interface Operation {
  "x-ursitoare-action"?: unknown;
  "x-ursitoare-auth"?: unknown;
  "x-ursitoare-errors"?: unknown;
  parameters?: unknown;
  responses?: unknown;
}

interface OperationDocument {
  paths: Record<string, Record<string, Operation | undefined> | undefined>;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  assert.ok(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${label} is an object`,
  );
  return value as Record<string, unknown>;
}

function operationOf(
  document: OperationDocument,
  path: string,
): Operation {
  const pathItem = document.paths[path];
  assert.ok(pathItem !== undefined, `the document lists ${path}`);
  const operation = pathItem["get"];
  assert.ok(operation !== undefined, `${path} carries the get operation`);
  return operation;
}

test("C-fb2cd0d1 the committed OpenAPI document describes both people routes", async () => {
  let served = "not run";
  await assert.doesNotReject(async () => {
    served = await servedOpenApiText();
  }, "servedOpenApiText answers the rendered document");

  const committed = await readFile(OPENAPI_FILE, "utf8");
  assert.equal(
    committed,
    served,
    "docs/api/openapi.json differs from the served document; run pnpm run test test/support/openapi-docs.ts",
  );

  const document = JSON.parse(served) as OperationDocument;
  const paths = document.paths;
  assert.equal(Object.keys(paths).length, 53, "the document lists 53 paths");

  const people = operationOf(document, "/api/v1/people");
  assert.deepEqual(people["x-ursitoare-errors"], [
    "AUTHZ_UNAVAILABLE",
    "FORBIDDEN",
    "UNAUTHENTICATED",
    "VALIDATION_FAILED",
  ]);
  assert.equal(people["x-ursitoare-action"], "read_self");
  assert.equal(people["x-ursitoare-auth"], "session");
  assert.deepEqual(
    Object.keys(asRecord(people.responses, "the people responses")),
    ["200", "400", "401", "403", "503"],
  );
  assert.deepEqual(people.parameters, [
    {
      in: "query",
      name: "ids",
      required: true,
      schema: { pattern: IDS_PATTERN, type: "string" },
    },
  ]);

  const teams = operationOf(document, "/api/v1/me/teams");
  assert.deepEqual(teams["x-ursitoare-errors"], [
    "AUTHZ_UNAVAILABLE",
    "FORBIDDEN",
    "UNAUTHENTICATED",
  ]);
  assert.equal(teams["x-ursitoare-action"], "read_self");
  assert.equal(teams["x-ursitoare-auth"], "session");
  assert.deepEqual(
    Object.keys(asRecord(teams.responses, "the teams responses")),
    ["200", "401", "403", "503"],
  );

  const me = operationOf(document, "/api/v1/me");
  const meResponse = asRecord(asRecord(me.responses, "the me responses")["200"], "the me 200");
  const meBody = asRecord(
    asRecord(asRecord(meResponse["content"], "the me content")["application/json"], "the me json")[
      "schema"
    ],
    "the me schema",
  );
  assert.deepEqual(meBody["required"], ["user", "tenant", "capabilities", "csrfToken"]);
  assert.equal(Object.hasOwn(meBody, "teams"), false, "/me keeps its four keys and no teams");
});
