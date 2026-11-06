// QuickJS Wasm module cache: one per memory bucket (design § 3 "one instance per worker and memory bucket").
import { newQuickJSWASMModuleFromVariant, newVariant } from "quickjs-emscripten-core";
import * as wasmfileModule from "@jitl/quickjs-wasmfile-release-sync";
import type { QuickJSSyncVariant, QuickJSWASMModule } from "quickjs-emscripten-core";

const PAGE_BYTES = 65536;
// The prebuilt module declares an initial memory of 16 MiB; a smaller wasmMemory fails to link.
const BASE_PAGES = 256;

interface WasmMemoryOptions {
  initial: number;
  maximum: number;
}

interface WasmMemory {
  readonly buffer: ArrayBuffer;
  grow(pages: number): number;
}

type WasmHost = { WebAssembly: { Memory: new (options: WasmMemoryOptions) => WasmMemory } };

const wasmHost = globalThis as unknown as WasmHost;
const wasmfileVariant = (wasmfileModule as unknown as { default: QuickJSSyncVariant }).default;

const modules = new Map<number, Promise<QuickJSWASMModule>>();

export function ceilingBytes(bucketBytes: number): number {
  return (BASE_PAGES + bucketBytes / PAGE_BYTES) * PAGE_BYTES;
}

export function getModule(bucketBytes: number): Promise<QuickJSWASMModule> {
  const cached = modules.get(bucketBytes);
  if (cached !== undefined) {
    return cached;
  }
  const variant = newVariant(wasmfileVariant, {
    wasmMemory: new wasmHost.WebAssembly.Memory({
      initial: BASE_PAGES,
      maximum: BASE_PAGES + bucketBytes / PAGE_BYTES,
    }),
  });
  const created = newQuickJSWASMModuleFromVariant(variant);
  modules.set(bucketBytes, created);
  return created;
}

export function resetModule(bucketBytes: number): void {
  modules.delete(bucketBytes);
}
