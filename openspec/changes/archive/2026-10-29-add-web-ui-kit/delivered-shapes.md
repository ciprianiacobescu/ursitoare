# Delivered shapes taken by add-web-ui-kit

The M0 names this change takes (proposal.md, "Interfaces taken"), as declared by the merged code on main (fb48c96): `tsc --emitDeclarationOnly` output, with `export` and `declare` dropped. The code is the truth; this file only shows its shapes to the readiness judge.

```ts
// add-web-shell (web/src/api/client.ts)
class ApiRequestError extends Error { readonly status: number; readonly code: string; readonly details: unknown; readonly requestId: string | null; constructor(status: number, code: string, message: string, opts?: { details?: unknown; requestId?: string | null; cause?: unknown }); }
type QueryValue = string | number | boolean | undefined;
interface RequestOptions { query?: Readonly<Record<string, QueryValue>>; headers?: Readonly<Record<string, string>>; signal?: AbortSignal; body?: unknown; }
interface ApiClient { request<T>(method: string, path: string, opts?: RequestOptions): Promise<T>; get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>; post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>; put<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>; patch<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>; delete<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>; }
interface ApiClientOptions { baseUrl?: string; fetch?: typeof globalThis.fetch; }
function createApiClient(opts?: ApiClientOptions): ApiClient;
// add-web-shell (web/src/app/features.ts)
interface FeatureSpec { id: string; path: string; navLabel?: string; capability?: string; element: ReactNode; }
type Feature = Readonly<FeatureSpec>;
interface NavItem { id: string; path: string; label: string; }
interface FeatureRegistry { register(spec: FeatureSpec): void; list(): readonly Feature[]; nav(capabilities?: ReadonlySet<string>): NavItem[]; }
function createFeatureRegistry(): FeatureRegistry;
function navItems(capabilities?: ReadonlySet<string>): NavItem[];
// add-supply-chain-gate (test/arch/licence-rules.ts)
interface LicenceException { ecosystem: "npm" | "pypi"; name: string; version: string; licence: string; reason: string; }
type LicenceViolationCode = "LICENCE_TERM_NOT_ALLOWED" | "LICENCE_UNKNOWN" | "LICENCE_MISSING" | "INVENTORY_EMPTY" | "POLICY_INVALID" | "VERSION_NOT_EXACT" | "MANIFEST_INVALID" | "BUILT_DEPS_DRIFT" | "VENV_REQUIRED" | "INSTALL_HOOK_FORBIDDEN";
interface LicenceViolation { code: LicenceViolationCode; subject: string; licence?: string; detail: string; }
interface InstalledPackage { ecosystem: "npm" | "pypi"; name: string; version: string; licence: string | null; terms: readonly string[] | null; }
interface LicencePolicy { allowed: readonly string[]; exceptions: readonly LicenceException[]; }
function scanNpmStore(repoRoot: string): InstalledPackage[];
function checkLicences(packages: readonly InstalledPackage[], policy: LicencePolicy, scope: string): LicenceViolation[];
// add-supply-chain-gate (test/arch/licence-policy.ts)
const ALLOWED_LICENCES: readonly string[];
const LICENCE_EXCEPTIONS: readonly LicenceException[];
```
