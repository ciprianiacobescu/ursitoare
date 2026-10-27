import { createHash } from "node:crypto";

export const ORGANIZATIONS = ["org-a", "org-b"] as const;

export type SeedUser = Readonly<{
  username: string;
  email: string;
  name: string;
  organization: string;
  groups: readonly string[];
  sub: string;
}>;

export type SeedClient = Readonly<{
  clientId: string;
  confidential: boolean;
}>;

function subjectFor(username: string): string {
  const bytes = Buffer.from(
    createHash("sha256").update(`ursitoare-fake-oidc/${username}`, "utf8").digest().subarray(0, 16),
  );
  bytes.writeUInt8((bytes.readUInt8(6) & 0x0f) | 0x50, 6);
  bytes.writeUInt8((bytes.readUInt8(8) & 0x3f) | 0x80, 8);
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function seedUser(
  username: string,
  organization: string,
  groups: readonly string[],
): SeedUser {
  const name = `${username.charAt(0).toUpperCase()}${username.slice(1)} Example`;
  return {
    username,
    email: `${username}@example.invalid`,
    name,
    organization,
    groups,
    sub: subjectFor(username),
  };
}

export const USERS: readonly SeedUser[] = [
  seedUser("alice", "org-a", ["ursitoare-authors", "team-finance"]),
  seedUser("bob", "org-a", ["ursitoare-approvers", "team-finance"]),
  seedUser("carol", "org-a", ["ursitoare-admins"]),
  seedUser("mallory", "org-b", ["ursitoare-authors"]),
];

export const CLIENTS: readonly SeedClient[] = [
  { clientId: "ursitoare-engine", confidential: true },
  { clientId: "ursitoare-mcp", confidential: false },
];

export function findUser(username: string): SeedUser | undefined {
  return USERS.find((user) => user.username === username);
}

export function findClient(clientId: string): SeedClient | undefined {
  return CLIENTS.find((client) => client.clientId === clientId);
}
