# Spec Delta

## Purpose
Regression scenarios for the web-shell capability, found by the verifier in add-app-shell.

## ADDED Requirements

### Requirement: Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table — finding H-829dbc6c
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table
- **WHEN** the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60 "M", at 1366 by 860 and at 900 by 800,
- **THEN** the banner is 56 px tall (within 1), the button "Sign out" is on one line and 38 px tall (within 1), both account paragraphs compute text-overflow ellipsis and are cut, and the right edge of "Sign out" is at most the viewport width.

### Requirement: The banner stays at most 72 px tall — regression 2
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60...
- **WHEN** the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60 "M", at 1366 by 860 and at 900 by 800,
- **THEN** the banner is 56 px tall (within 1), the button "Sign out" is on one line and 38 px tall (within 1), both account paragraphs compute text-overflow ellipsis and are cut, and the right edge of "Sign out" is at most the viewport width.
