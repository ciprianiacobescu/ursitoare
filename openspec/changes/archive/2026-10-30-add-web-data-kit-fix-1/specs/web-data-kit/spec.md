# Spec Delta

## Purpose
A paged list, per-field form errors and a JSON Schema renderer on the API's cursor contract.

## ADDED Requirements

### Requirement: DataTable has a caption, scoped headers and a view for each state — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Load more after an empty page unmounts the focused button
- **WHEN** tableView gets loading with no items and nextCursor "c1" (Load more pressed after an empty page) and focusAfterChange gets (loading none cursor "c1", loaded none no cursor)
- **THEN** the view's body, rowCount, loadMore, retry and showError are rows, 0,

### Requirement: Anything outside the subset is a visible unsupported error — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: An unsupported property `c` comes back with an empty name
- **WHEN** schemaToFields gets the schema of scenario "Unsupported properties"
- **THEN** the field of c has the label "C" and the reason "the property has no type", and the other six fields keep their names, labels and reasons.

### Requirement: A cursor list loads one page at a time and appends the next — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: task 1.1: no-op calls and loads do not settle with the request in flight
- **WHEN** load() from idle, loadMore() from loaded with a nextCursor and retry() from error each start a request
- **THEN** the promise each returns resolves only once that request's page or error is committed, or once reset() drops it, never rejec

### Requirement: task 4.1: an enum property without type is not rendered as an enum — finding F-d49cb373
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: task 4.1: an enum property without type is not rendered as an enum
- **WHEN** schemaToFields gets an object schema whose only property kind is { enum: ["bug", "task"] } with no type
- **THEN** problems is empty and the one field is the same enum field Kind with options bug and task that { type: "string", enum: ["bug", "task"] } gives.
