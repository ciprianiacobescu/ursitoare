// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export interface ErrorPanelModel {
  code: string;
  status: number | null;
  title: string;
  message: string;
  decisionId: string | null;
}

export interface ClipboardLike {
  writeText(text: string): Promise<void>;
}

export function errorPanelModel(_error: unknown): ErrorPanelModel {
  throw new Error("not implemented");
}

export async function copyText(
  _text: string,
  _clipboard?: ClipboardLike,
): Promise<"copied" | "unavailable"> {
  throw new Error("not implemented");
}

export function copyNotice(_outcome: "copied" | "unavailable"): string {
  throw new Error("not implemented");
}
