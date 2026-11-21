import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../core/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { kitSurface } from "../../test/support/adapter-kit.ts";
import { registerAdapterServerTx, submitAdapterSurfaceTx } from "./adapter-store.ts";
import { createToolDirectory } from "./directory.ts";
import type { ToolDirectory } from "./directory.ts";
import { approveSurface, registerToolServer } from "./store.ts";
import { surfaceDigest } from "./surface.ts";
import type { ToolCallSpec } from "./calls.ts";
import type { SurfaceTool, ToolSurface } from "./types.ts";

const ALICE = { kind: "user", id: "u_alice" } as const;
const DAVE = { kind: "user", id: "u_dave" } as const;
const CAROL = { userId: "u_carol", kind: "user" } as const;
const CLOCK = fixedClock("2026-11-06T10:00:00Z");

function callOf(kind: ToolCallSpec["kind"]): ToolCallSpec {
  const tool = kitSurface(kind).tools[0];
  assert.ok(tool !== undefined, "the kit surface has a tool");
  assert.ok(tool.call !== undefined, "the kit tool has a call");
  return tool.call;
}

function fixSurface(): ToolSurface {
  const tool = kitSurface("http").tools[0];
  assert.ok(tool !== undefined, "the kit surface has a tool");
  const fixture: SurfaceTool = {
    name: tool.name,
    effect: tool.effect,
    input: tool.input,
    output: tool.output,
    untrusted_result: false,
    http: { method: "POST", path: "/vendors/find" },
  };
  if (tool.description !== undefined) fixture.description = tool.description;
  return { tools: [fixture] };
}

function directoryFor(pool: TenantPool): ToolDirectory {
  let directory: ToolDirectory | undefined;
  assert.doesNotThrow(() => {
    directory = createToolDirectory(pool);
  });
  assert.ok(directory !== undefined, "createToolDirectory returns a directory");
  return directory;
}

function submit(pool: TenantPool, ctx: TenantContext, id: string, surface: ToolSurface) {
  return withTenantTx(pool, ctx, (tx) =>
    submitAdapterSurfaceTx(tx, ctx, id, surface, DAVE, { clock: CLOCK }),
  );
}

test("C-06d6192c: the directory binds a call tool with its call and no http", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const team: TenantContext = { tenantId: a.tenantId, reviewProfile: "team" };
    const directory = directoryFor(db.appPool);
    const T_HTTP = callOf("http");
    const T_CODE = callOf("code");

    // shop: registered with surface b, then dave submits the plain http surface
    await assert.doesNotReject(async () => {
      await withTenantTx(db.appPool, team, (tx) =>
        registerAdapterServerTx(
          tx,
          team,
          {
            id: "shop",
            adapter: "http_openapi",
            origin: "https://shop.fake.test",
            local: false,
            surface: kitSurface("http", "b"),
          },
          ALICE,
          { clock: CLOCK },
        ),
      );
      await submit(db.appPool, team, "shop", kitSurface("http"));
    });
    assert.equal(await directory.resolve(team, "shop.find_vendor@1"), null, "unapproved server");
    await assert.doesNotReject(async () => {
      await approveSurface(
        db.appPool,
        team,
        "shop",
        { digest: surfaceDigest(kitSurface("http")), selfApproval: false },
        CAROL,
        { clock: CLOCK },
      );
    });

    const shop = await directory.resolve(team, "shop.find_vendor@1");
    assert.ok(shop !== null, "the approved call tool resolves");
    assert.equal(Object.hasOwn(shop, "http"), false, "a call binding has no own http");
    assert.deepEqual(shop, {
      serverId: "shop",
      origin: "https://shop.fake.test",
      local: false,
      state: "approved",
      ref: "shop.find_vendor@1",
      tool: "find_vendor",
      effect: "read",
      call: T_HTTP,
      untrustedResult: false,
      unsafeToRetry: false,
    });

    // snips: a code_block server whose registration surface carol approves
    await assert.doesNotReject(async () => {
      await withTenantTx(db.appPool, team, (tx) =>
        registerAdapterServerTx(
          tx,
          team,
          {
            id: "snips",
            adapter: "code_block",
            origin: "sandbox",
            local: false,
            surface: kitSurface("code"),
          },
          ALICE,
          { clock: CLOCK },
        ),
      );
      await approveSurface(
        db.appPool,
        team,
        "snips",
        { digest: surfaceDigest(kitSurface("code")), selfApproval: false },
        CAROL,
        { clock: CLOCK },
      );
    });

    const snips = await directory.resolve(team, "snips.word_count@1");
    assert.ok(snips !== null, "the approved code tool resolves");
    assert.equal(Object.hasOwn(snips, "http"), false, "a code binding has no own http");
    assert.deepEqual(snips, {
      serverId: "snips",
      origin: "sandbox",
      local: false,
      state: "approved",
      ref: "snips.word_count@1",
      tool: "word_count",
      effect: "read",
      call: T_CODE,
      untrustedResult: false,
      unsafeToRetry: false,
    });

    // acme: a fixture server keeps its http and gains no call
    await assert.doesNotReject(async () => {
      await registerToolServer(
        db.appPool,
        team,
        {
          id: "acme",
          adapter: "fixture",
          origin: "https://tools.fake.test",
          local: false,
          surface: fixSurface(),
        },
        ALICE,
        { clock: CLOCK },
      );
      await approveSurface(
        db.appPool,
        team,
        "acme",
        { digest: surfaceDigest(fixSurface()), selfApproval: false },
        CAROL,
        { clock: CLOCK },
      );
    });

    const acme = await directory.resolve(team, "acme.find_vendor@1");
    assert.ok(acme !== null, "the approved fixture tool resolves");
    assert.equal(Object.hasOwn(acme, "call"), false, "a fixture binding has no own call");
    assert.deepEqual(acme, {
      serverId: "acme",
      origin: "https://tools.fake.test",
      local: false,
      state: "approved",
      ref: "acme.find_vendor@1",
      tool: "find_vendor",
      effect: "read",
      http: { method: "POST", path: "/vendors/find" },
      untrustedResult: false,
      unsafeToRetry: false,
    });
  } finally {
    await db.close();
  }
});
