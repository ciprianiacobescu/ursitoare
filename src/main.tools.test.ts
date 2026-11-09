import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { OPENAPI_FILE } from "../test/support/openapi-docs.ts";

interface Operation {
  operationId?: string;
  "x-ursitoare-action"?: string;
  "x-ursitoare-errors"?: string[];
  requestBody?: {
    content?: { "application/json"?: { schema?: Record<string, unknown> } };
  };
}

interface Document {
  paths?: Record<string, Record<string, Operation>>;
}

const PATHS: readonly string[] = [
  "/api/v1/tool-servers",
  "/api/v1/tool-servers/{id}",
  "/api/v1/tool-servers/{id}/surface",
  "/api/v1/tool-servers/{id}/surface/approve",
];

const OPERATIONS: readonly string[] = [
  "get_api_v1_tool_servers",
  "post_api_v1_tool_servers",
  "get_api_v1_tool_servers_id",
  "put_api_v1_tool_servers_id_surface",
  "post_api_v1_tool_servers_id_surface_approve",
];

test("C-0bfb5dc5 the committed OpenAPI document holds the five tool server operations with their actions", async () => {
  assert.ok(existsSync(OPENAPI_FILE), "docs/api/openapi.json exists");
  const document = JSON.parse(await readFile(OPENAPI_FILE, "utf8")) as Document;
  assert.ok(document.paths !== undefined, "the committed document holds paths");

  const operationIds: string[] = [];
  const actions: Record<string, string> = {};
  for (const path of PATHS) {
    const item = document.paths[path];
    assert.ok(item !== undefined, `the document lists ${path}`);
    for (const operation of Object.values(item)) {
      assert.ok(
        operation.operationId !== undefined,
        "every tool server operation carries an operation id",
      );
      operationIds.push(operation.operationId);
      assert.ok(
        operation["x-ursitoare-action"] !== undefined,
        "every tool server operation carries an action",
      );
      actions[operation.operationId] = operation["x-ursitoare-action"];
    }
  }
  operationIds.sort();
  assert.deepEqual(operationIds, [...OPERATIONS].sort(), "the five operation ids are present");

  for (const id of OPERATIONS) {
    const expected = id === "post_api_v1_tool_servers_id_surface_approve"
      ? "approve_tool_surface"
      : "register_tool_server";
    assert.equal(
      actions[id],
      expected,
      `${id} carries action ${expected}`,
    );
  }

  const approve = document.paths["/api/v1/tool-servers/{id}/surface/approve"]?.post;
  assert.ok(approve !== undefined, "the approve operation exists");
  const errors = approve["x-ursitoare-errors"] ?? [];
  for (const code of ["OPERATION_REFUSED", "FORBIDDEN", "NOT_FOUND"]) {
    assert.ok(errors.includes(code), `the approve operation lists ${code}`);
  }

  const post = document.paths["/api/v1/tool-servers"]?.post;
  assert.ok(post !== undefined, "the register operation exists");
  const body = post.requestBody?.content?.["application/json"]?.schema;
  assert.ok(body !== undefined, "the register operation declares a body schema");
  assert.equal(body["additionalProperties"], false);
  assert.deepEqual(
    body["required"],
    ["id", "adapter", "origin", "surface"],
    "the register body requires id, adapter, origin and surface",
  );
  const properties = body["properties"] as Record<string, unknown> | undefined;
  assert.ok(properties !== undefined, "the register body declares properties");
  assert.deepEqual(properties["local"], { type: "boolean" }, "local is a boolean property");
});
