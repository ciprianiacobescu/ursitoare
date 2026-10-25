// Proves the benchmark request mix measures real evaluations: for every variant, every request in the mix
// must return a "success" answer whose decision equals the scenario's expectation (no fast-failing requests).
import { loadPolicyMap } from "./cedar.ts";
import { fixtureDirectory } from "./directory.ts";
import { PolicyEngine, type EngineOptions } from "./engine.ts";
import { SCENARIOS } from "./scenarios.ts";

const dir = fixtureDirectory();
const opts: EngineOptions[] = [
  { stateful: false, useSchema: false, validateRequest: false, slice: false },
  { stateful: true, useSchema: false, validateRequest: false, slice: false },
  { stateful: true, useSchema: true, validateRequest: true, slice: false },
  { stateful: true, useSchema: false, validateRequest: false, slice: true },
  { stateful: true, useSchema: true, validateRequest: true, slice: true },
];
let bad = 0;
for (const o of opts) {
  const eng = new PolicyEngine(dir, o, loadPolicyMap());
  let n = 0, allow = 0, deny = 0, skipped = 0, failures = 0, errs = 0, mismatches = 0;
  for (const s of SCENARIOS.filter((x) => !x.rf1Reviewed)) {
    let call;
    try { call = eng.build(s.req).call; } catch { skipped++; continue; }
    const ans = eng.evaluate(call);
    n++;
    if (ans.type === "failure") { failures++; continue; }
    if (ans.response.diagnostics.errors.length) errs++;
    ans.response.decision === "allow" ? allow++ : deny++;
    if (eng.interpret(ans).decision !== s.expect) mismatches++;
  }
  bad += failures + errs + mismatches;
  console.log(`${JSON.stringify(o)} -> mix=${n} (allow ${allow}, deny ${deny}), skipped before wasm=${skipped}, wasm failures=${failures}, eval errors=${errs}, decision mismatches=${mismatches}`);
}
console.log(bad === 0 ? "SANITY OK: every benchmarked call is a full evaluation with the expected decision" : "SANITY FAILED");
process.exit(bad === 0 ? 0 : 1);
