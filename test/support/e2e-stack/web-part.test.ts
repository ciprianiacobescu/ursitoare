import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { discoverParts } from "./discover.ts";
import type { PartContext } from "./part.ts";
import { WEB_DIST_PATH, webPart } from "./web-part.ts";

assert.equal(typeof discoverParts, "function");

const REPOSITORY_WEB_DIST = fileURLToPath(new URL("../../../web/dist", import.meta.url));

function context(name: string): PartContext {
  return {
    name,
    dataDir: path.join("/tmp", `e2e-${name}`),
    engineOrigin: "http://127.0.0.1:1",
    controlOrigin: "http://127.0.0.1:2",
    env: {},
    handles: new Map(),
  };
}

type StartOutcome =
  | { ok: true; env: Readonly<Record<string, string>>; closeResolved: boolean }
  | { ok: false; error: string };

async function startWebPart(): Promise<StartOutcome> {
  try {
    const handle = await webPart.start(context("web"));
    let closeResolved = false;
    await handle.close().then(() => {
      closeResolved = true;
    });
    return { ok: true, env: handle.env, closeResolved };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

test("C-b5ce03f4 the web part is discovered after the database and hands the built web directory to the engine", async () => {
  const discovered = await discoverParts();
  const started = await startWebPart();

  assert.deepEqual(
    {
      discovery: {
        discoverPartsIsFunction: typeof discoverParts === "function",
        names: discovered.slice(0, 2).map((part) => part.name),
        secondIsWebPart: discovered[1] === webPart,
      },
      distPath: {
        isString: typeof WEB_DIST_PATH === "string",
        absolute: path.isAbsolute(WEB_DIST_PATH),
        endsWithWebDist: WEB_DIST_PATH.endsWith(path.join("web", "dist")),
        isRepositoryWebDist: WEB_DIST_PATH === REPOSITORY_WEB_DIST,
      },
      handle: started,
    },
    {
      discovery: {
        discoverPartsIsFunction: true,
        names: ["database", "web"],
        secondIsWebPart: true,
      },
      distPath: {
        isString: true,
        absolute: true,
        endsWithWebDist: true,
        isRepositoryWebDist: true,
      },
      handle: {
        ok: true,
        env: { URSITOARE_WEB_DIST: REPOSITORY_WEB_DIST },
        closeResolved: true,
      },
    },
  );
});
