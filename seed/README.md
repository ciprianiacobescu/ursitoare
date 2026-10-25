# seed/: Phase-0 spike code, read-only

Copied on 2026-10-25 from the Phase-0 spike repository (local, unpublished) so that Phase-1 changes can port proven
code instead of rewriting it. Nothing here is built, linted, type-checked or tested by the gates, and no product code
may import from it. L4 implementers may not write here (`odd.forbidden_paths`). A person deletes each subtree once
the change that ports it has merged (`docs/roadmap.md`, column "Seed").

| Directory | What it is | Ported by |
|---|---|---|
| `format/` | Format v0 validator: L1–L3 checks, 47 error and 5 warning codes, canonical form and content hash, rubric checker, 221 tests | `add-flow-format-model`, `add-flow-validator` |
| `format-ts/` | Optional TypeScript call-list authoring surface (76/76 lossless round trips) | Deferred (optional) |
| `policy-cedar/` | Embedded Cedar engine, entity slicing, 31 policies, flow-capability extractor | `add-pdp-cedar`, `add-taint-static`, `add-grants-model` |
| `sandbox-quickjs/` | Hardened QuickJS-in-Wasm `WorkerSandbox` and its escape suite | `add-code-sandbox` |
| `node-hooks/` | Hook runtime, static checker (`H_*` codes), the interpreter's visit structure and the 37 hook scenarios | `add-interpreter-core`, `add-hook-checker`, `add-hook-runtime`, `add-block-hooks`, `add-hooks-integration` |
| `core-dbos/` | The spike's DBOS-TS interpreter (10 node kinds) | `add-dbos-runtime`, `add-interpreter-core` |
| `shared/catalogue`, `shared/flows` | The 20-block mock catalogue (test fixture only) and the RF-1 invoice flow | `add-test-catalogue` |
| `shared/mocks`, `shared/harness` | Mock tool servers (incl. mock LLM and n8n) and the RT-0…RT-6 harness | `add-crash-harness`, `add-mock-test-runs`, `add-fake-llm-provider`, `add-delegate-n8n`, `add-integrated-recovery-suite`, `add-eval-service` |
| `deploy/` | The Path-B Mintkey compose, secrets script, audit sink and the Keycloak realm from the footprint spikes | `add-fake-oidc`, `add-fake-egress-proxy`, `add-init-secrets`, `add-keycloak-realm`, `add-hobbyist-compose`, `add-audit-sink` |
| `specs/` | The spike designs: format v0 (§4), decision rules, and the hooks grammar | Read by the format and hook changes |

Values such as `spike-only-secret` in `deploy/keycloak-footprint` are spike placeholders, never real credentials.
