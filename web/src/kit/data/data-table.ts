// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { CursorListState } from "./cursor-list.ts";

export interface DataColumn {
  key: string;
  header: string;
  rowHeader?: boolean;
}

export interface DataTableSpec {
  caption: string;
  columns: readonly DataColumn[];
  emptyTitle?: string;
  emptyDescription?: string;
}

export interface DataTableModel {
  caption: string;
  columns: readonly {
    key: string;
    header: string;
    scope: "col";
    cellTag: "th" | "td";
    cellScope: "row" | null;
  }[];
  emptyTitle: string;
  emptyDescription: string | null;
  loadingLabel: string;
}

export interface TableView {
  body: "none" | "loading" | "empty" | "rows";
  rowCount: number;
  loadMore: "hidden" | "enabled" | "busy";
  loadMoreLabel: string;
  retry: "hidden" | "again" | "restart";
  retryLabel: string | null;
  showError: boolean;
  announcement: string;
}

export type TableFocus = "table" | "retry" | "none";

export function dataTableModel(_spec: DataTableSpec): DataTableModel {
  throw new Error("not implemented");
}

export function tableView(_state: CursorListState<unknown>): TableView {
  throw new Error("not implemented");
}

export function focusAfterChange(
  _prev: CursorListState<unknown>,
  _next: CursorListState<unknown>,
): TableFocus {
  throw new Error("not implemented");
}
