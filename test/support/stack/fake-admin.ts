// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export interface RecordedRequest {
  method: string;
  path: string;
  authorization: string | null;
  contentType: string | null;
  body: string;
}

export interface FakeAdminOptions {
  adminUser?: string;
  adminPassword: string;
  groups?: readonly string[];
  organizations?: readonly { alias: string; members?: readonly string[] }[];
  users?: readonly { username: string; groups?: readonly string[] }[];
  clients?: readonly string[];
  missingRealm?: boolean;
  failOn?: { method: string; path: string; status: number };
  hang?: boolean;
}

export interface FakeAdminSnapshot {
  groups: string[];
  organizations: { alias: string; members: string[] }[];
  users: {
    username: string;
    groups: string[];
    password: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  }[];
  clients: {
    clientId: string;
    secret: string | null;
    serviceAccounts: boolean;
    standardFlow: boolean;
    audiences: string[];
  }[];
}

export interface FakeAdmin {
  url: string;
  token: string;
  requests: readonly RecordedRequest[];
  snapshot(): FakeAdminSnapshot;
  close(): Promise<void>;
}

export async function startFakeAdmin(_opts: FakeAdminOptions): Promise<FakeAdmin> {
  throw new Error("not implemented");
}
