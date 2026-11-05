export interface RunPageSpec {
  id: string;
  file: string;
  path: string;
  navLabel: string | null;
  capability: string | null;
}

const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export const RUN_PAGES: readonly RunPageSpec[] = [
  {
    id: "runs",
    file: "80-runs.tsx",
    path: "/runs",
    navLabel: "Runs",
    capability: "read_run",
  },
  {
    id: "run",
    file: "81-run.tsx",
    path: "/runs/:runId",
    navLabel: null,
    capability: null,
  },
];

export const TEST_RUN_PANEL: { id: string; title: string } = {
  id: "test-run",
  title: "Test run",
};

export const RUNS_TITLE = "Runs · Ursitoare";

export function runTitle(runId: string): string {
  return `Run ${runId} · Ursitoare`;
}

export function runPath(runId: string): string {
  if (typeof runId !== "string" || !RUN_ID_PATTERN.test(runId)) {
    throw new RangeError("runId must match ^[A-Za-z0-9_-]{1,128}$");
  }
  return `/runs/${runId}`;
}

export function runLinkName(runId: string): string {
  return `Open run ${runId}`;
}
