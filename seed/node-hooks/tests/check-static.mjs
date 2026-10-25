// npm run check:static: runs src/check.ts over flows/ and asserts the expected codes (design section 11).
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { checkFlow } from '../src/check.ts';
import { ROOT, RF1 } from './lib.mjs';

const EXPECT = {
  's14-unsafe-redirect.yaml': ['H_DOMINANCE'],
  's14c-cycle.yaml': ['H_CYCLE'],
  's18d-routes-on-human.yaml': ['H_ROUTE_HUMAN'],
  'static/n-schema.yaml': ['H_SCHEMA'],
  'static/n-schema-routes-pre.yaml': ['H_SCHEMA'],
  'static/n-block.yaml': ['H_BLOCK'],
  'static/n-route-target.yaml': ['H_ROUTE_TARGET'],
  'static/n-route-self.yaml': ['H_CYCLE', 'H_ROUTE_TARGET'], // a self-route is also a one-node cycle
  'static/n-retry-scope.yaml': ['H_RETRY_SCOPE'],
  'static/n-retry-scope-human.yaml': ['H_RETRY_SCOPE'],
  'static/n-dominance-hook.yaml': ['H_DOMINANCE'],
};
const WARN = { 'static/n-no-match.yaml': ['W_NO_MATCH'] };
let bad = 0;
const report = (ok, msg) => { if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };
const files = [...readdirSync(path.join(ROOT, 'flows')).filter((f) => f.endsWith('.yaml')), ...readdirSync(path.join(ROOT, 'flows/static')).map((f) => `static/${f}`)].sort();
let valid = 0;
for (const f of files) {
  const r = checkFlow(parse(readFileSync(path.join(ROOT, 'flows', f), 'utf8')));
  const codes = [...new Set(r.errors.map((e) => e.code))].sort();
  const wcodes = [...new Set(r.warnings.map((e) => e.code))].sort();
  const want = EXPECT[f] ?? [];
  const wantW = WARN[f] ?? [];
  const ok = JSON.stringify(codes) === JSON.stringify(want) && JSON.stringify(wcodes) === JSON.stringify(wantW);
  report(ok, `${f}: errors [${codes}] warnings [${wcodes}]  expected errors [${want}] warnings [${wantW}]`);
  if (want.length === 0 && wantW.length === 0 && ok) valid++;
  if (process.env.VERBOSE && (r.errors.length || r.warnings.length)) for (const e of [...r.errors, ...r.warnings]) console.log(`        ${e.code} ${e.node ?? ''} ${e.hook ?? ''}: ${e.message}`);
}
// v0.1 regression: unmodified RF-1 is clean
const rf = checkFlow(parse(readFileSync(RF1, 'utf8')));
report(rf.errors.length === 0 && rf.warnings.length === 0, `RF-1 (format 0.1) unchanged: ${rf.errors.length} errors, ${rf.warnings.length} warnings`);
// v0.1 flow carrying hooks is rejected
const bad01 = parse(readFileSync(RF1, 'utf8')); bad01.nodes.pay.pre = [{ id: 'x', kind: 'code', source: 'return;' }];
const r01 = checkFlow(bad01);
report(r01.errors.some((e) => e.code === 'H_SCHEMA'), `format 0.1 with a hook field is rejected: [${r01.errors.map((e) => e.code)}]`);
console.log(`${valid} flows in the valid set (no errors, no warnings)`);
console.log(bad ? `CHECK-STATIC FAIL (${bad})` : 'CHECK-STATIC PASS');
process.exit(bad ? 1 : 0);
