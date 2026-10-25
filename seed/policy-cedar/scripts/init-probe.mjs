// Runs in a fresh process: wasm module init (import) time, first-call time, RSS delta.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.join(here, "../node_modules/@cedar-policy/cedar-wasm/nodejs/cedar_wasm.js");
const rss0 = process.memoryUsage().rss;
const t0 = process.hrtime.bigint();
const cedar = createRequire(import.meta.url)(pkg); // nodejs build: readFileSync + sync WebAssembly instantiate at load
const t1 = process.hrtime.bigint();
const rss1 = process.memoryUsage().rss;
// first (cold) evaluation of a trivial request
const t2 = process.hrtime.bigint();
cedar.isAuthorized({ principal: { type: "User", id: "u" }, action: { type: "Action", id: "a" }, resource: { type: "R", id: "r" }, context: {}, policies: { staticPolicies: "permit(principal, action, resource);" }, entities: [] });
const t3 = process.hrtime.bigint();
console.log(JSON.stringify({ init_ms: Number(t1 - t0) / 1e6, first_call_ms: Number(t3 - t2) / 1e6, rss_delta_mb: (rss1 - rss0) / 1048576, version: cedar.getCedarVersion() }));
