/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { CapabilityState } from "../kit/capabilities.ts";
import { homeView } from "./home.ts";

test("C-48588514 homeView shows the dashboard only for a ready session", () => {
  assert.equal(typeof homeView, "function");
  const ready: CapabilityState = {
    status: "ready",
    me: {
      user: { id: "usr_me", displayName: "Alice Example", email: null },
      tenant: { id: "ten_a", name: "Acme", reviewProfile: "solo" },
      capabilities: new Set(["read_self", "read_run"]),
      csrfToken: "x",
    },
  };
  assert.deepEqual(homeView(null), { kind: "public" });
  assert.deepEqual(homeView({ status: "signed_out" }), { kind: "public" });
  assert.deepEqual(homeView({ status: "failed", code: "UNKNOWN_ERROR" }), { kind: "public" });
  const view = homeView(ready);
  assert.equal(view.kind, "dashboard");
  if (view.kind === "dashboard") {
    assert.deepEqual([...view.capabilities], ["read_self", "read_run"]);
    assert.equal(view.userId, "usr_me");
    assert.equal(view.displayName, "Alice Example");
  }
});
