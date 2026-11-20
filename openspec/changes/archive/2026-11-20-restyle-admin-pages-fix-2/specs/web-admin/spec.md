# Spec Delta

## Purpose
The four admin pages (Users, Roles and teams, Group mappings, Audit log) are built from the kit's page header, titled cards and badges, bounded to the list width, with names where a person is known and ids where a test or a record needs them.

## ADDED Requirements

### Requirement: Rejected hold: UI criterion C-3c7c4fbe has no end-to-end test; see the generated UI tests table — finding H-5a571db9
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Rejected hold: UI criterion C-3c7c4fbe has no end-to-end test; see the generated UI tests table
- **WHEN** the Grants page renders the Role or user field
- **THEN** the hint A role, for example author, or a user id from the Users page. is shown under that field, with the rows, badges, alerts, options, subject ids and layout of the scenario unchanged.
