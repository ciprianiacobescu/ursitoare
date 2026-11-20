import type { EditorPanel } from "./editor-panels.ts";
import { checkOwnerTeam } from "./flows.ts";

export interface WorkspacePanels {
  side: readonly EditorPanel[];
  below: readonly EditorPanel[];
}

export function splitPanels(panels: readonly EditorPanel[]): WorkspacePanels {
  return {
    side: panels.filter((panel) => panel.placement === "side"),
    below: panels.filter((panel) => panel.placement !== "side"),
  };
}

export interface JumpLink {
  id: string;
  label: string;
  href: string;
}

export function jumpLinks(panels: WorkspacePanels): JumpLink[] {
  return [
    { id: "editor", label: "Editor", href: "#flow-editor" },
    { id: "diagnostics", label: "Diagnostics", href: "#flow-diagnostics" },
    ...panels.side.map((panel) => ({
      id: panel.id,
      label: panel.title,
      href: `#flow-panel-${panel.id}`,
    })),
    { id: "versions", label: "Versions", href: "#flow-versions" },
    ...panels.below.map((panel) => ({
      id: panel.id,
      label: `${panel.title} panel`,
      href: `#flow-panel-${panel.id}`,
    })),
  ];
}

export function ownerTeamSuggestions(teams: readonly string[]): {
  options: string[];
  prefill: string;
} {
  const valid = new Set<string>();
  for (const team of teams) {
    const checked = checkOwnerTeam(team);
    if (checked.ok) {
      valid.add(checked.value);
    }
  }
  const options = [...valid].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return { options, prefill: options.length === 1 ? (options[0] ?? "") : "" };
}
