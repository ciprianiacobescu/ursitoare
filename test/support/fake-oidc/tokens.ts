import { createPublicKey } from "node:crypto";

import { signJwt } from "./jwt.ts";
import type { KeyRing, SigningKey } from "./keys.ts";
import { findClient, findUser, ORGANIZATIONS } from "./seed.ts";
import type { SeedUser } from "./seed.ts";
import { FakeOidcError } from "./types.ts";
import type { MintFlaw, MintOptions } from "./types.ts";

export type TokenContext = Readonly<{ issuer: string; now: () => Date; keys: KeyRing }>;

const FLAWS: readonly MintFlaw[] = [
  "none",
  "wrong_aud",
  "wrong_iss",
  "alg_none",
  "hs256_public_key",
  "expired",
  "missing_nonce",
  "wrong_nonce",
  "two_organizations",
  "unknown_kid",
  "foreign_key",
];

const DEFAULT_SCOPE = "openid profile email organization";

function hasOrganization(scope: string): boolean {
  return scope.split(/\s+/).includes("organization");
}

function commonClaims(
  ctx: TokenContext,
  user: SeedUser,
  clientId: string,
  scope: string,
  sid: string | undefined,
): Record<string, unknown> {
  const iat = Math.floor(ctx.now().getTime() / 1000);
  const claims: Record<string, unknown> = {
    iss: ctx.issuer,
    sub: user.sub,
    azp: clientId,
    iat,
    exp: iat + 300,
    email: user.email,
    email_verified: true,
    name: user.name,
    preferred_username: user.username,
    groups: [...user.groups],
  };
  if (sid !== undefined) claims["sid"] = sid;
  if (hasOrganization(scope)) claims["organization"] = [user.organization];
  return claims;
}

function idClaims(
  ctx: TokenContext,
  user: SeedUser,
  clientId: string,
  scope: string,
  sid: string | undefined,
  nonce: string | undefined,
): Record<string, unknown> {
  const claims = commonClaims(ctx, user, clientId, scope, sid);
  claims["typ"] = "ID";
  claims["aud"] = clientId;
  claims["auth_time"] = claims["iat"];
  if (nonce !== undefined) claims["nonce"] = nonce;
  return claims;
}

function accessClaims(
  ctx: TokenContext,
  user: SeedUser,
  clientId: string,
  scope: string,
  sid: string | undefined,
): Record<string, unknown> {
  const claims = commonClaims(ctx, user, clientId, scope, sid);
  claims["typ"] = "Bearer";
  claims["aud"] = clientId;
  claims["scope"] = scope;
  return claims;
}

function applyClaimFlaw(
  claims: Record<string, unknown>,
  flaw: MintFlaw,
  ctx: TokenContext,
  nonce: string | undefined,
  user: SeedUser,
): void {
  switch (flaw) {
    case "wrong_aud":
      claims["aud"] = "wrong-audience";
      return;
    case "wrong_iss":
      claims["iss"] = `${ctx.issuer}/other`;
      return;
    case "expired": {
      const iat = Math.floor(ctx.now().getTime() / 1000);
      claims["iat"] = iat - 600;
      claims["exp"] = iat - 300;
      return;
    }
    case "missing_nonce":
      delete claims["nonce"];
      return;
    case "wrong_nonce":
      claims["nonce"] = `${nonce ?? ""}-mismatch`;
      return;
    case "two_organizations":
      claims["organization"] = [
        user.organization,
        ...ORGANIZATIONS.filter((organization) => organization !== user.organization),
      ];
      return;
    default:
      return;
  }
}

function signingKeyFor(flaw: MintFlaw, keys: KeyRing): SigningKey {
  return flaw === "foreign_key" ? keys.foreign() : keys.current();
}

export function mintJwt(ctx: TokenContext, opts: MintOptions & { sid?: string }): string {
  const username = opts.user ?? "alice";
  const clientId = opts.clientId ?? "ursitoare-engine";
  const kind = opts.kind ?? "id";
  const flaw = opts.flaw ?? "none";
  const scope = opts.scope ?? DEFAULT_SCOPE;

  const user = findUser(username);
  if (user === undefined) {
    throw new FakeOidcError("FAKE_OIDC_UNKNOWN_USER", `unknown user: ${username}`);
  }
  if (findClient(clientId) === undefined) {
    throw new FakeOidcError("FAKE_OIDC_UNKNOWN_CLIENT", `unknown client: ${clientId}`);
  }
  if (!FLAWS.includes(flaw)) {
    throw new FakeOidcError("FAKE_OIDC_BAD_OPTIONS", `unknown flaw: ${String(flaw)}`);
  }

  const claims =
    kind === "access"
      ? accessClaims(ctx, user, clientId, scope, opts.sid)
      : idClaims(ctx, user, clientId, scope, opts.sid, opts.nonce);
  applyClaimFlaw(claims, flaw, ctx, opts.nonce, user);

  const key = signingKeyFor(flaw, ctx.keys);
  switch (flaw) {
    case "alg_none":
      return signJwt(claims, { alg: "none" });
    case "hs256_public_key": {
      const secret = createPublicKey({ key: key.jwk, format: "jwk" })
        .export({ type: "spki", format: "pem" })
        .toString();
      return signJwt(claims, { alg: "HS256", secret });
    }
    case "unknown_kid":
      return signJwt(claims, { alg: "RS256", kid: "unknown-kid", privateKey: key.privateKey });
    case "foreign_key":
      return signJwt(claims, { alg: "RS256", kid: ctx.keys.current().kid, privateKey: key.privateKey });
    default:
      return signJwt(claims, { alg: "RS256", kid: key.kid, privateKey: key.privateKey });
  }
}
