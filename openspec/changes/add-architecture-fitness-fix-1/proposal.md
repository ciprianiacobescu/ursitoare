# Proposal: fix 1 for add-architecture-fitness

## Why
The verifier found problems in `add-architecture-fitness` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-35492b20 (blocker): a pre-existing test no longer runs on the unit's code: test/arch/repo.test.ts: Error (ERR_MODULE_NOT_FOUND): Cannot find module '/home/runner/.cache/l4/worktrees/ursitoare-302fad6a21/openspec/add-architecture-fitness/test/arch/modules.ts' imported from /home/runner/.cache/l4/worktrees/ursitoare-302fad6a21/openspec/add-architecture-fitness/test/arch/rules.ts

## Impact
The code and the tests of `add-architecture-fitness`.
