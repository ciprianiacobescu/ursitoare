// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

import { EmptyState } from "../EmptyState.tsx";
import { ErrorPanel } from "../ErrorPanel.tsx";
import { LoadingState } from "../LoadingState.tsx";
import type { CursorList, CursorListState } from "./cursor-list.ts";
import { dataTableModel, focusAfterChange, tableView } from "./data-table.ts";
import type { DataColumn, DataTableSpec } from "./data-table.ts";
import "./data.css";

export interface DataTableProps<T> extends DataTableSpec {
  columns: readonly (DataColumn & { cell: (row: T) => ReactNode })[];
  list: CursorList<T>;
  rowKey: (row: T) => string;
}

export function DataTable<T>(props: DataTableProps<T>): ReactNode {
  const model = dataTableModel(props);
  const state = useSyncExternalStore(props.list.subscribe, props.list.getState);
  const view = tableView(state);

  const regionRef = useRef<HTMLDivElement | null>(null);
  const retryRef = useRef<HTMLButtonElement | null>(null);
  const previousState = useRef<CursorListState<T> | null>(null);

  useEffect(() => {
    if (!view.load) return undefined;
    void props.list.load();
    return undefined;
  }, [view.load, props.list]);

  useEffect(() => {
    const before = previousState.current;
    previousState.current = state;
    if (before === null) return undefined;
    const target = focusAfterChange(before, state);
    if (target === "table") {
      regionRef.current?.focus();
    } else if (target === "retry") {
      retryRef.current?.focus();
    }
    return undefined;
  }, [state]);

  let body: ReactNode = null;
  if (view.body === "loading") {
    body = <LoadingState label={model.loadingLabel} />;
  } else if (view.body === "empty") {
    body = (
      <EmptyState
        title={model.emptyTitle}
        {...(model.emptyDescription === null ? {} : { description: model.emptyDescription })}
      />
    );
  } else if (view.body === "rows") {
    body = (
      <div className="ui-table-wrap" role="region" aria-label={model.caption} tabIndex={0}>
        <table className="ui-table">
          <caption>{model.caption}</caption>
          <thead>
            <tr>
              {model.columns.map((column) => (
                <th key={column.key} scope="col">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.items.map((row) => (
              <tr key={props.rowKey(row)}>
                {model.columns.map((column) => {
                  const cell = props.columns.find((spec) => spec.key === column.key);
                  const content = cell === undefined ? null : cell.cell(row);
                  return column.cellTag === "th" ? (
                    <th key={column.key} scope="row">
                      {content}
                    </th>
                  ) : (
                    <td key={column.key}>{content}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const actions: ReactNode[] = [];
  if (view.loadMore !== "hidden") {
    actions.push(
      <button
        type="button"
        className="ui-button"
        aria-disabled={view.loadMore === "busy" ? true : undefined}
        onClick={() => {
          if (view.loadMore === "busy") return;
          void props.list.loadMore();
        }}
      >
        {view.loadMoreLabel}
      </button>,
    );
  }
  if (view.retryLabel !== null) {
    actions.push(
      <button
        type="button"
        ref={retryRef}
        className="ui-button"
        key="retry"
        onClick={() => void props.list.retry()}
      >
        {view.retryLabel}
      </button>,
    );
  }

  return (
    <div
      ref={regionRef}
      className="ui-table-region"
      role="group"
      aria-label={model.caption}
      tabIndex={-1}
    >
      {body}
      {actions.length === 0 ? null : <div className="ui-table-actions">{actions}</div>}
      {view.showError ? <ErrorPanel error={state.error} /> : null}
      <div className="ui-visually-hidden" aria-live="polite">
        {view.announcement}
      </div>
    </div>
  );
}
