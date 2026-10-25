import { cedar, loadPolicyMap, loadSchemaText, validatePolicies, CEDAR_WASM_PKG_VERSION } from "./cedar.ts";
import { MALFORMED } from "./malformed.ts";

const schema = loadSchemaText();
const policies = loadPolicyMap();
console.log(`cedar-wasm npm ${CEDAR_WASM_PKG_VERSION}; cedar lang ${cedar.getCedarLangVersion()}; SDK ${cedar.getCedarSDKVersion()}; core ${cedar.getCedarVersion()}`);
const schemaParse = cedar.checkParseSchema(schema);
console.log(`schema parse: ${schemaParse.type}`);
const rep = validatePolicies(policies, schema);
console.log(`real policy set: ${Object.keys(policies).length} policies, strict validation ok=${rep.ok}, validationErrors=${rep.validationErrors.length}, warnings=${rep.warnings.length}`);
for (const e of rep.validationErrors) console.log("  ERR", e.policyId, e.message);

console.log("\nDeliberately malformed policies (each must be rejected):");
let bad = 0;
for (const m of MALFORMED) {
  const parse = cedar.checkParsePolicySet({ staticPolicies: m.policy });
  let msg = "";
  let rejected = false;
  if (parse.type === "failure") { rejected = true; msg = `PARSE FAILURE: ${parse.errors[0]?.message.split("\n")[0]}`; }
  else {
    const r = validatePolicies({ bad: m.policy }, schema);
    rejected = !r.ok;
    const first = r.validationErrors[0]?.message ?? r.parseErrors[0];
    msg = r.ok ? "ACCEPTED (unexpected)" : first ? `VALIDATION ERROR: ${first.replace(/for policy `bad`, /, "")}` : `VALIDATION WARNING (gate fails on warnings): ${r.warnings[0].replace(/for policy `bad`, /, "")}`;
  }
  if (!rejected) bad++;
  console.log(`  ${m.id} [${m.stage}] ${m.why}\n      -> ${msg}`);
}
console.log(`\n${MALFORMED.length - bad}/${MALFORMED.length} malformed policies rejected`);
process.exit(rep.ok && bad === 0 ? 0 : 1);
