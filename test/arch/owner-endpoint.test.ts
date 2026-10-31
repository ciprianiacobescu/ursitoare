// Architecture test of the owner-endpoint rule: only src/cli, src/config and src/db may read it.
import assert from "node:assert/strict";
import { test } from "node:test";

import { checkOwnerEndpoint } from "./owner-endpoint.ts";
import { readSnapshot, snapshotOf, type Violation } from "./sources.ts";

// Runs a call and returns its answer, or a marker when it throws, so a missing behaviour fails on the comparison.
function answer<T>(call: () => T): T | "THROWN" {
  try {
    return call();
  } catch {
    return "THROWN";
  }
}

const MESSAGE = "the owner database endpoint is read only in src/cli, src/config and src/db";

function ownerEndpointViolation(file: string): Violation {
  return { code: "ARCH_OWNER_ENDPOINT", file, line: 1, message: MESSAGE };
}

const ALLOWED_FORMS =
  'const o = config.database.owner;\nconst p = config.database["owner"];\nconst { owner } = config.database;\n';

test("C-c40b4ca3: owner endpoint reads outside cli config and db are reported and allowed files are not", () => {
  const snapshot = snapshotOf({
    "src/api/a.ts": "const o = config.database.owner;\n",
    "src/api/i.ts": 'const o = config.database["owner"];\n',
    "src/runs/b.ts": "const { owner } = config.database;\n",
    "src/runs/j.ts": "const { database: { owner } } = config;\n",
    "src/tools/c.ts": 'const v = "URSITOARE_DATABASE_OWNER_URL";\n',
    "src/tools/k.ts": "const d = config.database; const o = d.owner;\n",
    "src/cli/d.ts": ALLOWED_FORMS,
    "src/config/e.ts": ALLOWED_FORMS,
    "src/db/f.ts": ALLOWED_FORMS,
    "src/api/g.test.ts": ALLOWED_FORMS,
    "src/api/h.ts": "const o = other.owner;\nconst a = config.database.app;\n",
  });

  assert.deepEqual(answer(() => checkOwnerEndpoint(snapshot)), [
    ownerEndpointViolation("src/api/a.ts"),
    ownerEndpointViolation("src/api/i.ts"),
    ownerEndpointViolation("src/runs/b.ts"),
    ownerEndpointViolation("src/runs/j.ts"),
    ownerEndpointViolation("src/tools/c.ts"),
    ownerEndpointViolation("src/tools/k.ts"),
  ]);
});

test("C-a71aff64: the repository reads the owner endpoint only in cli config and db", () => {
  assert.deepEqual(answer(() => checkOwnerEndpoint(readSnapshot())), []);
});
