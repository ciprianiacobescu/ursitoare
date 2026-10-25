import { newQuickJSWASMModule, newVariant, RELEASE_SYNC } from 'quickjs-emscripten';
import type { QuickJSWASMModule, QuickJSContext, QuickJSHandle, QuickJSDeferredPromise, QuickJSRuntime } from 'quickjs-emscripten';
import { buildPrelude } from './prelude.ts';
import { FetchGateway, normalizeOrigins } from './fetchGateway.ts';
import type { ErrorCode, FetchRecord, RunCodeOptions, RunResult, RunStats } from './types.ts';

export type * from './types.ts';

/**
 * The Wasm module runs on V8's native stack (about 984 KB by default) while QuickJS counts its limit against the
 * Wasm shadow stack, and the native-to-shadow ratio depends on the code path. Measured on Node 26.8 /
 * quickjs-emscripten 0.32.0 (see REPORT.md): plain recursion survives 256 KB, but deep JSON.stringify / JSON.parse /
 * Array.flat / String(nested) recursion exhausts V8's stack at 96-160 KB and surfaces as a host-side RangeError
 * (recovered as `sandbox_crash`). 64 KB was crash-free across 16 recursion shapes, so that is the hard cap.
 */
export const MIN_STACK_BYTES = 32 * 1024;
export const MAX_STACK_BYTES = 64 * 1024;

/** Counters for tests/benchmarks. `moduleResets` counts abandoned Wasm instances (aborts / V8 stack faults). */
export const diagnostics = { moduleResets: 0 };

const PAGE = 65536;
const BASE_PAGES = 256; // the prebuilt module declares an initial memory of 16 MiB; a smaller wasmMemory fails to link
const BUCKET_BYTES = 16 * 1024 * 1024;

/**
 * IMPORTANT (measured, see REPORT.md): in the prebuilt Emscripten build, JS_SetMemoryLimit does not count bytes
 * (malloc_usable_size is stubbed out, so every allocation is accounted as ~8 bytes). A 16 MiB limit let a guest reach
 * ~1.5 GiB of live heap and ~2 GiB RSS in about 2 s. The only real byte ceiling is the Wasm linear memory maximum,
 * so each memory bucket gets its own module instance whose WebAssembly.Memory has maximum = 16 MiB + bucket size.
 * Hitting it makes malloc fail, which QuickJS turns into a normal "out of memory" InternalError.
 */
export function memoryBucket(memoryBytes: number): number {
  return Math.max(1, Math.ceil(memoryBytes / BUCKET_BYTES)) * BUCKET_BYTES;
}
const modules = new Map<number, Promise<QuickJSWASMModule>>();
export function getModule(memoryBytes = 32 * 1024 * 1024): Promise<QuickJSWASMModule> {
  const bucket = memoryBucket(memoryBytes);
  let m = modules.get(bucket);
  if (!m) {
    const maxPages = BASE_PAGES + bucket / PAGE;
    const variant = newVariant(RELEASE_SYNC, { wasmMemory: new WebAssembly.Memory({ initial: BASE_PAGES, maximum: maxPages }) });
    m = newQuickJSWASMModule(variant);
    modules.set(bucket, m);
  }
  return m;
}
/** Drop a cached Wasm module (called after an abort or a V8 stack fault: its linear memory must be considered poisoned). */
export function resetModule(memoryBytes: number): void {
  diagnostics.moduleResets++;
  modules.delete(memoryBucket(memoryBytes));
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function seedToUint32(seed: number | string): number {
  if (typeof seed === 'number' && Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff) return seed;
  return fnv1a(String(seed));
}

class RunFailure extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** Strict JSON check for host -> guest data. Rejects anything JSON.stringify would silently drop or coerce. */
function strictJson(v: unknown, path: string, depth: number, stack: Set<object>): void {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new RunFailure('input_invalid', `input${path}: non-finite number`);
    return;
  }
  if (typeof v !== 'object') throw new RunFailure('input_invalid', `input${path}: ${typeof v} is not JSON`);
  if (depth > 64) throw new RunFailure('input_invalid', `input${path}: nesting deeper than 64`);
  if (stack.has(v)) throw new RunFailure('input_invalid', `input${path}: cycle`);
  stack.add(v);
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      if (!(i in v)) throw new RunFailure('input_invalid', `input${path}[${i}]: sparse array`);
      strictJson(v[i], `${path}[${i}]`, depth + 1, stack);
    }
  } else {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) throw new RunFailure('input_invalid', `input${path}: non-plain object`);
    for (const k of Object.keys(v)) {
      const d = Object.getOwnPropertyDescriptor(v, k)!;
      if (!('value' in d)) throw new RunFailure('input_invalid', `input${path}.${k}: accessor property`);
      strictJson(d.value, `${path}.${k}`, depth + 1, stack);
    }
  }
  stack.delete(v);
}

function describeError(ctx: QuickJSContext, h: QuickJSHandle): { name: string; message: string } {
  // Deliberately not ctx.dump(): dump() calls the guest's JSON.stringify, which honours a polluted Object.prototype.toJSON.
  try {
    const t = ctx.typeof(h);
    if (t === 'object') {
      const out = { name: 'Error', message: '' };
      const nh = ctx.getProp(h, 'name');
      const mh = ctx.getProp(h, 'message');
      if (ctx.typeof(nh) === 'string') out.name = ctx.getString(nh);
      if (ctx.typeof(mh) === 'string') out.message = ctx.getString(mh);
      nh.dispose();
      mh.dispose();
      return out;
    }
    if (t === 'string') return { name: 'Error', message: ctx.getString(h) };
    return { name: 'Error', message: `<thrown ${t}>` };
  } catch {
    return { name: 'Error', message: '<undescribable error>' };
  }
}

function classify(e: { name: string; message: string }, timedOut: boolean, nearCeiling: () => boolean = () => false): { code: ErrorCode; message: string } {
  if (e.name === 'NullThrown') {
    return !timedOut && nearCeiling()
      ? { code: 'memory_limit', message: 'allocation failed at the Wasm memory ceiling (no exception object could be built)' }
      : timedOut ? { code: 'timeout', message: 'execution exceeded timeoutMs' } : { code: 'runtime_error', message: 'null was thrown' };
  }
  if (timedOut) return { code: 'timeout', message: 'execution exceeded timeoutMs' };
  if (e.name === 'InternalError' && e.message === 'out of memory') return { code: 'memory_limit', message: 'guest heap exceeded memoryBytes' };
  if ((e.name === 'InternalError' && e.message === 'stack overflow') || (e.name === 'RangeError' && /Maximum call stack size exceeded/.test(e.message))) return { code: 'stack_overflow', message: e.message };
  if (e.name === 'OutputTooLargeError') return { code: 'output_too_large', message: e.message };
  if (e.name === 'OutputError') return { code: 'output_invalid', message: e.message };
  if (e.name === 'FetchDeniedError') return { code: 'fetch_denied', message: e.message };
  if (e.name === 'ReplayMismatchError') return { code: 'replay_mismatch', message: e.message };
  if (e.name === 'FetchError') return { code: 'fetch_failed', message: e.message };
  return { code: 'runtime_error', message: `${e.name}: ${e.message}` };
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
  });

export async function runCode(opts: RunCodeOptions): Promise<RunResult> {
  const t0 = performance.now();
  const stats: RunStats = { ms: 0, memBytes: -1 };
  let gateway: FetchGateway | undefined;
  const finish = (r: { ok: true; output: Record<string, unknown> } | { ok: false; error: { code: ErrorCode; message: string } }): RunResult => {
    stats.ms = performance.now() - t0;
    if (!r.ok && r.error.code === 'memory_limit') skipMemSample = true; // at the Wasm ceiling even this bookkeeping allocation can trap
    return { ...r, stats, fetchLog: gateway?.log ?? [] } as RunResult;
  };

  let QJS: QuickJSWASMModule;
  let rt: QuickJSRuntime | undefined;
  let ctx: QuickJSContext | undefined;
  const handles: QuickJSHandle[] = [];
  const deferreds: QuickJSDeferredPromise[] = [];
  const keep = (h: QuickJSHandle) => { handles.push(h); return h; };
  let alive = true;
  let crashed = false;
  let timedOut = false;
  let skipMemSample = false;
  let nearCeiling: () => boolean = () => false;

  try {
    // ---- validate options (host side, before any guest exists)
    const nowMs = Date.parse(opts.nowIso);
    if (!Number.isFinite(nowMs)) throw new RunFailure('input_invalid', `nowIso is not a valid date: ${opts.nowIso}`);
    const { timeoutMs, memoryBytes, maxOutputBytes } = opts.limits;
    if (![timeoutMs, memoryBytes, maxOutputBytes, opts.limits.maxStackBytes].every((n) => Number.isFinite(n) && n > 0))
      throw new RunFailure('input_invalid', 'limits must be positive finite numbers');
    const stackBytes = Math.min(opts.stackCapBytes ?? MAX_STACK_BYTES, Math.max(MIN_STACK_BYTES, Math.floor(opts.limits.maxStackBytes)));
    const stack = new Set<object>();
    strictJson(opts.input, '', 0, stack);
    const inputJson = JSON.stringify(opts.input);
    if (inputJson === undefined || inputJson.length > 8_000_000) throw new RunFailure('input_invalid', 'input missing or larger than 8 MB');
    if (opts.fetchAllowlist) {
      try {
        gateway = new FetchGateway({
          allowlist: normalizeOrigins(opts.fetchAllowlist),
          replay: opts.fetchReplay,
          impl: opts.fetchImpl,
          maxRequests: opts.fetchMaxRequests ?? 16,
          maxResponseBytes: opts.fetchMaxResponseBytes ?? 1_000_000,
        });
      } catch (e) {
        throw new RunFailure('input_invalid', `bad fetchAllowlist: ${(e as Error).message}`);
      }
    }

    // ---- fresh runtime + context
    QJS = await getModule(memoryBytes);
    const ceilingBytes = (BASE_PAGES + memoryBucket(memoryBytes) / PAGE) * PAGE;
    nearCeiling = () => QJS.getWasmMemory().buffer.byteLength >= ceilingBytes - 2 * PAGE;
    const deadline = performance.now() + timeoutMs;
    rt = QJS.newRuntime();
    rt.setMemoryLimit(memoryBytes);
    rt.setMaxStackSize(stackBytes);
    rt.setInterruptHandler(() => {
      if (performance.now() > deadline) { timedOut = true; return true; }
      return false;
    });
    ctx = rt.newContext();
    const c = ctx;
    const r = rt;

    if (gateway) {
      const gw = gateway;
      const hf = keep(c.newFunction('__hf', (reqH) => {
        const reqStr = c.getString(reqH);
        const d = c.newPromise();
        deferreds.push(d);
        const p = gw.handle(reqStr).then((s) => {
          if (!alive) return;
          const sh = c.newString(s);
          d.resolve(sh);
          sh.dispose();
        });
        const tracked = p.catch(() => undefined).finally(() => pending.delete(tracked));
        pending.add(tracked);
        return d.handle;
      }));
      c.setProp(c.global, '__hf', hf);
    }
    const pending = new Set<Promise<void>>();

    const prelude = buildPrelude({ nowMs, seed: seedToUint32(opts.seed), maxOutputChars: maxOutputBytes, fetchEnabled: !!gateway });
    const driverRes = c.evalCode(prelude, 'prelude.js');
    if (driverRes.error) throw new RunFailure('runtime_error', `prelude failed: ${JSON.stringify(describeError(c, keep(driverRes.error)))}`);
    const driver = keep(driverRes.value);

    const wrapped = `(async function (input) {\n"use strict";\n${opts.source}\n})`;
    const fnRes = c.evalCode(wrapped, 'code-node.js');
    if (fnRes.error) {
      const err = describeError(c, keep(fnRes.error));
      if (timedOut) return finish({ ok: false, error: classify(err, true) });
      return finish({ ok: false, error: { code: err.name === 'SyntaxError' ? 'syntax_error' : 'runtime_error', message: `${err.name}: ${err.message}` } });
    }
    const fn = keep(fnRes.value);
    const inputH = keep(c.newString(inputJson));
    stats.setupMs = performance.now() - t0;

    const callRes = c.callFunction(driver, c.undefined, fn, inputH);
    if (callRes.error) {
      return finish({ ok: false, error: classify(describeError(c, keep(callRes.error)), timedOut) });
    }
    const promise = keep(callRes.value);

    // ---- pump: run microtasks, wait for host fetches, until the driver promise settles or the deadline passes
    for (;;) {
      const jobs = r.executePendingJobs(512);
      if (jobs.error) {
        // An error out of executePendingJobs is engine-level (user exceptions inside jobs become promise rejections):
        // either the interrupt handler fired, or an allocation failed while no exception object could be built.
        const err = describeError(c, keep(jobs.error));
        if (!timedOut && err.message === '<thrown null>') return finish({ ok: false, error: { code: 'memory_limit', message: 'guest heap exceeded memoryBytes (job queue)' } });
        return finish({ ok: false, error: classify(err, timedOut) });
      }
      const st = c.getPromiseState(promise);
      if (st.type !== 'pending') {
        stats.execMs = performance.now() - t0;
        // Native built-ins (BigInt math, big String.replace, ...) don't poll the interrupt handler, so a run can finish
        // late without ever being interrupted. The budget is wall-clock, so that still counts as a timeout.
        if (performance.now() > deadline) { timedOut = true; return finish({ ok: false, error: classify({ name: 'InternalError', message: 'interrupted' }, true) }); }
        if (st.type === 'rejected') {
          const err = describeError(c, keep(st.error));
          return finish({ ok: false, error: classify(err, timedOut) });
        }
        const env = c.getString(keep(st.value));
        if (env[0] === 'E') {
          let e: { name: string; message: string };
          try { e = JSON.parse(env.slice(1)); } catch { e = { name: 'Error', message: 'unparseable error envelope' }; }
          return finish({ ok: false, error: classify(e, timedOut, nearCeiling) });
        }
        const outStr = env.slice(1);
        const bytes = Buffer.byteLength(outStr, 'utf8');
        if (bytes > maxOutputBytes) return finish({ ok: false, error: { code: 'output_too_large', message: `output is ${bytes} bytes, limit ${maxOutputBytes}` } });
        let parsed: unknown;
        try {
          parsed = JSON.parse(outStr);
        } catch {
          return finish({ ok: false, error: { code: 'output_invalid', message: 'driver produced invalid JSON' } });
        }
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
          return finish({ ok: false, error: { code: 'output_invalid', message: 'output must be an object' } });
        return finish({ ok: true, output: parsed as Record<string, unknown> });
      }
      if (performance.now() > deadline) { timedOut = true; return finish({ ok: false, error: classify({ name: 'InternalError', message: 'interrupted' }, true) }); }
      if (r.hasPendingJob()) continue;
      if (pending.size > 0) {
        const remaining = deadline - performance.now();
        const wake = new AbortController();
        await Promise.race([Promise.race([...pending]), sleep(Math.max(0, remaining), wake.signal)]);
        wake.abort();
        continue;
      }
      // Note: an allocation failure inside a promise job is swallowed by the engine (the chain just stops and its memory is
      // freed), so an out-of-memory promise flood also ends up here; the heap is no longer high enough to tell it apart.
      return finish({ ok: false, error: { code: 'never_settled', message: 'the code body returned a promise that can never settle (deadlock, or an out-of-memory failure swallowed inside a promise job)' } });
    }
  } catch (e) {
    if (e instanceof RunFailure) return finish({ ok: false, error: { code: e.code, message: e.message } });
    // Anything else is a host-visible fault: V8 stack exhaustion through the Wasm frames, a Wasm trap, an emscripten abort.
    crashed = true;
    return finish({ ok: false, error: { code: 'sandbox_crash', message: `${(e as Error)?.constructor?.name}: ${String((e as Error)?.message).slice(0, 300)}` } });
  } finally {
    alive = false;
    gateway?.abort.abort();
    // sample live heap before teardown
    if (rt && ctx && !crashed && !skipMemSample) {
      try {
        const mh = rt.computeMemoryUsage();
        const d = ctx.dump(mh) as { memory_used_size?: number };
        mh.dispose();
        stats.memBytes = d.memory_used_size ?? -1;
      } catch { crashed = true; /* a trap here means the instance is poisoned */ }
    }
    try {
      if (!crashed) {
        for (const d of deferreds) if (d.alive) d.dispose();
        for (const h of handles.reverse()) if (h.alive) h.dispose();
        ctx?.dispose();
        rt?.dispose();
      }
    } catch {
      crashed = true;
    }
    if (crashed) resetModule(opts.limits?.memoryBytes ?? 32 * 1024 * 1024);
    stats.ms = performance.now() - t0;
  }
}
