// Prints the scenario results as a markdown table (expected vs actual) for REPORT.md.
import { fixtureDirectory } from "./directory.ts";
import { PolicyEngine } from "./engine.ts";
import { SCENARIOS } from "./scenarios.ts";

const engines = new Map<boolean, PolicyEngine>();
const eng = (r: boolean) => engines.get(r) ?? (engines.set(r, new PolicyEngine(fixtureDirectory({ rf1Reviewed: r }))), engines.get(r)!);
let pass = 0;
const rows: string[] = ["| ID | Group | Scenario | Expected | Actual | Deciding policy / reason | OK |", "|---|---|---|---|---|---|---|"];
for (const s of SCENARIOS) {
  const d = eng(s.rf1Reviewed ?? false).check(s.req);
  const ok = d.decision === s.expect && d.reason.includes(s.reason) && d.errors.length === 0;
  if (ok) pass++;
  rows.push(`| ${s.id} | ${s.group} | ${s.title.replace(/\|/g, "/")} | ${s.expect} | ${d.decision} | \`${d.reason.length > 90 ? d.reason.slice(0, 87) + "..." : d.reason}\` | ${ok ? "yes" : "NO"} |`);
}
console.log(rows.join("\n"));
console.log(`\n${pass}/${SCENARIOS.length} scenarios match expectation (decision and deciding policy)`);
process.exit(pass === SCENARIOS.length ? 0 : 1);
