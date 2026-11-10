import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import v8 from "node:v8";
import vm from "node:vm";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { importCatalogue } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { createPolicyRuntime } from "./policy-runtime.ts";
import { deployPolicySet, validatePolicySet } from "./policy-sets.ts";
import type { PolicySetRecord } from "./policy-sets.ts";

const CLOCK = fixedClock("2026-11-06T09:00:00.000Z");
const CAROL = { kind: "user", id: "carol" } as const;
const MB = 1024 * 1024;

const tempDirs: string[] = [];

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

v8.setFlagsFromString("--expose-gc");
const gc = vm.runInNewContext("gc") as () => void;

function mem(): NodeJS.MemoryUsage {
  gc();
  gc();
  return process.memoryUsage();
}

test("C-5fed171a: repeated validations and deploys leave memory flat", { timeout: 300000 }, async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const srcDir = await mkdtemp(join(tmpdir(), "policy-memory-"));
    tempDirs.push(srcDir);
    await importCatalogue(
      db.appPool,
      a,
      {
        "acme.lookup_vendor@1": {
          effect: "read",
          input: { type: "object", properties: { limit: { type: "integer" } } },
          output: { type: "object" },
        },
      } as never,
      CAROL,
      { clock: CLOCK },
    );
    await withTenantTx(db.appPool, a, async (tx) => {
      await tx.query(
        `INSERT INTO ursitoare."grant"
           (tenant_id, grant_id, subject_kind, subject_id, tool, scope_kind, args, state, created_by, created_at)
         SELECT 'tenant_a', 'grant_00000000-0000-7000-8000-' || lpad(to_hex(n + 100), 12, '0'),
                'role', 'author', 'acme.lookup_vendor@1', 'any_step',
                jsonb_build_array(jsonb_build_object('arg', 'limit', 'op', 'lte', 'value', n)),
                'active', 'carol', '2026-11-06T09:00:00Z'
           FROM generate_series(0, 499) AS n`,
      );
    });
    const rt = await createPolicyRuntime({
      pool: db.appPool,
      srcDir,
      clock: CLOCK,
      ids: sequentialIds(1000),
      logger: createLogger({ level: "silent", destination: { write(_line: string): void {} } }),
    });

    for (let i = 0; i < 100; i += 1) {
      const v = await validatePolicySet(rt, db.appPool, a, "");
      assert.equal(v.ok, true, `warm-up validation ${i}`);
    }
    const m0 = mem();
    for (let i = 0; i < 100; i += 1) {
      const v = await validatePolicySet(rt, db.appPool, a, "");
      assert.equal(v.ok, true, `validation ${i}`);
    }
    const m1 = mem();
    assert.ok(m1.heapUsed - m0.heapUsed < 15 * MB, "validations: heapUsed grows by under 15 MB");
    assert.ok(m1.rss - m0.rss < 60 * MB, "validations: rss grows by under 60 MB");

    const deploy = async (source: string, instant: string): Promise<PolicySetRecord> => {
      let record: PolicySetRecord | undefined;
      await assert.doesNotReject(async () => {
        record = await deployPolicySet(rt, db.appPool, a, source, CAROL, { clock: fixedClock(instant) });
      }, "deployPolicySet resolves");
      assert.ok(record !== undefined);
      return record;
    };
    await deploy("", "2026-11-06T10:00:00.000Z");
    const m2 = mem();
    for (let i = 0; i < 30; i += 1) {
      const instant = new Date(Date.UTC(2026, 10, 6, 11, 0, i)).toISOString();
      const record = await deploy(`// ${i}\n`, instant);
      assert.equal(record.grantIds.length, 500, `deploy ${i} stores the 500 grants`);
    }
    const m3 = mem();
    assert.ok(m3.heapUsed - m2.heapUsed < 15 * MB, "deploys: heapUsed grows by under 15 MB");
    assert.ok(m3.rss - m2.rss < 60 * MB, "deploys: rss grows by under 60 MB");
  } finally {
    await db.close();
  }
});
