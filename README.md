# Ursitoare

A durable workflow engine for flows that mix deterministic steps (code, prebuilt blocks, delegation to n8n) with agentic
steps (LLM extract, decide, generate; agents). Every outbound call is checked by policy first and goes through a
credential broker, so neither the engine's flows nor its LLMs ever hold a credential. Humans and LLMs author flows
as YAML; review, not the LLM, is the activation gate.

**Status:** Phase 1 is under way and the engine is not usable yet. Milestone M0 (the engine skeleton, database,
tenancy, supply-chain and architecture gates, the e2e stack and the web shell) is complete; M1 (OIDC sign-in, the
policy check and the audit chain) is being built. The first milestone a person can use end to end is M11; see
`docs/roadmap.md`. This repository holds the toolchain, the L4 harness setup and the Phase-1 OpenSpec changes, and
the L4 harness builds the engine one change at a time.

| Where | What |
|---|---|
| `docs/roadmap.md` | The index: milestones, every OpenSpec change, dependencies, smoke and e2e per milestone |
| `docs/testing.md` | Test tiers, fakes, the browser e2e protocol, how to run each gate locally |
| `docs/architecture/` | Architecture summary and where the full architecture lives |
| `docs/decisions/` | Repository-level decisions (toolchain, layout, test strategy) |
| `openspec/changes/` | One change per unit of work, implemented by L4 test-first |
| `seed/` | Read-only Phase-0 spike code that changes port from; removed by a person once ported |
| `AGENTS.md` | Rules every coding agent follows |

## Develop

Requirements: Node 24, pnpm 10.34.8 (`corepack enable` or `npx pnpm@10.34.8`), uv, Python 3.11 or newer.

```sh
pnpm install
pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run build
pnpm run e2e:setup                                  # once: the e2e virtualenv
e2e/.venv/bin/playwright install chromium           # once, locally (CI uses L4's shared browser cache)
pnpm run e2e:serve &                                # the offline e2e stack on 127.0.0.1:39080
pnpm run e2e
```

## Licence

Source-available (architecture ADR-15); the licence text is being finalised. See `LICENSE`.
