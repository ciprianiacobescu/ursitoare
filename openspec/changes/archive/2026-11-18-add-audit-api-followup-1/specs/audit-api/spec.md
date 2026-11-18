# Spec Delta

## Purpose
Regression scenarios for the audit-api capability, found by the verifier in add-audit-api.

## ADDED Requirements

### Requirement: Audit events are listed in numeric seq order — feedback FB-001
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Audit events are listed in numeric seq order
- **WHEN** a tenant has 12 audit events with seq 1 to 12 and GET /api/v1/audit is read with order desc and with order asc, limit 5, following next_cursor until it is null
- **THEN** desc returns seq 12,11,10,9,8 then 7,6,5,4,3 then 2,1 and asc returns 1,2,3,4,5 then 6,7,8,9,10 then 11,12; across the pages every seq 1 to 12 appears exactly once
