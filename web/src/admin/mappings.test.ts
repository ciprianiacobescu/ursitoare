/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient, RequestOptions } from "../api/client.ts";
import type { CursorPage, FetchPage, PageRequest } from "../kit/data/cursor-list.ts";
import { ADMIN_PAGES, featureLiterals } from "./pages.ts";
import type { FeatureLiterals } from "./pages.ts";
import {
  ISSUER_HINT,
  defaultIssuer,
  grantOptions,
  loadAllItems,
  mappedMessage,
  mappingCells,
  mappingRequest,
  parseGroupMapping,
  setMapping,
} from "./mappings.ts";
import type { GrantOption, MappingCells, MappingRow } from "./mappings.ts";

assert.equal(typeof parseGroupMapping, "function");

const ISSUER = "https://idp.example/realms/u";
const REVIEWER = "operator:e2e-seed";
const AUTHOR_MAPPING = {
  issuer: ISSUER,
  group: "ursitoare-authors",
  roleId: "author",
  teamId: null,
  reviewedBy: REVIEWER,
};
const TEAM_MAPPING = {
  ...AUTHOR_MAPPING,
  roleId: null,
  teamId: "finance",
};
const ROLE_BODY = { issuer: ISSUER, group: "ursitoare-auditors", roleId: "auditor" };
const TEAM_BODY = { issuer: ISSUER, group: "ursitoare-auditors", teamId: "finance" };
const OPTIONS: readonly GrantOption[] = [
  { value: "role:author", label: "Role: author" },
  { value: "role:auditor", label: "Role: auditor" },
  { value: "team:finance", label: "Team: finance" },
];

const ISSUER_HINT_TEXT = "The issuer URL your identity provider puts in tokens (iss).";
const ISSUER_EMPTY = "Enter the issuer URL.";
const ISSUER_TOO_LONG = "An issuer has at most 2048 characters.";
const ISSUER_CONTROL = "Use no line breaks or control characters in an issuer.";
const GROUP_EMPTY = "Enter the group name exactly as the identity provider sends it.";
const GROUP_TOO_LONG = "A group name has at most 255 characters.";
const GROUP_CONTROL = "Use no line breaks or control characters in a group name.";
const GRANT_INVALID = "Choose a role or a team.";
const MAPPED_MESSAGE = "Mapped ops. Members get it the next time they sign in.";

const FEATURE_URL = new URL("../features/62-admin-group-mappings.tsx", import.meta.url);

function parsed(raw: unknown, label: string): MappingRow {
  let result: MappingRow | null | undefined;
  assert.doesNotThrow(() => {
    result = parseGroupMapping(raw);
  }, `${label} parses without throwing`);
  assert.ok(result !== null && result !== undefined, `${label} parses to a mapping`);
  return result as MappingRow;
}

function refused(raw: unknown, label: string): void {
  let result: MappingRow | null | undefined;
  assert.doesNotThrow(() => {
    result = parseGroupMapping(raw);
  }, `${label} parses without throwing`);
  assert.equal(result, null, `${label} is refused`);
}

function cells(mapping: MappingRow, label: string): MappingCells {
  let result: MappingCells | undefined;
  assert.doesNotThrow(() => {
    result = mappingCells(mapping);
  }, `${label} builds cells without throwing`);
  assert.ok(result !== undefined, `${label} produced cells`);
  return result;
}

function options(roles: readonly string[], teams: readonly string[], label: string): GrantOption[] {
  let result: GrantOption[] | undefined;
  assert.doesNotThrow(() => {
    result = grantOptions(roles, teams);
  }, `${label} builds options without throwing`);
  assert.ok(result !== undefined, `${label} produced options`);
  return result;
}

function firstIssuer(rows: readonly MappingRow[], label: string): string {
  let result: string | undefined;
  assert.doesNotThrow(() => {
    result = defaultIssuer(rows);
  }, `${label} reads the default issuer without throwing`);
  assert.ok(result !== undefined, `${label} produced an issuer`);
  return result;
}

type MappingRequestResult = ReturnType<typeof mappingRequest>;

function request(
  input: { issuer: string; group: string; grant: string },
  choices: readonly GrantOption[],
  label: string,
): MappingRequestResult {
  let result: MappingRequestResult | undefined;
  assert.doesNotThrow(() => {
    result = mappingRequest(input, choices);
  }, `${label} builds a request without throwing`);
  assert.ok(result !== undefined, `${label} produced a request result`);
  return result;
}

interface PutCall {
  readonly path: string;
  readonly body: unknown;
}

interface RecordingPutClient {
  readonly client: Pick<ApiClient, "put">;
  readonly calls: PutCall[];
}

function recordingPutClient(response: unknown): RecordingPutClient {
  const calls: PutCall[] = [];
  const client: Pick<ApiClient, "put"> = {
    async put<T>(path: string, body?: unknown, _opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, body });
      return response as T;
    },
  };
  return { client, calls };
}

interface PagedFetcher {
  readonly requests: PageRequest[];
  readonly fetchPage: FetchPage<number>;
}

function pagedFetcher(pages: readonly CursorPage<number>[]): PagedFetcher {
  const requests: PageRequest[] = [];
  let index = 0;
  const fetchPage: FetchPage<number> = async (pageRequest) => {
    requests.push(pageRequest);
    const page = pages[index];
    index += 1;
    if (page === undefined) {
      throw new Error("the loader asked for a page that is not there");
    }
    return page;
  };
  return { requests, fetchPage };
}

function endlessFetcher(): PagedFetcher {
  const requests: PageRequest[] = [];
  const fetchPage: FetchPage<number> = async (pageRequest) => {
    requests.push(pageRequest);
    const page = requests.length;
    return { items: [page], next_cursor: `c${page}` };
  };
  return { requests, fetchPage };
}

function asked(requests: readonly PageRequest[]): { cursor: string | null; limit: number }[] {
  return requests.map((pageRequest) => ({
    cursor: pageRequest.cursor,
    limit: pageRequest.limit,
  }));
}

test("C-b8ae0992 parseGroupMapping keeps a role or team mapping and refuses the rest", () => {
  assert.deepEqual(parsed(AUTHOR_MAPPING, "the role mapping"), AUTHOR_MAPPING);
  assert.deepEqual(parsed(TEAM_MAPPING, "the team mapping"), TEAM_MAPPING);

  refused({ ...AUTHOR_MAPPING, teamId: "finance" }, "a mapping with both targets");
  refused({ ...AUTHOR_MAPPING, group: "" }, "a mapping with an empty group");
});

test("C-b8ae0992 mappingCells shows the group grants issuer and reviewer", () => {
  const role = parsed(AUTHOR_MAPPING, "the role mapping");
  assert.deepEqual(cells(role, "the role mapping"), {
    group: "ursitoare-authors",
    grants: "Role: author",
    issuer: ISSUER,
    reviewedBy: REVIEWER,
  });

  const team = parsed(TEAM_MAPPING, "the team mapping");
  assert.deepEqual(cells(team, "the team mapping"), {
    group: "ursitoare-authors",
    grants: "Team: finance",
    issuer: ISSUER,
    reviewedBy: REVIEWER,
  });
});

test("C-b8ae0992 grantOptions lists every role then every team", () => {
  assert.deepEqual(options(["author", "auditor"], ["finance"], "the options"), [
    { value: "role:author", label: "Role: author" },
    { value: "role:auditor", label: "Role: auditor" },
    { value: "team:finance", label: "Team: finance" },
  ]);
});

test("C-b8ae0992 defaultIssuer picks the first issuer and the hint explains the field", () => {
  assert.equal(firstIssuer([], "no mappings"), "", "no mappings give no default issuer");

  const first = parsed({ ...AUTHOR_MAPPING, issuer: "https://a.example/r" }, "the first mapping");
  const second = parsed({ ...AUTHOR_MAPPING, issuer: "https://b.example/r" }, "the second mapping");
  assert.equal(
    firstIssuer([first, second], "two mappings"),
    "https://a.example/r",
    "the first mapping wins",
  );

  assert.equal(ISSUER_HINT, ISSUER_HINT_TEXT, "the issuer hint is the field's help text");
});

test("C-5e078fd3 mappingRequest trims the issuer and group for a role or team", () => {
  const role = request(
    { issuer: ` ${ISSUER} `, group: " ursitoare-auditors ", grant: "role:auditor" },
    OPTIONS,
    "the role request",
  );
  assert.deepEqual(role, {
    ok: true,
    body: { issuer: ISSUER, group: "ursitoare-auditors", roleId: "auditor" },
  });

  const team = request(
    { issuer: ` ${ISSUER} `, group: " ursitoare-auditors ", grant: "team:finance" },
    OPTIONS,
    "the team request",
  );
  assert.deepEqual(team, {
    ok: true,
    body: { issuer: ISSUER, group: "ursitoare-auditors", teamId: "finance" },
  });
});

test("C-5e078fd3 mappingRequest reports each empty field", () => {
  const result = request({ issuer: "", group: "", grant: "" }, OPTIONS, "the empty form");
  assert.deepEqual(result, {
    ok: false,
    errors: { issuer: ISSUER_EMPTY, group: GROUP_EMPTY, grant: GRANT_INVALID },
  });
});

test("C-5e078fd3 mappingRequest refuses a grant that is not offered", () => {
  const result = request(
    { issuer: ` ${ISSUER} `, group: " ursitoare-auditors ", grant: "role:root" },
    OPTIONS,
    "the unknown grant",
  );
  assert.deepEqual(result, { ok: false, errors: { grant: GRANT_INVALID } });
});

test("C-5e078fd3 mappingRequest bounds the issuer and group texts", () => {
  const controlGroup = request(
    { issuer: ISSUER, group: "a\nb", grant: "role:auditor" },
    OPTIONS,
    "the group with a line break",
  );
  assert.deepEqual(controlGroup, { ok: false, errors: { group: GROUP_CONTROL } });

  const longGroup = request(
    { issuer: ISSUER, group: "g".repeat(256), grant: "role:auditor" },
    OPTIONS,
    "the 256 character group",
  );
  assert.deepEqual(longGroup, { ok: false, errors: { group: GROUP_TOO_LONG } });

  const longIssuer = request(
    { issuer: "i".repeat(2049), group: "ursitoare-auditors", grant: "role:auditor" },
    OPTIONS,
    "the 2049 character issuer",
  );
  assert.deepEqual(longIssuer, { ok: false, errors: { issuer: ISSUER_TOO_LONG } });

  const controlIssuer = request(
    { issuer: "https://idp.example/\u0000", group: "ursitoare-auditors", grant: "role:auditor" },
    OPTIONS,
    "the issuer with a control character",
  );
  assert.deepEqual(controlIssuer, { ok: false, errors: { issuer: ISSUER_CONTROL } });
});

test("C-741e5139 setMapping puts the body and reads the returned mapping", async () => {
  const recording = recordingPutClient(AUTHOR_MAPPING);
  let result: MappingRow | undefined;
  await assert.doesNotReject(async () => {
    result = await setMapping(recording.client, ROLE_BODY);
  }, "saving a mapping resolves");
  assert.ok(result !== undefined, "saving a mapping returned the mapping");
  assert.equal(recording.calls.length, 1, "the client got one call");
  const call = recording.calls[0];
  assert.ok(call !== undefined, "the call was recorded");
  assert.equal(call.path, "/idp-group-map", "the mapping is saved on the group map path");
  assert.deepEqual(call.body, ROLE_BODY, "the body carries the trimmed mapping");
  assert.deepEqual(result, AUTHOR_MAPPING, "the answer is the saved mapping");
});

test("C-741e5139 setMapping puts a team mapping without a role", async () => {
  const recording = recordingPutClient(TEAM_MAPPING);
  let result: MappingRow | undefined;
  await assert.doesNotReject(async () => {
    result = await setMapping(recording.client, TEAM_BODY);
  }, "saving a team mapping resolves");
  assert.ok(result !== undefined, "saving a team mapping returned the mapping");
  const call = recording.calls[0];
  assert.ok(call !== undefined, "the call was recorded");
  assert.deepEqual(call.body, TEAM_BODY, "the team body carries no role");
  assert.deepEqual(result, TEAM_MAPPING, "the answer is the saved team mapping");
});

test("C-741e5139 loadAllItems reads every page with a size of two hundred", async () => {
  const paged = pagedFetcher([
    { items: [1, 2], next_cursor: "c1" },
    { items: [3], next_cursor: null },
  ]);
  let items: number[] | undefined;
  await assert.doesNotReject(async () => {
    items = await loadAllItems(paged.fetchPage);
  }, "reading every page resolves");
  assert.deepEqual(items, [1, 2, 3], "the items of every page are returned");
  assert.deepEqual(asked(paged.requests), [
    { cursor: null, limit: 200 },
    { cursor: "c1", limit: 200 },
  ]);
});

test("C-741e5139 loadAllItems stops after five pages", async () => {
  const endless = endlessFetcher();
  let items: number[] | undefined;
  await assert.doesNotReject(async () => {
    items = await loadAllItems(endless.fetchPage);
  }, "reading the endless pages resolves");
  assert.equal(endless.requests.length, 5, "the loader asked for five pages");
  assert.deepEqual(items, [1, 2, 3, 4, 5], "the five pages are returned");
});

test("C-741e5139 loadAllItems throws the error of a failed page", async () => {
  const failure = new ApiRequestError(503, "AUTHZ_UNAVAILABLE", "x");
  const fetchPage: FetchPage<number> = async () => {
    throw failure;
  };
  await assert.rejects(
    loadAllItems(fetchPage),
    (error: unknown) => error === failure,
    "the loader throws the page error",
  );
});

test("C-741e5139 mappedMessage names the group within the toast limit", () => {
  let message: string | undefined;
  assert.doesNotThrow(() => {
    message = mappedMessage("ops");
  }, "a short mapped message is built without throwing");
  assert.equal(message, MAPPED_MESSAGE, "a short group is named in full");

  const longGroup = "g".repeat(255);
  let longMessage: string | undefined;
  assert.doesNotThrow(() => {
    longMessage = mappedMessage(longGroup);
  }, "a long mapped message is built without throwing");
  assert.ok(longMessage !== undefined, "a long group produced a message");
  assert.ok(longMessage.length <= 300, "the mapped message fits the toast limit");
  assert.ok(
    longMessage.includes(`${"g".repeat(79)}…`),
    "the long group is cut by clip",
  );
});

test("C-bf07943b the group mappings feature file declares its literal page entry", () => {
  assert.ok(existsSync(FEATURE_URL), `${FEATURE_URL.pathname} must exist`);
  const source = readFileSync(FEATURE_URL, "utf8");
  const entry = ADMIN_PAGES.find((page) => page.id === "admin-group-mappings");
  assert.ok(entry !== undefined, "the admin-group-mappings page is listed");
  const expected: FeatureLiterals = {
    id: entry.id,
    path: entry.path,
    navLabel: entry.navLabel,
    capability: entry.capability,
  };

  let literal: FeatureLiterals | null | undefined;
  assert.doesNotThrow(() => {
    literal = featureLiterals(source);
  }, "the feature file literals are read");
  assert.deepEqual(literal, expected, "the feature file declares its page entry without the file");
});
