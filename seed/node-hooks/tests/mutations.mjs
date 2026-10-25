// Harness sensitivity check (extra): break the engine on purpose, one mutation at a time, and confirm the scenarios that guard that
// property FAIL. A scenario that stays green under its mutation would be vacuous. Restores every file afterwards.
import { readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const MUTATIONS = [
  { id: 'M1', what: 'skip allowed on any node', file: 'src/hooks.ts', from: "const skippable = node.effect === 'read' && (k === 'block' || k === 'code' || isLlm(k));", to: 'const skippable = true;', expect_fail: ['S18a', 'S18c'] },
  { id: 'M2', what: 'block hooks bypass the PEP', file: 'src/interpreter.ts', from: "const d = guard({ node: nodeId, kind: 'hook', tool: h.uses!, args: withArgs, taint: tt });", to: "const d: PolicyDecision = { decision: 'allow' };", expect_fail: ['S19'] },
  { id: 'M3', what: 'post mutate output clears taint', file: 'src/interpreter.ts', from: 's.outTaint = uniq([...s.outTaint, ...s.taintIn, ...hookT]);', to: 's.outTaint = [];', expect_fail: ['S17'] },
  { id: 'M4', what: 'hook idempotency key not stable across recovery', file: 'src/interpreter.ts', from: 'const key = `${keyBase}:${nodeId}#${phase}:${hid}:a${attempt}`;', to: 'const key = `${keyBase}:${nodeId}#${phase}:${hid}:a${attempt}:${Math.random()}`;', expect_fail: ['C2', 'S07'] },
  { id: 'M5', what: 'redirect outside routes allowed', file: 'src/hooks.ts', from: "!(p.hook.routes ?? []).includes(act.to)", to: 'false', expect_fail: ['S13'] },
  { id: 'M6', what: 'dominance check disabled', file: 'src/check.ts', from: "if (!dom[consumer]!.has(p)) err('H_DOMINANCE'", to: "if (false) err('H_DOMINANCE'", expect_fail: ['S14'] },
  { id: 'M7', what: 'hook code runs without a checkpoint (not its own step)', file: 'src/interpreter.ts', from: 'return DBOS.runStep<HookRes>(() => execCode(p, ctx, s), { name, ...RETRY });', to: 'return execCode(p, ctx, s);', expect_fail: ['C1', 'S09'] },
  { id: 'M8', what: 'retry ignores max_retries', file: 'src/interpreter.ts', from: 'if (s.attempt - 1 >= p.hook.max_retries!) fail(', to: 'if (false) fail(', expect_fail: ['S05b'] },
];
const only = process.argv[2]?.split(',');
const out = [];
for (const m of MUTATIONS.filter((x) => !only || only.includes(x.id))) {
  const file = path.join(ROOT, m.file);
  const orig = readFileSync(file, 'utf8');
  if (!orig.includes(m.from)) { out.push({ ...m, error: 'patch target not found' }); console.log(`${m.id} PATCH TARGET NOT FOUND`); continue; }
  writeFileSync(file, orig.replace(m.from, m.to));
  let stdout = '';
  try { stdout = execFileSync('node', ['tests/scenarios.mjs', '--only', m.expect_fail.join(','), '--tag', `mutation-${m.id}`], { cwd: ROOT, encoding: 'utf8' }); }
  catch (e) { stdout = String(e.stdout ?? e); }
  finally { writeFileSync(file, orig); }
  const res = Object.fromEntries(m.expect_fail.map((id) => [id, new RegExp(`^PASS  ${id}  `, 'm').test(stdout) ? 'PASS' : new RegExp(`^FAIL  ${id}  `, 'm').test(stdout) ? 'FAIL' : 'NO RESULT']));
  const detected = Object.values(res).some((v) => v === 'FAIL');
  out.push({ id: m.id, what: m.what, expected_to_fail: m.expect_fail, observed: res, detected });
  console.log(`${m.id}  ${m.what}: ${JSON.stringify(res)}  ${detected ? 'DETECTED' : 'NOT DETECTED'}`);
}
for (const f of readdirSync(path.join(ROOT, 'results'))) if (f.includes('mutation-')) rmSync(path.join(ROOT, 'results', f));
writeFileSync(path.join(ROOT, 'results', 'mutations.json'), JSON.stringify(out, null, 2));
