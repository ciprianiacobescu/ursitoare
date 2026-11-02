// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export const RUN_PAGES: readonly {
  id: string;
  file: string;
  path: string;
  navLabel: string | null;
  capability: string | null;
}[] = [];

export const TEST_RUN_PANEL: { id: string; title: string } = { id: "", title: "" };

export const RUNS_TITLE: string = "";

export function runTitle(_runId: string): string {
  throw new Error("not implemented");
}

export function runPath(_runId: string): string {
  throw new Error("not implemented");
}

export function runLinkName(_runId: string): string {
  throw new Error("not implemented");
}
