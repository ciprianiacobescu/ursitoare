## ADDED Requirements

### Requirement: The tools journey works against the real engine
The Node journey SHALL run the web logic on the e2e stack's engine: carol registers an MCP, an OpenAPI and a code-block server, reviews and approves them; alice's dry run calls one tool of each kind through main's wiring.

#### Scenario: Carol registers three servers and alice dry-runs through all three adapters
- **WHEN** `test/journeys/m7-tools.test.ts` starts the stack (asserting the handles `durable`, `egress`, `tools`, `tool-servers`, `mcp`) and runs steps 1 to 6 of test-plan-journey.md § Node journey
- **THEN** the values are those of the steps: `route_ticket` left out, `find_vendor` `write` despite `readOnlyHint`, then `read`, the first surface listed as `added`; the `ledger` credential stored (`keyVersion` 1); four discovery permits equal to the fake's `bodySha256`; the dry run `completed` with `find` through the fake MCP (`W1`, `<run>:find:1`), `score` local with `permit` null, `vendor` through the fake tools (`<run>:vendor:1`), `pay` stubbed, two tokens in all

### Requirement: The M7 journey proves tool registration, review and a dry run in a browser
`e2e/test_m7_tools.py` SHALL show carol registering an MCP, an OpenAPI and a code-block server, discovering and setting the MCP tools, approving the three surfaces and granting three tools, and alice's dry run reading `find` through the fake MCP, running `score` locally and stubbing `pay`, with `assert_accessible(page)` and `assert_layout(page)` on every page and an empty `watch_csp` list. With the Node journey it proves the batch outcome: an admin adds an HTTP/OpenAPI, MCP or code-block tool, approves its surface and stores its credential; a flow calls it (F9).

#### Scenario: Carol sets up three tool servers and alice's dry run reads, runs and stubs
- **WHEN** steps 1 to 5 of test-plan-browser.md § Journey run in two browser contexts (carol, alice)
- **THEN** the values are those of the steps: "Discovered 2 tools over MCP 2026-07-28.", `find_vendor` `read` in "Tools" and in the exact Effect cell of "Calls", the exact cells `unsafe to retry` (`create_payment`) and `safe to retry`, `trusted` (`risk_score`), "Surface approved." three times, the `ledger` credential stored; the run `State: completed` with the items `find · allow · POST mcp.fake.test/mcp`, `score · allow` (no Service detail) and `pay · allow · stubbed · POST tools.fake.test/blocks/erp.create_payment@1`, outputs `V-ACME`, `low`, `P-7`, and the Taint row `none` for `pay`, `untrusted` for `done`

### Requirement: The journey files carry the milestone marker, the M6b checks and no skip
`e2e/test_m7_tools.py` SHALL be marked `@pytest.mark.milestone("M7")`, set the viewport, call `watch_csp(` before its first `goto`, `assert_layout(` and `assert_accessible(` and use `exact=True` locators, with no `pytest.skip`, `xfail`, `skipif` or `time.sleep`; `test/journeys/m7-tools.test.ts` SHALL start the stack with `startE2eStack(` and assert the five handles. This Node-runnable check makes the unit's criteria fail at red, since both journeys are written after it.

#### Scenario: The journey sources read as the rules say
- **WHEN** `test/journeys/journey-sources.test.ts` reads `e2e/test_m7_tools.py` and `test/journeys/m7-tools.test.ts` (test-plan.md S1)
- **THEN** the Python file holds `@pytest.mark.milestone("M7")`, `set_viewport_size(`, `watch_csp(`, `assert_layout(`, `assert_accessible(`, `exact=True`, `browser.new_context(` and `def test_carol_sets_up_three_servers_and_alice_dry_runs`, and no `pytest.skip`, `xfail`, `skipif`, `time.sleep` or `page.wait_for_timeout`; the TypeScript file holds `startE2eStack(`, `"mcp"`, `"tool-servers"`, `mcpApi(`, `toolsApi(`, `egressApi(` and `demo-live`, and neither `.skip(` nor `.todo(`; four mutated copies (a required token removed, a skip call appended) each give a problem

