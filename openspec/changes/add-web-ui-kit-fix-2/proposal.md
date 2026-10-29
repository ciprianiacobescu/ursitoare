# Proposal: fix 2 for add-web-ui-kit

## Why
The verifier found problems in `add-web-ui-kit` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-448496f9 (major): Focus outline on the toast Dismiss button is below 3:1 against the toast background: Decided by agent in Q-033: The finding is correct and is a WCAG AA defect: the global :focus-visible outline uses --ui-color-focus #1d4ed8, and inside a toast it is drawn (2px offset) over --ui-color-toast-bg #1b1f27, a contrast of 2.46:1, below the 3:1 the requirement sets for focus (and WCAG 1.4.11 for focus indicators); theme.css has no rule that changes the outline inside a toast. Keep CONTRAST_PAIRS at its 16 pairs, which a frozen scenario pins; fix it in theme.css with an outline colour for focus inside a toast that has at least 3:1 against the toast background, for example --ui-color-toast-text (#ffffff, 16.5:1), with no new token. WHEN the Dismiss button inside a toast has keyboard focus THEN its focus outline colour has a contrast of at least 3:1 against --ui-color-toast-bg.. The global :focus-visible rule draws a var(--ui-color-focus) outline (#1d4ed8...

## Impact
The code and the tests of `add-web-ui-kit`.
