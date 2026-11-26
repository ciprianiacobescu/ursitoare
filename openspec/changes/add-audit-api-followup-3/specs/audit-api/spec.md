# Spec Delta

## Purpose
Regression scenarios for the audit-api capability, found by the verifier in add-audit-api.

## ADDED Requirements

### Requirement: limit=200 must still find the next page: the stores must accept limit+1 — feedback FB-003
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: limit=200 must still find the next page: the stores must accept limit+1
- **WHEN** GET /api/v1/audit-events or GET /api/v1/policy-decisions is called with limit=200 while 201 or more rows match, with an engine key and without one
- **THEN** with an engine key the answer holds the first 200 items and a non-null next_cursor whose next page starts with item 201, as limit=199 gives a next_cursor when 200 or more rows match; without an engine key the answer is the ENGINE_KEY_REQUIRED refusal that limit=199 gives in that case; listAuditEv...
