# 0001 Repository layout, toolchain and the L4 setup

Date: 2026-10-25. Status: accepted (owner answers 2026-10-25; orchestrator defaults marked).

## Owner decisions

- **Language: TypeScript** (architecture ADR-14, confirmed).
- **Repository: public** on GitHub. Consequences: `ci.upload_artifacts: false` (agent transcripts stay private), and
  nothing under version control may hold a secret or a description of an unfixed vulnerability in a dependency.
- **L4 agents:** implementer chain DeepSeek → GLM (OpenCode, `OPENCODE_API_KEY`) → Claude Sonnet; judges Claude and
  Codex (`CODEX_API_KEY`). A judge of the implementer's vendor is vetoed; Codex stays the independent judge.
- **Hooks gap X3:** accepted fix, `H_ROUTE_EFFECT` plus approvals-on-path in the policy context (ADR-16).
- **Repository:** `github.com/ciprianiacobescu/ursitoare`, public; the orchestrator makes the first commit and pushes it
  once M0's specs pass review (2026-10-25).
- **L4 schedule:** every 30 minutes, so an active plan moves unattended (2026-10-25).
- **Unattended plans** ("use merge auto, I want it unattended", 2026-10-25): `forge.merge_policy: auto` and plans with
  `merge: auto`; the delegate (`delegate-fable`, a model no implementer or judge uses) answers implementer questions
  read-only and escalates what it cannot check. With `forge.token_env: GITHUB_TOKEN`, L4's merges start no other
  workflow, so `e2e.yml` does not run on them; each unit's own L4 verification still runs the browser suite. A
  fine-grained `L4_FORGE_TOKEN` as `forge.token_env` makes `e2e.yml` run on L4's merges.
- **TypeScript stubs:** scaffold per milestone now, an L4 change later (`0002`).

## Orchestrator defaults (the owner may flip any)

| Topic | Choice | Why |
|---|---|---|
| Runtime | Node 24 LTS, ESM, Node runs `.ts` directly (erasable syntax only) | DBOS-TS 5.3.0 needs Node ≥ 20; no bundler (ADR-14) |
| Package manager | pnpm 10.34.8 workspace: root engine package plus `web/` | L4 `ci.toolchains` sets it up; pnpm 10 blocks unlisted build scripts |
| Compiler and lint | TypeScript 6.0.3, ESLint 10, typescript-eslint 8.72 | typescript-eslint supports TypeScript `<6.1`; 7.x is out of range |
| Unit tests | Node's test runner, JUnit to `.l4-out/junit.xml` through the owner reporter `tools/node-test-junit.mjs`, global setup for shared fixtures | No extra runner. Node's built-in junit reporter is not readable by L4 (failure kinds, ids): see 0002 |
| Database in tests | Embedded Postgres 18.4 (`embedded-postgres`) | L4's sandbox hides the Docker socket; DBOS 5.3.0 verified on it, Linux and macOS |
| Browser e2e | Python pytest-playwright 1.63.0 under `e2e/` | The L4 verifier generates Python browser tests and reads JUnit; its browser cache is pinned to 1.63.0 |
| UI | React and Vite under `web/`, served by the engine | `web/**` is an L4 UI path, so UI units get browser checks |
| Migrations | `src/db/migrations/NNNN_<name>.sql`, forward-only | `**/migrations/**` dropped from L4's forbidden paths (doctor CFG-005 warns; intended) |
| Outside the gates | `seed/**`, `.github/workflows/**`, `infra/**`, `deploy/secrets/**`, `.env*` are forbidden to implementers | Safety; workflow and seed edits are a person's |
| Starting units | `yolo.hold: ["*"]` | Nothing runs until a person activates a plan |
| e2e port | 39080 (control listener 39081) | 18080 collides with local Mintkey stacks; the e2e gate itself is network-isolated |
| Milestone e2e | Every unit's L4 verification runs the browser suite; each milestone's closing unit runs last; `.github/workflows/e2e.yml` runs it on every push to `main` | L4 0.4.30 refuses batch acceptance profiles that list `e2e` while the e2e gate serves an app (`yolo/admit.py`) |
| Web package | `web/package.json`, `web/tsconfig.json`, `web/vite.config.ts` are owner files | L4 restores gate scripts in any `package.json` and any `tsconfig*.json` |
| Supply chain | `.npmrc` (`save-exact`), `pnpm-workspace.yaml` (`onlyBuiltDependencies`, `minimumReleaseAge` 3 days) are forbidden to implementers | Install scripts run in the setup gate, which has network access |
| API base | REST under `/api/v1`; fixed endpoints at the root | SPA routes such as `/flows` would collide with §11 paths |
| No live effects before publish | Test runs mock and dry runs stub every `write`, `send` and `pay` | Review stays the activation gate (architecture top risk 3) |
| Untrusted external inputs | Webhook bodies and MCP caller arguments are `untrusted` unless a reviewed trigger marks fields trusted | Taint must cover every external input (architecture §8.7) |

## Consequences

- Real Keycloak and Mintkey never run inside an L4 gate. Their behaviour enters the gates through fakes with
  contract tests, and the real six-container stack is exercised once per milestone outside L4 (`docs/testing.md`).
- Gate scripts in `package.json`, `eslint.config.js`, `tsconfig*.json`, `e2e/pyproject.toml` and the test-support
  files are a person's to change. Units add dependencies freely.
