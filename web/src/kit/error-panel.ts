import { ApiRequestError } from "../api/client.ts";
import { KitError } from "./errors.ts";
import { messageFor } from "./messages.ts";

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

const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;
const DECISION_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

function titleFor(status: number | null): string {
  switch (status) {
    case 401:
      return "Sign in required";
    case 403:
      return "Not allowed";
    case 404:
      return "Not found";
    case 0:
      return "Cannot reach the engine";
    default:
      return "Something went wrong";
  }
}

function decisionIdFor(status: number, details: unknown): string | null {
  if (status !== 403) return null;
  if (typeof details !== "object" || details === null) return null;
  if (!("decisionId" in details)) return null;
  const decisionId: unknown = (details as { decisionId?: unknown }).decisionId;
  if (typeof decisionId !== "string") return null;
  return DECISION_ID_PATTERN.test(decisionId) ? decisionId : null;
}

export function errorPanelModel(error: unknown): ErrorPanelModel {
  if (!(error instanceof ApiRequestError)) {
    return {
      code: "UNKNOWN_ERROR",
      status: null,
      title: titleFor(null),
      message: messageFor("UNKNOWN_ERROR"),
      decisionId: null,
    };
  }

  const status = error.status;
  const code = CODE_PATTERN.test(error.code) ? error.code : "UNKNOWN_ERROR";

  return {
    code,
    status,
    title: titleFor(status),
    message: messageFor(code),
    decisionId: decisionIdFor(status, error.details),
  };
}

export async function copyText(
  text: string,
  clipboard?: ClipboardLike,
): Promise<"copied" | "unavailable"> {
  if (typeof text !== "string" || text.trim().length === 0) return "unavailable";
  if (clipboard === undefined || typeof clipboard.writeText !== "function") {
    return "unavailable";
  }
  try {
    await clipboard.writeText(text);
    return "copied";
  } catch {
    return "unavailable";
  }
}

export function copyNotice(outcome: "copied" | "unavailable"): string {
  switch (outcome) {
    case "copied":
      return "Decision id copied.";
    case "unavailable":
      return "Could not copy. Select the decision id and copy it by hand.";
    default:
      throw new KitError("KIT_PROP_INVALID", "Unknown copy outcome.");
  }
}
