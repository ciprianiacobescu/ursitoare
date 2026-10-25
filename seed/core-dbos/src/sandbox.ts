// `code` node runtime: QuickJS (Wasm) with a fresh runtime+context per call, no host functions,
// frozen Date and seeded Math.random. Input goes in as a JSON string; output comes back as a JSON string.
import { getQuickJS, shouldInterruptAfterDeadline } from 'quickjs-emscripten';
import { createHash } from 'node:crypto';
import { RunFailure } from './errors.ts';

const FROZEN_EPOCH_MS = Date.UTC(2026, 0, 1);

const PRELUDE = (seed: number) => `(() => {
  const T = ${FROZEN_EPOCH_MS}; const OD = Date;
  function FD(...a) { if (!new.target) return new OD(T).toString(); return a.length ? new OD(...a) : new OD(T); }
  FD.prototype = OD.prototype; FD.now = () => T; FD.parse = OD.parse; FD.UTC = OD.UTC;
  OD.now = () => T;
  Object.defineProperty(OD.prototype, 'constructor', { value: FD, writable: false, configurable: false });
  globalThis.Date = FD;
  let s = ${seed >>> 0};
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
})();`;

export async function runSandboxed(source: string, input: unknown, seedKey: string): Promise<unknown> {
  const QuickJS = await getQuickJS();
  const rt = QuickJS.newRuntime();
  rt.setMemoryLimit(32 * 1024 * 1024);
  rt.setMaxStackSize(512 * 1024);
  rt.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + 2000));
  const vm = rt.newContext();
  try {
    const seed = createHash('sha256').update(seedKey).digest().readUInt32LE(0);
    vm.unwrapResult(vm.evalCode(PRELUDE(seed))).dispose();
    const inputStr = vm.newString(JSON.stringify(input ?? null));
    vm.setProp(vm.global, '__input', inputStr);
    inputStr.dispose();
    const res = vm.evalCode(`JSON.stringify((function(input){\n${source}\n})(JSON.parse(__input)))`, 'code-node.js');
    if (res.error) {
      const err = vm.dump(res.error); res.error.dispose();
      throw new RunFailure('code_error', `code node threw: ${typeof err === 'object' ? err.message ?? JSON.stringify(err) : String(err)}`);
    }
    const out = vm.dump(res.value); res.value.dispose();
    if (typeof out !== 'string') throw new RunFailure('code_error', 'code node must return a JSON-serialisable object');
    return JSON.parse(out);
  } finally {
    vm.dispose();
    rt.dispose();
  }
}
