/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const APP_URL = new URL("./App.tsx", import.meta.url);

test("C-8c08d9f5 App gates a capability feature's page on the client except admin-users", () => {
  const source = readFileSync(APP_URL, "utf8");
  assert.ok(source.includes("useSession()"), "App uses the session to read capabilities");
  assert.ok(source.includes('"admin-users"'), "App names the server-gated exception explicitly");
  assert.ok(source.includes("ErrorPanel"), "App renders a not-allowed panel");
  assert.ok(source.includes("LoadingState"), "App waits for /me before rendering a gated page");
  assert.ok(source.includes("capability"), "App consults the feature capability");
});