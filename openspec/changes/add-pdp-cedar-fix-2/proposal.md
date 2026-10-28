# Proposal: fix 2 for add-pdp-cedar

## Why
The verifier found problems in `add-pdp-cedar` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-2fc9e5f3 (major): M8 malformed-policy test does not use design.md's M8 text: Decided by delegate in Q-004: The finding is correct and stands. design.md § Test plan defines M8 as permit (principal, action == Action::"reed", resource);, an unknown action in the action scope, and the scenario "Each malformed policy is refused" says each of M1 to M8 of design.md is loaded as the only policy of source m-src and rejected with PDP_POLICY_INVALID, stage validate and ids ("bad"). The M8 entry of the malformed-policy test instead loads @id("bad") permit (principal, action == Action::"read", resource == Action::"reed");, which keeps the declared action read and puts an action entity in the resource slot. That is a different validation fault, so the unknown-action case the design names is never exercised, and the later add-policy-catalogue change relies on exactly that case being refused at stage validate with the policy id. The fix is to replace the M8 text with the design's text; the other entries M1 to M7 already match design.md word for word. WHEN the only policy of source m-src is @id("bad") permi. design.md § Test plan defines M8 as `permit (principal, action == Action::"re...

## Impact
The code and the tests of `add-pdp-cedar`.
