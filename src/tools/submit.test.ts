import assert from "node:assert/strict";
import { test } from "node:test";

import type { Clock } from "../core/clock.ts";
import type { TenantContext } from "../tenancy/context.ts";
import { withTenantTx } from "../tenancy/tx.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixtureSurface } from "../../test/support/tool-surface.ts";
import { approveSurface, getToolServer, registerToolServer, submitSurface } from "./store.ts";
import type { SurfaceTool, ToolServerRecord, ToolSurface } from "./types.ts";

assert.equal(typeof submitSurface, "function");

const ORIGIN = "https://tools.fake.test";
const ALICE = { kind: "user", id: "u_alice" } as const;
const ALICE_APPROVER = { userId: "u_alice", kind: "user" } as const;
const DAVE = { kind: "user", id: "u_dave" } as const;
const CAROL = { userId: "u_carol", kind: "user" } as const;
const REGISTERED_AT = "2026-11-06T10:00:00.000000Z";

const D_A = "sha256:347725d7d6171586139eba5892b32b2b2ff6b25a556e8cbb2bca57c0624db7d9";
const D_B = "sha256:8d3d0f71f1a243d50752e6a5a9c3e9e672a3226900a6d13047a5af98d1642da2";
const D_ONE = "sha256:b9abc02155ff61abbcbfdccbda174b71a0502bd2597072ce6e5d6584e08818aa";
const D_ONE_T = "sha256:dfd7d562dae0c64d5452e722adb05a3d15ce87e468c64b8dc6ff8556a3e9c814";

const LV = "erp.lookup_vendor@1";
const CP = "erp.create_payment@1";

const SURF_A: ToolSurface = fixtureSurface([LV, CP], {
  untrustedResult: { [LV]: false, [CP]: false },
});
const SURF_ONE: ToolSurface = fixtureSurface([LV], { untrustedResult: { [LV]: false } });
const SURF_ONE_T: ToolSurface = fixtureSurface([LV]);

function mapFirst(surface: ToolSurface, patch: Partial<SurfaceTool>): ToolSurface {
  const tools: SurfaceTool[] = surface.tools.map((tool, index) =>
    index === 0 ? { ...tool, ...patch } : tool,
  );
  return { tools };
}

const SURF_B: ToolSurface = mapFirst(SURF_A, { untrusted_result: true });
const SURF_BAD_HTTP: ToolSurface = mapFirst(SURF_A, {
  http: { method: "DELETE", path: "/x" },
});

const REC_APPROVED_A: ToolServerRecord = {
  id: "acme",
  adapter: "fixture",
  origin: ORIGIN,
  local: false,
  state: "approved",
  registeredBy: "u_alice",
  registeredAt: REGISTERED_AT,
  approvedDigest: D_A,
  pendingDigest: null,
  pendingSubmittedBy: null,
  tools: [
    { name: "lookup_vendor", effect: "read", ref: "acme.lookup_vendor@1" },
    { name: "create_payment", effect: "pay", ref: "acme.create_payment@1" },
  ],
};

const REC_DRIFTED: ToolServerRecord = {
  ...REC_APPROVED_A,
  state: "drifted",
  pendingDigest: D_B,
  pendingSubmittedBy: "u_dave",
};

const REC_APPROVED_B: ToolServerRecord = {
  ...REC_APPROVED_A,
  approvedDigest: D_B,
  tools: [
    { name: "lookup_vendor", effect: "read", ref: "acme.lookup_vendor@2" },
    { name: "create_payment", effect: "pay", ref: "acme.create_payment@1" },
  ],
};

const REC_BETA_DRIFTED: ToolServerRecord = {
  id: "beta",
  adapter: "fixture",
  origin: ORIGIN,
  local: false,
  state: "drifted",
  registeredBy: "u_alice",
  registeredAt: REGISTERED_AT,
  approvedDigest: D_ONE,
  pendingDigest: D_ONE_T,
  pendingSubmittedBy: "u_dave",
  tools: [{ name: "lookup_vendor", effect: "read", ref: "beta.lookup_vendor@1" }],
};

const REC_GAMMA_PENDING: ToolServerRecord = {
  id: "gamma",
  adapter: "fixture",
  origin: ORIGIN,
  local: false,
  state: "pending",
  registeredBy: "u_alice",
  registeredAt: REGISTERED_AT,
  approvedDigest: null,
  pendingDigest: D_ONE_T,
  pendingSubmittedBy: "u_dave",
  tools: [{ name: "lookup_vendor", effect: "read", ref: null }],
};

interface MutableClock extends Clock {
  advance(seconds: number): void;
}

function mutableClock(startIso: string): MutableClock {
  let millis = Date.parse(startIso);
  return {
    now: (): Date => new Date(millis),
    advance(seconds: number): void {
      millis += seconds * 1000;
    },
  };
}

function registerInput(
  id: string,
  surface: ToolSurface,
): {
  id: string;
  adapter: "fixture";
  origin: string;
  local: boolean;
  surface: ToolSurface;
} {
  return { id, adapter: "fixture", origin: ORIGIN, local: false, surface };
}

interface SubmitEvent {
  payload: unknown;
}

test("C-0955b490: a submitted surface drifts an approved server and re-approval restores it", async () => {
  const db = await withTestDatabase();
  try {
    const seeded = await seedTwoTenants(db);
    const solo: TenantContext = { tenantId: seeded.a.tenantId, reviewProfile: "solo" };
    const team: TenantContext = { tenantId: seeded.a.tenantId, reviewProfile: "team" };
    const clock = mutableClock("2026-11-06T10:00:00Z");

    await registerToolServer(db.appPool, solo, registerInput("acme", SURF_A), ALICE, { clock });
    await registerToolServer(db.appPool, solo, registerInput("beta", SURF_ONE), ALICE, { clock });

    await assert.doesNotReject(async () => {
      await approveSurface(
        db.appPool,
        solo,
        "acme",
        { digest: D_A, selfApproval: true },
        ALICE_APPROVER,
        { clock },
      );
    });
    await assert.doesNotReject(async () => {
      await approveSurface(
        db.appPool,
        solo,
        "beta",
        { digest: D_ONE, selfApproval: true },
        ALICE_APPROVER,
        { clock },
      );
    });

    await registerToolServer(db.appPool, solo, registerInput("gamma", SURF_ONE), ALICE, { clock });

    async function submit(
      serverId: string,
      surface: ToolSurface,
      ctx: TenantContext = solo,
    ): Promise<ToolServerRecord> {
      clock.advance(1);
      let record: ToolServerRecord | undefined;
      await assert.doesNotReject(async () => {
        record = await submitSurface(db.appPool, ctx, serverId, surface, DAVE, { clock });
      });
      assert.ok(record !== undefined, `submitSurface resolves for ${serverId}`);
      return record;
    }

    assert.deepEqual(await submit("acme", SURF_A), REC_APPROVED_A);
    assert.deepEqual(await submit("acme", SURF_B), REC_DRIFTED);
    assert.deepEqual(await submit("acme", SURF_B), REC_DRIFTED);
    assert.deepEqual(await submit("acme", SURF_A), REC_DRIFTED);

    clock.advance(1);
    await assert.rejects(
      submitSurface(db.appPool, solo, "acme", SURF_BAD_HTTP, DAVE, { clock }),
      {
        code: "TOOLS_INVALID",
        details: { field: "tools/0/http/method", reason: "method_without_body" },
      },
    );
    clock.advance(1);
    await assert.rejects(
      submitSurface(db.appPool, solo, "nope", SURF_A, DAVE, { clock }),
      { code: "TOOLS_NOT_FOUND", details: { id: "nope" } },
    );

    assert.deepEqual(await submit("beta", SURF_ONE_T), REC_BETA_DRIFTED);
    assert.deepEqual(await submit("gamma", SURF_ONE_T), REC_GAMMA_PENDING);
    assert.deepEqual(await getToolServer(db.appPool, solo, "beta"), REC_BETA_DRIFTED);
    assert.deepEqual(await getToolServer(db.appPool, solo, "gamma"), REC_GAMMA_PENDING);

    let approvedB: Awaited<ReturnType<typeof approveSurface>> | undefined;
    await assert.doesNotReject(async () => {
      approvedB = await approveSurface(
        db.appPool,
        team,
        "acme",
        { digest: D_B, selfApproval: false },
        CAROL,
        { clock },
      );
    });
    assert.ok(approvedB !== undefined, "carol approves the new surface");
    assert.deepEqual(approvedB.blocks, [
      "acme.create_payment@1",
      "acme.lookup_vendor@2",
    ]);
    assert.deepEqual(approvedB.server, REC_APPROVED_B);

    clock.advance(1);
    await assert.rejects(
      submitSurface(db.appPool, solo, "acme", SURF_A, DAVE, { clock }),
      { code: "TOOLS_REFUSED", details: { reason: "surface_known" } },
    );

    const events = await withTenantTx(db.appPool, solo, async (tx) => {
      const { rows } = await tx.query<SubmitEvent>(
        `SELECT payload FROM ursitoare.audit_event
         WHERE event_type = 'tools.surface_submitted' ORDER BY seq`,
      );
      return rows;
    });
    assert.deepEqual(
      events.map((event) => event.payload),
      [
        { digest: D_B, drift: true },
        { digest: D_ONE_T, drift: true },
        { digest: D_ONE_T, drift: false },
      ],
    );
  } finally {
    await db.close();
  }
});
