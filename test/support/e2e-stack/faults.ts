import type { FastifyReply, FastifyRequest } from "fastify";

export interface Fault {
  method: string;
  url: string;
  delayMs?: number;
  status?: number;
}

export class FaultInvalidError extends Error {
  readonly code = "FAULT_INVALID" as const;
  readonly reason: string;
  constructor(reason: string) {
    super(`Invalid fault: ${reason}`);
    this.name = "FaultInvalidError";
    this.reason = reason;
  }
}

const METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const KEYS = new Set(["method", "url", "delayMs", "status"]);
const MAX_FAULTS = 100;

function validUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length === 0 || url.length > 512 || !url.startsWith("/")) return false;
  if (!/^[\x20-\x7e]+$/.test(url)) return false;
  if (url.includes("?") || url.includes("#")) return false;
  const star = url.indexOf("*");
  return star === -1 || star === url.length - 1;
}

export function parseFault(body: unknown): Fault {
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw new FaultInvalidError("not_object");
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => !KEYS.has(key))) throw new FaultInvalidError("unknown_property");
  if (typeof input.method !== "string" || !METHODS.has(input.method)) throw new FaultInvalidError("bad_method");
  if (!validUrl(input.url)) throw new FaultInvalidError("bad_url");
  const { delayMs, status } = input;
  if (delayMs !== undefined && !(Number.isInteger(delayMs) && (delayMs as number) >= 0 && (delayMs as number) <= 30000)) {
    throw new FaultInvalidError("bad_delay");
  }
  if (status !== undefined && !(Number.isInteger(status) && (status as number) >= 400 && (status as number) <= 599)) {
    throw new FaultInvalidError("bad_status");
  }
  if (delayMs === undefined && status === undefined) throw new FaultInvalidError("empty_fault");
  const fault: Fault = { method: input.method, url: input.url };
  if (delayMs !== undefined) fault.delayMs = delayMs as number;
  if (status !== undefined) fault.status = status as number;
  return fault;
}

export interface FaultTable {
  add(fault: Fault): void;
  clear(): void;
  list(): Fault[];
  hook(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply | undefined>;
}

function matches(fault: Fault, method: string, path: string): boolean {
  if (fault.method !== method) return false;
  if (fault.url.endsWith("*")) return path.startsWith(fault.url.slice(0, -1));
  return path === fault.url;
}

export function createFaultTable(opts?: { sleep?: (ms: number) => Promise<void> }): FaultTable {
  const sleep = opts?.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let faults: Fault[] = [];
  return {
    add(fault) {
      const index = faults.findIndex((f) => f.method === fault.method && f.url === fault.url);
      if (index >= 0) {
        faults[index] = { ...fault };
        return;
      }
      if (faults.length >= MAX_FAULTS) throw new FaultInvalidError("too_many");
      faults.push({ ...fault });
    },
    clear() {
      faults = [];
    },
    list() {
      return faults.map((f) => ({ ...f }));
    },
    async hook(request, reply) {
      const path = request.url.split("?")[0] ?? "";
      const fault = faults.find((f) => matches(f, request.method, path));
      if (fault === undefined) return undefined;
      if (fault.delayMs !== undefined) await sleep(fault.delayMs);
      if (fault.status === undefined) return undefined;
      return reply
        .code(fault.status)
        .send({ error: { code: "FAULT_INJECTED", message: "Injected fault", details: { status: fault.status } } });
    },
  };
}
