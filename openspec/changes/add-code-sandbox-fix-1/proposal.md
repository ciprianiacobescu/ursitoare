# Proposal: fix 1 for add-code-sandbox

## Why
The verifier found problems in `add-code-sandbox` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-7e9a81fb (blocker): new tests failed: src.sandbox.limits-run.test.ts::C-990d6a3c: stack bodies end in a typed fault and the pool keeps working

## Impact
The code and the tests of `add-code-sandbox`.
