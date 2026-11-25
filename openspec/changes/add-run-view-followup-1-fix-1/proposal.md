# Proposal: fix 1 for add-run-view-followup-1

## Why
Requested by CiprianSpot, 2026-11-25T13:35:33Z in FB-001 (behaviour, web/src/runs/RunPage.tsx:329-339, web/src/runs/runs.css:149-158): The Input and Output pre elements lost the wrapping rule when the payload section was rewritten: the rule still targets .runs-payload pre, which nothing uses any more, so the pre keeps white-space: pre and widens the page (1978 px at a 1280 px viewport with a judge 'reason' string; crypto smoke through the UI, 2026-11-25).

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

The verifier found problems in `add-run-view-followup-1` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-003479b0 (major): FB-001 not addressed: web/src/runs/RunPage.tsx:329-332 and web/src/runs/runs.css:149-158 changed...

## Impact
The code and the tests of `add-run-view-followup-1`.
