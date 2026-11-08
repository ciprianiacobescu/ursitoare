import { randomBytes } from "node:crypto";
import type { KeyObject } from "node:crypto";

import type { FakeAuditEvent, ForwardedRequest, IssuedToken, StoredCredential } from "./index.ts";

export interface StoredEntry {
  meta: StoredCredential;
  value: Buffer;
}

export interface FakeState {
  now: () => Date;
  brokerServiceToken: string;
  proxyServiceToken: string;
  privateKey: KeyObject;
  publicJwk: { kty: string; crv: string; x: string };
  kid: string;
  credentials: Map<string, StoredEntry>;
  credentialless: Map<string, string>;
  upstreams: Map<string, string>;
  issued: IssuedToken[];
  requests: ForwardedRequest[];
  events: FakeAuditEvent[];
  emit(event: FakeAuditEvent): Promise<void>;
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function randomId(prefix: string): string {
  const bytes = randomBytes(26);
  let out = prefix;
  for (const b of bytes) out += CROCKFORD[b % 32];
  return out;
}

export function randomSecret(): string {
  return randomBytes(24).toString("base64url");
}

export function credentialKey(tenantId: string, serviceId: string): string {
  return `${tenantId}/${serviceId}`;
}
