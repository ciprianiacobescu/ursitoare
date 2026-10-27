export type WebTarget = { kind: "spa" | "reserved" | "refused" } | { kind: "file"; segments: readonly string[] };

export const RESERVED_ROOTS: readonly (readonly string[])[] = [
  ["api"],
  ["health"],
  ["auth", "oidc"],
  [".well-known"],
  ["hooks"],
  ["callbacks"],
  ["mcp"],
];

const ASSET_EXTENSIONS: ReadonlySet<string> = new Set([
  "js",
  "mjs",
  "css",
  "map",
  "json",
  "svg",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "woff",
  "woff2",
  "ttf",
  "txt",
  "webmanifest",
]);

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  json: "application/json; charset=utf-8",
  map: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  webmanifest: "application/manifest+json",
};

const HASHED_ASSET = /^assets\/[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{8}\.([A-Za-z0-9]+)(?:\.map)?$/;

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function extensionOf(name: string): string | undefined {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) {
    return undefined;
  }
  return name.slice(dot + 1).toLowerCase();
}

export function classifyWebPath(url: string): WebTarget {
  const end = url.search(/[?#]/);
  const rawPath = end === -1 ? url : url.slice(0, end);
  if (!rawPath.startsWith("/")) {
    return { kind: "refused" };
  }

  const segments: string[] = [];
  for (const raw of rawPath.split("/")) {
    if (raw === "") {
      continue;
    }
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return { kind: "refused" };
    }
    if (decoded === "." || decoded === "..") {
      return { kind: "refused" };
    }
    if (decoded.includes("/") || decoded.includes("\\") || hasControlCharacter(decoded)) {
      return { kind: "refused" };
    }
    segments.push(decoded);
  }

  const lower = segments.map((segment) => segment.toLowerCase());
  for (const root of RESERVED_ROOTS) {
    if (root.every((part, index) => lower[index] === part)) {
      return { kind: "reserved" };
    }
  }

  for (const segment of segments) {
    if (segment.startsWith(".")) {
      return { kind: "refused" };
    }
  }

  if (segments.length === 0) {
    return { kind: "spa" };
  }
  return { kind: "file", segments };
}

export function isAssetName(name: string): boolean {
  const extension = extensionOf(name);
  return extension !== undefined && ASSET_EXTENSIONS.has(extension);
}

export function contentTypeFor(name: string): string {
  const extension = extensionOf(name);
  if (extension === undefined) {
    return "application/octet-stream";
  }
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

export function cacheControlFor(relativePath: string): string {
  if (relativePath === "index.html") {
    return "no-store";
  }
  const hashed = HASHED_ASSET.exec(relativePath);
  if (hashed !== null) {
    const extension = hashed[1];
    if (extension !== undefined && ASSET_EXTENSIONS.has(extension.toLowerCase())) {
      return "public, max-age=31536000, immutable";
    }
  }
  return "no-cache";
}
