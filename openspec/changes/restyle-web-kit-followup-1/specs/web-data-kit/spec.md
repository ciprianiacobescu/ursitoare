# Spec Delta

## Purpose
Regression scenarios for the web-data-kit capability, found by the verifier in restyle-web-kit.

## ADDED Requirements

### Requirement: Page header meta: a wrapping row below the title, with gaps between items — feedback FB-001
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Page header meta: a wrapping row below the title, with gaps between items
- **WHEN** a person opens the run page of a completed run, mocked as e2e/test_m6b_run_view.py mocks it, at 1366 by 860 and again at 390 by 860
- **THEN** the status "Run state" and the five items Flow, Mode, Started by, Started and Duration of the header's meta each start at or below the bottom edge of the h1 "Run run_1"; the first starts within 1 px of the h1's left edge; any two of them whose tops are within 4 px are at least 8 px apart horizont...
