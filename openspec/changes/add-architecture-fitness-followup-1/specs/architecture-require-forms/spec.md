# Spec Delta

## Purpose
Regression scenarios for the architecture-require-forms capability, found by the verifier in add-architecture-fitness.

## ADDED Requirements

### Requirement: The secret scan skips harness folders only, not the owner's .l4 files — feedback FB-002
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: The secret scan skips harness folders only, not the owner's .l4 files
- **WHEN** scanRepository runs on a temp git repository whose tracked files .l4/config.yaml, .l4/plans/p1.json, openspec/changes/x/.l4/evidence/round-1/verdict.json and openspec/changes/archive/2026-10-26-x/.l4/ledger/r.jsonl each hold one secret-looking line built at run time
- **THEN** it returns exactly one ARCH_SECRET for .l4/config.yaml and one for .l4/plans/p1.json, and none for the two files under openspec/changes
