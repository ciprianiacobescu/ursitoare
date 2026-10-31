import { listUsers, loadMemberships } from "../../identity/index.ts";
import type { User } from "../../identity/index.ts";
import { CliError } from "../errors.ts";
import { safeText } from "../output.ts";
import { defineAdminCommand } from "./define.ts";
import type { AdminCall, AdminResult, AdminSpec } from "./define.ts";

const DEFAULT_LIMIT = 50;
const LIMIT_PATTERN = /^[0-9]{1,3}$/;
const AFTER_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function resolveLimit(value: unknown): number {
  if (value === undefined) return DEFAULT_LIMIT;
  if (typeof value !== "string" || !LIMIT_PATTERN.test(value)) {
    throw new CliError("CLI_USAGE", "--limit must be an integer from 1 to 200");
  }
  const limit = Number.parseInt(value, 10);
  if (limit < 1 || limit > 200) {
    throw new CliError("CLI_USAGE", "--limit must be an integer from 1 to 200");
  }
  return limit;
}

function resolveAfter(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !AFTER_PATTERN.test(value)) {
    throw new CliError("CLI_USAGE", "--after is not a valid user id");
  }
  return value;
}

interface ListedUser {
  userId: string;
  kind: string;
  state: string;
  displayName: string;
  email: string | null;
  ownerUserId: string | null;
  roles: string[];
  teams: string[];
}

function listedLine(user: ListedUser): string {
  return [
    user.userId,
    user.kind,
    user.state,
    user.roles.join(","),
    user.teams.join(","),
    safeText(user.displayName),
  ].join("\t");
}

const spec: AdminSpec = {
  summary: "list the tenant's users with their roles and teams",
  options: {
    limit: { type: "string", summary: "maximum number of users to print (default 50)" },
    after: { type: "string", summary: "start after this user id" },
  },
  async run(call: AdminCall): Promise<AdminResult> {
    const limit = resolveLimit(call.args.limit);
    const after = resolveAfter(call.args.after);
    const page = await listUsers(call.tx, call.tenant, { limit, ...(after === undefined ? {} : { after }) });
    const users: ListedUser[] = [];
    for (const user of page.users as User[]) {
      const memberships = await loadMemberships(call.tx, call.tenant, user.userId);
      users.push({
        userId: user.userId,
        kind: user.kind,
        state: user.state,
        displayName: user.displayName,
        email: user.email,
        ownerUserId: user.ownerUserId,
        roles: memberships.roles,
        teams: memberships.teams,
      });
    }
    const data = { users, next: page.next };
    const audit = { count: users.length };
    if (users.length === 0) {
      return { lines: ["no users"], data, audit };
    }
    const lines = users.map(listedLine);
    if (page.next !== null) {
      lines.push(`next: ${page.next}`);
    }
    return { lines, data, audit };
  },
};

export const listUsersCommand = defineAdminCommand("admin list-users", spec);
