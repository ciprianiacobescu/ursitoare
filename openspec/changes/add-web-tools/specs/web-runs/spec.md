## ADDED Requirements

### Requirement: A stale validation has its own text in the test-run and dry-run panels
`staleVersionText(details)` SHALL give "This version was validated by an older validator. Validate it again from the flow's version page, then run it." for details whose own members are `reason` `version_not_runnable` and `cause` `validation_stale`, else `null`. `testRunFormErrors`, and so `dryRunFormErrors` for every error that is not a 400, SHALL give `{ $form: <that text> }` for such a 422 `OPERATION_REFUSED`; every other refusal reads as before.

#### Scenario: A stale version reads as one message in both panels
- **WHEN** `staleVersionText`, `testRunFormErrors` and `dryRunFormErrors` run on the rows of test-plan.md § Stale
- **THEN** the stale details give the text and the other values `null`; both form-error functions give `{ $form: STALE }` for the stale refusal and the existing blocks text for the `block_missing` one
