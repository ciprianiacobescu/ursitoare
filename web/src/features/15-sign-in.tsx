import type { FeatureSpec } from "../app/features.ts";
import { SignInPage } from "../auth/SignInPage.tsx";
import { registerSignInMessages } from "../auth/messages.ts";

registerSignInMessages();

export const feature: FeatureSpec = {
  id: "sign-in",
  path: "/sign-in",
  element: <SignInPage />,
};
