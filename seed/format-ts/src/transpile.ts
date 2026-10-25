/**
 * transpile(tsSource) -> { doc?, errors }
 *
 * 1. esbuild strips the types (no type checking happens).
 * 2. The result runs as an ES module in a fresh QuickJS-in-Wasm context with a memory ceiling, a stack limit and a
 *    wall-clock deadline. The only thing the sandbox knows about is the builder (src/prelude.js): there are no host
 *    functions, no Date, no Math.random, no eval, and the only import that resolves is `{ flow } from "@ursitoare/flow"`.
 * 3. The builder records the calls and hands back a format-v0 document as JSON text.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";
import { newQuickJSWASMModule, newVariant, RELEASE_SYNC } from "quickjs-emscripten";
import type { QuickJSContext, QuickJSHandle, QuickJSWASMModule } from "quickjs-emscripten";
import { KIND_SPECS } from "./kinds.ts";
import { parseSourceMap, type LineMap } from "./sourcemap.ts";

export type L0Code = "L0_SYNTAX" | "L0_EVAL_ERROR" | "L0_TIMEOUT" | "L0_BUILDER_MISUSE" | "L0_NO_FLOW";

export interface L0Error {
  layer: "L0";
  code: L0Code;
  message: string;
  line?: number;
}

export interface TranspileResult {
  doc?: Record<string, unknown>;
  errors: L0Error[];
}

export interface TranspileOptions {
  /** wall-clock budget for evaluating the module (default 2000 ms) */
  timeoutMs?: number;
  /** ceiling on the Wasm heap used by one evaluation (default 32 MiB, rounded up to 16 MiB buckets) */
  memoryBytes?: number;
  /** reject sources longer than this many characters (default 1,000,000) */
  maxSourceChars?: number;
}

export const FLOW_MODULE = "@ursitoare/flow";
const USER_FILE = "flow.ts";
const PAGE = 65536;
const BASE_PAGES = 256; // the prebuilt module declares 16 MiB of initial memory
const BUCKET = 16 * 1024 * 1024;
const STACK_BYTES = 64 * 1024; // deeper recursion can exhaust V8's own stack through the Wasm frames (sandbox-quickjs REPORT)

const here = dirname(fileURLToPath(import.meta.url));
const PRELUDE = readFileSync(join(here, "prelude.js"), "utf8").replace("__KINDS__", () => JSON.stringify(KIND_SPECS));

/**
 * quickjs-emscripten 0.32.0's JS_SetMemoryLimit does not count bytes in the prebuilt Wasm build (see
 * sandbox-quickjs/REPORT.md), so the real byte ceiling is the Wasm linear-memory maximum of a dedicated instance.
 */
const modules = new Map<number, Promise<QuickJSWASMModule>>();
function bucketOf(memoryBytes: number): number {
  return Math.max(1, Math.ceil(memoryBytes / BUCKET)) * BUCKET;
}
function getModule(memoryBytes: number): Promise<QuickJSWASMModule> {
  const bucket = bucketOf(memoryBytes);
  let m = modules.get(bucket);
  if (!m) {
    const variant = newVariant(RELEASE_SYNC, { wasmMemory: new WebAssembly.Memory({ initial: BASE_PAGES, maximum: BASE_PAGES + bucket / PAGE }) });
    m = newQuickJSWASMModule(variant);
    modules.set(bucket, m);
  }
  return m;
}

// Runs once in the context after the prelude captured what it needs: the determinism rules of the surface.
const HARDEN = `
"use strict";
delete globalThis.Date;
delete Math.random;
delete globalThis.eval;
globalThis.console = { log() {}, info() {}, warn() {}, error() {}, debug() {} };
0;
`;

function describe(ctx: QuickJSContext, h: QuickJSHandle): { name: string; message: string; stack: string } {
  // Not ctx.dump(): that calls the guest's JSON.stringify, which a polluted prototype could hijack.
  const out = { name: "Error", message: "", stack: "" };
  try {
    const t = ctx.typeof(h);
    if (t === "object") {
      for (const k of ["name", "message", "stack"] as const) {
        const p = ctx.getProp(h, k);
        if (ctx.typeof(p) === "string") out[k] = ctx.getString(p);
        p.dispose();
      }
    } else if (t === "string") out.message = ctx.getString(h);
    else out.message = `<thrown ${t}>`;
  } catch {
    out.message = "<undescribable error>";
  }
  return out;
}

function lineOf(stack: string, map?: LineMap): number | undefined {
  const m = new RegExp(`${USER_FILE.replace(".", "\\.")}:(\\d+)(?::(\\d+))?`).exec(stack);
  if (!m) return undefined;
  const gen = Number(m[1]);
  return (map && map.lookup(gen, m[2] ? Number(m[2]) : 1)) ?? gen;
}

export async function transpile(tsSource: string, opts: TranspileOptions = {}): Promise<TranspileResult> {
  const timeoutMs = opts.timeoutMs ?? 2000;
  const memoryBytes = opts.memoryBytes ?? 32 * 1024 * 1024;
  const fail = (code: L0Code, message: string, line?: number): TranspileResult => ({ errors: [{ layer: "L0", code, message, ...(line ? { line } : {}) }] });

  if (typeof tsSource !== "string") return fail("L0_SYNTAX", "source must be a string");
  if (tsSource.length > (opts.maxSourceChars ?? 1_000_000)) return fail("L0_SYNTAX", `source is longer than ${opts.maxSourceChars ?? 1_000_000} characters`);

  // ---- 1. strip types
  let js: string;
  let map: LineMap | undefined;
  try {
    const r = transformSync(tsSource, { loader: "ts", format: "esm", target: "es2020", sourcemap: "external", sourcefile: USER_FILE, logLevel: "silent" });
    js = r.code;
    map = parseSourceMap(r.map);
  } catch (e: any) {
    const errs: any[] = Array.isArray(e?.errors) && e.errors.length ? e.errors : [{ text: String(e?.message ?? e) }];
    return { errors: errs.slice(0, 5).map((x) => ({ layer: "L0" as const, code: "L0_SYNTAX" as const, message: String(x.text), ...(x.location?.line ? { line: x.location.line as number } : {}) })) };
  }

  // ---- 2. evaluate in QuickJS
  const handles: QuickJSHandle[] = [];
  const keep = (h: QuickJSHandle) => (handles.push(h), h);
  let QJS: QuickJSWASMModule;
  let rt: ReturnType<QuickJSWASMModule["newRuntime"]> | undefined;
  let ctx: QuickJSContext | undefined;
  let timedOut = false;
  let crashed = false;
  try {
    QJS = await getModule(memoryBytes);
    const deadline = performance.now() + timeoutMs;
    rt = QJS.newRuntime();
    rt.setMemoryLimit(memoryBytes);
    rt.setMaxStackSize(STACK_BYTES);
    rt.setInterruptHandler(() => {
      if (performance.now() > deadline) {
        timedOut = true;
        return true;
      }
      return false;
    });
    rt.setModuleLoader((name) =>
      name === FLOW_MODULE
        ? "export const flow = globalThis.flow;\nexport default flow;\n"
        : { error: new Error(`imports are not allowed: found an import of "${name}"; the only import that resolves is: import { flow } from "${FLOW_MODULE}"`) },
    );
    ctx = rt.newContext();
    const c = ctx;

    const pre = c.evalCode(PRELUDE, "prelude.js");
    if (pre.error) throw new Error(`builder prelude failed: ${JSON.stringify(describe(c, keep(pre.error)))}`);
    const finish = keep(pre.value);
    const hard = c.evalCode(HARDEN, "harden.js");
    if (hard.error) throw new Error(`hardening failed: ${JSON.stringify(describe(c, keep(hard.error)))}`);
    hard.value.dispose();

    const errors: L0Error[] = [];
    let evalErr: { name: string; message: string; stack: string } | undefined;
    const res = c.evalCode(js, USER_FILE, { type: "module" });
    if (res.error) evalErr = describe(c, keep(res.error));
    else {
      keep(res.value);
      const jobs = rt.executePendingJobs(512);
      if (jobs.error) evalErr = describe(c, keep(jobs.error));
    }

    if (timedOut) return fail("L0_TIMEOUT", `evaluation exceeded ${timeoutMs} ms (infinite loop?)`);

    // collect the builder's verdict even after a failure, so a swallowed misuse is not lost
    let outcome: { called: number; misuse: Array<{ message: string; stack: string }>; doc?: Record<string, unknown> } | undefined;
    const fr = c.callFunction(finish, c.undefined);
    if (fr.error) {
      if (timedOut) return fail("L0_TIMEOUT", `evaluation exceeded ${timeoutMs} ms`);
      keep(fr.error);
    } else {
      const s = c.getString(keep(fr.value));
      outcome = JSON.parse(s);
    }

    for (const m of outcome?.misuse ?? []) errors.push({ layer: "L0", code: "L0_BUILDER_MISUSE", message: m.message, ...(lineOf(m.stack, map) ? { line: lineOf(m.stack, map) } : {}) });
    if (evalErr && evalErr.name !== "BuilderMisuseError") {
      const l = lineOf(evalErr.stack, map);
      const code: L0Code = evalErr.name === "SyntaxError" ? "L0_SYNTAX" : "L0_EVAL_ERROR";
      const msg =
        evalErr.name === "InternalError" && evalErr.message === "out of memory"
          ? "memory limit exceeded while evaluating the flow"
          : evalErr.message === "<thrown null>" && !timedOut
            ? "evaluation failed (null thrown; probably out of memory)"
            : `${evalErr.name}: ${evalErr.message}`;
      errors.push({ layer: "L0", code, message: msg, ...(l ? { line: l } : {}) });
    } else if (evalErr && errors.length === 0) {
      errors.push({ layer: "L0", code: "L0_BUILDER_MISUSE", message: evalErr.message });
    }
    if (errors.length) return { errors };
    if (!outcome || outcome.called === 0 || !outcome.doc) return fail("L0_NO_FLOW", 'the file never called flow({ ... }, f => { ... }); it must define exactly one flow');
    return { doc: outcome.doc, errors: [] };
  } catch (e: any) {
    // Anything the guest cannot catch: V8 stack exhaustion through Wasm frames, a Wasm trap, an emscripten abort.
    crashed = true;
    if (timedOut) return fail("L0_TIMEOUT", `evaluation exceeded ${timeoutMs} ms`);
    return fail("L0_EVAL_ERROR", `sandbox fault: ${e?.constructor?.name}: ${String(e?.message ?? e).slice(0, 300)}`);
  } finally {
    try {
      if (!crashed) {
        for (const h of handles.reverse()) if (h.alive) h.dispose();
        ctx?.dispose();
        rt?.dispose();
      }
    } catch {
      crashed = true;
    }
    if (crashed) modules.delete(bucketOf(memoryBytes)); // its linear memory must be considered poisoned
  }
}
