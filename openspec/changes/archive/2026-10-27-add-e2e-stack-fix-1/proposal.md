# Proposal: fix 1 for add-e2e-stack

## Why
The verifier found problems in `add-e2e-stack` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-5758ac1b (blocker): a skip or xfail marker was added: e2e/test_e2e_stack.py::_require_fake_profile, e2e/test_e2e_stack.py::injected_fault

## Impact
The code and the tests of `add-e2e-stack`.
