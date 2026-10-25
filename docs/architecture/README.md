# Architecture (summary)

The full architecture (v0.1-r5, with ADR-01 to ADR-16, the security model, the user flows F1–F9, the Phase-1 exit
tests and the SEI Views and Beyond annex) lives in the project's research wiki, which is not published with this
repository. Specs in `openspec/changes/` are self-contained: they restate every behaviour, interface and rule they
rely on and cite architecture sections by name (for example "§8.7 taint propagation", "ADR-16").

## Decisions in one line each

| ADR | Decision |
|---|---|
| 01 | Ursitoare's own interpreter on the DBOS TypeScript SDK: one checkpointed step per node |
| 02 | One canonical YAML format; humans and LLMs author it; review, not the LLM, activates |
| 03 | Embedded Cedar behind one policy enforcement point; deny on any evaluation error; ~24 entities per request |
| 04 | `code` nodes are pure and run in a hardened QuickJS-in-Wasm worker sandbox |
| 05 | Work queue on Postgres (DBOS WorkflowQueue) |
| 06 | Mintkey's data plane is the only egress; Ursitoare is its sole authorizer; one token per step |
| 07 | Native LLM adapters with capability profiles and a call journal |
| 08 | Idempotency keys derive from run lineage, so forks never repeat effects |
| 09–11 | Node profiles, skills and business context, the Director (Phase 2) |
| 12 | Keycloak is the default OIDC identity provider; the engine is a relying party only |
| 13 | Multi-tenant by design (tenant-leading keys, RLS, tenant-namespaced policy), one tenant implemented |
| 14 | TypeScript |
| 15 | Source-available licence; permissive dependencies only |
| 16 | Pre- and post-node hooks are a runtime construct; hook routes may not target effect nodes |

## Module map

The modules and their allowed dependencies are enforced by `test/arch/` (see `AGENTS.md` and `docs/roadmap.md`).
