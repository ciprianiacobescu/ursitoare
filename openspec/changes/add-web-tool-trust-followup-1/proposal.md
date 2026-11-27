# Proposal: follow-up 1 for add-web-tool-trust

## Why
Requested by CiprianSpot, 2026-11-27T14:32:52Z in FB-001 (behaviour, web/src/tools/TrustControls.tsx:25-45, web/src/tools/RegisterPage.tsx:272-283): Seen on screenshots of the merged pages (e2e/test_m8_tool_trust.py and e2e/test_m8_tool_trust_review.py, run with a screenshot and a width measurement at each `checked(page)` state). At 1366x860 the Data class select in the Register page's operations table is 56 px wide: the form card is narrower than the table, the Effect select takes 176 px, and the last column gets the rest, so "Not set", "public" and "private" show as a sliver. The same select in Change registration (a full-width card) is wide enough to read. At 390x844 the operations table's Data class select is 39 px, and in Tool settings the Tool name input is 42 px, Effect 45 px and Data class 39 px: none of their values can be read. Give these controls a minimum width (for example `min-w-32`) and let the table scroll inside its `overflow-x-auto` box, as it already does; do not hide a column or change any label, name or value.

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

`add-web-tool-trust` was merged, and a person asked for the changes above in its `feedback.md`. This change carries them out; each task names the finding it answers.

## What Changes
- F-048a8f78: Feedback FB-001 (behaviour): Trust table controls shrink until their values cannot be read

## Impact
The code and the tests of `add-web-tool-trust`.
