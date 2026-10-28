# Proposal: fix 1 for add-pdp-cedar

## Why
The verifier found problems in `add-pdp-cedar` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-5a5184d6 (major): check rejects when a getter inside principal, resource, an entity or egress throws: Decided by delegate in Q-002: The finding is correct and stands. In guardRequest only the five top-level reads of req sit inside the try; the validators isUid, isEntity, isPlainObject and validateEgress then read principal.type, principal.id, each entity's uid, attrs and parents, and egress.method and the other five egress fields outside any try. runCheck calls guardRequest before its own try, and createPdp's check returns runCheck directly with no further guard, so a getter that throws on any of those nested properties propagates out of check as a rejection. The requirement "A check denies on any error" says check SHALL reject only when the injected IdSource or Clock throws, and design.md repeats that only a throwing IdSource or Clock makes check reject and that a request with a getter that throws anything is a denied request that is still recorded. The double read is also real: after the guard passes, runCheck reads req.principal, req.action, req.resource, req.context and req.entities again for Cedar, and allowPe. In guardRequest, only the top-level property reads of req sit inside a try. i...

## Impact
The code and the tests of `add-pdp-cedar`.
