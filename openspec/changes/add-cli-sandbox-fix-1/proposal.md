# Proposal: fix 1 for add-cli-sandbox

## Why
The verifier found problems in `add-cli-sandbox` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-2813828d (blocker): a pre-existing test fails on the unit's code: test.arch.repo.test.ts::C-c0da3179 C-9ded7e99 C-069f346e: the merged tree is clean (AssertionError: Expected values to be strictly deep-equal:)

## Impact
The code and the tests of `add-cli-sandbox`.
