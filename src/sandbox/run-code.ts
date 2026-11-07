// One run of pure code in a fresh QuickJS runtime and context (design § 3).
import type { QuickJSContext, QuickJSHandle, QuickJSRuntime, QuickJSWASMModule } from "quickjs-emscripten-core";

import { classifyFault } from "./classify.ts";
import type { FaultFacts } from "./classify.ts";
import { clampStack, memoryBucket, seedOf } from "./limits.ts";
import { buildPrelude } from "./prelude.ts";
import { ceilingBytes, getModule, resetModule } from "./wasm.ts";
import type { SandboxFaultCode, SandboxJson, SandboxLimits, SandboxOptions, SandboxResult, SandboxStats } from "./types.ts";

const PAGE_BYTES = 65536;

export interface SandboxJob {
  id: number;
  code: string;
  inputJson: string;
  limits: SandboxLimits;
  options: SandboxOptions;
  stackCapBytes: number;
}

type SandboxOutput =
  | { ok: true; value: { [key: string]: SandboxJson } | null }
  | { ok: false; fault: { code: SandboxFaultCode; message: string } };

class SandboxRunFault extends Error {
  readonly code: SandboxFaultCode;
  constructor(code: SandboxFaultCode, message: string) {
    super(message);
    this.code = code;
  }
}

function describeError(ctx: QuickJSContext, h: QuickJSHandle): { name: string; message: string } {
  // Deliberately not ctx.dump(): dump() calls the guest's JSON.stringify, which honours a polluted Object.prototype.toJSON.
  try {
    const t = ctx.typeof(h);
    if (t === "object") {
      const out = { name: "Error", message: "" };
      const nh = ctx.getProp(h, "name");
      const mh = ctx.getProp(h, "message");
      if (ctx.typeof(nh) === "string") out.name = ctx.getString(nh);
      if (ctx.typeof(mh) === "string") out.message = ctx.getString(mh);
      nh.dispose();
      mh.dispose();
      return out;
    }
    if (t === "string") return { name: "Error", message: ctx.getString(h) };
    return { name: "Error", message: `<thrown ${t}>` };
  } catch {
    return { name: "Error", message: "<undescribable error>" };
  }
}

function hostErrorFacts(e: unknown): FaultFacts {
  const error = e as { constructor?: { name?: string }; message?: unknown; name?: unknown };
  const name = error === null || error === undefined ? "Error" : String(error.constructor?.name ?? "Error");
  const message = error === null || error === undefined ? "" : String(error.message ?? "").slice(0, 300);
  return { stage: "host", error: { name, message } };
}

export async function runCode(job: SandboxJob): Promise<SandboxResult> {
  const t0 = performance.now();
  const stats: SandboxStats = { ms: 0, memBytes: -1 };
  let module: QuickJSWASMModule | undefined;
  let rt: QuickJSRuntime | undefined;
  let ctx: QuickJSContext | undefined;
  const handles: QuickJSHandle[] = [];
  let crashed = false;
  let timedOut = false;
  let skipMemSample = false;

  const finish = (out: SandboxOutput): SandboxResult => {
    stats.ms = performance.now() - t0;
    if (!out.ok && out.fault.code === "memory_limit") skipMemSample = true;
    return out.ok
      ? { ok: true, value: out.value, stats }
      : { ok: false, fault: out.fault, stats };
  };

  const bucket = memoryBucket(job.limits.memoryBytes);
  const { timeoutMs, memoryBytes, maxOutputBytes, maxStackBytes } = job.limits;

  try {
    const nowMs = Date.parse(job.options.nowIso);
    if (!Number.isFinite(nowMs) || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new SandboxRunFault("input_invalid", "options or limits are not valid");
    }

    module = await getModule(bucket);
    const ceiling = ceilingBytes(bucket) - 2 * PAGE_BYTES;
    const nearCeiling = (): boolean => module?.getWasmMemory().buffer.byteLength >= ceiling;
    const deadline = performance.now() + timeoutMs;
    rt = module.newRuntime();
    rt.setMemoryLimit(memoryBytes);
    rt.setMaxStackSize(clampStack(maxStackBytes, job.stackCapBytes));
    rt.setInterruptHandler(() => {
      if (performance.now() > deadline) {
        timedOut = true;
        return true;
      }
      return false;
    });
    ctx = rt.newContext();
    const c = ctx;
    const r = rt;
    const keep = (h: QuickJSHandle): QuickJSHandle => {
      handles.push(h);
      return h;
    };

    const prelude = buildPrelude({
      nowMs,
      seed: seedOf(job.options.seed),
      maxOutputChars: maxOutputBytes,
      objectOrNull: job.options.result === "object_or_null",
    });
    const driverRes = c.evalCode(prelude, "prelude.js");
    if (driverRes.error) {
      const err = describeError(c, keep(driverRes.error));
      return finish({
        ok: false,
        fault: classifyFault({ stage: "compile", error: err, interrupted: timedOut }),
      });
    }
    const driver = keep(driverRes.value);

    const wrapped = `(async function (${job.options.binding}) {\n"use strict";\n${job.code}\n})`;
    const fnRes = c.evalCode(wrapped, "sandbox-body.js");
    if (fnRes.error) {
      const err = describeError(c, keep(fnRes.error));
      return finish({
        ok: false,
        fault: classifyFault({ stage: "compile", error: err, interrupted: timedOut }),
      });
    }
    const fn = keep(fnRes.value);
    const inputH = keep(c.newString(job.inputJson));

    const callRes = c.callFunction(driver, c.undefined, fn, inputH);
    if (callRes.error) {
      const err = describeError(c, keep(callRes.error));
      return finish({
        ok: false,
        fault: classifyFault({ stage: "run", error: err, interrupted: timedOut, nearCeiling: nearCeiling() }),
      });
    }
    const promise = keep(callRes.value);

    // Pump: run microtasks until the driver promise settles or the deadline passes.
    for (;;) {
      const jobs = r.executePendingJobs(512);
      if (jobs.error) {
        const err = describeError(c, keep(jobs.error));
        if (!timedOut && err.message === "<thrown null>") {
          return finish({ ok: false, fault: classifyFault({ stage: "jobs", error: null }) });
        }
        return finish({
          ok: false,
          fault: classifyFault({ stage: "jobs", error: err, interrupted: timedOut }),
        });
      }
      const st = c.getPromiseState(promise);
      if (st.type !== "pending") {
        if (performance.now() > deadline) {
          timedOut = true;
          return finish({
            ok: false,
            fault: classifyFault({
              stage: "run",
              error: { name: "InternalError", message: "interrupted" },
              interrupted: true,
            }),
          });
        }
        if (st.type === "rejected") {
          const err = describeError(c, keep(st.error));
          return finish({
            ok: false,
            fault: classifyFault({ stage: "run", error: err, interrupted: timedOut, nearCeiling: nearCeiling() }),
          });
        }
        const envelopeOfRun = c.getString(keep(st.value));
        const tag = envelopeOfRun.slice(0, 1);
        if (tag === "E") {
          let e: { name: string; message: string };
          try {
            e = JSON.parse(envelopeOfRun.slice(1)) as { name: string; message: string };
          } catch {
            e = { name: "Error", message: "unparseable error envelope" };
          }
          return finish({
            ok: false,
            fault: classifyFault({ stage: "run", error: e, nearCeiling: nearCeiling() }),
          });
        }
        const outStr = envelopeOfRun.slice(1);
        const bytes = Buffer.byteLength(outStr, "utf8");
        if (bytes > maxOutputBytes) {
          return finish({ ok: false, fault: classifyFault({ stage: "output", bytes, maxBytes: maxOutputBytes }) });
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(outStr);
        } catch {
          return finish({ ok: false, fault: { code: "output_invalid", message: "driver produced invalid JSON" } });
        }
        if (parsed === null) {
          if (job.options.result !== "object_or_null") {
            return finish({
              ok: false,
              fault: { code: "output_invalid", message: "the code body did not return an object" },
            });
          }
          return finish({ ok: true, value: null });
        }
        if (typeof parsed !== "object" || Array.isArray(parsed)) {
          return finish({
            ok: false,
            fault: { code: "output_invalid", message: "the code body did not return an object" },
          });
        }
        return finish({ ok: true, value: parsed as { [key: string]: SandboxJson } });
      }
      if (performance.now() > deadline) {
        timedOut = true;
        return finish({
          ok: false,
          fault: classifyFault({
            stage: "run",
            error: { name: "InternalError", message: "interrupted" },
            interrupted: true,
          }),
        });
      }
      if (r.hasPendingJob()) continue;
      // An allocation failure inside a promise job is swallowed by the engine, so it ends up here too.
      return finish({ ok: false, fault: classifyFault({ stage: "pending" }) });
    }
  } catch (e) {
    if (e instanceof SandboxRunFault) {
      return finish({ ok: false, fault: { code: e.code, message: e.message } });
    }
    // Anything else is a host-visible fault: V8 stack exhaustion through the Wasm frames, a Wasm trap, an emscripten abort.
    crashed = true;
    return finish({ ok: false, fault: classifyFault(hostErrorFacts(e)) });
  } finally {
    if (rt !== undefined && ctx !== undefined && !crashed && !skipMemSample) {
      try {
        const mh = rt.computeMemoryUsage();
        const d = ctx.dump(mh) as { memory_used_size?: number } | null | undefined;
        mh.dispose();
        stats.memBytes = d === null || d === undefined || d.memory_used_size === undefined ? -1 : d.memory_used_size;
      } catch {
        crashed = true;
      }
    }
    try {
      if (!crashed) {
        for (const h of handles.reverse()) if (h.alive) h.dispose();
        ctx?.dispose();
        rt?.dispose();
      }
    } catch {
      crashed = true;
    }
    if (crashed) {
      resetModule(bucket);
    }
    stats.ms = performance.now() - t0;
  }
}
