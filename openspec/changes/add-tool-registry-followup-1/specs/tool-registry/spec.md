# Spec Delta

## Purpose
Regression scenarios for the tool-registry capability, found by the verifier in add-tool-registry.

## ADDED Requirements

### Requirement: A new surface submitted in the same millisecond is shadowed by an older one — feedback FB-001
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: A new surface submitted in the same millisecond is shadowed by an older one
- **WHEN** a server's newest stored surface has submitted_at T and a new surface whose digest sorts below that surface's digest is submitted with the clock still at T
- **THEN** the new surface is the newest surface: the record's pendingDigest is the new digest, approving the new digest succeeds, and for a server that was approved the record shows state drifted with pendingDigest the new digest
