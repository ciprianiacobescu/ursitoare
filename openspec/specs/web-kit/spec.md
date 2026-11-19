# web-kit Specification

## Purpose
The web kit gives every later screen the same accessible building blocks: design tokens and a theme that meet WCAG AA under the strict CSP, one message catalogue for API error codes, capability-filtered navigation, empty, loading and error states, a confirm dialog, toasts and an offline accessibility check for browser journeys.

## Requirements

### Requirement: The tokens and theme are CSS files that meet WCAG AA contrast
The kit SHALL define its design tokens in `web/src/kit/tokens.css` and its component styles in `web/src/kit/theme.css`, with no inline style anywhere in `web/src`, and every pair in `CONTRAST_PAIRS` SHALL reach 4.5:1 for text and 3:1 for borders and focus.

#### Scenario: Contrast maths and colour parsing
- **WHEN** `typeof contrastRatio` is `"function"`, and `contrastRatio` gets `("#000000", "#ffffff")`, `("#767676", "#ffffff")`, `("#777777", "#ffffff")` and `("#ffffff", "#000000")`; `parseHexColour` gets `"#1B1F27"`, `"#fff"`, `"red"` and `"#12345"`; `contrastRatio("red", "#ffffff")` is called
- **THEN** the ratios are 21, 4.54, 4.48 and 21 (each within 0.01), the parsed values are `[27, 31, 39]`, `null`, `null`, `null`, and the last call throws `KitError` with code `KIT_TOKEN_INVALID`

#### Scenario: The real tokens meet WCAG AA
- **WHEN** `tokens.css` is read and parsed with `parseTokens`
- **THEN** `CONTRAST_PAIRS` has the 16 pairs of design decision 3 in that order, with ids `<fg>-on-<bg>` (first `text-on-bg`, last `focus-on-surface`), `checkTokenContrast` returns `[]`, and every colour token is six-digit hex

#### Scenario: A weak, missing or malformed token is reported
- **WHEN** `checkTokenContrast` gets the real tokens with `--ui-color-text` set to `#777777`, then without `--ui-color-focus`, then with `--ui-color-border` set to `red`
- **THEN** the failures are `text-on-bg` and `text-on-surface` (ratio below 4.5, `min` 4.5), then `focus-on-bg` and `focus-on-surface` (ratio 0, `min` 3), then `border-on-bg` and `border-on-surface` (ratio 0, `min` 3)

#### Scenario: The theme uses only tokens
- **WHEN** `theme.css` is read; and the scanners get the five lines `a { color: #fff; }`, `b { background: rgb(0 0 0); }`, `/* #123 */`, `  --x: #000;`, `  color: var(--ui-color-text);`
- **THEN** `findRawColours(theme)` is `[]` and the theme holds `:focus-visible`, `prefers-reduced-motion` and the classes `.ui-empty`, `.ui-loading`, `.ui-error`, `.ui-dialog`, `.ui-toasts`, `.ui-toast`; on the sample `findRawColours` reports lines 1 and 2 only

#### Scenario: The web sources have no inline styles
- **WHEN** `findInlineStyleUse` gets `"<p style={{ color: 'red' }}>x</p>"`, `"<style>a{}</style>"`, `"el.setAttribute('style', 'a')"` and `"<p className=\"a\">x</p>"` on separate lines, and then every `.tsx` file under `web/src` and `web/index.html`
- **THEN** the sample reports lines 1, 2 and 3 only, and the real files report nothing

### Requirement: One catalogue maps API error codes to text
The kit SHALL map every API error code to one user-facing text through `messageFor`, SHALL answer `FALLBACK_MESSAGE` for any other code, and SHALL let later units add codes through `registerMessages` without editing the catalogue.

#### Scenario: Known codes
- **WHEN** `typeof messageFor` is `"function"` and `messageFor` gets each key of `BASE_MESSAGES`
- **THEN** the keys are the ten codes of task 2.1, each answer equals its `BASE_MESSAGES` text, ends with `.`, is 1 to 200 characters and does not contain its own code

#### Scenario: Unknown codes use the fallback
- **WHEN** `messageFor` gets `"NO_SUCH_CODE"`, `""`, `"forbidden"`, `"constructor"` and `"__proto__"`
- **THEN** every answer is `FALLBACK_MESSAGE`

#### Scenario: Later units register codes
- **WHEN** `registerMessages({ TEST_ONLY_FLOW_LOCKED: "This flow is locked." })` runs twice, then is called with `{ FORBIDDEN: "x" }`, `{ TEST_ONLY_FLOW_LOCKED: "other." }`, `{ "bad code": "x" }`, `{ TEST_ONLY_BLANK: "  " }` and `{ TEST_ONLY_NEW: "New.", FORBIDDEN: "x" }`
- **THEN** `messageFor("TEST_ONLY_FLOW_LOCKED")` is `"This flow is locked."`, the third and fourth calls throw `KitError` `KIT_MESSAGE_DUPLICATE`, the fifth and sixth `KIT_MESSAGE_INVALID`, the seventh `KIT_MESSAGE_DUPLICATE`, and `messageFor("TEST_ONLY_NEW")` is `FALLBACK_MESSAGE`

### Requirement: The nav shows only the entries the user's capabilities allow
The web app SHALL fetch `GET /api/v1/me` once per page load and pass its `capabilities` to the nav registry, so an entry with a `capability` shows only when `/me` lists it; with no session or on any failure only entries without a capability show, a failure other than 401 shows one notice, and the CSRF token never reaches a notice.

#### Scenario: Parsing the answer
- **WHEN** `typeof parseMe` is `"function"` and `parseMe` gets a valid body with `capabilities: ["read_flow", "Bad Cap", 5, "read_flow"]`, then bodies with `capabilities: "read_flow"`, without `csrfToken`, with `reviewProfile: "x"`, and the value `null`
- **THEN** the first gives `capabilities` equal to `new Set(["read_flow"])` and the other four give `null`

#### Scenario: The loader outcomes
- **WHEN** a fake client answers a valid body, and `load()` runs twice, then `reset()` and `load()`; then `ApiRequestError(401, "UNAUTHENTICATED", "x")`, `ApiRequestError(503, "AUTHZ_UNAVAILABLE", "x")`, `ApiRequestError(0, "NETWORK_ERROR", "x")`, the body `{}`, and a thrown `TypeError`, each on a fresh loader
- **THEN** the first sequence calls the client with path `"/me"` twice in total and gives `ready` each time; the others give `signed_out`, `failed` with `AUTHZ_UNAVAILABLE`, `NETWORK_ERROR`, `INVALID_RESPONSE` and `UNKNOWN_ERROR`; after a 401 or a failure the next `load()` calls the client again

#### Scenario: Concurrent callers and abort
- **WHEN** two `load()` calls start before the client answers, and another call gets an already aborted signal
- **THEN** the client is called once for the two callers, and the aborted call rejects with an error named `AbortError` without calling the client

#### Scenario: Filtering and the notice
- **WHEN** a registry holds `a` (no capability), `b` (`read_flow`) and `c` (`manage_flows`), all with a `navLabel`; `visibleNav(state, registry.nav)` gets a `ready` state with `read_flow`, then `null`, `signed_out` and `failed`; `capabilityNotice` gets the same states with `failed` code `AUTHZ_UNAVAILABLE`
- **THEN** the ids are `a b`, then `a`, `a`, `a`; the notice is `Some menu entries are hidden because your permissions could not be loaded. Authorization is unavailable right now. Try again in a moment.` for `failed` and `null` for the others; with a `ready` state whose `csrfToken` is `tok-123-abc`, neither the notice nor the ids contain it

#### Scenario: The nav in the browser
- **WHEN** the journey opens `/` signed out; then with `/api/v1/me` answered 503 `AUTHZ_UNAVAILABLE`; then with it answered 200 with `capabilities: ["read_flow"]`
- **THEN** one `/api/v1/me` request is made each time; the first answer is 401, and in all three the navigation "Main" holds the link "Home"; the second shows the notice above in one region with `aria-live="polite"` and no `role`, clicking its "Dismiss" button removes it and focus is then on `main`, and no notice appears in the first and third

### Requirement: Empty and loading states are announced and validated
The kit SHALL provide `EmptyState`, with a heading at a chosen level, and `LoadingState`, with `role="status"` and `aria-busy="true"`, from models that refuse invalid properties.

#### Scenario: The models
- **WHEN** `emptyStateModel` gets `{ title: " No flows " }`, `{ title: "T", description: "  ", headingLevel: 1 }` and `{ title: "T", description: "d" }`; `loadingStateModel` gets nothing, `{ label: " Loading flows " }`
- **THEN** the results are `{ title: "No flows", description: null, headingTag: "h2" }`, `{ title: "T", description: null, headingTag: "h1" }`, `{ title: "T", description: "d", headingTag: "h2" }`, `{ label: "Loading", role: "status", ariaBusy: true }` and the same with label `"Loading flows"`

#### Scenario: Invalid properties
- **WHEN** `emptyStateModel` gets an empty title, a 121-character title, a 301-character description and `headingLevel: 5`; `loadingStateModel` gets a blank label and an 81-character label
- **THEN** each throws `KitError` with `KIT_PROP_INVALID`

### Requirement: ErrorPanel shows the message for the code and, on 403, the decision id with a copy button
The kit SHALL show an error as a `role="alert"` panel with the catalogue text for its code, never the server's text or details, and for a 403 with a well-formed `details.decisionId` SHALL show that id with a button that copies it.

#### Scenario: The model by status
- **WHEN** `errorPanelModel` gets `ApiRequestError(403, "FORBIDDEN", "raw", { details: { decisionId: "dec_0123-ab" } })`, `(401, "UNAUTHENTICATED", "raw")`, `(404, "NOT_FOUND", "raw")`, `(0, "NETWORK_ERROR", "raw")`, `(500, "INTERNAL", "SELECT * FROM secret", { details: { sql: "x", path: "/etc/passwd" } })`, `(409, "FLOW_LOCKED", "raw")`, `(500, "weird code", "raw")` and `new Error("boom")`
- **THEN** the models are `FORBIDDEN`, 403, "Not allowed", the catalogue text, `"dec_0123-ab"`; `UNAUTHENTICATED` 401 "Sign in required"; `NOT_FOUND` 404 "Not found"; `NETWORK_ERROR` 0 "Cannot reach the engine"; `INTERNAL` 500 "Something went wrong"; `FLOW_LOCKED` 409 "Something went wrong" with `FALLBACK_MESSAGE`; `UNKNOWN_ERROR` 500 with `FALLBACK_MESSAGE`; `UNKNOWN_ERROR` with status `null`; `decisionId` is `null` in all but the first, and no model contains `raw`, `SELECT`, `secret`, `sql` or `/etc/passwd`

#### Scenario: A decision id is shown only when it is well formed
- **WHEN** `errorPanelModel` gets a 403 with `details.decisionId` equal to `"<img src=x>"`, a 129-character id, `""`, the number `7`, and no details; and a 500 with a valid `decisionId`
- **THEN** every `decisionId` is `null`

#### Scenario: Copying
- **WHEN** `copyText("dec_1", clipboard)` runs with a clipboard that resolves, one that rejects, and none, and `copyText("", clipboard)` runs; `copyNotice` gets both outcomes
- **THEN** the results are `"copied"` (the clipboard received `"dec_1"`), `"unavailable"`, `"unavailable"`, `"unavailable"` with no write; the notices are `Decision id copied.` and `Could not copy. Select the decision id and copy it by hand.`

### Requirement: ConfirmDialog names its action and cancels unless told otherwise
The kit SHALL provide a native modal dialog whose confirm button carries the name of the action, whose focus starts on Cancel for a destructive action, and which confirms only on the exact value `"confirm"`; Escape cancels.

#### Scenario: The model
- **WHEN** `confirmDialogModel` gets `{ title: "Delete flow", action: " Delete flow ", destructive: true }` and `{ title: "Publish", description: "Goes live.", action: "Publish version" }`
- **THEN** the results are `{ title: "Delete flow", description: null, confirmLabel: "Delete flow", cancelLabel: "Cancel", initialFocus: "cancel" }` and `{ title: "Publish", description: "Goes live.", confirmLabel: "Publish version", cancelLabel: "Cancel", initialFocus: "confirm" }`

#### Scenario: The confirm button must name the action
- **WHEN** `confirmDialogModel` gets the actions `"OK"`, `"Yes."`, `"Confirm"`, `"continue…"`, `"Cancel"`, `""` and a 41-character action
- **THEN** the first four throw `KitError` `KIT_CONFIRM_LABEL_GENERIC` and the others `KIT_PROP_INVALID`

#### Scenario: Only the exact value confirms
- **WHEN** `dialogOutcome` gets `"confirm"`, `""` (Escape), `"cancel"`, `"Confirm"` and `"confirm "`
- **THEN** the results are `confirmed`, `cancelled`, `cancelled`, `cancelled`, `cancelled`

### Requirement: toast() uses one polite live region and a testable queue
The kit SHALL show toasts through one `aria-live="polite"` region mounted once in the shell, from a queue that expires info and success items by an injected clock, keeps error items until dismissed, and shows a repeated message once.

#### Scenario: Expiry by the clock
- **WHEN** a queue on a `KitClock` at 2026-10-25T09:00:00Z gets `push` for an info message, an error message and a success message with `durationMs: 1000`, and the clock moves to 09:00:01Z, then 09:00:06Z
- **THEN** `list()` ids are `t1 t2 t3`; `nextExpiry()` is the epoch ms of 09:00:01Z; `expire()` returns `["t3"]`, then `["t1"]`; `list()` then holds only `t2`, and `nextExpiry()` is `null`

#### Scenario: Duplicates, limits and invalid specs
- **WHEN** the same info message is pushed twice, 7 distinct messages are pushed into a queue with `maxVisible` 5, and `push` gets an empty message, a 301-character message, `durationMs: 999`, `durationMs: 60001` and kind `"warn"`; `createToastQueue` gets `maxVisible: 0` and `11`
- **THEN** the duplicate returns the first id and the queue holds one item with a refreshed expiry; the 7 pushes leave the 5 newest; the invalid specs and sizes throw `KitError` `KIT_TOAST_INVALID`

#### Scenario: Subscribers and stable snapshots
- **WHEN** a queue has two subscribers, the first throws, and a message is pushed and dismissed, and `dismiss("nope")` is called; `list()` is read twice without a change; a subscriber unsubscribes
- **THEN** the second subscriber is called for each change, `dismiss` returns `true` for the pushed id and `false` for `"nope"`, the two reads are the same array object, and an unsubscribed callback is not called again

#### Scenario: Focus after a dismissal and the default queue
- **WHEN** `focusAfterDismiss` gets `([], 0)`, `(["t2", "t3"], 0)`, `(["t1", "t3"], 1)`, `(["t1", "t2"], 2)` and `(["t1"], -1)`; and `toast` and `dismissToast` run on the default `toastQueue`
- **THEN** the results are `main`, `t2`, `t3`, `t2`, `t1`; `toast({ kind: "info", message: "Saved." })` returns an id that `toastQueue.list()` holds, and `dismissToast` removes it

### Requirement: Every component documents its keyboard behaviour
The kit SHALL document the keyboard behaviour of every component in `KEYBOARD`, and a component file without an entry SHALL fail the test run.

#### Scenario: Documentation matches the component files
- **WHEN** `KEYBOARD` is compared with the `.tsx` files that are direct children of `web/src/kit` (listed with `readdirSync(dir)` without `recursive`; files in subfolders such as `web/src/kit/data/` are not counted)
- **THEN** the sorted keys equal the file names without `.tsx` (`ConfirmDialog`, `EmptyState`, `ErrorPanel`, `LoadingState`, `ToastRegion`), and every entry has at least one binding whose `keys` and `effect` are non-blank

### Requirement: assert_accessible fails a journey on serious or critical axe violations, offline
`assert_accessible(page)` in `e2e/conftest.py` SHALL run axe-core from the installed npm package against the page, without a network and without weakening the page's CSP, and SHALL fail the test with the rule ids of violations of impact serious or critical.

#### Scenario: The setup check
- **WHEN** `checkAccessibilitySetup` gets throwaway roots: a complete one; one with no `axe-core` in `devDependencies`; one declaring `"^4.14.0"`; one without `node_modules/axe-core/axe.min.js`; a `conftest.py` without `def assert_accessible(page`; one that holds `add_script_tag`; one that lacks `critical`
- **THEN** the results are `[]`, `AXE_NOT_DECLARED`, `AXE_NOT_EXACT`, `AXE_NOT_INSTALLED`, `ASSERT_ACCESSIBLE_MISSING`, `ASSERT_ACCESSIBLE_UNSAFE`, `ASSERT_ACCESSIBLE_UNSAFE`, each as the only problem

#### Scenario: The repository is set up and axe-core's licence is allowed
- **WHEN** `checkAccessibilitySetup` runs on the repository root, `scanNpmStore` is read for `axe-core`, and `checkLicences` gets that package with `ALLOWED_LICENCES` and `LICENCE_EXCEPTIONS`
- **THEN** the setup result is `[]`, the package is `4.14.0` with licence `MPL-2.0`, and `checkLicences` returns `[]`

#### Scenario: The helper in a browser
- **WHEN** the journey calls `assert_accessible(page)` on a loaded page with a labelled button, and on a page with a button without a name
- **THEN** the first returns and the second fails the test with a message that holds `button-name`

#### Scenario: The M0 pages pass
- **WHEN** the four page tests of `e2e/test_m0_skeleton.py` (landmarks, deep link, landing health, health states) call `assert_accessible(page)` after their last step
- **THEN** none reports a serious or critical violation and no console message mentions "Content Security Policy"

### Requirement: The tokens and theme are CSS files that meet WCAG AA contrast — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Toast Dismiss button turns white-on-white on hover
- **WHEN** the pointer hovers the Dismiss button inside a toast
- **THEN** the button keeps a transparent or toast-background col

### Requirement: The tokens and theme are CSS files that meet WCAG AA contrast — regression 2
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Focus outline on the toast Dismiss button is below 3:1 against the toast background
- **WHEN** the Dismiss button inside a toast has keyboard focus
- **THEN** its focus outline colour has a contrast of at least 3:1 against --ui-color-toast-bg.

### Requirement: Kit buttons, dialogs, states and toasts are styled by token-only rules in theme.css
`web/src/kit/theme.css` SHALL hold as exactly one rule each (selectors compared with whitespace collapsed): `.ui-button[data-tone="primary"]` (`border-color` and `background` `var(--ui-color-accent)`, `color` `var(--ui-color-on-accent)`), the same for `danger` with `--ui-color-danger` and `--ui-color-on-danger`, their `:hover` rules (`filter: brightness(0.9)`), `.ui-button[data-tone][aria-disabled="true"]` (`filter: none`, `opacity: 0.6`), `.ui-dialog` (`width: 32rem`, `max-width: calc(100vw - 2rem)`), `.ui-page-header` (`display: grid`), `.ui-page-header-title` and `.ui-page-header-description` (each `overflow-wrap: anywhere`) and `.ui-section`. The toast rules SHALL keep their values: `.ui-toast` `background: var(--ui-color-toast-bg)`, the toast hover rule (exactly `background: transparent` and `color: var(--ui-color-toast-text)`) and the toast focus rule (exactly `outline-color: var(--ui-color-toast-text)`); `.ui-toast button` SHALL also set `box-shadow: none`. The tone rules SHALL come after `.ui-button:disabled, .ui-button[aria-disabled="true"]`. The file SHALL hold no raw colour, use only tokens that `tokens.css` defines, and add no token.

#### Scenario: Tone, dialog, state and toast rules are token-only and the toast is unchanged
- **WHEN** `theme-restyle.test.ts` reads `theme.css` and `tokens.css` and checks the rows R1 to R20 of test-plan.md T1
- **THEN** every row's selector is one rule with its declarations (`.ui-button[data-tone="primary"]` has `background: var(--ui-color-accent)`, `.ui-toast` has `background: var(--ui-color-toast-bg)`, the toast hover rule has 2 declarations and the focus rule 1); the primary rule comes after the disabled rule; `findRawColours(theme)` is `[]`; no `var(--ui-…)` is missing from `tokens.css`; the C-92d9ac35 needles are present; `tokens.css` still has 25 `--ui-color-*` values and `--ui-color-toast-bg` `#1b1f27`; three altered texts fail the checker

### Requirement: The pinned kit markup is unchanged and a tone is only an attribute
`ConfirmDialog` SHALL stay a native `<dialog>` holding `<form method="dialog">`, with the cancel button before the confirm button; its confirm button SHALL carry `data-tone` `danger` when `destructive` is true and `primary` otherwise, and nothing else in it carries `data-tone`. `Form`'s submit button SHALL carry `data-tone="primary"` and keep `aria-disabled={model.submit === "busy"}`. `ErrorPanel`, `LoadingState`, `EmptyState` and `ToastRegion` SHALL keep their roles, classes and texts and carry no `data-tone`. No kit `.tsx` SHALL use `buttonClasses` or import `ui/button`.

#### Scenario: Kit sources keep their roles, texts and order
- **WHEN** `kit-markup.test.ts` reads the eleven kit `.tsx` files of test-plan.md T2 with `readFileSync`
- **THEN** each file holds its T2 strings and counts: `ConfirmDialog.tsx` has `<dialog`, `<form method="dialog">`, `showModal()`, `value="cancel"` before `value="confirm"` and one `data-tone`, `data-tone={props.destructive === true ? "danger" : "primary"}`; `Form.tsx` one `data-tone="primary"` and one `role="alert"`; `ErrorPanel.tsx` `role="alert"`, `Error code: <code>{model.code}</code>` and `Copy decision id`, no `data-tone`; `ToastRegion.tsx` `className="ui-toasts" aria-live="polite" aria-atomic="false"`; no file has `buttonClasses`, `ui/button`, an inline style, a stylesheet import or a palette utility

### Requirement: Layout helpers are fixed strings and PageHeader and Section are plain wrappers
`sectionHeadingId(prefix, title)` SHALL be `${prefix}-` plus the title lower-cased with each run of characters outside `[a-z0-9]` as one `-`, trimmed of `-`. `captionDisplayFor(caption, heading)` SHALL be `"hidden"` when the two trimmed texts are equal (case-sensitive) and `"visible"` otherwise. `PAGE_WIDTHS` SHALL deep-equal `{ form: "max-w-3xl", list: "max-w-6xl", wide: "max-w-none" }`. `PageHeader.tsx` and `Section.tsx` SHALL hold no `role=`, `aria-live`, `<header`, `<nav`, `<a `, stylesheet import or inline style; `PageHeader`'s `h1` SHALL be `tabIndex={-1}` with the given `ref`, and `Section` SHALL render its title in an `h2` (an `h3` when `headingLevel` is 3; 2 is the default) labelled by its heading's `useId()`. A `Section` is a `region` named `title`; each page that uses it keeps that name unique on the page, which the consuming units check in their own frozen-pins tables. The files SHALL live in `web/src/kit/layout/`, so `kit/` keeps its five direct-child components and `KEYBOARD` its five keys.

#### Scenario: sectionHeadingId, captionDisplayFor and PAGE_WIDTHS
- **WHEN** `layout.test.ts` runs the rows V1 to V8, W1 to W5 and the table of test-plan.md T3
- **THEN** `sectionHeadingId("flow", "Test run")` is `flow-test-run`, `("flow", "  Hello, World!  ")` is `flow-hello-world`, `("a", "Résumé")` is `a-r-sum`, `("a", "!!!")` and `("a", "")` are `a-`, `("x", "---Already-Slugged---")` is `x-already-slugged`; `captionDisplayFor("Flows", "Flows")` and `(" Flows ", "Flows")` are `hidden`, `("Flows", "flows")` and `("Versions", "Flows")` are `visible`; `PAGE_WIDTHS` deep-equals the three strings

#### Scenario: The layout sources hold no landmark, role, link or inline style
- **WHEN** `layout-sources.test.ts` reads `PageHeader.tsx`, `Section.tsx`, lists `web/src/kit` and `web/src/kit/layout`, and reads `keyboard.ts` (test-plan.md T2)
- **THEN** neither source contains `role=`, `aria-live`, `<header`, `<nav`, `<a ` or `.css`, `findInlineStyleUse` gives `[]`; `PageHeader.tsx` contains `<h1 className="ui-page-header-title" tabIndex={-1} ref={props.headingRef}>`; `Section.tsx` contains `aria-labelledby={headingId}`, `useId()` and `cn("ui-section", props.className)`; `kit/` holds exactly five `.tsx` files (`ConfirmDialog`, `EmptyState`, `ErrorPanel`, `LoadingState`, `ToastRegion`) and `kit/layout/` the non-test files `layout.ts`, `PageHeader.tsx`, `Section.tsx`

### Requirement: A confirm dialog opens centred with its tone and returns focus
The native dialog SHALL open centred (at most 512 px wide at 1366), the confirm button's background SHALL equal the colour token of its own `data-tone` (`--ui-color-accent` for `primary`, `--ui-color-danger` for `danger`), the cancel button's the quiet surface token (`--ui-color-surface`), Escape SHALL close it and return focus to the opener, and the page SHALL raise no Content Security Policy message and pass axe.

#### Scenario: The Disable dialog is centred, toned and returns focus
- **WHEN** `test_disable_dialog_is_centred_toned_and_returns_focus` opens `/admin/users` with mocked `/api/v1/me` and `/api/v1/users` at 1366 by 860 after `watch_csp(page)`, clicks "Disable Bob Example" and presses Escape (test-plan-browser.md)
- **THEN** the `dialog` has one heading and two buttons, its horizontal centre is within 1 px of 683 and its width at most 512, the `data-tone` of "Disable user" is `primary` or `danger` and its computed background equals that token's resolved colour (read from the tokens at run time, not a literal; `rgb(29, 78, 216)` for `primary`, `rgb(180, 35, 24)` for `danger`), and "Cancel" equals `--ui-color-surface`; after Escape there is no `dialog`, "Disable Bob Example" is focused, `assert_accessible(page)` passes and the `watch_csp` list is `[]`
