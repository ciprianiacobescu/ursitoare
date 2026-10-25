import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cedar, loadPolicyMap, loadSchemaText, validatePolicies } from "./cedar.ts";
import { ROOT } from "./catalogue.ts";
import { fixtureDirectory, type EntityJson } from "./directory.ts";
import { PolicyEngine, type CedarCall, type CheckRequest, type EngineOptions } from "./engine.ts";
import { SCENARIOS } from "./scenarios.ts";

const N = Number(process.env.BENCH_N ?? 10_000);
const WARMUP = Number(process.env.BENCH_WARMUP ?? 2_000);
const ROUNDS = Number(process.env.BENCH_ROUNDS ?? 3);

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const pct = (sorted: Float64Array, p: number) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];

interface Stats { n: number; p50: number; p95: number; p99: number; max: number; mean: number }   // microseconds
function measureNs(fn: (i: number) => unknown, n: number, warm: number): Stats {
  for (let i = 0; i < warm; i++) fn(i);
  const t = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = process.hrtime.bigint();
    fn(i);
    t[i] = Number(process.hrtime.bigint() - a) / 1000; // us with sub-us resolution
  }
  return summarize(t);
}
function summarize(t: Float64Array): Stats {
  const s = Float64Array.from(t).sort();
  let sum = 0; for (const x of t) sum += x;
  return { n: t.length, p50: pct(s, 50), p95: pct(s, 95), p99: pct(s, 99), max: s[s.length - 1], mean: sum / t.length };
}
const fmt = (x: number) => (x >= 1000 ? (x / 1000).toFixed(2) + " ms" : x.toFixed(1) + " us");

function rounds(fn: (i: number) => unknown, n: number, warm: number, r: number) {
  const rs: Stats[] = [];
  for (let k = 0; k < r; k++) rs.push(measureNs(fn, n, k === 0 ? warm : 200));
  const byP99 = [...rs].sort((a, b) => a.p99 - b.p99);
  const med = byP99[Math.floor(rs.length / 2)];
  return { median: med, p99_min: Math.min(...rs.map((x) => x.p99)), p99_max: Math.max(...rs.map((x) => x.p99)), max_all: Math.max(...rs.map((x) => x.max)), rounds: rs.length };
}

// ------------------------------------------------------------------ environment
const load = os.loadavg();
const env = {
  node: process.version, platform: `${os.platform()} ${os.release()} ${os.arch()}`, cpu: os.cpus()[0].model, cpus: os.cpus().length,
  mem_gb: Math.round(os.totalmem() / 2 ** 30), loadavg_1_5_15: load.map((x) => +x.toFixed(2)),
  cedar_wasm_npm: "4.14.0", cedar_core: cedar.getCedarVersion(), cedar_lang: cedar.getCedarLangVersion(),
  n_per_round: N, warmup: WARMUP, rounds: ROUNDS,
};
console.log("ENV", JSON.stringify(env));

// ------------------------------------------------------------------ 1. wasm init (fresh process x7)
const probe = path.join(ROOT, "scripts/init-probe.mjs");
const inits = Array.from({ length: 7 }, () => JSON.parse(execFileSync(process.execPath, [probe], { encoding: "utf8" })));
const initMs = inits.map((x) => x.init_ms);
const firstMs = inits.map((x) => x.first_call_ms);
console.log(`INIT wasm module load (fresh process, n=7): median ${median(initMs).toFixed(1)} ms, range ${Math.min(...initMs).toFixed(1)}-${Math.max(...initMs).toFixed(1)} ms; first isAuthorized call: median ${median(firstMs).toFixed(1)} ms; RSS delta ${median(inits.map((x) => x.rss_delta_mb)).toFixed(1)} MB`);

// ------------------------------------------------------------------ 2. policy-set / schema parse times
const policies = loadPolicyMap();
const schema = loadSchemaText();
const nPol = Object.keys(policies).length;
const polText = Object.values(policies).join("\n");
const parseTimes = (label: string, f: (i: number) => unknown, reps = 200) => {
  const s = measureNs(f, reps, 20);
  console.log(`PARSE ${label}: median-ish p50 ${fmt(s.p50)}, p95 ${fmt(s.p95)}, max ${fmt(s.max)} (n=${reps}, ${nPol} policies)`);
  return s;
};
const parsePolicy = parseTimes("preparsePolicySet (31 policies, cache for later calls)", (i) => cedar.preparsePolicySet(`bench-p-${i}`, { staticPolicies: policies }));
const parseCheck = parseTimes("checkParsePolicySet (31 policies, text)", () => cedar.checkParsePolicySet({ staticPolicies: polText }));
const parseSchema = parseTimes("preparseSchema", (i) => cedar.preparseSchema(`bench-s-${i}`, schema));
const validateT = parseTimes("validate (strict, 31 policies vs schema; CI/deploy-time)", () => validatePolicies(policies, schema), 50);

// ------------------------------------------------------------------ 3. authorization latency matrix
const dir = fixtureDirectory();
const full: EntityJson[] = dir.allEntities();
console.log(`ENTITIES full store: ${full.length} (${["Role", "User", "Flow", "Node", "Tool"].map((t) => `${t}=${full.filter((e) => e.uid.type === t).length}`).join(", ")}); policies: ${nPol}`);

const reqs: CheckRequest[] = SCENARIOS.filter((s) => !s.rf1Reviewed).map((s) => s.req);
const variants: { name: string; opts: EngineOptions }[] = [
  { name: "V0 isAuthorized (policies re-parsed per call), full store, no schema", opts: { stateful: false, useSchema: false, validateRequest: false, slice: false } },
  { name: "V1 stateful preparsed set, full store, no schema", opts: { stateful: true, useSchema: false, validateRequest: false, slice: false } },
  { name: "V2 stateful + schema parse, full store", opts: { stateful: true, useSchema: true, validateRequest: false, slice: false } },
  { name: "V3 stateful + schema + validateRequest, full store", opts: { stateful: true, useSchema: true, validateRequest: true, slice: false } },
  { name: "V4 stateful preparsed set, sliced entities, no schema", opts: { stateful: true, useSchema: false, validateRequest: false, slice: true } },
  { name: "V5 stateful + schema parse, sliced entities", opts: { stateful: true, useSchema: true, validateRequest: false, slice: true } },
  { name: "V6 stateful + schema + validateRequest, sliced (RECOMMENDED)", opts: { stateful: true, useSchema: true, validateRequest: true, slice: true } },
];

type Row = { name: string; evalOnly: ReturnType<typeof rounds>; endToEnd: ReturnType<typeof rounds>; entitiesPerCall: number };
const results: Row[] = [];
for (const v of variants) {
  const eng = new PolicyEngine(dir, v.opts, policies);
  // pre-build calls (drop requests that fail before evaluation)
  const calls: CedarCall[] = [];
  const okReqs: CheckRequest[] = [];
  for (const r of reqs) { try { calls.push(eng.build(r).call); okReqs.push(r); } catch { /* request_error path, not representative */ } }
  const heavy = !v.opts.stateful;
  const n = heavy ? Math.min(N, 2_000) : N;
  const warm = heavy ? 500 : WARMUP;
  const evalOnly = rounds((i) => eng.evaluate(calls[i % calls.length]), n, warm, ROUNDS);
  const endToEnd = rounds((i) => eng.check(okReqs[i % okReqs.length]), n, warm, ROUNDS);
  const ent = Math.round(calls.reduce((a, c) => a + c.entities.length, 0) / calls.length);
  results.push({ name: v.name, evalOnly, endToEnd, entitiesPerCall: ent });
  const show = (r: ReturnType<typeof rounds>) => `p50 ${fmt(r.median.p50)} p95 ${fmt(r.median.p95)} p99 ${fmt(r.median.p99)} max ${fmt(r.max_all)} (p99 across rounds ${fmt(r.p99_min)}..${fmt(r.p99_max)})`;
  console.log(`\nAUTH ${v.name}  [n=${n}x${ROUNDS}, requests in mix=${calls.length}, entities/call=${ent}]\n   wasm evaluate only: ${show(evalOnly)}\n   check() end-to-end: ${show(endToEnd)}`);
}

// ------------------------------------------------------------------ 4. scaling: entities and policies (evaluate-only, V6 config)
function padEntities(k: number): EntityJson[] {
  const extra: EntityJson[] = [];
  for (let i = 0; i < k; i++) extra.push(i % 2 ? dir.nodeEntity({ flow: "invoice-intake", id: `pad_${i}`, kind: "block" }) : dir.userEntity({ id: `pad_user_${i}`, roles: ["finance-clerk"], team: "finance" }));
  return extra;
}
const eng6 = new PolicyEngine(dir, variants[6].opts, policies);
const base = eng6.build(reqs[0]).call;
const scaling: { entities: number; stats: Stats }[] = [];
for (const k of [0, 20, 46, 200, 1000, 5000]) {
  const call: CedarCall = { ...base, entities: [...base.entities, ...padEntities(k)] };
  const s = measureNs(() => eng6.evaluate(call), Math.min(N, 5000), 500);
  scaling.push({ entities: call.entities.length, stats: s });
  console.log(`SCALE entities=${String(call.entities.length).padEnd(5)} p50 ${fmt(s.p50)} p95 ${fmt(s.p95)} p99 ${fmt(s.p99)} max ${fmt(s.max)}`);
}
const polScaling: { policies: number; stats: Stats }[] = [];
for (const mult of [1, 10, 50]) {
  const big: Record<string, string> = {};
  for (let m = 0; m < mult; m++) for (const [id, text] of Object.entries(policies)) big[`${id}#${m}`] = text.replace(/@id\("[^"]+"\)/, `@id("${id}#${m}")`);
  const e = new PolicyEngine(dir, variants[6].opts, big);
  const call = e.build(reqs[0]).call;
  const s = measureNs(() => e.evaluate(call), Math.min(N, 5000), 500);
  polScaling.push({ policies: Object.keys(big).length, stats: s });
  console.log(`SCALE policies=${String(Object.keys(big).length).padEnd(5)} p50 ${fmt(s.p50)} p95 ${fmt(s.p95)} p99 ${fmt(s.p99)} max ${fmt(s.max)}`);
}

// ------------------------------------------------------------------ 5. build vs evaluate split for the recommended path
const buildable = reqs.filter((r) => { try { eng6.build(r); return true; } catch { return false; } });
const buildOnly = measureNs((i) => eng6.build(buildable[i % buildable.length]), N, WARMUP);
console.log(`SPLIT PEP request construction (entity slice + context, no wasm): p50 ${fmt(buildOnly.p50)} p95 ${fmt(buildOnly.p95)} p99 ${fmt(buildOnly.p99)}`);

const out = { env, init: { init_ms: initMs, first_call_ms: firstMs, rss_delta_mb: inits.map((x) => x.rss_delta_mb) },
  parse: { preparsePolicySet: parsePolicy, checkParsePolicySet: parseCheck, preparseSchema: parseSchema, validate: validateT },
  entities_full: full.length, policies: nPol, results, scaling, polScaling, buildOnly };
writeFileSync(path.join(ROOT, "results/bench.json"), JSON.stringify(out, null, 1));
console.log("\nwrote results/bench.json");
