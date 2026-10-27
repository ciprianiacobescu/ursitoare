# Proposal: fix 3 for add-e2e-stack

## Why
The verifier found problems in `add-e2e-stack` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-7e9a81fb (blocker): new tests failed: test.support.e2e-stack.main.test.ts::C-23b4de23 the process starts on the default ports 39080 and 39081

## Impact
The code and the tests of `add-e2e-stack`.
