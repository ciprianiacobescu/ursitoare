# Proposal: follow-up 1 for add-architecture-fitness

## Why
Requested by CiprianSpot, 2026-10-26T21:02:17Z in FB-001 (refactor, test/arch/rules.ts:1-20): Waived in Q-007, Q-008 and Q-011 until this unit was on main. test/arch/rules.ts declares its own literal MODULES (lines 17 to 176) and uses it as the default of checkGraphIntegrity, checkModuleGraph, checkNetwork and checkAll, while test/arch/modules.ts holds the same graph, so an edit to modules.ts changes nothing the rules check. Import MODULES from ./modules.ts in rules.ts and use that object as the default, delete the literal from rules.ts, and delete the stale first line that calls the file a signature stub. No test imports MODULES from rules.ts. Behaviour and tests stay as they are; test/arch/modules.ts is not changed.

    // Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
    import ts from "typescript";

    import type { Egress, ModuleRule, Snapshot, SourceFile, Violation } from "./sources.ts";
    import { collectImports, isTestFile, resolveSpecifier, sortViolations } from "./sources.ts";

    const GRAPH_FILE = "test/arch/modules.ts";

    const EGRESS_VALUES: readonly Egress[] = ["tools", "oidc", "otlp"];

    const PINNED_EGRESS: Record<string, Egress> = {
      observability: "otlp",
      identity: "oidc",
      gateway: "tools",
    };

    export const MODULES: Record<string, ModuleRule> = {
      core: { allowed: [] },
      config: { allowed: ["core"] },
      observability: { allowed: ["core", "config"], egress: "otlp" },

Requested by CiprianSpot, 2026-10-26T21:02:26Z in FB-002 (behaviour, test/arch/secrets.ts:68-74): Waived in Q-012 for this unit. fix 2 made listScannableFiles skip every .l4 path so that harness evidence (a judge verdict quoting a private-key header) no longer fails the repository test. Only the .l4 folders under openspec/changes hold harness-written evidence and ledgers. The repository's own .l4/config.yaml and .l4/plans are owner files and must be scanned like every other tracked file.

    function isHarnessPath(relativePath: string): boolean {
      return (
        relativePath === ".l4" ||
        relativePath.startsWith(".l4/") ||
        relativePath.includes("/.l4/")
      );
    }

`add-architecture-fitness` was merged, and a person asked for the changes above in its `feedback.md`. This change carries them out; each task names the finding it answers.

## What Changes
- F-2c8576cb: Feedback FB-001 (refactor): rules.ts reads the graph from test/arch/modules.ts
- F-41752109: Feedback FB-002 (behaviour): The secret scan skips harness folders only, not the owner's .l4 files

## Impact
The code and the tests of `add-architecture-fitness`.
