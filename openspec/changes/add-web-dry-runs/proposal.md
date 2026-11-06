## Why

An author can start a dry run only through the API (U51), and the run page shows none of the policy decisions a dry run recorded and no taint for `switch`, `end` and `wait` steps (carry-forward C14). This change adds the "Dry run" panel, the run page's "Policy decisions" and the Taint row of every step, and proves milestone M6 in a browser and against the engine.

Observable result: carol approves the seeded `acme` server; alice saves and validates `demo-grants`, dry-runs it and reads `State: failed`, `INTERPRETER_TOOL_DENIED` at `lookup` and "Policy decisions" holding `lookup · deny`. Carol grants `acme.lookup_vendor@1` to the role `author` and `acme.create_payment@1` for the step `pay`, and deploys. Alice's second dry run reads `State: completed`, `lookup` returns `V-ACME` and "Policy decisions" holds `lookup · allow · POST tools.fake.test/blocks/erp.lookup_vendor@1` and `pay · allow · stubbed · POST tools.fake.test/blocks/erp.create_payment@1`; the fake tools hold one call and none for `pay`.

Batch `m6-grants` (U40b, U45, U46, U45b, U47, U48, U49, U49b, U50, U51, U52, U52b in plan order; closing unit `add-web-dry-runs`, journey `e2e/test_m6_grants.py`) delivers M6: admins register tool servers and grant tools per role and step; an attended dry run reads through the broker with a one-step token and shows each effect's permit while stubbing it. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- New in `web/src/runs/`: `dry-run.ts`, `decisions.ts`, `DryRunPanel.tsx` and their tests; also `test/journeys/m6-grants.test.ts` and `e2e/test_m6_grants.py`.
- Edited, each in a named task (U52b alone edits them in M6): `web/src/runs/timeline.ts` (`stepDetailRows`, C14), `web/src/runs/RunPage.tsx` (the "Policy decisions" region), `web/src/features/80-runs.tsx` (registers `DRY_RUN_PANEL`).
- Capability `web-runs`: ADDED requirements only; no MODIFIED requirement (design decision 2), no frozen test change. No feature file, CSS, API, error code, migration, part, dependency or `src/` change.

## Impact

- **Scaffold:** Signature stubs for the interfaces below are on the base branch (`docs/decisions/0002`); this change implements them. Not scaffolded: `DryRunPanel.tsx`, the edits of `timeline.ts`, `RunPage.tsx` and `80-runs.tsx`, the tests and journeys, and the module-internal texts of `decisions.ts` (in the spec). The six `(addition)` names below need stubs too. No dependency.
- **Depends on:** the card's 19 units (U45 to U52 are in the plan, the rest is merged): `add-web-shell` (U07), `add-web-ui-kit` (U15), `add-web-data-kit` (U15b), `add-web-sign-in` (U16), `add-web-flow-editor` (U28: `registerEditorPanel`), `add-mock-test-runs` (U35: `parseTestInputs`), `add-runs-api` (U36), `add-web-run-timeline` (U37: `RunPage`, `stepDetailRows`), `add-hook-taint-check` (U40b), `add-fake-egress-proxy` (U45), `add-fake-tools` (U45b), `add-gateway-client` (U46) (the fakes the Node journey reads), `add-tool-registry` (U47), `add-credentials` (U48) (the pending `acme` server, D22), `add-grants-model` (U49), `add-policy-deploy` (U49b) (grants count after a deploy, D13), `add-tool-invocation` (U50), `add-dry-runs` (U51), `add-web-grants` (U52). Added: `add-web-hooks-view` (U44, merged: `StepView.hooks`); the journeys also use `add-e2e-stack`, `add-fake-oidc` and `add-roles-and-memberships`.
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@cf34c628, and from the M5 folder and the M6 folders named, checked line by line).

**Interfaces given** (as in design.md § Interfaces)

```ts
// web/src/runs/dry-run.ts
export const DRY_RUN_PANEL: Readonly<{ id: "dry-run"; title: "Dry run" }>;
export function dryRunPanelView(capabilities: ReadonlySet<string>, version: { state: string } | null):
  { state: "not_allowed" | "needs_version" | "ready"; message: string | null };
  // no dry_run_flow → not_allowed, "Only members of the flow's owner team can dry-run it."; no saved version or a draft → needs_version, "Save and validate a version to dry-run it."
export function parseFakes(text: string): { ok: true; fakes: Record<string, unknown[]> } | { ok: false; message: string };
export function startDryRun(api: ApiClient, flowId: string, hash: string, input: unknown, fakes: Record<string, unknown[]>, key: string): Promise<RunView>;
export function dryRunFormErrors(error: unknown): FormErrors;   // (addition)
// web/src/runs/decisions.ts
export interface DecisionViewWeb {
  decisionId: string; nodeId: string | null; resource: string; decision: "allow" | "deny"; reasons: string[];
  permit: { method: string; host: string; path: string; serviceId: string; ttlSeconds: number } | null;
}
export interface DecisionRowView { nodeId: string; text: string; details: readonly { term: string; value: string }[] }
export function parseDecisions(raw: unknown): DecisionViewWeb[] | null;   // raw: one page's `items`
export function permitText(p: NonNullable<DecisionViewWeb["permit"]>): string;    // `${method} ${host}${path}`
export function decisionRows(run: RunView, steps: readonly StepView[], decisions: readonly DecisionViewWeb[]): DecisionRowView[];
  // text `<node> · <decision>[ · stubbed][ · <permitText>]`; stubbed = run.mode "stub", the step of that node is a block
  // with idemKey !== null, and the decision is allow; a hook decision's node label is `<node>:<phase>:<label>` from `resource`
export type DecisionLoad = { phase: "loading" } | { phase: "ready"; decisions: DecisionViewWeb[]; truncated: boolean } | { phase: "error"; error: unknown };   // (addition)
export type DecisionsSection =   // (addition)
  | { kind: "hidden" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "empty"; text: string }
  | { kind: "rows"; rows: DecisionRowView[]; note: string | null };
export function decisionsWanted(run: RunView | null): boolean;   // (addition)
export function decisionsView(run: RunView | null, steps: readonly StepView[], load: DecisionLoad | undefined): DecisionsSection;   // (addition)
export function loadDecisions(client: Pick<ApiClient, "get">, runId: string, signal?: AbortSignal): Promise<{ decisions: DecisionViewWeb[]; truncated: boolean }>;   // (addition)
```

**Interfaces taken:**

- From `add-dry-runs`: `DecisionView`, `registerDryRunRoutes` (the dry-run route) and `registerRunDecisionRoutes` (the decisions route).
- The web restates the decision view as `DecisionViewWeb`, without `decidedAt`, `policySetVersion` and the permit's `bodyDigest`.
- From `add-web-grants`: `loadToolServer`, `approveToolSurface`, `postGrant`, `loadPolicy`, `deployPolicy`, `deployText`, `SURFACE_APPROVED`. From `add-credentials`: `SEED_TOOL_SERVER`, `seedServiceId`.
- From `add-fake-egress-proxy`: `FakeEgress`, `IssuedToken`, `ForwardedRequest`. From `add-gateway-client`: `egressApi`. From `add-fake-tools`: `FakeTools`, `FakeToolCall`, `toolsApi`. From `add-tool-invocation`: `blockResourceId`, `INVOKE_LIMITS`.
- From merged code and `add-web-hooks-view` (shapes in `delivered-shapes.md`): `RunView`, `StepView`, `StepHooksView`, `stepDetailRows`, `parseTestInputs`, `testRunFormErrors`, `registerRunMessages`, `runLinkName`, `followRun`, `loadSteps`, `loadPayload`, `ApiClient`, `ApiRequestError`, `parseCursorPage`, `FormErrors`, `EditorPanelContext`, `registerEditorPanel`, `useSession`, `signInAs`, `sessionClient`, `createCapabilityLoader`, `postFlow`, `saveVersion`, `validateVersion`; in Python `login`, `users`, `fresh_state`, `assert_accessible`.

## Out of scope

Registering servers and credentials in the UI (U56, M7), a fakes editor that reads the flow, human approvals and live runs (M11), showing a body digest, and any change to the API, the engine or `src/`.
