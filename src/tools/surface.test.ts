import assert from "node:assert/strict";
import { test } from "node:test";

import { surfaceDigest } from "./surface.ts";
import type { SurfaceTool, ToolSurface } from "./types.ts";

const SMALL_DIGEST = "sha256:244a8eeaac0eaa92b0f9f37583383b828cfd1f4aaa3028ab7052e0d013ef2c0c";
const PING_DIGEST = "sha256:aa3089b4ead0b1991651cec106303e025ac4b569a55767655f1c57fd42c02552";

const PING: SurfaceTool = {
  name: "ping",
  effect: "read",
  input: { type: "object" },
  output: { type: "object" },
  http: { method: "GET", path: "/ping" },
};

const ECHO: SurfaceTool = {
  name: "echo",
  description: "Echo.",
  effect: "read",
  input: { type: "object", properties: { q: { type: "string" } } },
  output: {
    type: "object",
    properties: { a: { type: "string" }, b: { type: "string" } },
  },
  untrusted_fields: ["b", "a"],
  data_class: "public",
  http: { method: "POST", path: "/echo" },
};

const SMALL: ToolSurface = { tools: [PING, ECHO] };

const PING_EXPLICIT: SurfaceTool = {
  ...PING,
  untrusted_fields: [],
  untrusted_result: true,
  unsafe_to_retry: false,
};

const PROPERTY_X = { type: "object", properties: { x: { type: "string" } } };

const VARIANTS: readonly { readonly label: string; readonly surface: ToolSurface }[] = [
  { label: "name", surface: { tools: [{ ...PING, name: "pong" }, ECHO] } },
  { label: "description", surface: { tools: [{ ...PING, description: "Ping." }, ECHO] } },
  { label: "effect", surface: { tools: [{ ...PING, effect: "write" }, ECHO] } },
  { label: "input", surface: { tools: [{ ...PING, input: PROPERTY_X }, ECHO] } },
  { label: "output", surface: { tools: [{ ...PING, output: PROPERTY_X }, ECHO] } },
  {
    label: "untrusted_result",
    surface: { tools: [{ ...PING, untrusted_result: false }, ECHO] },
  },
  {
    label: "unsafe_to_retry",
    surface: { tools: [{ ...PING, unsafe_to_retry: true }, ECHO] },
  },
  {
    label: "data_class",
    surface: { tools: [{ ...PING, data_class: "private" }, ECHO] },
  },
  {
    label: "http.method",
    surface: {
      tools: [{ ...PING, http: { method: "DELETE", path: "/ping" } }, ECHO],
    },
  },
  {
    label: "http.path",
    surface: { tools: [{ ...PING, http: { method: "GET", path: "/ping2" } }, ECHO] },
  },
  {
    label: "echo.untrusted_fields",
    surface: { tools: [PING, { ...ECHO, untrusted_fields: ["a"] }] },
  },
];

test("C-9e03eeea: SMALL digest ignores tool order and explicit defaults", () => {
  assert.doesNotThrow(() => {
    assert.equal(surfaceDigest(SMALL), SMALL_DIGEST);
  });

  const reordered: ToolSurface = {
    tools: [{ ...ECHO, untrusted_fields: ["a", "b"] }, PING],
  };
  assert.doesNotThrow(() => {
    assert.equal(surfaceDigest(reordered), SMALL_DIGEST);
  });

  const explicit: ToolSurface = { tools: [PING_EXPLICIT, ECHO] };
  assert.doesNotThrow(() => {
    assert.equal(surfaceDigest(explicit), SMALL_DIGEST);
  });
});

test("C-9e03eeea: each one-field variant and the one-tool form has a distinct digest", () => {
  assert.equal(VARIANTS.length, 11);

  const seen = new Set<string>([SMALL_DIGEST]);
  const digests: string[] = [];

  for (const variant of VARIANTS) {
    assert.doesNotThrow(() => {
      const digest = surfaceDigest(variant.surface);
      digests.push(digest);
      assert.notEqual(digest, SMALL_DIGEST, variant.label);
      assert.equal(seen.has(digest), false, variant.label);
      seen.add(digest);
    }, variant.label);
  }

  assert.equal(digests.length, 11);

  const oneTool: ToolSurface = { tools: [PING] };
  assert.doesNotThrow(() => {
    const digest = surfaceDigest(oneTool);
    assert.equal(digest, PING_DIGEST);
    assert.notEqual(digest, SMALL_DIGEST);
    assert.equal(seen.has(digest), false);
  });
});
