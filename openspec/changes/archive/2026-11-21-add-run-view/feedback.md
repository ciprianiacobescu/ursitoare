# Feedback — add-run-view

<!-- l4:feedback v1
Ask for changes here while the unit's branch is open. The easy way is `l4 feedback add` (see `l4 feedback --help`).
An item is read only when its **Status** is `submitted`; `draft` items wait and `withdrawn` items are ignored.
Kinds: refactor · duplication · tests · config · behaviour (see docs/feedback.md).
Do not change item IDs. Commit and push to the l4/… branch: the harness takes submitted items at its next
verification round, turns them into a fix unit and checks that each one was addressed. -->

<!-- l4:feedback-index:start -->
| ID | Status | Kind | Where | Feedback |
|----|--------|------|-------|----------|
| FB-001 | addressed | behaviour | web/src/runs/RunPage.tsx:329 | Run page scrolls sideways when a step's input or output has a long line |
<!-- l4:feedback-index:end -->

---

## FB-001: Run page scrolls sideways when a step's input or output has a long line

- **Status:** addressed
- **Kind:** behaviour
- **Where:** `web/src/runs/RunPage.tsx:329-339`
- **Where:** `web/src/runs/runs.css:149-158`
- **Lesson:** no
- **By:** CiprianSpot, 2026-11-25T13:35:33Z

### Code
`web/src/runs/RunPage.tsx:329-339`
```
                  <Section title="Input" headingLevel={3} className="runs-flat">
                    <pre>
                      {payloadShown(selectedStep.inputRef, loads.get(selectedStep.inputRef ?? ""))}
                    </pre>
                  </Section>
                  <Section title="Output" headingLevel={3} className="runs-flat">
                    <pre>
                      {payloadShown(selectedStep.outputRef, loads.get(selectedStep.outputRef ?? ""))}
                    </pre>
                  </Section>
                </>
```
`web/src/runs/runs.css:149-158`
```
.runs-payload pre {
  margin: 0;
  padding: var(--ui-space-2);
  border: 1px solid var(--ui-color-border);
  border-radius: var(--ui-radius);
  background: var(--ui-color-surface);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: var(--ui-font-mono);
}
```

### Feedback
The Input and Output pre elements lost the wrapping rule when the payload section was rewritten: the rule still targets .runs-payload pre, which nothing uses any more, so the pre keeps white-space: pre and widens the page (1978 px at a 1280 px viewport with a judge 'reason' string; crypto smoke through the UI, 2026-11-25).

### When / Then
- **When:** the Step details of a run show an Input or Output whose JSON holds a line longer than the column, such as a long string value
- **Then:** the text wraps inside the Step details column and the page does not scroll sideways at 1280 px and at 375 px wide (the document's scrollWidth equals its clientWidth)

### Outcome
<!-- written by the harness -->
Addressed in round 3 at 563cf61804: web/src/runs/RunPage.tsx:330; web/src/runs/runs.css:149
