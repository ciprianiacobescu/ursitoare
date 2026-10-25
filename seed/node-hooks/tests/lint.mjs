// C2 definition lint, adapted from core-dbos/tests/lint.mjs for hooks (design section 11). Static:
//  * every outbound call (callBlock / callLlm / callDelegate) in interpreter.ts sits inside a DBOS step, after a guard() policy check
//    whose deny result short-circuits (node cores run only through nodeStep(), which wraps them in DBOS.runStep);
//  * hooks.ts and check.ts and everything else do no network/process I/O and never import clients.ts.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
let bad = 0; const report = (ok, msg) => { if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };

const interp = readFileSync(path.join(SRC, 'interpreter.ts'), 'utf8');
const calls = [...interp.matchAll(/\b(callBlock|callLlm|callDelegate)\(/g)].filter((m) => !/^import/.test(interp.slice(interp.lastIndexOf('\n', m.index) + 1, m.index)));
console.log(`outbound call sites: interpreter.ts has ${calls.length} (D1 had 3: ${calls.map((c) => c[1]).join(', ')}); hooks.ts has ${(readFileSync(path.join(SRC, 'hooks.ts'), 'utf8').match(/\b(callBlock|callLlm|callDelegate)\(/g) ?? []).length}`);
report(calls.length === 4 && calls.filter((c) => c[1] === 'callBlock').length === 2, `interpreter has exactly 4 outbound call sites: node block, hook block, llm, delegate (found ${calls.length}: ${calls.map((c) => c[1]).join(', ')})`);
for (const m of calls) {
  const before = interp.slice(0, m.index);
  const stepAt = Math.max(before.lastIndexOf('DBOS.runStep'), before.lastIndexOf('nodeStep(async'));
  const seg = before.slice(stepAt);
  const guardAt = seg.indexOf('guard({');
  const denyAt = seg.indexOf("d.decision === 'deny') return {");
  report(stepAt >= 0 && guardAt >= 0 && denyAt > guardAt, `${m[1]} (line ${before.split('\n').length}) is preceded by guard() + deny short-circuit inside the same step entry (${before.slice(stepAt, stepAt + 18)}...)`);
}
// node cores are only reachable through nodeStep(), whose body is a DBOS.runStep
const def = interp.slice(interp.indexOf('const nodeStep ='));
const defBody = def.slice(0, def.indexOf('// ---- 1. pre-hooks'));
report((defBody.match(/\bcore\(sh\)/g) ?? []).length === 1 && defBody.indexOf('DBOS.runStep') >= 0 && defBody.indexOf('DBOS.runStep') < defBody.indexOf('core(sh)'), 'nodeStep() invokes core(sh) exactly once, inside its DBOS.runStep');
report((interp.match(/\bnodeStep\(async/g) ?? []).length === 5, `nodeStep() is the only entry for node cores: 5 call sites (block, llm, code, switch, delegate) -> found ${(interp.match(/\bnodeStep\(async/g) ?? []).length}`);
for (const f of readdirSync(SRC).filter((f) => f.endsWith('.ts'))) {
  const t = readFileSync(path.join(SRC, f), 'utf8');
  if (f !== 'clients.ts' && f !== 'main.ts') report(!/\bfetch\(|node:http|node:https|node:net|child_process/.test(t), `${f}: no network/process I/O`);
  if (f !== 'interpreter.ts' && f !== 'clients.ts') report(!/from '\.\/clients\.ts'/.test(t), `${f}: does not import clients.ts`);
}
console.log(bad ? `LINT FAIL (${bad})` : 'LINT PASS');
process.exit(bad ? 1 : 0);
