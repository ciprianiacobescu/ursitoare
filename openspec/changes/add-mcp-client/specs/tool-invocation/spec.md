## MODIFIED Requirements

### Requirement: The gateway has one more inventoried caller
This change SHALL add `src/runtimes/invoke/request.ts` to the frozen egress inventory, leaving it `["src/credentials/vault-call.ts", "src/main.ts", "src/runtimes/invoke/request.ts"]`, and it SHALL be the only file of `src/runtimes/` that imports the gateway by value (`bodyDigest`). A later caller adds itself in a named task of its own change: `add-mcp-client` adds `src/tools/mcp/discover.ts`, leaving the four paths `["src/credentials/vault-call.ts", "src/main.ts", "src/runtimes/invoke/request.ts", "src/tools/mcp/discover.ts"]`.

#### Scenario: Only request.ts is an egress site of runtimes
- **WHEN** `checkEgressSites` runs on `readSnapshot()` with `["src/credentials/vault-call.ts", "src/main.ts"]`
- **THEN** the violations whose file starts `src/runtimes/` are exactly one `ARCH_EGRESS_SITE`, for `src/runtimes/invoke/request.ts`, and `test/arch/egress-sites.test.ts::C-76ead8ea` passes on the inventory literal that holds `src/runtimes/invoke/request.ts` (four paths since `add-mcp-client`; the new test of `add-mcp-client` in `src/tools/mcp/egress-site.test.ts` proves the four-path literal)
