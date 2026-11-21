Values: `test-plan.md`; steps: `test-plan-browser.md`. No `src/`, API or migration change. Each task writes its tests first (red), then the code (green), and runs `pnpm run test <path>`. Each Node test begins with `assert.equal(typeof <function>, "function")` for the names it imports from `./review.ts` (the file its Interfaces header names), wraps a call that reaches a stub in `assert.doesNotThrow` (`assert.doesNotReject` for a promise), uses `node:assert/strict`, records every argument in its fakes and has no `.`, `[` or `::` in its name.

## 1. Reading a surface

- [ ] 1.1 Write `web/src/tools/review.test.ts` (scenario "Call texts, hints and flags are read from a surface and a malformed one is refused"; rows R1 to R3, C1, C2) first, then implement `parseReviewTools`, `callRows` and `readNote` in `web/src/tools/review.ts`; every other name of `review.ts` stays a scaffold stub (the diff is task 1.2, discovery tasks 2.1 and 2.2, `REVIEW_NAMES` task 3.1)
- [ ] 1.2 Write `web/src/tools/review-diff.test.ts` (scenario "The diff names added, removed and changed tools and the fields that changed") first (the rows only this task adds: D1 to D9 and the `changeText` and `changesView` rows V1 to V13), then implement `surfaceDiff`, `changeText` and `changesView`, leaving the discovery names to 2.1 and 2.2

## 2. Discovery

- [ ] 2.1 Write `web/src/tools/review-discover.test.ts` (scenario "Settings become the body and a discovery is worded with every tool left out") first (rows I1, I2, B1, B2, P1, P2, X1 to X6), then implement `initialDraft`, `discoverBody`, `parseDiscovery` and `discoveryText`, leaving `discoverTools`, `loadServerReview`, `discoveryErrorText` and `collidingNames` to 2.2
- [ ] 2.2 Write `web/src/tools/review-calls.test.ts` (scenario "The calls use their routes and each refusal has its text"; `registerToolMessages()` first; the rows only this task adds: K1 to K3 and E1 to E9, which need the four functions) first, then implement `discoverTools`, `loadServerReview`, `discoveryErrorText` and `collidingNames`

## 3. The page

- [ ] 3.1 Write `web/src/tools/review-pages.test.ts` (scenario "The review names are fixed and the page reads as the rules say"; it reads `ServersPage.tsx`, `ReviewSections.tsx`, `review.ts` and `messages.ts` with `readFileSync`, as `pages.test.ts` does) first, and `e2e/test_m7_tool_review.py` in the same task (a red step cannot run `e2e/`: two tests, test-plan-browser.md § Review 1 and § Review 2, proving the scenarios "An MCP server is discovered, given a setting and discovered again" and "The Changes list and the Calls table of a drifted server"; their criteria stay out of `criteria_ids`), then fill the values of `REVIEW_NAMES`, create `web/src/tools/ReviewSections.tsx` and edit `web/src/tools/ServersPage.tsx` (design 1, 2 and § Roles and names); `pages.test.ts`, `states.test.ts`, `servers.test.ts` and `approve.test.ts` stay green
