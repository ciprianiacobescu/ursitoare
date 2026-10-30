import { capabilityLoader } from "../kit/capabilities.ts";
import { createBrowserSession } from "./session-client.ts";

export const browserSession = createBrowserSession({
  fetch: (input, init) => globalThis.fetch(input, init),
  location: window.location,
  loader: capabilityLoader,
});
