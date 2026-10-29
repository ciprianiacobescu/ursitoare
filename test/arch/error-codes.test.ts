import assert from "node:assert/strict";
import { test } from "node:test";

import { checkApiErrorCodes } from "./error-codes.ts";
import { readSnapshot, snapshotOf } from "./sources.ts";

assert.equal(typeof checkApiErrorCodes, "function");

const flowExists = "FLOW_EXISTS";

test("C-601275f9 An unregistered literal ApiError code fails the scan", () => {
  const snapshot = snapshotOf({
    "src/x/a.ts": [
      "const a = 1;",
      "// pad so the throw is on line 3",
      'throw new ApiError(409, "FLOW_EXISTS", "x");',
    ].join("\n"),
  });
  let violations: unknown = "not run";
  assert.doesNotThrow(() => {
    violations = checkApiErrorCodes(snapshot, ["NOT_FOUND"]);
  }, "checkApiErrorCodes over the snapshot");
  assert.ok(Array.isArray(violations), `expected a list, got ${JSON.stringify(violations)}`);
  const list = violations as Array<{ code: string; file: string; line: number; message: string }>;
  assert.equal(list.length, 1, `expected one violation, got ${JSON.stringify(list)}`);
  const first = list[0];
  assert.ok(first !== undefined, "expected one violation");
  assert.equal(first.code, "ARCH_API_ERROR_CODE", `code: ${JSON.stringify(first)}`);
  assert.equal(first.file, "src/x/a.ts", `file: ${JSON.stringify(first)}`);
  assert.equal(first.line, 3, `line: ${JSON.stringify(first)}`);
  assert.ok(
    first.message.includes(flowExists) && first.message.includes("src/api/error-codes.ts"),
    `message names the code and the registry file: ${JSON.stringify(first)}`,
  );
});

test("C-05ca73a7 Registered, dynamic and test code use passes the scan", () => {
  const snapshot = snapshotOf({
    "src/x/ok.ts": ['throw new ApiError(404, "NOT_FOUND", "m");'].join("\n"),
    "src/x/dyn.ts": ["const dynamic = \"NOT_FOUND\";", "throw new ApiError(500, dynamic, \"m\");"].join(
      "\n",
    ),
    "src/x/a.test.ts": ['const literal = "FLOW_EXISTS";'].join("\n"),
  });
  let reported: unknown = "not run";
  assert.doesNotThrow(() => {
    reported = checkApiErrorCodes(snapshot);
  }, "checkApiErrorCodes with the default registry");
  assert.deepEqual(reported, [], `unexpected violations: ${JSON.stringify(reported)}`);

  let withList: unknown = "not run";
  assert.doesNotThrow(() => {
    withList = checkApiErrorCodes(snapshot, ["NOT_FOUND"]);
  }, "checkApiErrorCodes with a registered list");
  assert.deepEqual(withList, [], `unexpected violations: ${JSON.stringify(withList)}`);

  let realTree: unknown = "not run";
  assert.doesNotThrow(() => {
    realTree = checkApiErrorCodes(readSnapshot());
  }, "checkApiErrorCodes over readSnapshot()");
  assert.deepEqual(realTree, [], `unexpected violations in the real tree: ${JSON.stringify(realTree)}`);
});
