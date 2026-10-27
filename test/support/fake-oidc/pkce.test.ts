import assert from "node:assert/strict";
import { test } from "node:test";

import { pkceChallengeS256, verifyPkce } from "./pkce.ts";

const RFC_VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const RFC_CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

test("C-868f25bb the RFC 7636 appendix B verifier produces its S256 challenge and verifies", () => {
  assert.doesNotThrow(() => {
    assert.equal(pkceChallengeS256(RFC_VERIFIER), RFC_CHALLENGE);
    assert.equal(verifyPkce(RFC_VERIFIER, RFC_CHALLENGE), true);
  });
});

test("C-868f25bb verifyPkce rejects a wrong challenge and an empty challenge", () => {
  assert.doesNotThrow(() => {
    assert.equal(verifyPkce(RFC_VERIFIER, "A".repeat(43)), false);
    assert.equal(verifyPkce(RFC_VERIFIER, ""), false);
  });
});

test("C-868f25bb verifier lengths 43 and 128 verify and 42 and 129 do not", () => {
  assert.doesNotThrow(() => {
    const shortest = "a".repeat(43);
    const longest = "A".repeat(128);
    assert.equal(shortest.length, 43);
    assert.equal(longest.length, 128);
    assert.equal(verifyPkce(shortest, pkceChallengeS256(shortest)), true);
    assert.equal(verifyPkce(longest, pkceChallengeS256(longest)), true);

    const tooShort = "b".repeat(42);
    const tooLong = "B".repeat(129);
    assert.equal(verifyPkce(tooShort, pkceChallengeS256(tooShort)), false);
    assert.equal(verifyPkce(tooLong, pkceChallengeS256(tooLong)), false);
  });
});

test("C-868f25bb a verifier with a plus sign is rejected even when its challenge matches", () => {
  assert.doesNotThrow(() => {
    const withPlus = `${"c".repeat(42)}+`;
    assert.equal(withPlus.length, 43);
    assert.equal(verifyPkce(withPlus, pkceChallengeS256(withPlus)), false);
  });
});
