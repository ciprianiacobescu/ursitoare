# Proposal: fix 1 for add-web-ui-kit

## Why
The verifier found problems in `add-web-ui-kit` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-4e8c6585 (major): Toast Dismiss button turns white-on-white on hover: Decided by delegate in Q-004: The finding is correct. The Dismiss button in ToastRegion carries the class ui-button, and theme.css gives .ui-button:hover (specificity 0,2,0) a background of var(--ui-color-bg), which tokens.css sets to #ffffff. The rule .ui-toast button (specificity 0,1,1) sets the colour to var(--ui-color-toast-text), also #ffffff, and its transparent background loses to the hover rule. So while the pointer hovers the Dismiss button of a toast, its label is white on white, which contradicts the requirement that the theme meets WCAG AA contrast and defeats the toast-text-on-toast-bg pair of design decision 3. axe does not evaluate hover states, so no gate catches it, and this is a real accessibility defect that a user of the toast will meet on every dismissal. The fix belongs in theme.css only, with colours still taken from var(--ui-color-*) tokens so that findRawColours stays empty. WHEN the pointer hovers the Dismiss button inside a toast THEN the button keeps a transparent or toast-background col. The Dismiss button in ToastRegion carries class ui-button. On hover, `.ui-but...

## Impact
The code and the tests of `add-web-ui-kit`.
