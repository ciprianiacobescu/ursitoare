import { readFileSync, statSync, readdirSync } from "node:fs";
import { gzipSync, brotliCompressSync } from "node:zlib";
import path from "node:path";
import { ROOT } from "./catalogue.ts";

const pkg = path.join(ROOT, "node_modules/@cedar-policy/cedar-wasm");
const wasm = readFileSync(path.join(pkg, "nodejs/cedar_wasm_bg.wasm"));
const glue = statSync(path.join(pkg, "nodejs/cedar_wasm.js")).size;
const dirSize = (d: string): number => readdirSync(d, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? dirSize(path.join(d, e.name)) : statSync(path.join(d, e.name)).size), 0);
const kb = (n: number) => `${n} bytes (${(n / 1048576).toFixed(2)} MiB)`;
console.log("cedar_wasm_bg.wasm raw    :", kb(wasm.length));
console.log("cedar_wasm_bg.wasm gzip -9:", kb(gzipSync(wasm, { level: 9 }).length));
console.log("cedar_wasm_bg.wasm brotli :", kb(brotliCompressSync(wasm).length));
console.log("nodejs/cedar_wasm.js glue :", kb(glue));
console.log("npm package on disk (all 3 builds esm+nodejs+web):", kb(dirSize(pkg)));
console.log("a Node deployment needs only nodejs/ :", kb(dirSize(path.join(pkg, "nodejs"))));
