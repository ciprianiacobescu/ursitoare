import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runCode } from '../src/index.ts';
import type { Limits, RunResult } from '../src/index.ts';
import { startStub, STUB_ORIGIN } from './stub-server.ts';

const LIMITS: Limits = { timeoutMs: 1000, memoryBytes: 32 << 20, maxStackBytes: 64 << 10, maxOutputBytes: 100_000 };
const NOW = '2026-10-24T12:00:00.000Z';
const RUNS = 1000;

// Body of the RF-1 `normalize` node, read verbatim from the normative flow file.
function rf1NormalizeSource(): string {
  const yaml = readFileSync(new URL('../../shared/flows/rf-1-invoice-intake.yaml', import.meta.url), 'utf8');
  const m = /normalize:[\s\S]*?source: \|\n((?: {6}.*\n)+)/.exec(yaml);
  assert.ok(m, 'normalize source not found in rf-1 yaml');
  return m[1].split('\n').map((l) => l.slice(6)).join('\n');
}
const NORMALIZE = rf1NormalizeSource();
const CLOCK_RANDOM = `
  const r = [Math.random(), Math.random(), Math.random()];
  return {
    now: Date.now(), iso: new Date().toISOString(), str: String(new Date()), r,
    id: Math.floor(Math.random() * 1e9).toString(36),
    shuffled: [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5),
    plus1h: new Date(Date.now() + 3600000).toISOString(),
    parts: [new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), new Date().getHours()]
  };`;

const digest = (r: RunResult) => createHash('sha256').update(JSON.stringify(r.ok ? r.output : r.error)).digest('hex');
const exec = (source: string, input: unknown, seed: number | string, nowIso = NOW) => runCode({ source, input, limits: LIMITS, seed, nowIso });

const evidence: Record<string, unknown> = { runs: RUNS, normalizeSource: NORMALIZE };

test(`RF-1 normalize: ${RUNS} runs, same input -> one distinct output`, async () => {
  const input = { amount: 1234.567, currency: 'eur' };
  const set = new Map<string, number>();
  let ref = '';
  for (let i = 0; i < RUNS; i++) {
    const r = await exec(NORMALIZE, input, 42);
    assert.ok(r.ok, JSON.stringify(r));
    const d = digest(r); set.set(d, (set.get(d) ?? 0) + 1); ref = JSON.stringify(r.output);
  }
  evidence.normalize = { distinctOutputs: set.size, sampleOutput: ref, sha256: [...set.keys()][0] };
  assert.equal(set.size, 1);
  assert.equal(ref, '{"amount":1234.57,"currency":"EUR","is_large":true}');
});

test(`Date.now()/Math.random() body: ${RUNS} runs same seed+now -> identical; ${RUNS} different seeds -> different`, async () => {
  const same = new Set<string>();
  let sample = '';
  for (let i = 0; i < RUNS; i++) { const r = await exec(CLOCK_RANDOM, {}, 42); assert.ok(r.ok, JSON.stringify(r)); same.add(digest(r)); sample = JSON.stringify(r.output); }
  assert.equal(same.size, 1);
  const baseline = [...same][0];

  const diffSeeds = new Set<string>();
  for (let i = 0; i < RUNS; i++) { const r = await exec(CLOCK_RANDOM, {}, 1000 + i); assert.ok(r.ok); diffSeeds.add(digest(r)); }
  assert.ok(!diffSeeds.has(baseline), 'a different seed produced the baseline output');
  assert.equal(diffSeeds.size, RUNS, 'every distinct seed should give a distinct output');

  const str = new Set<string>();
  for (let i = 0; i < 50; i++) { const r = await exec(CLOCK_RANDOM, {}, 'seed-' + i); assert.ok(r.ok); str.add(digest(r)); }
  assert.equal(str.size, 50);

  const nows = new Set<string>();
  for (let i = 0; i < 50; i++) { const r = await exec(CLOCK_RANDOM, {}, 42, new Date(Date.parse(NOW) + i * 1000).toISOString()); assert.ok(r.ok); nows.add(digest(r)); }
  assert.equal(nows.size, 50, 'a different nowIso must change the output');

  evidence.clockRandom = { sameSeedDistinct: same.size, sameSeedSha256: baseline, differentSeeds: RUNS, differentSeedDistinct: diffSeeds.size, stringSeeds: str.size, differentNowDistinct: nows.size, sample };
});

test('guest mulberry32 equals an independent host-side reference implementation', async () => {
  function mulberry32(seed: number) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const ref = mulberry32(12345);
  const expected = Array.from({ length: 10 }, () => ref());
  const r = await exec(`return { v: Array.from({ length: 10 }, () => Math.random()) };`, {}, 12345);
  assert.ok(r.ok);
  assert.deepEqual(r.output.v, expected);
  evidence.prngReference = { seed: 12345, first3: expected.slice(0, 3) };
});

test('determinism across separate Node processes and host timezones (UTC, Los_Angeles, Tokyo)', () => {
  const probe = `import { runCode } from './src/index.ts'; import { createHash } from 'node:crypto';
    const src = ${JSON.stringify(CLOCK_RANDOM)}; const h = createHash('sha256');
    for (let i = 0; i < 100; i++) { const r = await runCode({ source: src, input: {}, limits: { timeoutMs: 1000, memoryBytes: 32<<20, maxStackBytes: 64<<10, maxOutputBytes: 100000 }, seed: i, nowIso: '${NOW}' }); h.update(JSON.stringify(r.ok ? r.output : r.error)); }
    console.log(h.digest('hex'));`;
  const outs = ['UTC', 'America/Los_Angeles', 'Asia/Tokyo'].map((tz) => execFileSync(process.execPath, ['--input-type=module', '-e', probe], { env: { ...process.env, TZ: tz }, cwd: new URL('..', import.meta.url).pathname }).toString().trim());
  evidence.crossProcessTz = { digests: outs, distinct: new Set(outs).size };
  assert.equal(new Set(outs).size, 1, outs.join(' '));
});

test('fetch replay: 200 replayed runs are identical and touch no network; two live runs differ', async () => {
  const stub = await startStub();
  try {
    const src = `const r = await fetch('${STUB_ORIGIN}/nondeterministic'); const j = await r.json(); return { n: j.n, t: j.t, rnd: Math.random(), hdr: r.headers.get('x-counter') };`;
    const live = await runCode({ source: src, input: {}, limits: LIMITS, seed: 9, nowIso: NOW, fetchAllowlist: [STUB_ORIGIN] });
    const live2 = await runCode({ source: src, input: {}, limits: LIMITS, seed: 9, nowIso: NOW, fetchAllowlist: [STUB_ORIGIN] });
    assert.ok(live.ok && live2.ok);
    assert.notEqual(digest(live), digest(live2));
    const hitsBefore = stub.total();
    const set = new Set<string>();
    for (let i = 0; i < 200; i++) { const r = await runCode({ source: src, input: {}, limits: LIMITS, seed: 9, nowIso: NOW, fetchAllowlist: [STUB_ORIGIN], fetchReplay: live.fetchLog }); assert.ok(r.ok, JSON.stringify(r)); set.add(digest(r)); }
    assert.equal(set.size, 1);
    assert.equal([...set][0], digest(live));
    assert.equal(stub.total(), hitsBefore, 'replay must not hit the network');
    evidence.replay = { replayRuns: 200, distinct: set.size, equalsRecordedLive: true, liveRunsDiffer: true, stubHitsDuringReplay: stub.total() - hitsBefore };
  } finally { await stub.close(); }
});

test('write evidence', () => {
  writeFileSync(new URL('../results/determinism.json', import.meta.url), JSON.stringify(evidence, null, 2));
});
