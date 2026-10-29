# Spec Delta

## Purpose
The web kit gives every later screen the same accessible building blocks: design tokens and a theme that meet WCAG AA under the strict CSP, one message catalogue for API error codes, capability-filtered navigation, empty, loading and error states, a confirm dialog, toasts and an offline accessibility check for browser journeys.

## ADDED Requirements

### Requirement: The tokens and theme are CSS files that meet WCAG AA contrast — regression 2
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Focus outline on the toast Dismiss button is below 3:1 against the toast background
- **WHEN** the Dismiss button inside a toast has keyboard focus
- **THEN** its focus outline colour has a contrast of at least 3:1 against --ui-color-toast-bg.
