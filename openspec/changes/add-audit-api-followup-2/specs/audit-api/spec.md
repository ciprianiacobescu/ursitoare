# Spec Delta

## Purpose
Regression scenarios for the audit-api capability, found by the verifier in add-audit-api.

## ADDED Requirements

### Requirement: limit=200 on the audit and decision lists answers 500 — feedback FB-002
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: limit=200 on the audit and decision lists answers 500
- **WHEN** GET /api/v1/audit-events or GET /api/v1/policy-decisions is called with limit=200, the documented maximum of both routes
- **THEN** the answer is not a 500: it is the same page the route gives for limit=199 on the same data, holding at most 200 items with the next_cursor of the page rules; limit=201 is still refused with 400 VALIDATION_FAILED
