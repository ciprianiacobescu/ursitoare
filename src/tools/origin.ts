import type { OriginCheck } from "./types.ts";

type RefusalReason = Extract<OriginCheck, { ok: false }>["reason"];
type HostClass = "metadata" | "loopback" | "link_local" | "private" | "public";

const MAX_URL_LENGTH = 2048;

const SERVICE_NAMES: ReadonlySet<string> = new Set([
  "broker",
  "vault",
  "proxy",
  "postgres",
  "keycloak",
  "engine",
  "ursitoare",
  "mintkey",
  "mintkey-broker",
  "mintkey-proxy",
  "mintkey-vault",
]);

function refuse(reason: RefusalReason): OriginCheck {
  return { ok: false, reason };
}

function parseIpv4(text: string): readonly [number, number, number, number] | null {
  const parts = text.split(".");
  if (parts.length !== 4) return null;
  const [a, b, c, d] = parts;
  if (a === undefined || b === undefined || c === undefined || d === undefined) return null;
  const octets: number[] = [];
  for (const part of [a, b, c, d]) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  const first = octets[0];
  const second = octets[1];
  const third = octets[2];
  const fourth = octets[3];
  if (first === undefined || second === undefined || third === undefined || fourth === undefined) {
    return null;
  }
  return [first, second, third, fourth];
}

function classifyIpv4(octets: readonly [number, number, number, number]): HostClass {
  const [a, b, c, d] = octets;
  if (a === 169 && b === 254 && c === 169 && d === 254) return "metadata";
  if (a === 127 || a === 0) return "loopback";
  if (a === 169 && b === 254) return "link_local";
  if (a === 10) return "private";
  if (a === 172 && b >= 16 && b <= 31) return "private";
  if (a === 192 && b === 168) return "private";
  if (a === 100 && b >= 64 && b <= 127) return "private";
  return "public";
}

function parseIpv6(text: string): readonly number[] | null {
  const source = text.toLowerCase();
  if (source.includes(":::")) return null;

  const parseGroups = (part: string): number[] | null => {
    if (part === "") return [];
    const groups: number[] = [];
    for (const piece of part.split(":")) {
      if (piece === "") return null;
      if (piece.includes(".")) {
        const embedded = parseIpv4(piece);
        if (embedded === null) return null;
        groups.push((embedded[0] << 8) | embedded[1], (embedded[2] << 8) | embedded[3]);
        continue;
      }
      if (!/^[0-9a-f]{1,4}$/.test(piece)) return null;
      groups.push(Number.parseInt(piece, 16));
    }
    return groups;
  };

  const halves = source.split("::");
  if (halves.length === 1) {
    const groups = parseGroups(source);
    if (groups === null || groups.length !== 8) return null;
    return groups;
  }
  if (halves.length !== 2) return null;
  const left = parseGroups(halves[0] ?? "");
  const right = parseGroups(halves[1] ?? "");
  if (left === null || right === null) return null;
  const missing = 8 - left.length - right.length;
  if (missing < 1) return null;
  const middle = new Array<number>(missing).fill(0);
  return [...left, ...middle, ...right];
}

function isZero(groups: readonly number[]): boolean {
  return groups.every((group) => group === 0);
}

function isLoopbackV6(groups: readonly number[]): boolean {
  return groups.length === 8 && groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1;
}

function isMetadataV6(groups: readonly number[]): boolean {
  return (
    groups.length === 8 &&
    groups[0] === 0xfd00 &&
    groups[1] === 0x0ec2 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0 &&
    groups[6] === 0 &&
    groups[7] === 0x0254
  );
}

function embeddedIpv4(groups: readonly number[]): readonly [number, number, number, number] | null {
  if (groups.length !== 8) return null;
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;
  if (
    g0 === undefined ||
    g1 === undefined ||
    g2 === undefined ||
    g3 === undefined ||
    g4 === undefined ||
    g5 === undefined ||
    g6 === undefined ||
    g7 === undefined
  ) {
    return null;
  }
  const prefixZero = (values: readonly (number | undefined)[]): boolean =>
    values.every((value) => value === 0);
  const mapped = prefixZero([g0, g1, g2, g3, g4]) && g5 === 0xffff;
  const compatible = prefixZero([g0, g1, g2, g3, g4, g5]);
  const nat64 = g0 === 0x0064 && g1 === 0xff9b && prefixZero([g2, g3, g4, g5]);
  if (!mapped && !compatible && !nat64) return null;
  const high = g6;
  const low = g7;
  return [high >> 8, high & 0xff, low >> 8, low & 0xff];
}

function acceptOrReason(hostClass: HostClass, local: boolean): RefusalReason | null {
  if (hostClass === "public") return null;
  if (hostClass === "private") return local ? null : "private";
  return hostClass;
}

function assessIpv6(groups: readonly number[], local: boolean): RefusalReason {
  if (isZero(groups) || isLoopbackV6(groups)) return "loopback";
  if (isMetadataV6(groups)) return "metadata";
  const embedded = embeddedIpv4(groups);
  if (embedded !== null) {
    const hostClass = classifyIpv4(embedded);
    const accepted = acceptOrReason(hostClass, local);
    return accepted === null ? "ipv6" : accepted;
  }
  const first = groups[0];
  if (first !== undefined && (first & 0xffc0) === 0xfe80) return "link_local";
  if (first !== undefined && (first & 0xfe00) === 0xfc00) return local ? "ipv6" : "private";
  return "ipv6";
}

function assessHost(host: string, local: boolean): RefusalReason | null {
  if (host.startsWith("[")) {
    const groups = parseIpv6(host.slice(1, -1));
    if (groups === null) return "ipv6";
    return assessIpv6(groups, local);
  }

  const ipv4 = parseIpv4(host);
  if (ipv4 !== null) return acceptOrReason(classifyIpv4(ipv4), local);

  const name = host.toLowerCase();
  if (name === "localhost" || name.endsWith(".localhost")) return "loopback";
  if (name === "metadata.google.internal") return "metadata";
  const base = name.endsWith(".local") ? name.slice(0, -".local".length) : name;
  if (SERVICE_NAMES.has(name) || SERVICE_NAMES.has(base)) return "service_name";
  if (name === "host.docker.internal" || name === "host-gateway") {
    return local ? null : "private";
  }
  return null;
}

export function validateOrigin(url: string, opts: { local: boolean }): OriginCheck {
  if (url.length > MAX_URL_LENGTH) return refuse("not_url");

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return refuse("not_url");
  }

  if (parsed.protocol !== "https:" && !(opts.local && parsed.protocol === "http:")) {
    return refuse("scheme");
  }
  if (parsed.username !== "" || parsed.password !== "") return refuse("credentials");
  if (parsed.href !== parsed.origin + "/") return refuse("path");

  const hostname = parsed.hostname;
  const host = hostname.endsWith("]") ? hostname : hostname.replace(/\.$/, "");
  const reason = assessHost(host, opts.local);
  if (reason !== null) return refuse(reason);

  const port = parsed.port;
  const origin = `${parsed.protocol}//${host}${port === "" ? "" : `:${port}`}`;
  return { ok: true, origin };
}
