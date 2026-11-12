import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { OPENAPI_FILE } from "../../test/support/openapi-docs.ts";

interface Schema {
  description?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  type?: unknown;
  pattern?: string;
}

interface Operation {
  "x-ursitoare-action"?: string;
  "x-ursitoare-auth"?: string;
  "x-ursitoare-errors"?: string[];
  responses?: Record<string, { content?: Record<string, { schema?: Schema }> }>;
}

interface Document {
  paths: Record<string, Record<string, Operation> | undefined>;
}

const STEPS_DESCRIPTION =
  "Steps of the run. hooks.inputOriginalRef is the audit digest of the input before the pre-hooks changed it; the payload route does not serve it";

async function load(): Promise<Document> {
  return JSON.parse(await readFile(OPENAPI_FILE, "utf8")) as Document;
}

test("C-de41e7dd the steps 200 schema carries the hooks audit digest description", async () => {
  const document = await load();
  const schema =
    document.paths["/api/v1/runs/{runId}/steps"]?.["get"]?.responses?.["200"]?.content?.[
      "application/json"
    ]?.schema;
  assert.ok(schema !== undefined, "the steps operation has a 200 schema");
  assert.equal(schema.description, STEPS_DESCRIPTION);
});
