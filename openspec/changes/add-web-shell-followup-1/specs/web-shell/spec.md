# Spec Delta

## Purpose
Regression scenarios for the web-shell capability, found by the verifier in add-web-shell.

## ADDED Requirements

### Requirement: A feature's page opens for a user without the feature's capability — feedback FB-001
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: A feature's page opens for a user without the feature's capability
- **WHEN** a signed-in user whose capabilities from /me do not include a feature's capability opens that feature's path directly, for example an author opening /admin/grants
- **THEN** the page shows only a not-allowed panel inside the shell, renders none of the feature's forms, tables or lists and sends none of the feature's API requests; a user who has the capability sees the page as today
