# Delivered shapes taken by add-code-sandbox

Declarations from main@a6b5fb37 (`file:line`).

```ts
// test/arch/licence-policy.ts (U05)
:8        const ALLOWED_LICENCES: readonly string[]
// test/arch/sources.ts (U04)
:28-33    interface Violation { code: string; file: string; line: number; message: string }
:39-47    interface SourceFile { path: string; text: string }   interface Snapshot { files: SourceFile[]; srcDirs: string[] }
:54       function isTestFile(path: string): boolean
:62       function snapshotOf(files: Record<string, string>): Snapshot
:103      function readSnapshot(root: string = REPO_ROOT): Snapshot
:129-134  interface ImportRef { specifier: string | null; line: number; typeOnly: boolean; dynamic: boolean }
:162      function collectImports(file: SourceFile): ImportRef[]
:242      function resolveSpecifier(fromPath: string, specifier: string): string | null
:253      function sortViolations(vs: Violation[]): Violation[]
```

## Facts from the merged code

- `test/arch/sources.ts:52`: `const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;`. `:243`: `if (!specifier.startsWith("./") && !specifier.startsWith("../")) return null;` (a bare specifier resolves to `null`). `:162-240`: `collectImports` lists static imports and exports, `import type`, `require("…")` and `import(…)`; a non-literal argument gives `specifier: null`, `dynamic: true`.
- `test/arch/rules.ts:388-393`: `const sandbox = moduleName === "sandbox";` and `if (isWorkerThreads(ref.specifier)) { if (!sandbox) violations.push(workerThreadsViolation(...)); continue; }` (`:391` skips type-only and computed refs); `test/arch/network.test.ts:54` fixes that `src/sandbox/pool.ts` importing `worker_threads` passes.
- `test/arch/modules.ts:21`: `sandbox: { allowed: ["core", "config"] },`. `test/arch/licence-policy.ts:9`: `"MIT"` is in `ALLOWED_LICENCES`. `pnpm-workspace.yaml:7`: `minimumReleaseAge: 4320`.
- `tsconfig.json:4,7`: `"lib": ["es2024"]`, `"types": ["node"]`: no `WebAssembly` namespace (probe: `TS2304`).
