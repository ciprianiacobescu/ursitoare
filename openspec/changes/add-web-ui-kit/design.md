## Context

Shapes used from `add-web-shell`, `add-api-pep` and `add-supply-chain-gate`, as their changes define them:

```ts
// add-web-shell: web/src/api/client.ts
class ApiRequestError extends Error { readonly status: number; readonly code: string; readonly details: unknown; readonly requestId: string | null;
  constructor(status: number, code: string, message: string, opts?: { details?: unknown; requestId?: string | null; cause?: unknown }) }
interface ApiClient { get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> /* and request, post, put, patch, delete */ };  createApiClient(opts?: ApiClientOptions): ApiClient  // baseUrl default "/api/v1"
// add-web-shell: web/src/app/features.ts
interface NavItem { id: string; path: string; label: string }
interface FeatureRegistry { register(spec: FeatureSpec): void; list(): readonly Feature[]; nav(capabilities?: ReadonlySet<string>): NavItem[] };  createFeatureRegistry(): FeatureRegistry
navItems(capabilities?: ReadonlySet<string>): NavItem[]   // the entries with a navLabel whose capability is absent or in the set
// add-api-pep: GET /api/v1/me (session, action read_self, no-store): 200 { user: { id, displayName, email: string | null },
//   tenant: { id, name, reviewProfile: "solo" | "team" }, capabilities: string[] /* PEP action names */, csrfToken: string }; 401 UNAUTHENTICATED; 503 AUTHZ_UNAVAILABLE; each call rotates the CSRF token
// add-supply-chain-gate (test/arch): scanNpmStore, checkLicences, ALLOWED_LICENCES, LICENCE_EXCEPTIONS, InstalledPackage, LicencePolicy (signatures: proposal.md, Interfaces taken)
```

The CSP is `default-src 'self'; script-src 'self'; style-src 'self'; ...`: no `style` attribute, no `<style>`.

## Decisions

1. **Pure models, thin `.tsx`.** Each component has a `.ts` model or queue decided by Node tests; the `.tsx` maps it to elements. No barrel file: consumers import the file they need.
2. **CSS files only.** `tokens.css` holds `--ui-*` properties on `:root`; `theme.css` holds `.ui-*` rules and takes colours only from `var(--ui-color-*)`. `web/src/main.tsx` imports both before `./app/shell.css`. Light theme only; semantic names let a dark theme override later.
3. **Tokens** (`--ui-color-<name>`, six-digit hex): `bg #ffffff`, `surface #f4f5f7`, `text #1b1f27`, `text-muted #4b5262`, `border #7b8494`, `focus #1d4ed8`, `accent #1d4ed8`, `on-accent #ffffff`, `danger #b42318`, `on-danger #ffffff`, `danger-surface #fef3f2`, `danger-text #912018`, `success-surface #ecfdf3`, `success-text #05603a`, `info-surface #eff4ff`, `info-text #1a3fa8`, `toast-bg #1b1f27`, `toast-text #ffffff`. Also `--ui-space-1..4` (0.25, 0.5, 1, 1.5 rem), `--ui-radius` 0.375rem, `--ui-focus-width` 3px, `--ui-target-min` 2.5rem, `--ui-font-sans` `system-ui, sans-serif`, `--ui-font-size` 1rem. `CONTRAST_PAIRS` (16, this order, `id` = `<fg>-on-<bg>` without the prefix, `fg`/`bg` full property names), min 4.5: `text/bg`, `text/surface`, `text-muted/bg`, `text-muted/surface`, `on-accent/accent`, `on-danger/danger`, `danger/bg`, `danger-text/danger-surface`, `success-text/success-surface`, `info-text/info-surface`, `toast-text/toast-bg`, `accent/bg`; min 3: `border/bg`, `border/surface`, `focus/bg`, `focus/surface`. All pass (lowest 3.46).
4. **Messages.** One catalogue keyed by envelope code (seven server codes and three client codes; texts in task 2.1). Later units add theirs with `registerMessages`; `add-api-conventions` owns the code registry and adds the rest (`BAD_REQUEST`, `PAYLOAD_TOO_LARGE` and others fall back until then). A duplicate code with other text, and any invalid entry, throws and registers nothing.
5. **`/me` loader.** `createCapabilityLoader(client)` runs one `client.get("/me")` without the caller's signal, so an abort does not cancel the shared request. Concurrent `load` calls share it; `ready` is cached until `reset()`; `signed_out` (401) and `failed` are not cached. An aborted caller alone rejects with `DOMException("Aborted", "AbortError")`. `Me` keeps `csrfToken` because every `/me` call rotates it: `add-web-sign-in` reads it from `capabilityLoader` and never calls `/me` again; nothing renders, logs or stores it.
6. **Capability filtering.** The filter stays `navItems`. `visibleNav(state, nav = navItems)` calls `nav(state.me.capabilities)` for `ready` and `nav()` otherwise, so loading, signed-out and failed show only entries without a `capability`. A feature's `capability` is a PEP action name such as `read_flow`. The UI hides, the API decides.
7. **ErrorPanel.** Shows `messageFor(code)`, never the server's `message` or `details`, except a valid `details.decisionId` on a 403. A code not matching `^[A-Z][A-Z0-9_]{1,63}$`, and any non-`ApiRequestError`, gives `UNKNOWN_ERROR` and `FALLBACK_MESSAGE`. A decision id matches `^[A-Za-z0-9_.:-]{1,128}$`. The clipboard is write-only.
8. **ConfirmDialog.** A native `<dialog>` with a `<form method="dialog">` (markup in task 5.1). Escape is the native `cancel` event, so `returnValue` stays `""` and the outcome is `cancelled`; a backdrop click does nothing; only the exact value `"confirm"` confirms. The component records the opener itself and refocuses it on close.
9. **Toasts.** `createToastQueue`: ids `t1`, `t2`, ... per queue, push order. `info` and `success` expire after 6000 ms, `error` never; `durationMs` is `null` or 1000 to 60000. `maxVisible` 1 to 10 (default 5): a push beyond it drops the oldest. A push equal in kind and message to a visible item returns its id and refreshes its expiry. `list()` returns the same array object until content changes (`useSyncExternalStore`). `expire()` removes items with `expiresAt <= clock.now()` and returns their ids. A throwing listener does not stop the others. `ToastRegion` (markup in task 6.1) renders the one live region with no `role`: the landing page owns the one `role="status"`.
10. **axe-core.** `e2e/pyproject.toml` is an owner file and a 650 KB minified file cannot be hand-written, so axe-core 4.14.0 is installed by the scaffold as an exact root devDependency (MPL-2.0, 2026-10-05, no install script); this change edits no `package.json` or lockfile. `assert_accessible` reads `<repo>/node_modules/axe-core/axe.min.js` (from `Path(__file__).resolve().parent.parent`) and injects it with `page.evaluate(source)`: verified here, `page.add_script_tag(content=...)` is blocked by `script-src 'self'` and `evaluate` is not, so the page keeps its CSP and no console message appears.

The code of `assert_accessible` is in task 9.1.

## Interfaces

Paths below are under `web/src/kit/` unless written in full.

- `errors.ts`: `KitErrorCode`; `KitError(code: KitErrorCode, message: string)`
- `contrast.ts`: `StringMap`; `ContrastPair`; `ContrastFailure`; `SourceHit`; `CONTRAST_PAIRS: readonly ContrastPair[]`; `parseHexColour(text: string): [number, number, number] | null`; `contrastRatio(foreground: string, background: string): number`; `parseTokens(css: string): StringMap`; `checkTokenContrast(tokens: StringMap, pairs?: readonly ContrastPair[]): ContrastFailure[]`; `findRawColours(css: string): SourceHit[]`; `findInlineStyleUse(source: string): SourceHit[]`
- `messages.ts`: `FALLBACK_MESSAGE: string`; `BASE_MESSAGES: StringMap`; `messageFor(code: string): string`; `registerMessages(messages: StringMap): void`
- `states.ts`: `EmptyStateProps`; `EmptyStateModel`; `LoadingStateModel`; `emptyStateModel(props: EmptyStateProps): EmptyStateModel`; `loadingStateModel(props?: { label?: string }): LoadingStateModel`
- `error-panel.ts`: `ErrorPanelModel`; `ClipboardLike`; `errorPanelModel(error: unknown): ErrorPanelModel`; `copyText(text: string, clipboard?: ClipboardLike): Promise<"copied" | "unavailable">`; `copyNotice(outcome: "copied" | "unavailable"): string`
- `confirm.ts`: `ConfirmDialogProps`; `ConfirmDialogModel`; `confirmDialogModel(props: Pick<ConfirmDialogProps, "title" | "description" | "action" | "destructive">): ConfirmDialogModel`; `dialogOutcome(returnValue: string): "confirmed" | "cancelled"`
- `toast.ts`: `ToastSpec`; `ToastItem`; `KitClock`; `ToastQueue`; `createToastQueue(opts: { clock: KitClock; maxVisible?: number }): ToastQueue`; `toastQueue: ToastQueue`; `toast(spec: ToastSpec): string`; `dismissToast(id: string): boolean`; `focusAfterDismiss(remainingIds: readonly string[], dismissedIndex: number): { kind: "toast"; id: string } | { kind: "main" }`
- `capabilities.ts`: `Me`; `CapabilityState`; `CapabilityLoader`; `parseMe(body: unknown): Me | null`; `createCapabilityLoader(client: Pick<ApiClient, "get">): CapabilityLoader`; `capabilityLoader: CapabilityLoader`; `visibleNav(state: CapabilityState | null, nav?: (capabilities?: ReadonlySet<string>) => NavItem[]): NavItem[]`; `capabilityNotice(state: CapabilityState | null): string | null`
- `keyboard.ts`: `KeyBinding`; `KEYBOARD: Readonly<Record<string, readonly KeyBinding[]>>`
- `use-visible-nav.ts`: `useVisibleNav(): NavItem[]`
- `EmptyState.tsx`, `LoadingState.tsx`, `ErrorPanel.tsx`, `ConfirmDialog.tsx`, `ToastRegion.tsx`: `EmptyState(props: EmptyStateProps & { children?: ReactNode })`; `LoadingState(props: { label?: string })`; `ErrorPanel(props: { error: unknown })`; `ConfirmDialog(props: ConfirmDialogProps)`; `ToastRegion()`
- `test/support/a11y-setup.ts`: `A11yProblem`; `checkAccessibilitySetup(repoRoot: string): A11yProblem[]`
- `e2e/conftest.py`: `assert_accessible(page) -> None`

Types (all exported):

```ts
type StringMap = Readonly<Record<string, string>>;  interface KeyBinding { keys: string; effect: string }
type KitErrorCode = "KIT_PROP_INVALID" | "KIT_CONFIRM_LABEL_GENERIC" | "KIT_MESSAGE_INVALID" | "KIT_MESSAGE_DUPLICATE" | "KIT_TOAST_INVALID" | "KIT_TOKEN_INVALID";
class KitError extends Error { readonly code: KitErrorCode; constructor(code: KitErrorCode, message: string) }
interface ContrastPair { id: string; fg: string; bg: string; min: number }  // fg, bg: property names such as "--ui-color-text"
interface ContrastFailure { id: string; ratio: number; min: number }  interface SourceHit { line: number; text: string }  // 1-based original line, trimmed
interface EmptyStateProps { title: string; description?: string; headingLevel?: 1 | 2 | 3 | 4 }
interface EmptyStateModel { title: string; description: string | null; headingTag: "h1" | "h2" | "h3" | "h4" }
interface LoadingStateModel { label: string; role: "status"; ariaBusy: true }
interface ErrorPanelModel { code: string; status: number | null; title: string; message: string; decisionId: string | null }
interface ClipboardLike { writeText(text: string): Promise<void> }
interface ConfirmDialogProps { open: boolean; title: string; description?: string; action: string; destructive?: boolean; onConfirm: () => void; onCancel: () => void }
interface ConfirmDialogModel { title: string; description: string | null; confirmLabel: string; cancelLabel: "Cancel"; initialFocus: "confirm" | "cancel" }
interface ToastSpec { kind: "info" | "success" | "error"; message: string; durationMs?: number | null }
interface ToastItem { id: string; kind: ToastSpec["kind"]; message: string; expiresAt: number | null }  // epoch ms
interface KitClock { now(): Date }
interface ToastQueue { push(spec: ToastSpec): string; dismiss(id: string): boolean; expire(): string[]; list(): readonly ToastItem[]; nextExpiry(): number | null; subscribe(listener: () => void): () => void }
interface Me { user: { id: string; displayName: string; email: string | null }; tenant: { id: string; name: string; reviewProfile: "solo" | "team" }; capabilities: ReadonlySet<string>; csrfToken: string }
type CapabilityState = { status: "signed_out" } | { status: "failed"; code: string } | { status: "ready"; me: Me };  interface CapabilityLoader { load(signal?: AbortSignal): Promise<CapabilityState>; reset(): void }
type A11yProblemCode = "AXE_NOT_DECLARED" | "AXE_NOT_EXACT" | "AXE_NOT_INSTALLED" | "ASSERT_ACCESSIBLE_MISSING" | "ASSERT_ACCESSIBLE_UNSAFE";  interface A11yProblem { code: A11yProblemCode; detail: string }
```

**Rules.** `parseHexColour` takes `#` and six hex digits (any case), else `null`; `contrastRatio` is the unrounded WCAG 2.x ratio `(lighter + 0.05) / (darker + 0.05)` and throws `KIT_TOKEN_INVALID` for a non-hex argument. `parseTokens` strips comments and collects every `--name: value;` (later wins). `checkTokenContrast` keeps pair order and gives ratio 0 for a missing or non-hex token. `findRawColours` ignores comments and custom-property lines, keeps original line numbers, and reports hex literals, colour functions (`rgb rgba hsl hsla hwb lab lch oklab oklch color`) and the names `white black red green blue yellow orange purple gray grey` used as a value. `findInlineStyleUse` reports lines holding `style=`, `<style` or `setAttribute("style"`. The other per-function rules (limits, patterns, the order of setup problems) are stated in the task that implements the function and bind like this section.

## Failure cases

| Situation | Behaviour |
|---|---|
| `/me` 401 | `signed_out`: only entries without a capability, no notice |
| `/me` 503, network error, bad body, unexpected throw | `failed`: same nav, one error toast with the message of the code |
| Two askers, StrictMode, abort | one request; only the aborting caller rejects |
| Unknown or prototype-like code | `FALLBACK_MESSAGE` |
| Invalid or generic props | `KitError` from the model, before any element exists |
| Clipboard missing or refused | error toast "Could not copy. ..." |
| Escape, backdrop click, any value but `"confirm"` | `onCancel` once |
| Seven toasts at once; a repeat | the five newest stay; the repeat shows once |
| axe-core missing at run time | the test fails with "axe-core is not installed: run pnpm install"; no network |

## Security

1. **Authentication and PEP.** No endpoint is added. The one call is `GET /api/v1/me` (`session`, `read_self`); 401 means signed out. Hiding a nav entry is cosmetic: the API enforces every action.
2. **Tenant isolation.** No table or query; the tenant comes from the session and the browser sends none.
3. **Input validation.** `parseMe` checks the answer's shape and drops malformed capability entries (fewer entries, never more). Messages come from a closed catalogue; the server's `message` and `details` are never shown; a decision id shows only when it matches a strict pattern; all texts are React text. Nothing reaches a prompt, so no taint label.
4. **Secrets.** `csrfToken` lives only in the loader's memory for `add-web-sign-in`; it is never rendered, toasted, logged or stored. axe-core is a public package; no key is used.
5. **Abuse cases.** A server message with SQL, a decision id with markup, a code such as `__proto__`, a later inline style, a generic confirm label on a destructive action, a token pair that loses contrast, axe injected around the CSP: each has a spec scenario.

## Test plan

Node test runner, `*.test.ts` beside the code, no network, no sleeps; each web test file starts with `/// <reference types="node" />` and then `assert.equal(typeof <the function it tests>, "function")`. Toast tests use a `KitClock` over a mutable `Date`; loader tests a fake client `{ get }`; nav tests a registry from `createFeatureRegistry()`. `contrast.test.ts` reads the CSS with `node:fs` and walks `web/src` for `.tsx`; a test that reads a file green creates (`tokens.css`, `theme.css`) or looks for an installed package first asserts with `assert.ok` that it exists, so red fails by assertion, not by a thrown `ENOENT` or a `TypeError`; `a11y-setup.test.ts` builds throwaway roots under `os.tmpdir()`. The browser proves the theme (axe contrast on real pages), the live region and notice (a failing `/me`) and the nav, in `e2e/test_m1_web_kit.py` and the four page tests of `e2e/test_m0_skeleton.py`.

**DOM behaviour and its check.** No route renders `ErrorPanel`, `ConfirmDialog`, `EmptyState` or `LoadingState` (no kit demo route, no consumer yet), so `e2e/test_m1_web_kit.py` reaches only what `Shell` mounts, and a Node test cannot import a `.tsx` file. Where each behaviour is checked: `ToastRegion`'s one `aria-live="polite"` region without a `role`, its Dismiss button and the focus move to `main`: `test_me_failure_shows_one_notice`. `EmptyState` heading tag: `emptyStateModel` ("The models"). `LoadingState` `role="status"` and `aria-busy`: `loadingStateModel` ("The models"). `ErrorPanel` text, title and decision id: `errorPanelModel`; the copy result and notice: `copyText` and `copyNotice` ("Copying"). `ConfirmDialog` label, initial focus on Cancel when destructive, and Escape as `cancelled` (`returnValue` `""`): `confirmDialogModel` and `dialogOutcome`. Left as fixed markup in tasks 3.1 to 5.1, rendered by no test in this unit: `role="alert"`, `showModal()` followed by the focus call, the `close` event calling one callback and refocusing the opener, and the click calling `copyText` and then `toast`.

## Decisions made while writing

- **No `LICENCE_EXCEPTIONS` entry for axe-core (deviation from the card).** `MPL-2.0` is already in `ALLOWED_LICENCES`, so an entry is redundant, and add-supply-chain-gate's frozen scenario "The reviewed policy is well formed" asserts that `LICENCE_EXCEPTIONS` holds exactly the `text-unidecode@1.3` entry: a new one turns it red. Task 9.1 runs `checkLicences` on the installed axe-core instead. If the owner wants the entry, that scenario must first say "holds the `text-unidecode@1.3` entry".
- **axe-core from npm**, not the Python environment or a vendored file (decision 10); **WCAG 2.1 AA tags only**, so a best-practice rule cannot fail another unit's journey.
- **If the M0 shell fails axe at serious or critical** in task 9.1, the one allowed change outside the kit is a fix of that rule in `web/src/app/shell.css`.
- **`EmptyState` is not wired into "Page not found"**, so `add-web-shell`'s journeys stay untouched; the first consumer adopts it. **Error toasts persist** (WCAG 2.2.1); a caller that needs an info or success toast read passes `durationMs: null`.
- **`add-web-sign-in` hand-off:** read the CSRF token, user and tenant from `capabilityLoader.load()` and call `reset()` on sign-out.
- **Frozen M0 tests changed in red.** The rule relied on: in red a task may change in place up to 5 existing tests that its text names as `path.py::test_name`. Task 9.1 names 4 of `e2e/test_m0_skeleton.py` that way (each gains one `assert_accessible(page)` call); no other frozen test is changed.
- **No new function or route for DOM wiring.** A `.ts` function for the effects would add interfaces the scaffold has no stubs for, and a route is ruled out by the card; the models carry every decision (see "DOM behaviour and its check").
