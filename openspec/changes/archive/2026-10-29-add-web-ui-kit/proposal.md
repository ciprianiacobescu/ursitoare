## Why

Every later screen needs the same few things and would otherwise invent them: colours readable under a strict Content-Security-Policy, one wording per API error code, a navigation that hides what the user cannot use, empty, loading and failed states, a confirm step that names its action, and notices a screen reader announces. Browser journeys also have no accessibility check, so a contrast or labelling regression would pass every gate.

Observable result: the built app loads `tokens.css` and `theme.css` from `/assets/` with no Content-Security-Policy message in the console. The shell asks `GET /api/v1/me` once and lists only the entries whose `capability` the answer holds; signed out (401) it lists the entries without one, such as "Home", and on a 503 it also shows one dismissible notice in a single polite live region. Every API error code has one text (`messageFor`), `ErrorPanel` shows it and, for a 403, the decision id with a "Copy decision id" button, `ConfirmDialog` is a native modal whose confirm button names its action and that Escape cancels, and `toast()` notices expire by an injected clock. `assert_accessible(page)` runs axe-core offline and fails a journey with the ids of serious or critical violations; the four page tests of `e2e/test_m0_skeleton.py` call it and pass.

## What Changes

- `web/src/kit`: `tokens.css`, `theme.css`; `contrast.ts` (WCAG ratio, token and theme checks, the inline-style scan); `messages.ts`; `states.ts`, `error-panel.ts`, `confirm.ts`, `toast.ts`, `capabilities.ts`, `keyboard.ts` (the logic, each with Node tests); `use-visible-nav.ts`; the thin components `EmptyState`, `LoadingState`, `ErrorPanel`, `ConfirmDialog`, `ToastRegion`.
- `web/src/app/Shell.tsx` builds its nav from `useVisibleNav()` and mounts `ToastRegion` once; `web/src/main.tsx` imports the two CSS files.
- `e2e/conftest.py`: `assert_accessible(page)`; `e2e/test_m1_web_kit.py`; four existing tests of `e2e/test_m0_skeleton.py` call the helper.
- Root `package.json` and `pnpm-lock.yaml` are not changed: the scaffold installs `axe-core` 4.14.0 as an exact root devDependency (MPL-2.0, already an allowed licence term).
- `test/support/a11y-setup.ts`: a check that the declared dependency, the installed package and the helper agree, and that the helper never loads a script from the network or around the CSP.

## Impact

- **Depends on:** `add-web-shell` (U07): the client, the feature registry and `navItems`, `Shell.tsx`, `main.tsx`, `shell.css`, the M0 journeys, and through it the `fresh_state` fixture and the engine's envelope codes. `add-api-pep` (U13): `GET /api/v1/me` and its error codes. `add-supply-chain-gate` (U05): the licence functions and data used by task 9.1; its frozen policy is not changed (design.md, Decisions made while writing).
- **Files implemented** (stubs from the scaffold): the `.ts` and `.tsx` files listed under Interfaces given. **Files created:** `web/src/kit/{tokens,theme}.css`, a `*.test.ts` beside `contrast`, `messages`, `states`, `error-panel`, `confirm`, `toast`, `capabilities` and `keyboard`, `test/support/a11y-setup.test.ts`, `e2e/test_m1_web_kit.py`. **Files changed:** `web/src/app/Shell.tsx`, `web/src/main.tsx`, `e2e/conftest.py` (task 9.1 only), `e2e/test_m0_skeleton.py`. `web/src/app/shell.css` changes only to fix an axe finding.
- **Migrations, tables, endpoints, env vars:** none. No kit demo route.
- Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. `axe-core` 4.14.0 is installed by the scaffold, not by this change.

**Interfaces given** (exact members of the named types: design.md § Interfaces)

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

**Interfaces taken**

- From `add-web-shell`: `ApiRequestError(status: number, code: string, message: string, opts?: { details?: unknown; requestId?: string | null; cause?: unknown })` (`status`, `code`, `details`, `requestId`); `ApiClient.get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>`; `createApiClient(opts?: ApiClientOptions): ApiClient`; `NavItem { id: string; path: string; label: string }`; `navItems(capabilities?: ReadonlySet<string>): NavItem[]`; `createFeatureRegistry(): FeatureRegistry` (`register`, `nav`); `Shell.tsx` (its `<main id="main" tabindex="-1">` and `<footer>`), `main.tsx`, `shell.css`, the tests of `e2e/test_m0_skeleton.py`; the `fresh_state` fixture (from `add-e2e-stack`).
- From `add-api-pep`: `GET /api/v1/me` answering `{ user: { id, displayName, email }, tenant: { id, name, reviewProfile }, capabilities, csrfToken }` (auth `session`; action `read_self`, defined by `add-policy-catalogue`), 401 `UNAUTHENTICATED`, 503 `AUTHZ_UNAVAILABLE`, 403 `FORBIDDEN` with `details.decisionId`, 403 `CSRF_INVALID`.
- From `add-engine-skeleton` (through `add-web-shell`): the root handler codes `NOT_FOUND`, `VALIDATION_FAILED`, `INTERNAL`.
- From `add-supply-chain-gate`: `scanNpmStore(repoRoot: string): InstalledPackage[]`; `checkLicences(packages: readonly InstalledPackage[], policy: LicencePolicy, scope: string): LicenceViolation[]`; `ALLOWED_LICENCES: readonly string[]`; `LICENCE_EXCEPTIONS: readonly LicenceException[]`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@fb48c96, checked line by line).

`fresh_state` (add-e2e-stack) is Python in `e2e/conftest.py`: fixture `fresh_state() -> None` (POSTs `/reset` on `E2E_CONTROL_URL`, default `http://127.0.0.1:39081`; a no-op when `E2E_PROFILE` is `stack`).


## Out of scope

`DataTable`, `Form`, `Field` and `SchemaForm` (`add-web-data-kit`); sign-in, sign-out, session expiry and the CSRF header in the client (`add-web-sign-in`, which reads the token from `capabilityLoader`); any kit demo route; a dark theme; the registry of error codes and the OpenAPI document (`add-api-conventions`); changing the nav registry, which stays `add-web-shell`'s; the browser proof of the panel, the dialog and the empty state, which comes with their first consumers; a licence exception for axe-core (the gate already allows MPL-2.0); vendoring axe-core or adding a Python package.
