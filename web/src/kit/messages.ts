import type { StringMap } from "./contrast.ts";
import { KitError } from "./errors.ts";

export const FALLBACK_MESSAGE =
  "Something went wrong. Try again, and tell an administrator if it keeps happening.";

export const BASE_MESSAGES: StringMap = {
  UNAUTHENTICATED: "You are not signed in, or your session has ended. Sign in and try again.",
  FORBIDDEN:
    "You are not allowed to do this. If you think you should be, give the decision id to an administrator.",
  CSRF_INVALID: "This page is out of date. Reload it and try again.",
  AUTHZ_UNAVAILABLE: "Authorization is unavailable right now. Try again in a moment.",
  NOT_FOUND: "That item does not exist, or you cannot see it.",
  VALIDATION_FAILED: "Some of the information is not valid. Check it and try again.",
  INTERNAL:
    "The engine hit an unexpected problem. Try again, and tell an administrator if it keeps happening.",
  NETWORK_ERROR: "Cannot reach the engine. Check your connection and try again.",
  HTTP_ERROR: "The engine answered with an error this page does not know.",
  INVALID_RESPONSE: "The engine sent an answer this page cannot read.",
};

const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;

const catalogue = new Map<string, string>(Object.entries(BASE_MESSAGES));

function hasControlCharacters(text: string): boolean {
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

export function messageFor(code: string): string {
  return catalogue.get(code) ?? FALLBACK_MESSAGE;
}

export function registerMessages(messages: StringMap): void {
  const entries = Object.entries(messages);

  for (const [code, rawText] of entries) {
    if (!CODE_PATTERN.test(code)) {
      throw new KitError("KIT_MESSAGE_INVALID", `Invalid message code: ${code}`);
    }
    const text = typeof rawText === "string" ? rawText.trim() : "";
    if (text.length < 1 || text.length > 200 || hasControlCharacters(text)) {
      throw new KitError("KIT_MESSAGE_INVALID", `Invalid message text for code: ${code}`);
    }
  }

  for (const [code, rawText] of entries) {
    const existing = catalogue.get(code);
    if (existing !== undefined && existing !== rawText.trim()) {
      throw new KitError(
        "KIT_MESSAGE_DUPLICATE",
        `Message code already registered with other text: ${code}`,
      );
    }
  }

  for (const [code, rawText] of entries) {
    catalogue.set(code, rawText.trim());
  }
}
