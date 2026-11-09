import type { Logger } from "../../src/observability/index.ts";
import { createLogger } from "../../src/observability/index.ts";
import { fixedClock, sequentialIds } from "../../src/core/index.ts";
import { createPdp } from "../../src/pdp/index.ts";
import type { Egress, Permit, PolicyRequest, PolicySource } from "../../src/pdp/index.ts";

export const BASE_EGRESS: Readonly<Egress> = {
  method: "POST",
  host: "tools.fake.test",
  path: "/v1/lookup?id=7",
  bodyDigest: "0e9900c914ed43a1be38e237e918e29501562e302390f970957dd30a83a41966",
  serviceId: "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01",
  ttlSeconds: 60,
};

const SCHEMA = "entity User;\nentity Doc;\naction send appliesTo { principal: User, resource: Doc, context: {} };\n";

const POLICY: PolicySource = {
  id: "allow-send",
  layer: "tenant",
  text: `@id("allow-send") permit (principal, action == Action::"send", resource);`,
};

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: { write(_line: string): void {} },
  });
}

export async function issuedPermit(over?: Partial<Egress>): Promise<Permit> {
  const pdp = await createPdp({
    schema: SCHEMA,
    policies: [POLICY],
    clock: fixedClock("2026-11-06T10:00:00.000Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  });
  const req: PolicyRequest = {
    principal: { type: "User", id: "alice" },
    action: "send",
    resource: { type: "Doc", id: "d1" },
    context: {},
    entities: [
      { uid: { type: "User", id: "alice" }, attrs: {}, parents: [] },
      { uid: { type: "Doc", id: "d1" }, attrs: {}, parents: [] },
    ],
    egress: { ...BASE_EGRESS, ...over },
  };
  const decision = await pdp.check(req);
  if (decision.decision !== "allow" || decision.permit === undefined) {
    throw new Error("not implemented");
  }
  return decision.permit;
}

// Signature stubs (milestone scaffold, docs/decisions/0002): the change that owns this file implements them.

export function recordingFetch(answers: (Response | Error)[]): {
  fetch: typeof fetch;
  calls: { url: string; init: RequestInit }[];
} {
  const calls: { url: string; init: RequestInit }[] = [];
  const queue = [...answers];

  const fetchFn = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, init: init ?? {} });
    const answer = queue.shift();
    if (answer === undefined) throw new Error("recordingFetch: no answer queued");
    if (answer instanceof Error) throw answer;
    return answer;
  };

  return { fetch: fetchFn as typeof fetch, calls };
}

export function captureLogger(): { logger: Logger; lines(): Record<string, unknown>[] } {
  const captured: Record<string, unknown>[] = [];
  const logger = createLogger({
    level: "trace",
    destination: {
      write(line: string): void {
        const trimmed = line.trim();
        if (trimmed.length === 0) return;
        captured.push(JSON.parse(trimmed) as Record<string, unknown>);
      },
    },
  });
  return { logger, lines: () => captured };
}
