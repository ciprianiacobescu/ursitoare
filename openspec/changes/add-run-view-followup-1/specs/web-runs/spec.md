# Spec Delta

## Purpose
Regression scenarios for the web-runs capability, found by the verifier in add-run-view.

## ADDED Requirements

### Requirement: Run page scrolls sideways when a step's input or output has a long line — feedback FB-001
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Run page scrolls sideways when a step's input or output has a long line
- **WHEN** the Step details of a run show an Input or Output whose JSON holds a line longer than the column, such as a long string value
- **THEN** the text wraps inside the Step details column and the page does not scroll sideways at 1280 px and at 375 px wide (the document's scrollWidth equals its clientWidth)
