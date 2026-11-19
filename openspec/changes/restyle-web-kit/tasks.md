Paths without a directory are in `web/src/kit/` (`data/` and `layout/` files in their subdirectories). Each task is one red-green cycle: the test comes first and fails by assertion on the stubs or the unedited file, then the edit makes it pass. No task adds a token, package, role, text or stylesheet import.

## 1. theme.css

- [x] 1.1 Write `theme-restyle.test.ts` (scenario "Tone, dialog, state and toast rules are token-only and the toast is unchanged", test-plan.md T1 rows R1 to R20 (R18b and R18c included) and the checker mutations) first, then edit `theme.css`: `.ui-button` gains `font-weight: 500` and the `[aria-disabled="true"]` selector beside `:disabled`; add the primary and danger tone rules, their hover rules and the toned-disabled rule after the disabled rule; restyle `.ui-empty`, `.ui-loading`, `.ui-error`, `.ui-dialog`, `.ui-toast` and `.ui-toast button` as in R8 to R17 (the toast hover and focus rules are not touched); add `.ui-page-header*` and `.ui-section*` rules (R18, R19); keep `.ui-visually-hidden`. Rules are flat and token-only, implementing requirement "Kit buttons, dialogs, states and toasts are styled by token-only rules in theme.css". `contrast.test.ts`, `toast-focus.test.ts`, `toast-hover.test.ts` and `keyboard.test.ts` stay green unchanged

## 2. data.css

- [x] 2.1 Write `data/data-restyle.test.ts` (scenario "data.css keeps every pinned rule and adds the new declarations", test-plan.md T1b rows D1 to D16) first, then edit `data/data.css`: change the declarations inside the existing rules (never a second rule for a pinned selector, never `@media`) and add `.ui-table-caption`, `.ui-table tbody tr:hover` and `.ui-table tbody tr:last-child > *` (no line under the last row), implementing requirement "data.css makes tables cards and bounds fields without breaking a pinned rule". `data/data-css.test.ts` stays green unchanged

## 3. Captions

- [x] 3.1 Write `data/caption-class.test.ts` (scenario "captionClass and the DataTable wiring", test-plan.md T4; it imports `captionClass` from `data/data-table.ts`) first, then implement `captionClass` in `data/data-table.ts`, add the optional `captionDisplay` to `DataTableProps` and write `captionClass(props.captionDisplay)` on the `<caption>` in `data/DataTable.tsx` (U15c has already deleted that file's stylesheet import line), implementing requirement "A table caption can be hidden and still names the table". `data/data-table.test.ts` stays green unchanged

## 4. Fields and forms

- [x] 4.1 Write `data/field-order.test.ts` (scenario "The field order, the hidden prefix and the form tone in the sources", T5) first, then reorder the stacked `Field` in `data/Field.tsx` to label, control, described (the inline block and the "Error: " span are untouched) and add `data-tone="primary"` to the submit button in `data/Form.tsx`, implementing requirement "Field puts the control before its hint and error, and Form's submit is the accent tone". `data/field.test.ts` and `data/form.test.ts` stay green unchanged

## 5. Dialog and the pinned markup

- [x] 5.1 Write `kit-markup.test.ts` (scenario "Kit sources keep their roles, texts and order", test-plan.md T2) first, then add `data-tone={props.destructive === true ? "danger" : "primary"}` to the confirm button in `ConfirmDialog.tsx`; `EmptyState.tsx`, `ErrorPanel.tsx`, `LoadingState.tsx` and `ToastRegion.tsx` are not edited, implementing requirement "The pinned kit markup is unchanged and a tone is only an attribute". `kit-markup.test.ts` is one test function: the needles of the four untouched files and the absences hold at red, the `ConfirmDialog` `data-tone` needle fails, so it fails at red

## 6. Layout

- [ ] 6.1 Write `layout/layout.test.ts` (scenario "sectionHeadingId, captionDisplayFor and PAGE_WIDTHS", test-plan.md T3; it imports from `layout/layout.ts`) and `layout/layout-sources.test.ts` (scenario "The layout sources hold no landmark, role, link or inline style", T2) and, in the same task, `e2e/test_m6b_kit.py` (the three tests of test-plan-browser.md, scenarios "The Disable dialog is centred, toned and returns focus", "A table is a card with a header row and a hover row" and "The Flows form is bounded, toned and keeps its prefix and focus ring"; `page` and `base_url` only; L4 refuses a red step that adds no Node test, a red step cannot run `e2e/`, their criteria stay out of `criteria_ids` and the verifier checks them) first, then implement `sectionHeadingId`, `captionDisplayFor` and `PAGE_WIDTHS` in `layout/layout.ts`, `PageHeader` in `layout/PageHeader.tsx` and `Section` in `layout/Section.tsx` (it imports `cn` from `../../ui/cn.ts`), implementing requirement "Layout helpers are fixed strings and PageHeader and Section are plain wrappers". No `kit/*.tsx` direct child is added, so `keyboard.test.ts` and `data/data-keyboard.test.ts` stay green unchanged
