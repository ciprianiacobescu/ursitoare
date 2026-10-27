import { identityError } from "./errors.ts";
import { requireText } from "./text.ts";

export const IDP_ROUTE_KIND: string = "idp";

export function idpRouteKey(issuer: string, organization: string): string {
  requireText(issuer, 2048);
  requireText(organization, 255);
  return issuer + "\n" + organization;
}

export function organizationFromClaim(organization: unknown): string {
  let entry: unknown = organization;
  if (Array.isArray(organization)) {
    if (organization.length === 0) throw identityError("IDENTITY_NO_ORGANIZATION");
    if (organization.length > 1) throw identityError("IDENTITY_AMBIGUOUS_ORGANIZATION");
    entry = organization[0];
  }
  if (typeof entry !== "string") throw identityError("IDENTITY_NO_ORGANIZATION");
  try {
    return requireText(entry, 255);
  } catch {
    throw identityError("IDENTITY_NO_ORGANIZATION");
  }
}
