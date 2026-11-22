import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { OPENAPI_FILE } from "../../test/support/openapi-docs.ts";
import { renderOpenApi } from "./openapi.ts";

assert.equal(typeof renderOpenApi, "function");
assert.equal(typeof OPENAPI_FILE, "string");

const PATTERN = "^[a-z][a-z0-9_]{0,127}$";

interface Document {
  paths: Record<string, Record<string, unknown> | undefined>;
}

interface Location {
  label: string;
  path: string;
  method: string;
  keys: readonly string[];
}

const LOCATIONS: readonly Location[] = [
  {
    label: "the grants list items",
    path: "/api/v1/grants",
    method: "get",
    keys: [
      "responses",
      "200",
      "content",
      "application/json",
      "schema",
      "properties",
      "items",
      "items",
      "properties",
      "grant",
      "properties",
      "scope",
      "properties",
      "nodeId",
    ],
  },
  {
    label: "the create body",
    path: "/api/v1/grants",
    method: "post",
    keys: [
      "requestBody",
      "content",
      "application/json",
      "schema",
      "properties",
      "scope",
      "properties",
      "nodeId",
    ],
  },
  {
    label: "the 201 record",
    path: "/api/v1/grants",
    method: "post",
    keys: [
      "responses",
      "201",
      "content",
      "application/json",
      "schema",
      "properties",
      "scope",
      "properties",
      "nodeId",
    ],
  },
  {
    label: "the revoke record",
    path: "/api/v1/grants/{id}",
    method: "delete",
    keys: [
      "responses",
      "200",
      "content",
      "application/json",
      "schema",
      "properties",
      "scope",
      "properties",
      "nodeId",
    ],
  },
  {
    label: "the confirm record",
    path: "/api/v1/grants/{id}/confirm",
    method: "post",
    keys: [
      "responses",
      "200",
      "content",
      "application/json",
      "schema",
      "properties",
      "scope",
      "properties",
      "nodeId",
    ],
  },
];

function asRecord(value: unknown, label: string): Record<string, unknown> {
  assert.ok(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${label} is an object`,
  );
  return value as Record<string, unknown>;
}

function valueAt(root: unknown, keys: readonly string[], label: string): unknown {
  let current: unknown = root;
  for (const key of keys) {
    const record = asRecord(current, `${label} ${key}`);
    current = record[key];
  }
  return current;
}

function operationOf(document: Document, path: string, method: string): unknown {
  const pathItem = document.paths[path];
  assert.ok(pathItem !== undefined, `the document lists ${path}`);
  const operation = pathItem[method];
  assert.ok(operation !== undefined, `${path} carries the ${method} operation`);
  return operation;
}

function collectPatternNodeIds(value: unknown, found: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectPatternNodeIds(item, found);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  const record = value as Record<string, unknown>;
  const nodeId = record["nodeId"];
  if (typeof nodeId === "object" && nodeId !== null && !Array.isArray(nodeId)) {
    const pattern = (nodeId as Record<string, unknown>)["pattern"];
    if (typeof pattern === "string") found.push(pattern);
  }
  for (const nested of Object.values(record)) collectPatternNodeIds(nested, found);
}

test("C-fe644ebe the committed document holds the node id bound five times", async () => {
  const document = JSON.parse(await readFile(OPENAPI_FILE, "utf8")) as Document;

  for (const location of LOCATIONS) {
    const operation = operationOf(document, location.path, location.method);
    const nodeId = asRecord(
      valueAt(operation, location.keys, location.label),
      `${location.label} nodeId`,
    );
    assert.equal(nodeId["pattern"], PATTERN, `${location.label} carries the node-id bound`);
  }

  const found: string[] = [];
  collectPatternNodeIds(document, found);
  assert.equal(found.length, 5, `exactly five nodeId properties carry a pattern: ${found.length}`);
  for (const pattern of found) {
    assert.equal(pattern, PATTERN, "every nodeId pattern is the node-id bound");
  }
});
