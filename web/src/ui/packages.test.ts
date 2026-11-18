import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { BANNED_PACKAGES, M6B_PACKAGES } from "./rules.ts";

type Manifest = Record<string, Record<string, string> | undefined>;

const manifest = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as Manifest;

const SECTIONS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

test("C-3c9f8b7f BANNED_PACKAGES lists the 14 names in order", () => {
  assert.deepEqual(
    [...BANNED_PACKAGES],
    [
      "@radix-ui/react-dialog",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-toast",
      "@radix-ui/react-scroll-area",
      "radix-ui",
      "react-remove-scroll",
      "@radix-ui/themes",
      "@emotion/react",
      "@emotion/styled",
      "styled-components",
      "@mantine/core",
    ],
  );
});

test("C-3c9f8b7f M6B_PACKAGES lists the nine exact versions", () => {
  assert.deepEqual(
    { dependencies: { ...M6B_PACKAGES.dependencies }, devDependencies: { ...M6B_PACKAGES.devDependencies } },
    {
      dependencies: {
        "@radix-ui/react-slot": "1.5.0",
        "@radix-ui/react-collapsible": "1.2.1",
        "@radix-ui/react-tooltip": "1.4.1",
        "class-variance-authority": "0.7.1",
        clsx: "2.1.1",
        "tailwind-merge": "3.7.0",
        "lucide-react": "1.72.0",
      },
      devDependencies: { tailwindcss: "4.3.5", "@tailwindcss/vite": "4.3.5" },
    },
  );
});

test("C-3c9f8b7f the manifest holds no banned name and each M6B package", () => {
  assert.ok(BANNED_PACKAGES.length === 14);
  for (const section of SECTIONS) {
    for (const name of BANNED_PACKAGES) {
      assert.equal(manifest[section]?.[name], undefined, `${section} holds ${name}`);
    }
  }
  assert.equal(Object.keys(M6B_PACKAGES.dependencies).length, 7);
  for (const section of ["dependencies", "devDependencies"] as const) {
    for (const [name, version] of Object.entries(M6B_PACKAGES[section])) {
      assert.equal(manifest[section]?.[name], version, `${section} ${name}`);
    }
  }
});
