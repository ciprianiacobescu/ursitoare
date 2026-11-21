## Why

Milestone M7 lets an admin add an MCP, an OpenAPI or a code-block tool, approve its surface and store its credential, and a flow call it (F9). U53, U54 and U55 prove their `src/main.ts` wiring only by reading its text, and say "U56b's journey proves it live". U56 and U56b build the pages. This closing unit proves the whole outcome: a Node journey on the real e2e stack, with at least one live call through `main`'s wiring for each adapter kind, and a browser journey through the pages. It was split from `add-web-tool-review` (ruling S1) to keep each folder under the size cut.

Observable result: carol registers `crm` (MCP), `ledger` (OpenAPI) and `calc` (code block), stores two credentials, discovers the MCP tools, sets `find_vendor` to `read`, approves three surfaces and grants three tools; alice's dry run of `demo-live` calls `find_vendor` through the fake MCP, `lookup_vendor` through the fake tools, runs `risk_score` locally with `permit` null and no token, and stubs `pay`. The fakes hold exactly one `tools/call`, one `erp.lookup_vendor@1` call and none for `erp.create_payment@1`; two tokens were issued.

Batch `m7-tools` (U47b, U35c, U27b, U54b, U53, U54, U55, U56, U56b, U56c in plan order; closing unit `add-web-tool-journeys`, journey `e2e/test_m7_tools.py`) delivers M7: an admin adds an HTTP/OpenAPI, MCP or code-block tool, approves its surface and stores its credential; a flow calls it (F9). This unit's part: the Node and browser journeys that prove the batch outcome. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- `web-tools`: ADDED requirements only, three (the Node journey, the browser journey, and the source rules of both). New: `test/journeys/m7-tools.test.ts`, `test/journeys/journey-sources.test.ts`, `e2e/test_m7_tools.py`. No `src/`, `web/`, API, migration, dependency, part or CSS change, and no page with a `navLabel` (`web/src/visual-pages.test.ts` pins 13).

## Impact

- **Scaffold:** nothing is scaffolded: no interface is given, and the three files are tests that the task creates.
- **Depends on:** `add-web-shell`, `add-web-sign-in`, `add-web-flow-editor`, `add-runs-api`, `add-web-run-timeline`, `add-fake-egress-proxy`, `add-fake-tools`, `add-gateway-client`, `add-e2e-stack`, `add-dry-runs`, `add-web-grants`, `add-web-dry-runs` (merged: the stack, the fakes, the run and grant pages and functions of M6), `add-ui-foundation` (`watch_csp`, `assert_layout`), `restyle-web-kit`, `add-app-shell`, `restyle-admin-pages`, `add-run-inputs-form`, `add-run-view`, `add-flow-workspace`, `add-home-dashboard` (merged: M6b, the pages step 5 drives), and in plan, each with the evidence that the journey drives it against the real engine:
  - `add-tool-adapters` (U47b): the invoke dispatch. The code call is authorised with `permit` null and runs with no token; the MCP and HTTP calls carry permits (Node steps 5 and 6).
  - `add-validator-version` (U27b): the validated, stamped version that the dry run starts; alice validates `demo-live` and `demo-tools` (Node step 4, browser step 5).
  - `add-fake-mcp` (U54b): part `55-mcp` and the fake MCP the discovery and the live call reach (`mcpApi`, `FAKE_MCP_TOOLS`).
  - `add-http-openapi-tools` (U53): the preview and registration routes, the `http` adapter, live in the `vendor` step.
  - `add-mcp-client` (U54): the discover route, the MCP adapter, the discovery egress site and the recorded decisions and digests (Node steps 1, 2 and 6).
  - `add-code-block-tools` (U55): the code registration route and `createCodeRunner` in `main` (the `score` step).
  - `add-web-tools` (U56): the registration and credential functions and pages (Node steps 1 and 3, browser steps 1, 3 and 4).
  - `add-web-tool-review` (U56b): `review.ts` and the sections "Discovery", "Changes" and "Calls" (Node steps 1 and 3, browser steps 2 to 4).
  - `add-cli-sandbox` (U35c) is not a dependency: no journey step uses the CLI.
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@9afc868e, checked line by line).
- **Deviations from the card:** the Node journey uses `demo-live` (the card's flow plus a `vendor` node, a live OpenAPI read) and also covers the `x_mcp_header` tool left out and the discovery permits; the browser journey's OpenAPI document has two operations (shared with Node); a third requirement, a Node source test of both journeys, makes the unit's criteria fail at red (rule R3); the journeys moved from `add-web-tool-review` unchanged in substance.

**Interfaces given** (the block of `design.md` § Interfaces)

```ts
// This unit gives no interface: it adds only test files (test/journeys/m7-tools.test.ts, test/journeys/journey-sources.test.ts, e2e/test_m7_tools.py).
```

**Interfaces taken:**

- From `add-web-tools`: `mcpRegistration`, `openApiRegistration`, `codeRegistration`, `previewRequest`, `previewOperations`, `registerServer`, `credentialBody`, `storeCredential`.
- From `add-web-tool-review`: `parseReviewTools`, `discoverTools`, `discoverBody`, `initialDraft`, `loadServerReview`, `changesView`, `discoveryText`, `REVIEW_NAMES`.
- From `add-fake-mcp`: `FakeMcp`, `FAKE_MCP_TOOLS`, `mcpApi`.
- The routes and answers of U53, U54 and U55: `delivered-shapes.md`.
- From merged code (shapes in `delivered-shapes.md`): `startE2eStack`, `egressApi`, `toolsApi`, `signInAs`, `sessionClient`, `postFlow`, `saveVersion`, `validateVersion`, `approveToolSurface`, `postGrant`, `deployPolicy`, `startDryRun`, `followRun`, `loadPayload`, `decisionRows`, `loadDecisions`; in Python `login`, `users`, `fresh_state`, `assert_accessible`.

## Out of scope

Any change to the engine or the web (the journeys only drive them), journeys for MCP sessions or `x-mcp-header` mirroring (M8, M13), and the real Mintkey stack (M8).
