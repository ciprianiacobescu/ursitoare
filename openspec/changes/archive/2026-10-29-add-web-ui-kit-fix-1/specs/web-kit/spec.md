# Spec Delta

## Purpose
The web kit gives every later screen the same accessible building blocks: design tokens and a theme that meet WCAG AA under the strict CSP, one message catalogue for API error codes, capability-filtered navigation, empty, loading and error states, a confirm dialog, toasts and an offline accessibility check for browser journeys.

## ADDED Requirements

### Requirement: The tokens and theme are CSS files that meet WCAG AA contrast — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Toast Dismiss button turns white-on-white on hover
- **WHEN** the pointer hovers the Dismiss button inside a toast
- **THEN** the button keeps a transparent or toast-background col
