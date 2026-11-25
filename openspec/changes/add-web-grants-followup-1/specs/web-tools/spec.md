# Spec Delta

## Purpose
Regression scenarios for the web-tools capability, found by the verifier in add-web-grants.

## ADDED Requirements

### Requirement: Server page says 'Pending surface .' when there is no pending surface — feedback FB-001
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Server page says 'Pending surface .' when there is no pending surface
- **WHEN** a server in state pending has no pending surface yet (pendingDigest is null), as an MCP server has after registration and before its first discovery
- **THEN** the Surface card's state note mentions no digest and reads 'This server has not been approved. Its tools cannot be used yet. No surface has been submitted yet.'; with a pending digest it still ends with 'Pending surface ' and the 12-character digest

### Requirement: Server list keeps the old state after approve, replace or discovery — feedback FB-002
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Server list keeps the old state after approve, replace or discovery
- **WHEN** an admin approves a pending or drifted surface, replaces a server's document, or discovers its tools again on the tool servers page
- **THEN** the server list on the same page is loaded again and the server's row shows its new state (for example approved), as the Surface card does, without reloading the page
