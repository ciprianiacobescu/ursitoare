// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { FastifyReply, FastifyRequest } from "fastify";

export interface Fault {
  method: string;
  url: string;
  delayMs?: number;
  status?: number;
}

export class FaultInvalidError extends Error {
  readonly code: "FAULT_INVALID";
  readonly reason: string;
  constructor(_reason: string) {
    super();
    throw new Error("not implemented");
  }
}

export function parseFault(_body: unknown): Fault {
  throw new Error("not implemented");
}

export interface FaultTable {
  add(fault: Fault): void;
  clear(): void;
  list(): Fault[];
  hook(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply | undefined>;
}

export function createFaultTable(_opts?: { sleep?: (ms: number) => Promise<void> }): FaultTable {
  throw new Error("not implemented");
}
