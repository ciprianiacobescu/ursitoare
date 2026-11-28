import assert from "node:assert/strict";
import { test } from "node:test";

import type { Env, SecretReader } from "../../config/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import type { TestDatabase } from "../../../test/support/pg.ts";
import { createCommandRegistry } from "../registry.ts";
import type { OwnerConnection } from "../run.ts";
import { runCli } from "../run.ts";
import { tenantCreateCommand } from "./tenant-create.ts";

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

function ownerEnv(db: TestDatabase): Env {
  return {
    URSITOARE_DATABASE_OWNER_URL: db.ownerEndpoint.url,
    URSITOARE_DATABASE_OWNER_PASSWORD_FILE: "/run/owner-pw",
  };
}

async function run(
  db: TestDatabase,
  argv: readonly string[],
  ids: ReturnType<typeof sequentialIds>,
): Promise<Run> {
  const registry = createCommandRegistry();
  registry.registerCommand("tenant-create", tenantCreateCommand);
  let stdout = "";
  let stderr = "";
  const readSecret: SecretReader = () => db.ownerEndpoint.password?.reveal() ?? "";
  const code = await runCli(["tenant-create", ...argv], {
    env: ownerEnv(db),
    stdout: { write: (text) => void (stdout += text) },
    stderr: { write: (text) => void (stderr += text) },
    registry,
    clock: fixedClock("2026-11-25T10:00:00.000Z"),
    ids,
    readSecret,
    connectOwner: (): OwnerConnection => ({ pool: db.ownerPool, close: async () => undefined }),
  });
  return { code, stdout, stderr };
}

const T0 = "ten_00000000-0000-7000-8000-000000000000";
const T1 = "ten_00000000-0000-7000-8000-000000000001";
const T2 = "ten_00000000-0000-7000-8000-000000000002";

test("C-da899ae8 tenant-create once by name", async () => {
  const db = await withTestDatabase();
  try {
    const ids = sequentialIds(0);
    const step = (...argv: string[]): Promise<Run> => run(db, argv, ids);

    assert.deepEqual(await step("--name", "E2E tenant"), {
      code: 0,
      stdout: `tenant ${T0} "E2E tenant" created\n`,
      stderr: "",
    });
    assert.deepEqual(await step("--name", "E2E tenant"), {
      code: 0,
      stdout: `tenant ${T0} "E2E tenant" unchanged\n`,
      stderr: "",
    });
    assert.deepEqual(await step("--name", "Team Co", "--review-profile", "team"), {
      code: 0,
      stdout: `tenant ${T1} "Team Co" created\n`,
      stderr: "",
    });
    assert.deepEqual(await step("--name", "Team Co"), {
      code: 1,
      stdout: "",
      stderr: "TENANT_PROFILE_CONFLICT: the tenant exists with another review profile\n",
    });
    assert.deepEqual(await step("--name", "Other", "--review-profile", "gold"), {
      code: 2,
      stdout: "",
      stderr: "CLI_USAGE: --review-profile must be solo or team\n",
    });
    assert.deepEqual(await step("--name", " x"), {
      code: 1,
      stdout: "",
      stderr: "TENANT_INVALID: invalid tenant name\n",
    });
    assert.deepEqual(await step("--name", 'A "q"\nB‮'), {
      code: 0,
      stdout: `tenant ${T2} "A "q"?B?" created\n`,
      stderr: "",
    });
    assert.deepEqual(await step(), {
      code: 2,
      stdout: "",
      stderr: "CLI_USAGE: missing required option --name\n",
    });

    const rows = await db.ownerPool.query<{
      tenant_id: string;
      review_profile: string;
      name: string;
      created_at: Date;
    }>(
      "SELECT tenant_id, review_profile, name, created_at FROM ursitoare.tenant ORDER BY tenant_id",
    );
    assert.deepEqual(
      rows.rows.map((row) => [row.tenant_id, row.review_profile]),
      [
        [T0, "solo"],
        [T1, "team"],
        [T2, "solo"],
      ],
    );
    assert.equal(rows.rows[0]?.created_at.toISOString(), "2026-11-25T10:00:00.000Z");
    assert.ok(rows.rows.every((row) => row.name !== "Other" && row.name !== " x"));
  } finally {
    await db.close();
  }
});
