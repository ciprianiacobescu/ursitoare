import assert from "node:assert/strict";
import { test } from "node:test";

import type { Clock } from "../core/clock.ts";
import type { BlockImport } from "../registry/block-input.ts";
import { importCatalogue } from "../registry/block-store.ts";
import type { TenantContext } from "../tenancy/context.ts";
import { withTenantTx } from "../tenancy/tx.ts";
import type { TenantPool } from "../tenancy/tx.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixtureSurface } from "../../test/support/tool-surface.ts";
import { createToolDirectory } from "./directory.ts";
import type { ToolDirectory } from "./directory.ts";
import { approveSurface, registerToolServer, submitSurface } from "./store.ts";
import type { SurfaceTool, ToolBinding, ToolSurface } from "./types.ts";

assert.equal(typeof createToolDirectory, "function");

const ORIGIN = "https://tools.fake.test";
const ALICE = { kind: "user", id: "u_alice" } as const;
const DAVE = { kind: "user", id: "u_dave" } as const;
const DAVE_APPROVER = { userId: "u_dave", kind: "user" } as const;
const CAROL_APPROVER = { userId: "u_carol", kind: "user" } as const;

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

function firstTool(surface: ToolSurface): SurfaceTool {
  const tool = surface.tools[0];
  assert.ok(tool !== undefined, "the surface has a tool");
  return tool;
}

const SURF_E: ToolSurface = { tools: [firstTool(SURF_B)] };

const BIND_LV_1: ToolBinding = {
  serverId: "acme",
  origin: ORIGIN,
  local: false,
  state: "approved",
  ref: "acme.lookup_vendor@1",
  tool: "lookup_vendor",
  effect: "read",
  http: { method: "POST", path: "/blocks/erp.lookup_vendor@1" },
  untrustedResult: false,
  unsafeToRetry: false,
};

const BIND_LV_2: ToolBinding = {
  ...BIND_LV_1,
  ref: "acme.lookup_vendor@2",
  untrustedResult: true,
};

const BIND_PAY_1: ToolBinding = {
  serverId: "acme",
  origin: ORIGIN,
  local: false,
  state: "approved",
  ref: "acme.create_payment@1",
  tool: "create_payment",
  effect: "pay",
  http: { method: "POST", path: "/blocks/erp.create_payment@1" },
  untrustedResult: false,
  unsafeToRetry: false,
};

const BIND_GAMMA: ToolBinding = {
  ...BIND_LV_1,
  serverId: "gamma",
  ref: "gamma.lookup_vendor@1",
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

function directoryFor(pool: TenantPool): ToolDirectory {
  let directory: ToolDirectory | undefined;
  assert.doesNotThrow(() => {
    directory = createToolDirectory(pool);
  });
  assert.ok(directory !== undefined, "createToolDirectory returns a directory");
  return directory;
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

function blockOf(tool: SurfaceTool, binding: Record<string, string>): BlockImport {
  return {
    effect: tool.effect,
    ...(tool.description === undefined ? {} : { description: tool.description }),
    input: tool.input,
    output: tool.output,
    untrusted_fields: tool.untrusted_fields ?? [],
    ...(tool.data_class === undefined ? {} : { data_class: tool.data_class }),
    untrusted_result: tool.untrusted_result ?? true,
    unsafe_to_retry: tool.unsafe_to_retry ?? false,
    binding,
  };
}

function statementText(query: unknown): string {
  if (typeof query === "string") return query;
  const text = (query as { text?: unknown } | null)?.text;
  return typeof text === "string" ? text : "";
}

function proxyPool(
  base: TenantPool,
  onQuery: (text: string) => Promise<void> | undefined,
): TenantPool {
  const wrapped = {
    async connect() {
      const client = await base.connect();
      return new Proxy(client, {
        get(target, property, receiver) {
          if (property === "query") {
            const raw = target as unknown as {
              query: (query: unknown, values?: unknown) => Promise<unknown>;
            };
            return async (query: unknown, values?: unknown): Promise<unknown> => {
              const action = onQuery(statementText(query));
              if (action !== undefined) await action;
              return raw.query(query, values);
            };
          }
          const value = Reflect.get(target, property, receiver) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    },
  };
  return wrapped as unknown as TenantPool;
}

function rejectingPool(base: TenantPool, matches: (text: string) => boolean): TenantPool {
  return proxyPool(base, (text) =>
    matches(text) ? Promise.reject(new Error("injected")) : undefined,
  );
}

function racingPool(
  base: TenantPool,
  matches: (text: string) => boolean,
  before: () => Promise<void>,
): TenantPool {
  let fired = false;
  return proxyPool(base, (text) => {
    if (fired || !matches(text)) return undefined;
    fired = true;
    return before();
  });
}

test("C-c3474bfc: the directory answers an approved tool, a drifted one with its state, and null for everything else", async () => {
  const db = await withTestDatabase();
  try {
    const seeded = await seedTwoTenants(db);
    const solo: TenantContext = { tenantId: seeded.a.tenantId, reviewProfile: "solo" };
    const team: TenantContext = { tenantId: seeded.a.tenantId, reviewProfile: "team" };
    const other: TenantContext = {
      tenantId: seeded.b.tenantId,
      reviewProfile: seeded.b.reviewProfile,
    };
    const clock = mutableClock("2026-11-06T10:00:00Z");
    const directory = directoryFor(db.appPool);

    await registerToolServer(db.appPool, solo, registerInput("acme", SURF_A), ALICE, { clock });
    assert.equal(await directory.resolve(solo, "acme.lookup_vendor@1"), null);

    await assert.doesNotReject(async () => {
      await approveSurface(
        db.appPool,
        team,
        "acme",
        { digest: D_A, selfApproval: false },
        DAVE_APPROVER,
        { clock },
      );
    });

    assert.deepEqual(await directory.resolve(solo, "acme.lookup_vendor@1"), BIND_LV_1);
    assert.deepEqual(await directory.resolve(solo, "acme.create_payment@1"), BIND_PAY_1);
    for (const ref of ["erp.lookup_vendor@1", "nope.x@1", "acme.nope@1"]) {
      assert.equal(await directory.resolve(solo, ref), null, ref);
    }
    assert.equal(await directory.resolve(other, "acme.lookup_vendor@1"), null);

    clock.advance(1);
    await submitSurface(db.appPool, solo, "acme", SURF_B, DAVE, { clock });
    assert.deepEqual(await directory.resolve(solo, "acme.lookup_vendor@1"), {
      ...BIND_LV_1,
      state: "drifted",
    });

    await assert.doesNotReject(async () => {
      await approveSurface(
        db.appPool,
        team,
        "acme",
        { digest: D_B, selfApproval: false },
        CAROL_APPROVER,
        { clock },
      );
    });
    assert.equal(await directory.resolve(solo, "acme.lookup_vendor@1"), null);
    assert.deepEqual(await directory.resolve(solo, "acme.lookup_vendor@2"), BIND_LV_2);
    assert.deepEqual(await directory.resolve(solo, "acme.create_payment@1"), BIND_PAY_1);

    const lookup = firstTool(SURF_B);
    await importCatalogue(
      db.appPool,
      solo,
      {
        "evil.lookup@1": blockOf(lookup, { server: "acme", tool: "lookup_vendor" }),
        "acme.partial@1": blockOf(lookup, { server: "acme" }),
        "acme.extra@1": blockOf(lookup, { server: "acme", tool: "extra", note: "x" }),
      },
      { kind: "system", id: "operator:test" },
      { clock },
    );
    for (const ref of ["evil.lookup@1", "acme.partial@1", "acme.extra@1"]) {
      assert.equal(await directory.resolve(solo, ref), null, ref);
    }

    clock.advance(1);
    await submitSurface(db.appPool, solo, "acme", SURF_E, DAVE, { clock });
    await assert.doesNotReject(async () => {
      await approveSurface(
        db.appPool,
        team,
        "acme",
        { digest: D_ONE_T, selfApproval: false },
        CAROL_APPROVER,
        { clock },
      );
    });
    assert.equal(await directory.resolve(solo, "acme.create_payment@1"), null);
    assert.deepEqual(await directory.resolve(solo, "acme.lookup_vendor@2"), BIND_LV_2);
  } finally {
    await db.close();
  }
});

test("C-c3474bfc: blocks stored by a failed or raced approval stay inert", async () => {
  const db = await withTestDatabase();
  try {
    const seeded = await seedTwoTenants(db);
    const solo: TenantContext = { tenantId: seeded.a.tenantId, reviewProfile: "solo" };
    const team: TenantContext = { tenantId: seeded.a.tenantId, reviewProfile: "team" };
    const clock = mutableClock("2026-11-06T10:00:00Z");
    const directory = directoryFor(db.appPool);

    await registerToolServer(db.appPool, solo, registerInput("gamma", SURF_ONE), ALICE, {
      clock,
    });
    const failing = rejectingPool(db.appPool, (text) =>
      /UPDATE ursitoare\.tool_surface/.test(text),
    );
    await assert.rejects(
      approveSurface(
        failing,
        team,
        "gamma",
        { digest: D_ONE, selfApproval: false },
        DAVE_APPROVER,
        { clock },
      ),
      /injected/,
    );
    assert.equal(await directory.resolve(solo, "gamma.lookup_vendor@1"), null);

    await assert.doesNotReject(async () => {
      await approveSurface(
        db.appPool,
        team,
        "gamma",
        { digest: D_ONE, selfApproval: false },
        DAVE_APPROVER,
        { clock },
      );
    });
    assert.deepEqual(await directory.resolve(solo, "gamma.lookup_vendor@1"), BIND_GAMMA);

    await registerToolServer(db.appPool, team, registerInput("zeta", SURF_ONE), ALICE, {
      clock,
    });
    const zetaPool = racingPool(
      db.appPool,
      (text) => /ursitoare\.tool_server[\s\S]*FOR UPDATE/.test(text),
      async () => {
        clock.advance(1);
        await withTenantTx(db.ownerPool, team, async (tx) => {
          await tx.query(
            `INSERT INTO ursitoare.tool_surface
               (tenant_id, tool_server_id, surface_digest, surface, submitted_by, submitted_at,
                approved_by, approved_at, self_approved)
             VALUES ($1, 'zeta', $2, $3::jsonb, 'u_dave', $4, NULL, NULL, NULL)`,
            [team.tenantId, D_ONE_T, JSON.stringify(SURF_ONE_T), clock.now()],
          );
        });
      },
    );
    await assert.rejects(
      approveSurface(
        zetaPool,
        team,
        "zeta",
        { digest: D_ONE, selfApproval: false },
        DAVE_APPROVER,
        { clock },
      ),
      { code: "TOOLS_REFUSED", details: { reason: "digest_mismatch" } },
    );
    assert.equal(await directory.resolve(solo, "zeta.lookup_vendor@1"), null);
  } finally {
    await db.close();
  }
});

test("C-c3474bfc: a database failure rejects instead of answering null", async () => {
  const ctx: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
  const failing: TenantPool = {
    connect: async () => {
      throw new Error("db down");
    },
  };
  const directory = directoryFor(failing);
  await assert.rejects(directory.resolve(ctx, "acme.lookup_vendor@1"), /db down/);
});
