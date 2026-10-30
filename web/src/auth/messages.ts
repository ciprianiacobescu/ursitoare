import { registerMessages } from "../kit/messages.ts";

export const SIGN_IN_ERROR_CODES: readonly string[] = [
  "SESSION_ENDED",
  "OIDC_LOGIN_EXPIRED",
  "OIDC_STATE_MISMATCH",
  "OIDC_BAD_REQUEST",
  "OIDC_EXCHANGE_FAILED",
  "OIDC_PROVIDER_UNAVAILABLE",
  "OIDC_TOKEN_INVALID",
  "OIDC_UNKNOWN_TENANT",
  "OIDC_USER_DISABLED",
  "OIDC_INTERNAL",
];

export const SIGN_IN_MESSAGES: Readonly<Record<string, string>> = {
  SESSION_ENDED: "Your session has ended, or you are not signed in. Sign in to continue.",
  OIDC_LOGIN_EXPIRED: "The sign-in took too long or began in another tab. Try again.",
  OIDC_STATE_MISMATCH: "The sign-in did not match this browser. Try again.",
  OIDC_BAD_REQUEST: "The sign-in answer was incomplete. Try again.",
  OIDC_EXCHANGE_FAILED: "The identity provider refused the sign-in. Try again.",
  OIDC_PROVIDER_UNAVAILABLE:
    "The identity provider cannot be reached right now. Try again in a moment.",
  OIDC_TOKEN_INVALID:
    "The identity provider sent an answer that could not be trusted. Try again or ask an administrator.",
  OIDC_UNKNOWN_TENANT: "Your organization is not set up on this engine. Ask an administrator.",
  OIDC_USER_DISABLED: "Your account is disabled. Ask an administrator.",
  OIDC_INTERNAL: "Sign-in hit an unexpected problem. Try again or ask an administrator.",
  OIDC_CSRF_INVALID: "This page is out of date. Reload it and try again.",
  OIDC_NOT_CONFIGURED: "Sign-in is not configured on this engine. Ask an administrator.",
};

export function registerSignInMessages(): void {
  registerMessages(SIGN_IN_MESSAGES);
}
