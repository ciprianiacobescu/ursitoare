# Proposal: fix 1 for add-web-ref-carry

## Why
The verifier found problems in `add-web-ref-carry` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-6eb0cc43 (major): an inline suppression was not declared: e2e/test_m8_ref_carry.py:187 # type: ignore. Remove each comment by fixing what it hides; declare one only if it cannot be removed

## Impact
The code and the tests of `add-web-ref-carry`.
