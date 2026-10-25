# policy-cedar (M6): Cedar as the in-process policy decision point

Question: can Cedar, embedded in a TypeScript engine, decide tool and LLM calls per
(principal role, flow, flow version, node, node kind, tool, tool arguments, data taint, run context)
with p99 latency under 1 ms, and can it express the policies Ursitoare needs?
Results are in [`REPORT.md`](./REPORT.md). This file explains what is here and how to run it.

## Pinned stack

| Item | Version |
|---|---|
| Node | v26.8.1 (as installed) |
| `@cedar-policy/cedar-wasm` | **4.14.0** (Cedar core 4.14.0, language 4.6), `nodejs` build |
| `yaml` | 2.9.1 (2.8.1 has a stack-overflow advisory; `npm audit` is clean at 2.9.1) |
| `typescript` / `tsx` / `@types/node` | 5.9.3 / 4.20.6 / 24.9.2 (dev) |

Everything is pinned exactly in `package.json` (no ranges, no root workspace).

## Run it

```bash
cd policy-cedar
npm install                     # prints a harmless "install-scripts" notice for esbuild/fsevents
npm run gen-schema              # regenerate schema/ursitoare.cedarschema from shared/catalogue/blocks.v0.json
npm run validate                # strict validation of 31 policies + 8 deliberately malformed ones
npm test                        # 117 tests: 88 scenarios, validation, per-policy mutation check, extractor, limits
npm run report:scenarios        # markdown table: expected vs actual for every scenario
npm run extract                 # static extractor on RF-1 + activation decision + dry-run of per-node requests
npm run size                    # Wasm bundle size (raw / gzip / brotli)
npm run bench:sanity            # proves the benchmark mix is real evaluations with the expected decisions
npm run bench                   # latency benchmark (about 10-20 minutes, the 5,000-entity scaling row dominates); writes results/bench.json
npm run typecheck
```

## Layout

```
schema/ursitoare.cedarschema   GENERATED from the catalogue (ToolArgs union, ApproversByRole keys); `gen-schema --check` detects drift
policies/*.cedar               31 policies, each with @id. 00-org (18), 10-invoice-intake (3), 20-support-triage (6), 30-sales-followup (4)
config/private-blocks.json     which read blocks count as "private data" (the v0 catalogue has no such marker)
src/cedar.ts                   wasm loader, policy loading (split by @id), strict validation helper (warnings fail the gate)
src/directory.ts               in-memory users/flows/nodes/tools + entity JSON builders + the fixture directory
src/engine.ts                  PolicyEngine = the policy.check() hook: request builder, evaluator, fail-closed interpretation
src/scenarios.ts               the scenario table (88 rows)
src/malformed.ts               8 deliberately malformed policies
src/extractor.ts, extract-cli.ts  static extractor: flow YAML -> flow_capabilities + per-node expected requests
src/bench.ts, size.ts          benchmark and bundle size
test/*.test.ts                 node:test suites
scripts/init-probe.mjs         fresh-process wasm init timer
results/                       raw benchmark output (bench.json, bench-output.txt)
```

## Mapping of format-v0 concepts onto Cedar

The hook in design section 6 is `policy.check({principal, flow, flow_version, node, kind, tool, args, taint})`.
`PolicyEngine.check()` implements it (plus `run_initiator` and `approvals`, which the separation-of-duties rule needs).

| Format-v0 / engine concept | Cedar construct | Notes |
|---|---|---|
| Run principal (the user the run acts for) | `principal`: `User::"alice"`, attrs `roles: Set<Role>`, `team: String`; **parents** = the user's `Role` entities | Both forms are available: `principal in Role::"finance-approver"` (idiomatic, hierarchy-capable) and `principal.roles.contains(...)` |
| Catalogue role (`finance-clerk`, ...) | `Role::"finance-clerk"` | One entity per catalogue role |
| Flow (`flow` + `version`) | `Flow::"invoice-intake"` with `owner_team`, `version`, `reviewed` | Id is the flow name without the version. The engine builds the entity for the version in the request, so `version` and `reviewed` are per-version facts and policies survive version bumps. Pin a version with `resource.flow.version == "1.0.0"` or `like "1.*"` |
| Node (`node` id + `kind`) | `Node::"invoice-intake/pay"` with `flow: Flow`, `kind: String` | Id is `<flow>/<node_id>` (node ids are only unique per flow). `kind` is the format-v0 kind string (`block`, `llm.extract`, `agent`, `human.approval`, ...) |
| Catalogue block `uses` (`erp.create_payment@1`) | `Tool::"erp.create_payment@1"` with `effect` (`read`/`write`/`send`/`pay`) | Delegate targets become `Tool::"n8n:archive-invoice"` with an **assumed** effect `send` (the catalogue does not type delegates) |
| Tool call (block, agent tool, foreach `uses`, delegate) | action `invoke_tool`; resource = the calling **Node**; `context.tool` = the Tool | Resource is the node so a per-step allowlist reads `resource == Node::"invoice-intake/pay"` in the policy scope |
| LLM call (`llm.*`, `agent`) | action `invoke_llm`; resource = the Node; `context.args` = `{model_profile?, tools?}` | `tools` is present only when the call carries tools (agent nodes) |
| Human task decision | action `approve_task`; resource = the `human.approval` Node | `context.run_initiator` enables separation of duties |
| Activate a flow version | action `activate_flow`; resource = Flow; `context.flow_capabilities = {reads_untrusted, reads_private, has_send_or_pay}` | Capabilities come from the static extractor |
| Edit a flow | action `edit_flow`; resource = Flow | |
| Start a run (**addition** to the requested action list) | action `start_run`; resource = Flow | "finance-clerk may start runs" needs an action |
| Block/agent tool arguments | `context.args: ToolArgs` | Closed record: union of every non-object catalogue input property, all optional, plus a PEP-derived `url_host` (Cedar `like` has no host boundary, so URL allowlists compare the parsed host). Decimals (`number`) are Cedar `decimal` (4 fractional digits); free-form `object` parameters (`http.post.json`) cannot be typed and are reported back as `unconstrained_args` |
| Data taint | `context.taint: Set<String>` | Labels: `untrusted` (raw untrusted field), `extracted` (after `llm.extract`/`code`, format v0 section 4.4) |
| Run initiator | `context.run_initiator: User` | Distinct from `principal` for `approve_task` |
| Approvals recorded on the run | `context.approvals: Set<{approver: User, role: Role}>` **and** `context.approvers_by_role: {<role>?: Set<User>}` | The second is a pure regrouping of the first. Needed because Cedar cannot quantify over a set of records (REPORT.md section "What Cedar could not express") |

### Decision semantics

* Default deny. `forbid` overrides `permit`.
* `PolicyEngine.interpret()` **fails closed**: any Cedar evaluation error becomes `deny` (`policy_error:...`),
  because Cedar silently *skips* a policy that errors, and a skipped `forbid` would turn into an allow.
* Unknown user, flow, node, tool, undeclared argument key, a `kind` or `flow_version` that disagrees with the directory,
  or a number with more than 4 decimals all produce `deny` (`request_error:...`).
* `Decision.determining` lists the policy ids Cedar reports (sorted: Cedar returns them in unstable order).

### Using it in the engine

```ts
const policy = new PolicyEngine(directory);          // once at start: preparses policies + schema into wasm memory
const d = policy.check({ action: "invoke_tool", principal: "alice", flow: "invoice-intake", flow_version: "1.0.0",
  node: "pay", kind: "block", tool: "erp.create_payment@1",
  args: { vendor_id: "V-1", amount: 2450, currency: "EUR", reference: "INV-1001" },
  taint: ["extracted"], run_initiator: "alice", approvals: [] });
// d = { decision: "allow", reason: "permit:inv-pay-step", determining: ["inv-pay-step"], errors: [] }
```

Log every `Decision` (the hook contract requires it). A deploy-time gate must run
`npm run validate`-equivalent code (`validatePolicies`) and fail on **errors and warnings**: Cedar reports a policy that
can never match ("impossible policy") only as a warning.
