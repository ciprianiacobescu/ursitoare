import { useEffect, useMemo, type ReactNode } from "react";
import { Link } from "react-router";

import { browserSession } from "../auth/browser-session.ts";
import { DataTable } from "../kit/data/DataTable.tsx";
import { createCursorList } from "../kit/data/cursor-list.ts";
import { RUNS_TITLE, runLinkName, runPath } from "./pages.ts";
import { runListFetcher } from "./runs-source.ts";
import type { RunView } from "./types.ts";
import "./runs.css";

const RUN_COLUMNS = [
  { key: "run", header: "Run", rowHeader: true },
  { key: "flow", header: "Flow" },
  { key: "mode", header: "Mode" },
  { key: "state", header: "State" },
  { key: "created", header: "Created (UTC)" },
] as const;

export function RunsPage(): ReactNode {
  const list = useMemo(() => createCursorList(runListFetcher(browserSession.api)), []);

  useEffect(() => {
    const previous = document.title;
    document.title = RUNS_TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

  const columns = RUN_COLUMNS.map((column) => ({
    ...column,
    cell: (row: RunView): ReactNode => {
      switch (column.key) {
        case "run":
          return <Link to={runPath(row.id)}>{runLinkName(row.id)}</Link>;
        case "flow":
          return row.flowId;
        case "mode":
          return row.mode;
        case "state":
          return row.state;
        case "created":
          return row.createdAt;
        default:
          return null;
      }
    },
  }));

  return (
    <div className="runs-page">
      <h1>Runs</h1>
      <DataTable
        caption="Runs"
        columns={columns}
        list={list}
        rowKey={(row) => row.id}
        emptyTitle="No runs yet"
      />
    </div>
  );
}
