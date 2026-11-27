# Feedback — add-web-tool-trust

<!-- l4:feedback v1
Ask for changes here while the unit's branch is open. The easy way is `l4 feedback add` (see `l4 feedback --help`).
An item is read only when its **Status** is `submitted`; `draft` items wait and `withdrawn` items are ignored.
Kinds: refactor · duplication · tests · config · behaviour (see docs/feedback.md).
Do not change item IDs. Commit and push to the l4/… branch: the harness takes submitted items at its next
verification round, turns them into a fix unit and checks that each one was addressed. -->

<!-- l4:feedback-index:start -->
| ID | Status | Kind | Where | Feedback |
|----|--------|------|-------|----------|
| FB-001 | submitted | behaviour | web/src/tools/TrustControls.tsx:25 | Trust table controls shrink until their values cannot be read |
<!-- l4:feedback-index:end -->

---

## FB-001: Trust table controls shrink until their values cannot be read

- **Status:** submitted
- **Kind:** behaviour
- **Where:** `web/src/tools/TrustControls.tsx:25-45`
- **Where:** `web/src/tools/RegisterPage.tsx:272-283`
- **Lesson:** no
- **By:** CiprianSpot, 2026-11-27T14:32:52Z

### Code
`web/src/tools/TrustControls.tsx:25-45`
```
export function DataClassSelect(props: {
  name: string;
  value: DataClass | null;
  onChange: (value: DataClass | null) => void;
}): ReactNode {
  return (
    <select
      className="ui-input"
      aria-label={fillName(TRUST_NAMES["dataClassOf"] ?? "", props.name)}
      value={props.value ?? ""}
      onChange={(event) => {
        const value = event.target.value;
        props.onChange(value === "public" || value === "private" ? value : null);
      }}
    >
      <option value="">{TRUST_NAMES["notSet"] ?? ""}</option>
      <option value="public">public</option>
      <option value="private">private</option>
    </select>
  );
}
```
`web/src/tools/RegisterPage.tsx:272-283`
```
  const operationsTable =
    preview === null ? null : (
      <div className="overflow-x-auto">
        <table className="ui-table" aria-label={label("operations")}>
          <thead>
            <tr>
              <th scope="col">Operation</th>
              <th scope="col">Method</th>
              <th scope="col">Path</th>
              <th scope="col">Effect</th>
              <th scope="col">{TRUST_NAMES["trustColumn"] ?? "Result trusted"}</th>
              <th scope="col">{TRUST_NAMES["dataClassColumn"] ?? "Data class"}</th>
```

### Feedback
Seen on screenshots of the merged pages (e2e/test_m8_tool_trust.py and e2e/test_m8_tool_trust_review.py, run with a screenshot and a width measurement at each `checked(page)` state). At 1366x860 the Data class select in the Register page's operations table is 56 px wide: the form card is narrower than the table, the Effect select takes 176 px, and the last column gets the rest, so "Not set", "public" and "private" show as a sliver. The same select in Change registration (a full-width card) is wide enough to read. At 390x844 the operations table's Data class select is 39 px, and in Tool settings the Tool name input is 42 px, Effect 45 px and Data class 39 px: none of their values can be read. Give these controls a minimum width (for example `min-w-32`) and let the table scroll inside its `overflow-x-auto` box, as it already does; do not hide a column or change any label, name or value.

### When / Then
- **When:** the Register page's operations table is shown at 1366x860, or the operations table or the Tool settings table is shown at 390x844
- **Then:** every Effect select, Data class select and Tool name input in that table is at least 128 px wide, so its chosen value (Not set, public, private, Proposed, Skip, a tool name) reads in full; the table may scroll sideways inside its own box, and the page itself still has no horizontal scroll

### Outcome
<!-- written by the harness -->
