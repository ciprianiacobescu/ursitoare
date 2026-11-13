import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../core/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixtureSurface } from "../../test/support/tool-surface.ts";
import { approveSurface, registerToolServer, submitSurface } from "./store.ts";
import type { ToolSurface } from "./types.ts";

const ORIGIN = "https://tools.fake.test";
const ALICE = { kind: "user", id: "u_alice" } as const;
const DAVE = { kind: "user", id: "u_dave" } as const;
const CAROL = { userId: "u_carol", kind: "user" } as const;
const NOW = "2026-11-06T10:00:00Z";

const LV = "erp.lookup_vendor@1";
const CP = "erp.create_payment@1";

const D_A = "sha256:347725d7d6171586139eba5892b32b2b2ff6b25a556e8cbb2bca57c0624db7d9";
const D_LOW = "sha256:31e1d70af027715b9a8215e3a25a82f7bfbb33f21f5481d343c4bd8023e9883a";

const SURF_A: ToolSurface = fixtureSurface([LV, CP], {
  untrustedResult: { [LV]: false, [CP]: false },
});
const SURF_LOW: ToolSurface = fixtureSurface([LV, CP]);

function registerInput(surface: ToolSurface): {
  id: string;
  adapter: "fixture";
  origin: string;
  local: boolean;
  surface: ToolSurface;
} {
  return { id: "acme", adapter: "fixture", origin: ORIGIN, local: false, surface };
}

test("C-70e19ad9: a lower-digest surface submitted at the same instant is the newest pending surface and can be approved", async () => {
  const db = await withTestDatabase();
  try {
    const seeded = await seedTwoTenants(db);
    const team: TenantContext = { tenantId: seeded.a.tenantId, reviewProfile: "team" };
    const clock = fixedClock(NOW);

    await registerToolServer(db.appPool, team, registerInput(SURF_A), ALICE, { clock });

    const submitted = await submitSurface(db.appPool, team, "acme", SURF_LOW, DAVE, { clock });
    assert.equal(submitted.state, "pending");
    assert.equal(submitted.pendingDigest, D_LOW);
    assert.equal(submitted.pendingSubmittedBy, "u_dave");

    let approved: Awaited<ReturnType<typeof approveSurface>> | undefined;
    await assert.doesNotReject(async () => {
      approved = await approveSurface(
        db.appPool,
        team,
        "acme",
        { digest: D_LOW, selfApproval: false },
        CAROL,
        { clock },
      );
    });
    assert.ok(approved !== undefined, "approving the new digest succeeds");
    assert.equal(approved.server.state, "approved");
    assert.equal(approved.server.approvedDigest, D_LOW);
    assert.equal(approved.server.pendingDigest, null);
  } finally {
    await db.close();
  }
});

test("C-70e19ad9: a lower-digest surface submitted at the same instant drifts an approved server with its new pending digest", async () => {
  const db = await withTestDatabase();
  try {
    const seeded = await seedTwoTenants(db);
    const team: TenantContext = { tenantId: seeded.a.tenantId, reviewProfile: "team" };
    const clock = fixedClock(NOW);

    await registerToolServer(db.appPool, team, registerInput(SURF_A), ALICE, { clock });
    await approveSurface(
      db.appPool,
      team,
      "acme",
      { digest: D_A, selfApproval: false },
      CAROL,
      { clock },
    );

    const drifted = await submitSurface(db.appPool, team, "acme", SURF_LOW, DAVE, { clock });
    assert.equal(drifted.state, "drifted");
    assert.equal(drifted.approvedDigest, D_A);
    assert.equal(drifted.pendingDigest, D_LOW);
    assert.equal(drifted.pendingSubmittedBy, "u_dave");
  } finally {
    await db.close();
  }
});
