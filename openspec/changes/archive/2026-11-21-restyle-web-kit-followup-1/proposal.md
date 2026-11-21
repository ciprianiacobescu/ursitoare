# Proposal: follow-up 1 for restyle-web-kit

## Why
Requested by CiprianSpot, 2026-11-21T11:33:33Z in FB-001 (behaviour, web/src/kit/theme.css:205-225, web/src/runs/RunPage.tsx:224-247): The kit's PageHeader renders meta in a div .ui-page-header-meta that has no CSS rule: theme.css:205-225 styles only the header grid, the title and the description. The grid places the meta div in the auto column beside the h1, and inline items there have no gap. On the run page (RunPage.tsx:224-247) the items run together and read "Flow demo-uiMode mockStarted by Alice ExampleStarted just nowDuration <1 s" (measured on main 36dd7cce at 1366: the items sit between x 611 and 1342 with 0 px between them); at 390 the h1 "Run run_1" is squeezed so narrow that its bottom is at 368 px. Wanted: the meta spans the whole header width below the title and the description, as a row that wraps, with a visible gap between items; actions stay at the top right. Tried on main 36dd7cce and reverted: .ui-page-header-meta { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: var(--ui-space-2) var(--ui-space-4); } plus .ui-page-header-meta > * { margin: 0; } plus .ui-page-header-actions { grid-column: 2; grid-row: 1; justify-self: end; }. With it, at 1366 the items start at the h1's left edge below it with 24 px gaps, and at 390 they wrap with no sideways scroll. All 118 e2...

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

`restyle-web-kit` was merged, and a person asked for the changes above in its `feedback.md`. This change carries them out; each task names the finding it answers.

## What Changes
- F-26464f57: Feedback FB-001 (behaviour): Page header meta: a wrapping row below the title, with gaps between...

## Impact
The code and the tests of `restyle-web-kit`.
