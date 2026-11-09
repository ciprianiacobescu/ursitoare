import assert from "node:assert/strict";
import { test } from "node:test";

import { validateOrigin } from "./origin.ts";
import type { OriginCheck } from "./types.ts";

type RefusalReason = Extract<OriginCheck, { ok: false }>["reason"];

interface OriginCase {
  readonly n: number;
  readonly input: string;
  readonly local: boolean;
  readonly expected: OriginCheck;
}

function ok(origin: string): OriginCheck {
  return { ok: true, origin };
}

function refused(reason: RefusalReason): OriginCheck {
  return { ok: false, reason };
}

const CASES: readonly OriginCase[] = [
  { n: 1, input: "https://tools.fake.test", local: false, expected: ok("https://tools.fake.test") },
  { n: 2, input: "HTTPS://Tools.Fake.Test:443", local: false, expected: ok("https://tools.fake.test") },
  { n: 3, input: "https://api.example.com.", local: false, expected: ok("https://api.example.com") },
  { n: 4, input: "http://api.example.com", local: false, expected: refused("scheme") },
  { n: 5, input: "http://api.example.com", local: true, expected: ok("http://api.example.com") },
  {
    n: 6,
    input: "https://user:pw@api.example.com",
    local: false,
    expected: refused("credentials"),
  },
  { n: 7, input: "https://api.example.com/v1", local: false, expected: refused("path") },
  { n: 8, input: "not a url", local: false, expected: refused("not_url") },
  { n: 9, input: "https://localhost", local: false, expected: refused("loopback") },
  { n: 10, input: "https://2130706433", local: false, expected: refused("loopback") },
  { n: 11, input: "https://[::ffff:127.0.0.1]", local: true, expected: refused("loopback") },
  { n: 12, input: "https://169.254.10.10", local: false, expected: refused("link_local") },
  { n: 13, input: "https://[fe80::1]", local: true, expected: refused("link_local") },
  { n: 14, input: "https://169.254.169.254", local: true, expected: refused("metadata") },
  {
    n: 15,
    input: "https://metadata.google.internal",
    local: true,
    expected: refused("metadata"),
  },
  { n: 16, input: "https://[fd00:ec2::254]", local: true, expected: refused("metadata") },
  { n: 17, input: "https://10.1.2.3", local: false, expected: refused("private") },
  { n: 18, input: "http://10.1.2.3:8080", local: true, expected: ok("http://10.1.2.3:8080") },
  { n: 19, input: "https://broker.local", local: true, expected: refused("service_name") },
  { n: 20, input: "https://broker.fake.test", local: false, expected: ok("https://broker.fake.test") },
  { n: 21, input: "https://100.64.0.1", local: false, expected: refused("private") },
  { n: 22, input: "https://100.127.255.254", local: false, expected: refused("private") },
  { n: 23, input: "https://100.63.255.255", local: false, expected: ok("https://100.63.255.255") },
  { n: 24, input: "https://100.128.0.1", local: false, expected: ok("https://100.128.0.1") },
  { n: 25, input: "https://100.64.0.1", local: true, expected: ok("https://100.64.0.1") },
  { n: 26, input: "http://mintkey-vault:8084", local: true, expected: refused("service_name") },
  { n: 27, input: "http://ursitoare:8090", local: true, expected: refused("service_name") },
  { n: 28, input: "https://[2001:db8::1]", local: false, expected: refused("ipv6") },
  { n: 29, input: "https://[fd12:3456::1]:8443", local: true, expected: refused("ipv6") },
  { n: 30, input: "https://172.16.0.1", local: false, expected: refused("private") },
  { n: 31, input: "https://172.31.255.255", local: false, expected: refused("private") },
  { n: 32, input: "https://172.15.255.255", local: false, expected: ok("https://172.15.255.255") },
  { n: 33, input: "https://172.32.0.1", local: false, expected: ok("https://172.32.0.1") },
  { n: 34, input: "https://192.168.1.1", local: false, expected: refused("private") },
  { n: 35, input: "https://0.0.0.0", local: false, expected: refused("loopback") },
  { n: 36, input: "https://[::]", local: true, expected: refused("loopback") },
  { n: 37, input: "https://[::1]", local: true, expected: refused("loopback") },
  { n: 38, input: "https://[fc00::1]", local: false, expected: refused("private") },
  { n: 39, input: "https://[fdff::1]", local: false, expected: refused("private") },
  { n: 40, input: "https://[64:ff9b::7f00:1]", local: true, expected: refused("loopback") },
  { n: 41, input: "https://[64:ff9b::a01:203]", local: false, expected: refused("private") },
  { n: 42, input: "https://[64:ff9b::808:808]", local: false, expected: refused("ipv6") },
  { n: 43, input: "https://[::7f00:1]", local: true, expected: refused("loopback") },
  { n: 44, input: "https://[::a01:203]", local: false, expected: refused("private") },
  { n: 45, input: "https://app.localhost", local: false, expected: refused("loopback") },
  { n: 46, input: "https://host.docker.internal", local: false, expected: refused("private") },
  { n: 47, input: "https://host-gateway", local: false, expected: refused("private") },
  { n: 48, input: "https://broker", local: false, expected: refused("service_name") },
  { n: 49, input: "https://postgres.local", local: false, expected: refused("service_name") },
  { n: 50, input: "https://tools.fake.test?x=1", local: false, expected: refused("path") },
  { n: 51, input: "https://tools.fake.test#f", local: false, expected: refused("path") },
  { n: 52, input: "https://tools.fake.test?", local: false, expected: refused("path") },
  { n: 53, input: "https://tools.fake.test/", local: false, expected: ok("https://tools.fake.test") },
  {
    n: 54,
    input: "https://tools.fake.test/" + "a".repeat(2024),
    local: false,
    expected: refused("path"),
  },
  {
    n: 55,
    input: "https://tools.fake.test/" + "a".repeat(2025),
    local: false,
    expected: refused("not_url"),
  },
];

test("C-f1acd012: each of the 55 origin rows is accepted or refused with its reason", () => {
  assert.equal(CASES.length, 55);

  for (const item of CASES) {
    assert.doesNotThrow(() => {
      assert.deepEqual(
        validateOrigin(item.input, { local: item.local }),
        item.expected,
        `row ${item.n}: ${item.input}`,
      );
    }, `row ${item.n}: ${item.input}`);
  }
});
