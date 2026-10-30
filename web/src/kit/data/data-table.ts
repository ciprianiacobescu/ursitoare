import { ApiRequestError } from "../../api/client.ts";
import { KitError } from "../errors.ts";
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
  load: boolean;
}

export type TableFocus = "table" | "retry" | "none";

const MIN_CAPTION_LENGTH = 1;
const MAX_CAPTION_LENGTH = 72;
const MIN_COLUMNS = 1;
const MAX_COLUMNS = 20;
const MAX_HEADER_LENGTH = 60;
const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const DEFAULT_EMPTY_TITLE = "Nothing to show";
const MIN_EMPTY_TITLE_LENGTH = 1;
const MAX_EMPTY_TITLE_LENGTH = 120;
const MAX_EMPTY_DESCRIPTION_LENGTH = 300;
const LOAD_MORE_LABEL = "Load more";

function invalid(spec: string): KitError {
  return new KitError("KIT_PROP_INVALID", spec);
}

export function dataTableModel(spec: DataTableSpec): DataTableModel {
  const caption = typeof spec.caption === "string" ? spec.caption.trim() : "";
  if (
    caption.length < MIN_CAPTION_LENGTH ||
    caption.length > MAX_CAPTION_LENGTH
  ) {
    throw invalid(`The caption must be ${MIN_CAPTION_LENGTH} to ${MAX_CAPTION_LENGTH} characters.`);
  }

  const given = Array.isArray(spec.columns) ? spec.columns : [];
  if (given.length < MIN_COLUMNS || given.length > MAX_COLUMNS) {
    throw invalid(`The table needs ${MIN_COLUMNS} to ${MAX_COLUMNS} columns.`);
  }
  const seen = new Set<string>();
  let rowHeaders = 0;
  const columns = given.map((column) => {
    const key = typeof column.key === "string" ? column.key : "";
    if (!KEY_PATTERN.test(key) || !Object.hasOwn(column, "key")) {
      throw invalid("Each column key must be a supported field name.");
    }
    if (seen.has(key)) {
      throw invalid("The column keys must be distinct.");
    }
    seen.add(key);
    const header = typeof column.header === "string" ? column.header.trim() : "";
    if (header.length < 1 || header.length > MAX_HEADER_LENGTH) {
      throw invalid(`Each column header must be 1 to ${MAX_HEADER_LENGTH} characters.`);
    }
    const rowHeader = column.rowHeader === true;
    if (rowHeader) {
      rowHeaders += 1;
      if (rowHeaders > 1) {
        throw invalid("At most one column may be the row header.");
      }
      return { key, header, scope: "col", cellTag: "th", cellScope: "row" } as const;
    }
    return { key, header, scope: "col", cellTag: "td", cellScope: null } as const;
  });

  const emptyTitle =
    spec.emptyTitle === undefined || spec.emptyTitle === null
      ? DEFAULT_EMPTY_TITLE
      : spec.emptyTitle;
  const trimmedTitle = typeof emptyTitle === "string" ? emptyTitle.trim() : "";
  if (
    trimmedTitle.length < MIN_EMPTY_TITLE_LENGTH ||
    trimmedTitle.length > MAX_EMPTY_TITLE_LENGTH
  ) {
    throw invalid(
      `The empty title must be ${MIN_EMPTY_TITLE_LENGTH} to ${MAX_EMPTY_TITLE_LENGTH} characters.`,
    );
  }
  let emptyDescription: string | null = null;
  if (spec.emptyDescription !== undefined && spec.emptyDescription !== null) {
    const trimmed = typeof spec.emptyDescription === "string" ? spec.emptyDescription.trim() : "";
    if (trimmed.length > MAX_EMPTY_DESCRIPTION_LENGTH) {
      throw invalid(
        `The empty description must be at most ${MAX_EMPTY_DESCRIPTION_LENGTH} characters.`,
      );
    }
    emptyDescription = trimmed.length > 0 ? trimmed : null;
  }

  return {
    caption,
    columns,
    emptyTitle: trimmedTitle,
    emptyDescription,
    loadingLabel: `Loading ${caption}`,
  };
}

export function tableView(state: CursorListState<unknown>): TableView {
  const rowCount = state.items.length;
  const status = state.status;
  let body: TableView["body"];
  if (status === "idle" || (status === "error" && rowCount === 0)) {
    body = "none";
  } else if (status === "loading" && rowCount === 0 && state.nextCursor === null) {
    body = "loading";
  } else if (status === "loaded" && rowCount === 0 && state.nextCursor === null) {
    body = "empty";
  } else {
    body = "rows";
  }
  let loadMore: TableView["loadMore"] = "hidden";
  if (status === "loading" && (rowCount > 0 || state.nextCursor !== null)) {
    loadMore = "busy";
  } else if (status === "loaded" && state.nextCursor !== null) {
    loadMore = "enabled";
  }
  let retry: TableView["retry"] = "hidden";
  let retryLabel: string | null = null;
  if (status === "error") {
    retry = "again";
    retryLabel = "Try again";
    if (state.error instanceof ApiRequestError && state.error.code === "CURSOR_INVALID") {
      retry = "restart";
      retryLabel = "Start over";
    }
  }
  let announcement = "";
  if (status === "loading" && (rowCount > 0 || state.nextCursor !== null)) {
    announcement = "Loading more rows";
  } else if (status === "loaded" && rowCount > 0) {
    announcement = rowCount === 1 ? "1 row shown" : `${rowCount} rows shown`;
  } else if (body === "rows" && status === "loaded" && rowCount === 0) {
    announcement = "No rows on this page. Load more to continue.";
  }
  return {
    body,
    rowCount,
    loadMore,
    loadMoreLabel: LOAD_MORE_LABEL,
    retry,
    retryLabel,
    showError: status === "error",
    announcement,
    load: status === "idle",
  };
}

export function focusAfterChange(
  prev: CursorListState<unknown>,
  next: CursorListState<unknown>,
): TableFocus {
  if (prev.status === "loading" && next.status === "error") {
    return "retry";
  }
  if (prev.status === "error" && next.status === "loading") {
    return "table";
  }
  if (
    prev.status === "loading" &&
    (prev.items.length > 0 || prev.nextCursor !== null) &&
    next.status === "loaded" &&
    next.nextCursor === null
  ) {
    return "table";
  }
  return "none";
}
