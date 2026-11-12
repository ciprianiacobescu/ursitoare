// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { DataTableSpec } from "../kit/data/data-table.ts";

export const TOOL_PAGES: readonly {
  id: string;
  file: string;
  path: string;
  navLabel: string;
  capability: string;
}[] = [
  {
    id: "admin-tool-servers",
    file: "64-admin-tool-servers.tsx",
    path: "/admin/tool-servers",
    navLabel: "Tool servers",
    capability: "register_tool_server",
  },
  {
    id: "admin-grants",
    file: "65-admin-grants.tsx",
    path: "/admin/grants",
    navLabel: "Grants",
    capability: "deploy_policy",
  },
  {
    id: "admin-policies",
    file: "66-admin-policies.tsx",
    path: "/admin/policies",
    navLabel: "Policies",
    capability: "deploy_policy",
  },
];

export const TOOL_TITLES: { servers: string; grants: string; policies: string } = {
  servers: "Tool servers · Ursitoare",
  grants: "Grants · Ursitoare",
  policies: "Policies · Ursitoare",
};

export const TOOL_TABLES: Readonly<Record<"servers" | "tools" | "grants", DataTableSpec>> = {
  servers: {
    caption: "Tool servers",
    columns: [
      { key: "server", header: "Server", rowHeader: true },
      { key: "summary", header: "Summary" },
    ],
    emptyTitle: "No tool servers",
  },
  tools: {
    caption: "Tools",
    columns: [
      { key: "name", header: "Name", rowHeader: true },
      { key: "effect", header: "Effect" },
      { key: "block", header: "Block" },
      { key: "result", header: "Result" },
      { key: "call", header: "Call" },
    ],
    emptyTitle: "No tools",
  },
  grants: {
    caption: "Grants",
    columns: [
      { key: "grant", header: "Grant", rowHeader: true },
      { key: "actions", header: "Actions" },
    ],
    emptyTitle: "No grants",
  },
};

export const TOOL_NAMES: Readonly<Record<string, string>> = {
  surfaceHeading: "Surface",
  approveButton: "Approve surface",
  ownBox: "I approve my own surface",
  grantForm: "New grant",
  subjectGroup: "Subject",
  subjectRole: "Role",
  subjectUser: "User",
  subjectField: "Role or user",
  toolField: "Tool",
  scopeGroup: "Scope",
  scopeAny: "Any step",
  scopeNode: "One step",
  flowField: "Flow",
  stepField: "Step",
  createGrant: "Create grant",
  revoke: "Revoke",
  confirm: "Confirm for the newest version",
  cedarField: "Hand-written Cedar",
  validate: "Validate",
  deploy: "Deploy",
  deployHint: "Grant changes take effect when you deploy the policy.",
};

export type RegionLoad<T> =
  | { phase: "loading" }
  | { phase: "error"; error: unknown }
  | { phase: "ready"; value: T };

export function regionState<T>(
  load: RegionLoad<T>,
  isEmpty?: (value: T) => boolean,
): { view: "loading" | "error" | "empty" | "ready"; actionsDisabled: boolean } {
  switch (load.phase) {
    case "loading":
      return { view: "loading", actionsDisabled: true };
    case "error":
      return { view: "error", actionsDisabled: true };
    case "ready":
      if (isEmpty !== undefined && isEmpty(load.value)) {
        return { view: "empty", actionsDisabled: false };
      }
      return { view: "ready", actionsDisabled: false };
    default:
      throw new RangeError("Unknown region phase");
  }
}

export type ActionPhase =
  | { phase: "idle" }
  | { phase: "busy" }
  | { phase: "done"; text: string }
  | { phase: "failed"; text: string };

export function actionState(a: ActionPhase): {
  disabled: boolean;
  status: { role: "status" | "alert"; text: string } | null;
} {
  switch (a.phase) {
    case "idle":
      return { disabled: false, status: null };
    case "busy":
      return { disabled: true, status: null };
    case "done":
      if (a.text === "") throw new RangeError("An action status needs a text");
      return { disabled: false, status: { role: "status", text: a.text } };
    case "failed":
      if (a.text === "") throw new RangeError("An action status needs a text");
      return { disabled: false, status: { role: "alert", text: a.text } };
    default:
      throw new RangeError("Unknown action phase");
  }
}
