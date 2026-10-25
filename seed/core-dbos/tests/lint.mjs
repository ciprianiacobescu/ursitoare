// C2 definition lint (static): every outbound call (callBlock / callLlm / callDelegate) in the interpreter must sit inside a
// DBOS step, after a guard() policy check whose deny result short-circuits; and nothing outside clients.ts may do network I/O.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
let bad = 0; const report = (ok, msg) => { if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };

const interp = readFileSync(path.join(SRC, 'interpreter.ts'), 'utf8');
const calls = [...interp.matchAll(/\b(callBlock|callLlm|callDelegate)\(/g)].filter((m) => !/^import/.test(interp.slice(interp.lastIndexOf('\n', m.index) + 1, m.index)));
report(calls.length === 3, `interpreter has exactly 3 outbound call sites (found ${calls.length}: ${calls.map((c) => c[1]).join(', ')})`);
for (const m of calls) {
  const before = interp.slice(0, m.index);
  const stepAt = before.lastIndexOf('DBOS.runStep');
  const seg = before.slice(stepAt);
  const guardAt = seg.indexOf('guard({');
  const denyAt = seg.indexOf("d.decision === 'deny') return {");
  report(stepAt >= 0 && guardAt >= 0 && denyAt > guardAt, `${m[1]} is preceded by guard() + deny short-circuit inside the same DBOS step`);
}
for (const f of readdirSync(SRC).filter((f) => f.endsWith('.ts'))) {
  const t = readFileSync(path.join(SRC, f), 'utf8');
  if (f !== 'clients.ts' && f !== 'main.ts') report(!/\bfetch\(|node:http|node:https|node:net|child_process/.test(t), `${f}: no network/process I/O`);
  if (f !== 'interpreter.ts' && f !== 'clients.ts') report(!/from '\.\/clients\.ts'/.test(t), `${f}: does not import clients.ts`);
}
console.log(bad ? `LINT FAIL (${bad})` : 'LINT PASS');
process.exit(bad ? 1 : 0);
