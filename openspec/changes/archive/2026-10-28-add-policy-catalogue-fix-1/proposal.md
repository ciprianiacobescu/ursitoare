# Proposal: fix 1 for add-policy-catalogue

## Why
The verifier found problems in `add-policy-catalogue` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-e12398b4 (major): An unreadable or non-directory policy directory is skipped silently: Decided by delegate in Q-001: The finding is correct and the specification does not allow the behaviour. In loadPolicyFragments the readdir of each module's policy directory is wrapped in a try/catch whose only action is continue, so every error is treated like a missing directory: a policy directory that exists but cannot be read, or a policy entry that is a regular file, drops all of that module's fragments and the engine loads without them. The requirement "Policy fragments are loaded from module directories" says the loader SHALL refuse a directory or file it cannot use rather than skip it, design decision 6 refuses unusable entries because a forbid must never be skipped silently, and the failure cases say a bad srcDir or fragment file makes createPolicyEngine reject with nothing half-loaded. A module whose forbids live in a policy directory the process cannot read is exactly the case these sentences guard against. Only a policy path that does not exist at all may be skipped, because the "Nothing to load" scena. loadPolicyFragments wraps readdir of <module>/policy in try/catch and does `c...

## Impact
The code and the tests of `add-policy-catalogue`.
