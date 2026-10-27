import assert from "node:assert/strict";
import { test } from "node:test";

import { cacheControlFor, classifyWebPath, contentTypeFor, isAssetName } from "./web-paths.ts";
import type { WebTarget } from "./web-paths.ts";

function classify(url: string): WebTarget {
  let target: WebTarget | undefined;
  assert.doesNotThrow(
    () => {
      target = classifyWebPath(url);
    },
    `classifyWebPath(${JSON.stringify(url)}) must not throw`,
  );
  assert.ok(target !== undefined, `classifyWebPath(${JSON.stringify(url)}) must return a target`);
  return target;
}

function asset(name: string): boolean {
  let result: boolean | undefined;
  assert.doesNotThrow(
    () => {
      result = isAssetName(name);
    },
    `isAssetName(${JSON.stringify(name)}) must not throw`,
  );
  assert.ok(result !== undefined, `isAssetName(${JSON.stringify(name)}) must return a value`);
  return result;
}

function contentType(name: string): string {
  let result: string | undefined;
  assert.doesNotThrow(
    () => {
      result = contentTypeFor(name);
    },
    `contentTypeFor(${JSON.stringify(name)}) must not throw`,
  );
  assert.ok(result !== undefined, `contentTypeFor(${JSON.stringify(name)}) must return a type`);
  return result;
}

function cacheControl(relativePath: string): string {
  let result: string | undefined;
  assert.doesNotThrow(
    () => {
      result = cacheControlFor(relativePath);
    },
    `cacheControlFor(${JSON.stringify(relativePath)}) must not throw`,
  );
  assert.ok(result !== undefined, `cacheControlFor(${JSON.stringify(relativePath)}) must return a policy`);
  return result;
}

test("C-1dc68043 classifyWebPath classifies the raw strings", () => {
  const cases: { url: string; expected: WebTarget }[] = [
    { url: "/", expected: { kind: "spa" } },
    { url: "/flows/", expected: { kind: "file", segments: ["flows"] } },
    { url: "/a/../b", expected: { kind: "refused" } },
    { url: "/%zz", expected: { kind: "refused" } },
    { url: "/x%2fy", expected: { kind: "refused" } },
    { url: "/api", expected: { kind: "reserved" } },
    { url: "/Api/v1/x", expected: { kind: "reserved" } },
    { url: "/%61pi/x", expected: { kind: "reserved" } },
    { url: "/auth/oidc/cb", expected: { kind: "reserved" } },
    { url: "/auth/other", expected: { kind: "file", segments: ["auth", "other"] } },
    { url: "/.well-known/x", expected: { kind: "reserved" } },
    { url: "/.hidden", expected: { kind: "refused" } },
    { url: "/assets/a.js?v=1", expected: { kind: "file", segments: ["assets", "a.js"] } },
  ];

  for (const { url, expected } of cases) {
    assert.deepEqual(classify(url), expected, `classifyWebPath(${JSON.stringify(url)})`);
  }
});

test("C-b2a74658 isAssetName accepts the listed asset extensions without regard to case", () => {
  const cases: [string, boolean][] = [
    ["a.js", true],
    ["a.JS", true],
    ["a.js.map", true],
    ["a.cd", false],
    ["a", false],
    [".js", false],
    ["a.", false],
    ["", false],
  ];

  for (const [name, expected] of cases) {
    assert.equal(asset(name), expected, `isAssetName(${JSON.stringify(name)})`);
  }
});

test("C-b2a74658 contentTypeFor maps the scenario names every extension and an unknown one", () => {
  const scenario: [string, string][] = [
    ["index.html", "text/html; charset=utf-8"],
    ["a.JS", "text/javascript; charset=utf-8"],
    ["LOGO.PNG", "image/png"],
    ["a.js.map", "application/json; charset=utf-8"],
    ["data.bin", "application/octet-stream"],
    ["a", "application/octet-stream"],
    [".js", "application/octet-stream"],
  ];

  for (const [name, expected] of scenario) {
    assert.equal(contentType(name), expected, `contentTypeFor(${JSON.stringify(name)})`);
  }

  const extensions: [string, string][] = [
    ["html", "text/html; charset=utf-8"],
    ["js", "text/javascript; charset=utf-8"],
    ["mjs", "text/javascript; charset=utf-8"],
    ["css", "text/css; charset=utf-8"],
    ["txt", "text/plain; charset=utf-8"],
    ["json", "application/json; charset=utf-8"],
    ["map", "application/json; charset=utf-8"],
    ["svg", "image/svg+xml"],
    ["png", "image/png"],
    ["gif", "image/gif"],
    ["webp", "image/webp"],
    ["jpg", "image/jpeg"],
    ["jpeg", "image/jpeg"],
    ["ico", "image/x-icon"],
    ["woff", "font/woff"],
    ["woff2", "font/woff2"],
    ["ttf", "font/ttf"],
    ["webmanifest", "application/manifest+json"],
  ];

  for (const [extension, expected] of extensions) {
    const name = `file.${extension}`;
    assert.equal(contentType(name), expected, `contentTypeFor(${JSON.stringify(name)})`);
  }
});

test("C-b2a74658 cacheControlFor is immutable only for hashed assets", () => {
  const immutable = "public, max-age=31536000, immutable";
  const cases: [string, string][] = [
    ["index.html", "no-store"],
    ["assets/index-Ab3dEf9Z.js", immutable],
    ["assets/index-Ab3dEf9Z.js.map", immutable],
    ["assets/INDEX-Ab3dEf9Z.JS", immutable],
    ["assets/short-1.js", "no-cache"],
    ["assets/my-long-name.js", "no-cache"],
    ["assets/index-Ab3dEf9Z1.js", "no-cache"],
    ["assets/logo.svg", "no-cache"],
    ["favicon.svg", "no-cache"],
  ];

  for (const [relativePath, expected] of cases) {
    assert.equal(cacheControl(relativePath), expected, `cacheControlFor(${JSON.stringify(relativePath)})`);
  }
});
