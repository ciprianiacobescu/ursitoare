# Spec Delta

## Purpose
The three tool pages (Tool servers, Grants, Policies) are built from the kit's page header, titled cards and badges, with the pinned row texts, native controls and alert counts unchanged, and with a person's name only where the page shows who registered a server.

## ADDED Requirements

### Requirement: The Grants page keeps its errors, options and subject ids and shows status badges — regression 2
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: the Grants page is open at 1366 by 860 with the rows and with the error state of its two e2e test...
- **WHEN** the Grants page is open at 1366 by 860 with the rows and with the error state of its two e2e tests, and the Roles and teams, Group mappings, Audit log and Tool servers pages are open as in their tests in e2e/test_m6b_admin.py
- **THEN** in each of the regions "New grant", "Create team", "Map a group", "Chain verification", "Filter the audit log" and "Surface" the heading is on one line (its height is less than twice its font size) and every other child of the region starts at the heading's left edge within 1 px and at or below the heading's bottom edge.
