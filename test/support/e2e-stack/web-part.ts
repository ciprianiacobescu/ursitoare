import { fileURLToPath } from "node:url";

import type { E2eStackPart, PartHandle } from "./part.ts";

export const WEB_DIST_PATH: string = fileURLToPath(
  new URL("../../../web/dist", import.meta.url),
);

export const webPart: E2eStackPart = {
  name: "web",
  start(): Promise<PartHandle> {
    return Promise.resolve({
      env: { URSITOARE_WEB_DIST: WEB_DIST_PATH },
      close: (): Promise<void> => Promise.resolve(),
    });
  },
};
