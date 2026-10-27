// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ReactNode } from "react";

import type { CursorList } from "./cursor-list.ts";
import type { DataColumn, DataTableSpec } from "./data-table.ts";

export interface DataTableProps<T> extends DataTableSpec {
  columns: readonly (DataColumn & { cell: (row: T) => ReactNode })[];
  list: CursorList<T>;
  rowKey: (row: T) => string;
}

export function DataTable<T>(_props: DataTableProps<T>): ReactNode {
  throw new Error("not implemented");
}
