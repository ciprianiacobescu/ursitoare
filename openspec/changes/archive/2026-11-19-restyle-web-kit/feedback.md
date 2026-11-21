# Feedback — restyle-web-kit

<!-- l4:feedback v1
Ask for changes here while the unit's branch is open. The easy way is `l4 feedback add` (see `l4 feedback --help`).
An item is read only when its **Status** is `submitted`; `draft` items wait and `withdrawn` items are ignored.
Kinds: refactor · duplication · tests · config · behaviour (see docs/feedback.md).
Do not change item IDs. Commit and push to the l4/… branch: the harness takes submitted items at its next
verification round, turns them into a fix unit and checks that each one was addressed. -->

<!-- l4:feedback-index:start -->
| ID | Status | Kind | Where | Feedback |
|----|--------|------|-------|----------|
| FB-001 | submitted | behaviour | web/src/kit/theme.css:205 | Page header meta: a wrapping row below the title, with gaps between items |
<!-- l4:feedback-index:end -->

---

## FB-001: Page header meta: a wrapping row below the title, with gaps between items

- **Status:** submitted
- **Kind:** behaviour
- **Where:** `web/src/kit/theme.css:205-225`
- **Where:** `web/src/runs/RunPage.tsx:224-247`
- **Lesson:** no
- **By:** CiprianSpot, 2026-11-21T11:33:33Z

### Code
`web/src/kit/theme.css:205-225`
```
.ui-page-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--ui-space-2) var(--ui-space-4);
  align-items: start;
  margin-bottom: var(--ui-space-4);
}

.ui-page-header-title {
  grid-column: 1;
  margin: 0;
  overflow-wrap: anywhere;
}

.ui-page-header-description {
  grid-column: 1;
  margin: 0;
  color: var(--ui-color-text-muted);
  overflow-wrap: anywhere;
}
```
`web/src/runs/RunPage.tsx:224-247`
```
          <PageHeader
            title={`Run ${runId}`}
            meta={
              <>
                <p role="status" aria-label="Run state" data-tone={header.tone} className="runs-state">
                  {header.stateText}
                </p>
                <span className="runs-meta-item">
                  Flow <Link to={`/flows/${header.flowId}`}>{header.flowId}</Link>
                </span>
                <span className="runs-meta-item">{`Mode ${header.mode}`}</span>
                <span className="runs-meta-item">
                  Started by <span title={snapshot.run.principal.userId}>{header.startedBy}</span>
                </span>
                <span className="runs-meta-item">
                  <Tooltip content={header.started}>
                    <time dateTime={header.startedIso} tabIndex={0}>
                      {`Started ${formatAgo(header.startedIso, nowMs)}`}
                    </time>
                  </Tooltip>
                </span>
                <span className="runs-meta-item">{`Duration ${header.duration}`}</span>
              </>
            }
```

### Feedback
The kit's PageHeader renders meta in a div .ui-page-header-meta that has no CSS rule: theme.css:205-225 styles only the header grid, the title and the description. The grid places the meta div in the auto column beside the h1, and inline items there have no gap. On the run page (RunPage.tsx:224-247) the items run together and read "Flow demo-uiMode mockStarted by Alice ExampleStarted just nowDuration <1 s" (measured on main 36dd7cce at 1366: the items sit between x 611 and 1342 with 0 px between them); at 390 the h1 "Run run_1" is squeezed so narrow that its bottom is at 368 px. Wanted: the meta spans the whole header width below the title and the description, as a row that wraps, with a visible gap between items; actions stay at the top right. Tried on main 36dd7cce and reverted: .ui-page-header-meta { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: var(--ui-space-2) var(--ui-space-4); } plus .ui-page-header-meta > * { margin: 0; } plus .ui-page-header-actions { grid-column: 2; grid-row: 1; justify-self: end; }. With it, at 1366 the items start at the h1's left edge below it with 24 px gaps, and at 390 they wrap with no sideways scroll. All 118 e2e tests and the 17 Node tests that read theme.css still pass, and the Home, Flow and Policies headers (the other users of meta) still read well. Keep every existing test as it is.

### When / Then
- **When:** a person opens the run page of a completed run, mocked as e2e/test_m6b_run_view.py mocks it, at 1366 by 860 and again at 390 by 860
- **Then:** the status "Run state" and the five items Flow, Mode, Started by, Started and Duration of the header's meta each start at or below the bottom edge of the h1 "Run run_1"; the first starts within 1 px of the h1's left edge; any two of them whose tops are within 4 px are at least 8 px apart horizontally; the h1 is on one line (its height is less than twice its font size); assert_layout passes at both widths

### Outcome
<!-- written by the harness -->
