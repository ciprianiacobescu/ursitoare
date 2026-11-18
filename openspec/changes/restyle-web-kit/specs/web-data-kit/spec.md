## Purpose

The data components look finished while their API stays as it is: tables are cards, a caption can be hidden without losing the table's name, fields are bounded with their hint and error below the control, and a form's main action is accent blue.

## ADDED Requirements

### Requirement: A table caption can be hidden and still names the table
`DataTableProps` SHALL gain the optional `captionDisplay: "visible" | "hidden"` (default `"visible"`). `captionClass(display)` SHALL return `ui-table-caption` for `"visible"` or `undefined` and `ui-table-caption ui-visually-hidden` for `"hidden"`. `DataTable` SHALL write that class on its `<caption>` and keep `aria-label={model.caption}` on both the group and the region, so a hidden caption is still the table's accessible name.

#### Scenario: captionClass and the DataTable wiring
- **WHEN** `caption-class.test.ts` runs `captionClass` on `undefined`, `"visible"` and `"hidden"` and reads `DataTable.tsx` (test-plan.md T4)
- **THEN** the results are `ui-table-caption`, `ui-table-caption` and `ui-table-caption ui-visually-hidden`; `DataTable.tsx` contains `captionDisplay?: "visible" | "hidden";` and `<caption className={captionClass(props.captionDisplay)}>{model.caption}</caption>`, holds `aria-label={model.caption}` twice, and `theme.css` has one `.ui-visually-hidden` rule (`position: absolute`)

### Requirement: data.css makes tables cards and bounds fields without breaking a pinned rule
`web/src/kit/data/data.css` SHALL keep exactly one rule for each of its 16 pinned selectors and for `.ui-table thead th`, `.ui-table tbody th, .ui-table tbody td` and `.ui-input[aria-invalid="true"]`, with every frozen declaration. Inside those rules: `.ui-field` and `.ui-field-inline` `max-width: 40rem`; `.ui-table-wrap` `border: 1px solid var(--ui-color-divider)`, `border-radius: var(--ui-radius-lg)` and `overflow-x: auto`; the row lines use `var(--ui-color-divider)`; `.ui-form-actions` `justify-content: flex-start`. New rules: `.ui-table-caption`, `.ui-table tbody tr:hover` (`background: var(--ui-color-accent-surface)`) and `.ui-table tbody tr:last-child > *` (`border-bottom: 0`: no line under the last row). The file SHALL hold no raw colour, no `@media` and only tokens that `tokens.css` defines.

#### Scenario: data.css keeps every pinned rule and adds the new declarations
- **WHEN** `data-restyle.test.ts` reads `data.css` and `tokens.css` and checks the rows D1 to D16 of test-plan.md T1b
- **THEN** each of the 22 selectors of test-plan.md T1b is exactly one rule, each row has its declarations (`.ui-field` `max-width: 40rem`, `.ui-table tbody tr:hover` `background: var(--ui-color-accent-surface)`, `.ui-input` still `border: var(--ui-color-border)`, `width: 100%`, `min-height: var(--ui-target-min)`), `findRawColours(data)` is `[]`, no `var(--ui-…)` is undefined, and the text `@media` does not occur; the frozen `data-css.test.ts` stays green

#### Scenario: A table is a card with a header row and a hover row
- **WHEN** `test_users_table_is_a_card_with_a_header_and_a_hover_row` opens `/admin/users` with mocked `/api/v1/me` and `/api/v1/users` (Alice and Bob) at 1366 by 860 after `watch_csp(page)`, then hovers the row "Bob Example" (test-plan-browser.md)
- **THEN** the card wrapper has border colour `rgb(208, 213, 221)`, radius `8px` and `overflow-x` `auto`; "Name" has background `rgb(244, 245, 247)` and weight `600`; the caption's class list contains `ui-table-caption`, its text is `Users` and its weight is `600` (nothing asserts that it is visible or its exact class string, because a page may hide it with `captionDisplay`; the table is found by its name `Users` either way); the row is `rgba(0, 0, 0, 0)` before the hover and `rgb(239, 244, 255)` after; `assert_layout(page, max_banner_px=300)` and `assert_accessible(page)` pass and the `watch_csp` list is `[]`

### Requirement: Field puts the control before its hint and error, and Form's submit is the accent tone
The stacked `Field` SHALL render its label, then the control, then the hint, then the error; the inline `Field` SHALL keep control, label, hint, error. The error paragraph SHALL keep the hidden "Error: " span as its first child. `Form`'s submit button SHALL carry `data-tone="primary"`.

#### Scenario: The field order, the hidden prefix and the form tone in the sources
- **WHEN** `field-order.test.ts` reads `Field.tsx` and `Form.tsx` (test-plan.md T5)
- **THEN** in the last `<div className="ui-field">` block `{label}` precedes `{props.children(control)}`, which precedes `{described}`; in the `ui-field-inline` block the order is `{props.children(control)}`, `{label}`, `{described}`; the pattern `className="ui-field-error">\s*<span className="ui-visually-hidden">Error: </span>` matches; `Form.tsx` holds `data-tone="primary"` once

#### Scenario: The Flows form is bounded, toned and keeps its prefix and focus ring
- **WHEN** `test_flows_form_is_bounded_and_keeps_its_focus_ring` opens `/flows` with mocked `/api/v1/me` and `/api/v1/flows` (one flow) at 1366 by 860 after `watch_csp(page)`, focuses "Create flow" and clicks it with `force=True` (test-plan-browser.md)
- **THEN** "Flow name" is at most 640 px wide; the table "Flows" is visible; "Create flow" has `outlineWidth` at least 2, `backgroundColor` `rgb(29, 78, 216)` and `color` `rgb(255, 255, 255)`; the first `.ui-field-error` has `textContent` exactly `Error: Enter a flow name.`, its hidden span has `position` `absolute` and width 1, and the children of the first `.ui-field` are, in order, `LABEL.ui-field-label`, `INPUT.ui-input`, `P.ui-field-hint`, `P.ui-field-error`; `assert_layout(page, max_banner_px=300)` and `assert_accessible(page)` pass and the `watch_csp` list is `[]`
