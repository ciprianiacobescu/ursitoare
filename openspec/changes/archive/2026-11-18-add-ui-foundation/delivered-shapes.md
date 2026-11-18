Declarations this change takes or edits (`export` omitted), copied from main@3daa5c35 and checked line by line.

```ts
// web/src/kit/contrast.ts:3, :5-10, :18-21, :32-49
type StringMap = Readonly<Record<string, string>>
interface ContrastPair { id: string; fg: string; bg: string; min: number }
interface SourceHit { line: number; text: string }
const CONTRAST_PAIRS: readonly ContrastPair[]   // sixteen pairs; first `text-on-bg`, last `focus-on-surface`
// web/src/kit/contrast.ts:97-174
function parseTokens(css: string): StringMap   // `--name: value;` pairs, a later duplicate wins
function checkTokenContrast(tokens: StringMap, pairs?: readonly ContrastPair[]): ContrastFailure[]   // ContrastFailure { id; ratio; min }; a missing or non-six-digit-hex token gives ratio 0
function findRawColours(css: string): SourceHit[]   // a 3-8 digit hex, colour function or colour name outside a custom-property line
function findInlineStyleUse(source: string): SourceHit[]   // `style=`, `<style` or setAttribute("style" on a line, comments included
```

```python
# e2e/conftest.py:90, :114-139 (unchanged; U15c appends two helpers after them)
def login(page, user: dict[str, str], path: str = "/sign-in") -> None   # ends with expect(banner).to_contain_text(user["displayName"])
def assert_accessible(page) -> None   # axe-core 4.14.0 from node_modules, tags wcag2a wcag2aa wcag21a wcag21aa; fails on serious or critical
# fixtures (e2e/conftest.py:23, :49, :70): base_url, fresh_state, users
```

Files this change edits, as they are on main:

- `web/src/main.tsx:4-6`: `import "./kit/tokens.css";`, `import "./kit/theme.css";`, `import "./app/shell.css";`, then `import "./features/index.ts";` and `import { App } from "./app/App.tsx";`.
- `web/vite.config.ts`: first line `// Build configuration for the web app (owner-maintained). The engine serves `web/dist` (docs/roadmap.md, M0).`; `plugins: [react()]`; `build: { outDir: "dist", emptyOutDir: true, sourcemap: true }`.
- `web/src/kit/tokens.css`: one `:root` block of 18 `--ui-color-*` hex values (the last `--ui-color-toast-text: #ffffff`), `--ui-space-1` to `-4`, `--ui-radius`, `--ui-focus-width`, `--ui-target-min`, `--ui-font-sans: system-ui, sans-serif;`, `--ui-font-size`.
- `web/src/kit/theme.css`: `.ui-button { … min-height: var(--ui-target-min) … }` (the build test's kit rule) and `:focus-visible { outline: var(--ui-focus-width) solid var(--ui-color-focus); }`.
