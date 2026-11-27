# Spec Delta

## Purpose
Regression scenarios for the web-tools capability, found by the verifier in add-web-tool-trust.

## ADDED Requirements

### Requirement: Trust table controls shrink until their values cannot be read — feedback FB-001
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Trust table controls shrink until their values cannot be read
- **WHEN** the Register page's operations table is shown at 1366x860, or the operations table or the Tool settings table is shown at 390x844
- **THEN** every Effect select, Data class select and Tool name input in that table is at least 128 px wide, so its chosen value (Not set, public, private, Proposed, Skip, a tool name) reads in full; the table may scroll sideways inside its own box, and the page itself still has no horizontal scroll
