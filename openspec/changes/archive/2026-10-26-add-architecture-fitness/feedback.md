# Feedback — add-architecture-fitness

<!-- l4:feedback v1
Ask for changes here while the unit's branch is open. The easy way is `l4 feedback add` (see `l4 feedback --help`).
An item is read only when its **Status** is `submitted`; `draft` items wait and `withdrawn` items are ignored.
Kinds: refactor · duplication · tests · config · behaviour (see docs/feedback.md).
Do not change item IDs. Commit and push to the l4/… branch: the harness takes submitted items at its next
verification round, turns them into a fix unit and checks that each one was addressed. -->

<!-- l4:feedback-index:start -->
| ID | Status | Kind | Where | Feedback |
|----|--------|------|-------|----------|
| FB-001 | taken | refactor | test/arch/rules.ts:1 | rules.ts reads the graph from test/arch/modules.ts |
| FB-002 | taken | behaviour | test/arch/secrets.ts:68 | The secret scan skips harness folders only, not the owner's .l4 files |
<!-- l4:feedback-index:end -->

---

## FB-001: rules.ts reads the graph from test/arch/modules.ts

- **Status:** taken
- **Kind:** refactor
- **Where:** `test/arch/rules.ts:1-20`
- **Lesson:** no
- **By:** CiprianSpot, 2026-10-26T21:02:17Z

### Code
```typescript
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
```

### Feedback
Waived in Q-007, Q-008 and Q-011 until this unit was on main. test/arch/rules.ts declares its own literal MODULES (lines 17 to 176) and uses it as the default of checkGraphIntegrity, checkModuleGraph, checkNetwork and checkAll, while test/arch/modules.ts holds the same graph, so an edit to modules.ts changes nothing the rules check. Import MODULES from ./modules.ts in rules.ts and use that object as the default, delete the literal from rules.ts, and delete the stale first line that calls the file a signature stub. No test imports MODULES from rules.ts. Behaviour and tests stay as they are; test/arch/modules.ts is not changed.

### Outcome
<!-- written by the harness -->
Taken into add-architecture-fitness-followup-1

---

## FB-002: The secret scan skips harness folders only, not the owner's .l4 files

- **Status:** taken
- **Kind:** behaviour
- **Where:** `test/arch/secrets.ts:68-74`
- **Lesson:** no
- **By:** CiprianSpot, 2026-10-26T21:02:26Z

### Code
```typescript
function isHarnessPath(relativePath: string): boolean {
  return (
    relativePath === ".l4" ||
    relativePath.startsWith(".l4/") ||
    relativePath.includes("/.l4/")
  );
}
```

### Feedback
Waived in Q-012 for this unit. fix 2 made listScannableFiles skip every .l4 path so that harness evidence (a judge verdict quoting a private-key header) no longer fails the repository test. Only the .l4 folders under openspec/changes hold harness-written evidence and ledgers. The repository's own .l4/config.yaml and .l4/plans are owner files and must be scanned like every other tracked file.

### When / Then
- **When:** scanRepository runs on a temp git repository whose tracked files .l4/config.yaml, .l4/plans/p1.json, openspec/changes/x/.l4/evidence/round-1/verdict.json and openspec/changes/archive/2026-10-26-x/.l4/ledger/r.jsonl each hold one secret-looking line built at run time
- **Then:** it returns exactly one ARCH_SECRET for .l4/config.yaml and one for .l4/plans/p1.json, and none for the two files under openspec/changes

### Outcome
<!-- written by the harness -->
Taken into add-architecture-fitness-followup-1
