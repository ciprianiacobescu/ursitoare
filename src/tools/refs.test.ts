import assert from "node:assert/strict";
import { test } from "node:test";

import { fixtureSurface } from "../../test/support/tool-surface.ts";
import { surfaceRefs } from "./surface.ts";
import type { ToolSurface } from "./types.ts";

const ZERO = `sha256:${"0".repeat(64)}`;
const H_LV_F = "sha256:995af4085de7518f271b1881877eaee8c6bb10caf610793d10898dccf97d16e8";
const H_LV_T = "sha256:6f532256387746247161d2395653c5e1d42c44d2be58896ae191f505b7829bb7";

const LV = "erp.lookup_vendor@1";
const ONE: ToolSurface = fixtureSurface([LV], { untrustedResult: { [LV]: false } });
const ONE_T: ToolSurface = fixtureSurface([LV]);
const TWO: ToolSurface = fixtureSurface([LV, "erp.create_payment@1"]);

function refs(
  serverId: string,
  surface: ToolSurface,
  taken: readonly (readonly [string, string])[],
): Record<string, string> {
  let result: Record<string, string> = {};
  assert.doesNotThrow(() => {
    result = surfaceRefs(serverId, surface, new Map(taken));
  });
  return result;
}

test("C-9e03eeea: surfaceRefs gives major 1 when nothing is taken or the same content holds it", () => {
  assert.deepEqual(refs("acme", ONE, []), { lookup_vendor: "acme.lookup_vendor@1" });
  assert.deepEqual(refs("acme", ONE, [["acme.lookup_vendor@1", H_LV_F]]), {
    lookup_vendor: "acme.lookup_vendor@1",
  });
});

test("C-9e03eeea: surfaceRefs skips a major held with other content", () => {
  assert.deepEqual(refs("acme", ONE, [["acme.lookup_vendor@1", ZERO]]), {
    lookup_vendor: "acme.lookup_vendor@2",
  });
  assert.deepEqual(
    refs("acme", ONE, [
      ["acme.lookup_vendor@1", ZERO],
      ["acme.lookup_vendor@2", H_LV_F],
    ]),
    { lookup_vendor: "acme.lookup_vendor@2" },
  );
  assert.deepEqual(
    refs("acme", ONE, [
      ["acme.lookup_vendor@1", ZERO],
      ["acme.lookup_vendor@2", ZERO],
    ]),
    { lookup_vendor: "acme.lookup_vendor@3" },
  );
});

test("C-9e03eeea: surfaceRefs tells a changed tool block from the same one by its hash", () => {
  assert.deepEqual(refs("acme", ONE_T, [["acme.lookup_vendor@1", H_LV_F]]), {
    lookup_vendor: "acme.lookup_vendor@2",
  });
  assert.deepEqual(
    refs("acme", ONE_T, [
      ["acme.lookup_vendor@1", H_LV_F],
      ["acme.lookup_vendor@2", H_LV_T],
    ]),
    { lookup_vendor: "acme.lookup_vendor@2" },
  );
});

test("C-9e03eeea: surfaceRefs takes the lowest free major and ignores other servers", () => {
  assert.deepEqual(refs("acme", ONE, [["acme.lookup_vendor@2", ZERO]]), {
    lookup_vendor: "acme.lookup_vendor@1",
  });
  assert.deepEqual(refs("acme", ONE, [["beta.lookup_vendor@1", ZERO]]), {
    lookup_vendor: "acme.lookup_vendor@1",
  });
  assert.deepEqual(refs("acme", TWO, [["acme.create_payment@1", ZERO]]), {
    lookup_vendor: "acme.lookup_vendor@1",
    create_payment: "acme.create_payment@2",
  });
  assert.deepEqual(refs("erp", ONE, [["erp.lookup_vendor@1", ZERO]]), {
    lookup_vendor: "erp.lookup_vendor@2",
  });
});
