/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../../api/client.ts";
import { KitError } from "../errors.ts";
import type { CursorListState, CursorListStatus } from "./cursor-list.ts";
import { dataTableModel, focusAfterChange, tableView } from "./data-table.ts";
import type { DataTableSpec, DataTableModel, TableFocus, TableView } from "./data-table.ts";

assert.equal(typeof dataTableModel, "function");
assert.equal(typeof tableView, "function");
assert.equal(typeof focusAfterChange, "function");

function isKitError(code: KitError["code"]): (error: unknown) => boolean {
  return (error: unknown) => error instanceof KitError && error.code === code;
}

function known<T>(value: T | undefined, name: string): T {
  assert.ok(value !== undefined, `${name} was produced`);
  return value;
}

const GOOD_SPEC: DataTableSpec = {
  caption: "Flows",
  columns: [{ key: "name", header: "Name" }],
};

test("C-df0a8688 dataTableModel trims a valid spec and fills the defaults", () => {
  let model: DataTableModel | undefined;
  assert.doesNotThrow(() => {
    model = dataTableModel({
      caption: " Flows ",
      columns: [
        { key: "name", header: " Name ", rowHeader: true },
        { key: "state", header: "State" },
      ],
    });
  }, "a valid spec builds a model");
  const built = known(model, "the model of the valid spec");
  assert.equal(built.caption, "Flows", "the caption is trimmed");
  assert.equal(built.loadingLabel, "Loading Flows", "the loading label is Loading and the caption");
  assert.equal(built.emptyTitle, "Nothing to show", "the default empty title");
  assert.equal(built.emptyDescription, null, "no description is given");
  assert.deepEqual(
    built.columns,
    [
      { key: "name", header: "Name", scope: "col", cellTag: "th", cellScope: "row" },
      { key: "state", header: "State", scope: "col", cellTag: "td", cellScope: null },
    ],
    "the columns are trimmed, scoped and typed",
  );

  let titled: DataTableModel | undefined;
  assert.doesNotThrow(() => {
    titled = dataTableModel({
      caption: "Flows",
      columns: [{ key: "name", header: "Name" }],
      emptyTitle: " No flows yet ",
      emptyDescription: " Run one ",
    });
  }, "a spec with its own empty state builds a model");
  const withEmpty = known(titled, "the model of the own empty state");
  assert.equal(withEmpty.emptyTitle, "No flows yet", "the given empty title is trimmed");
  assert.equal(withEmpty.emptyDescription, "Run one", "the given empty description is kept");
});

test("C-df0a8688 dataTableModel throws KIT_PROP_INVALID for a bad spec", () => {
  const bad: (name: string, spec: () => unknown) => void = (name, spec) => {
    assert.throws(spec, isKitError("KIT_PROP_INVALID"), `${name} throws KIT_PROP_INVALID`);
  };

  bad("an empty caption", () => dataTableModel({ ...GOOD_SPEC, caption: " " }));
  bad("a 73 character caption", () => dataTableModel({ ...GOOD_SPEC, caption: "F".repeat(73) }));
  bad("no columns", () => dataTableModel({ ...GOOD_SPEC, columns: [] }));
  bad("a duplicate key", () =>
    dataTableModel({
      ...GOOD_SPEC,
      columns: [
        { key: "name", header: "Name" },
        { key: "name", header: "State" },
      ],
    }),
  );
  bad("more than 20 columns", () =>
    dataTableModel({
      ...GOOD_SPEC,
      columns: Array.from({ length: 21 }, (_unused, index) => ({
        key: `c${index}`,
        header: `Column ${index}`,
      })),
    }),
  );
  bad("a key that is no field name", () =>
    dataTableModel({ ...GOOD_SPEC, columns: [{ key: "1x", header: "Name" }] }),
  );
  bad("a blank header", () =>
    dataTableModel({ ...GOOD_SPEC, columns: [{ key: "name", header: " " }] }),
  );
  bad("a 61 character header", () =>
    dataTableModel({ ...GOOD_SPEC, columns: [{ key: "name", header: "H".repeat(61) }] }),
  );
  bad("two row headers", () =>
    dataTableModel({
      ...GOOD_SPEC,
      columns: [
        { key: "name", header: "Name", rowHeader: true },
        { key: "state", header: "State", rowHeader: true },
      ],
    }),
  );
  bad("a 121 character empty title", () => dataTableModel({ ...GOOD_SPEC, emptyTitle: "N".repeat(121) }));
  bad("a 301 character empty description", () =>
    dataTableModel({ ...GOOD_SPEC, emptyDescription: "D".repeat(301) }),
  );

  assert.doesNotThrow(() => {
    dataTableModel({
      ...GOOD_SPEC,
      caption: "F".repeat(72),
      columns: Array.from({ length: 20 }, (_unused, index) => ({
        key: `c${index}`,
        header: `Column ${index}`,
      })),
      emptyTitle: "N".repeat(120),
      emptyDescription: "D".repeat(300),
    });
  }, "the spec at every bound builds a model");
});

function state(
  status: CursorListStatus,
  items: readonly unknown[],
  nextCursor: string | null,
  error: unknown = null,
): CursorListState<unknown> {
  return { status, items, nextCursor, error: status === "error" ? error : null };
}

const BAD_GATEWAY = new ApiRequestError(503, "AUTHZ_UNAVAILABLE", "x");
const BAD_CURSOR = new ApiRequestError(400, "CURSOR_INVALID", "x");

interface Case {
  readonly name: string;
  readonly state: CursorListState<unknown>;
  readonly view: TableView;
}

function cases(): Case[] {
  return [
    {
      name: "1 idle",
      state: state("idle", [], null),
      view: {
        body: "none",
        rowCount: 0,
        loadMore: "hidden",
        loadMoreLabel: "Load more",
        retry: "hidden",
        retryLabel: null,
        showError: false,
        announcement: "",
        load: true,
      },
    },
    {
      name: "2 loading with no items",
      state: state("loading", [], null),
      view: {
        body: "loading",
        rowCount: 0,
        loadMore: "hidden",
        loadMoreLabel: "Load more",
        retry: "hidden",
        retryLabel: null,
        showError: false,
        announcement: "",
        load: false,
      },
    },
    {
      name: "3 loading with 2 items",
      state: state("loading", ["a", "b"], null),
      view: {
        body: "rows",
        rowCount: 2,
        loadMore: "busy",
        loadMoreLabel: "Load more",
        retry: "hidden",
        retryLabel: null,
        showError: false,
        announcement: "Loading more rows",
        load: false,
      },
    },
    {
      name: "4 loaded with no items and no cursor",
      state: state("loaded", [], null),
      view: {
        body: "empty",
        rowCount: 0,
        loadMore: "hidden",
        loadMoreLabel: "Load more",
        retry: "hidden",
        retryLabel: null,
        showError: false,
        announcement: "",
        load: false,
      },
    },
    {
      name: "5 loaded with no items and a cursor",
      state: state("loaded", [], "c1"),
      view: {
        body: "rows",
        rowCount: 0,
        loadMore: "enabled",
        loadMoreLabel: "Load more",
        retry: "hidden",
        retryLabel: null,
        showError: false,
        announcement: "No rows on this page. Load more to continue.",
        load: false,
      },
    },
    {
      name: "6 loaded with 3 items and a cursor",
      state: state("loaded", ["a", "b", "c"], "c1"),
      view: {
        body: "rows",
        rowCount: 3,
        loadMore: "enabled",
        loadMoreLabel: "Load more",
        retry: "hidden",
        retryLabel: null,
        showError: false,
        announcement: "3 rows shown",
        load: false,
      },
    },
    {
      name: "7 error with no items",
      state: state("error", [], null, BAD_GATEWAY),
      view: {
        body: "none",
        rowCount: 0,
        loadMore: "hidden",
        loadMoreLabel: "Load more",
        retry: "again",
        retryLabel: "Try again",
        showError: true,
        announcement: "",
        load: false,
      },
    },
    {
      name: "8 error with 2 items",
      state: state("error", ["a", "b"], "c1", BAD_CURSOR),
      view: {
        body: "rows",
        rowCount: 2,
        loadMore: "hidden",
        loadMoreLabel: "Load more",
        retry: "restart",
        retryLabel: "Start over",
        showError: true,
        announcement: "",
        load: false,
      },
    },
  ];
}

test("C-686289b8 tableView gives every state its view", () => {
  const list = cases();
  let views: (Case | undefined)[] = [];
  assert.doesNotThrow(() => {
    views = list.map((entry) => {
      const view = tableView(entry.state);
      return { name: entry.name, state: entry.state, view };
    });
  }, "every state gets a view");
  for (const entry of list) {
    const produced = known(
      views.at(list.indexOf(entry)),
      `the view of ${entry.name}`,
    );
    assert.deepEqual(produced.view, entry.view, `${entry.name} has its view`);
  }
  assert.equal(list.length, 8, "every state of the scenario got a view");
});

test("C-3bc08473 focusAfterChange names where focus moves after a change", () => {
  const pairs: readonly {
    readonly name: string;
    readonly prev: CursorListState<unknown>;
    readonly next: CursorListState<unknown>;
    readonly expected: TableFocus;
  }[] = [
    {
      name: "a load more that ends the list",
      prev: state("loading", ["a", "b"], null),
      next: state("loaded", ["a", "b", "c"], null),
      expected: "table",
    },
    {
      name: "a load more that fails",
      prev: state("loading", ["a", "b"], null),
      next: state("error", ["a", "b"], null, BAD_GATEWAY),
      expected: "retry",
    },
    {
      name: "a retry that begins a load",
      prev: state("error", ["a", "b"], null, BAD_GATEWAY),
      next: state("loading", ["a", "b"], null),
      expected: "table",
    },
    {
      name: "a start over that begins a load",
      prev: state("error", [], null, BAD_CURSOR),
      next: state("loading", [], null),
      expected: "table",
    },
    {
      name: "a first page that lands",
      prev: state("loading", [], null),
      next: state("loaded", ["a", "b"], "c1"),
      expected: "none",
    },
    {
      name: "a second page that lands",
      prev: state("loading", ["a", "b"], null),
      next: state("loaded", ["a", "b", "c", "d"], "c2"),
      expected: "none",
    },
  ];

  let targets: (TableFocus | undefined)[] = [];
  assert.doesNotThrow(() => {
    targets = pairs.map((pair) => focusAfterChange(pair.prev, pair.next));
  }, "every pair of states gets a focus target");
  for (const pair of pairs) {
    const target = known(targets.at(pairs.indexOf(pair)), `the target of ${pair.name}`);
    assert.equal(target, pair.expected, `${pair.name} moves focus as decided`);
  }
  assert.equal(pairs.length, 6, "every pair of the scenario got a target");
});
