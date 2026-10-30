import type { FastifyReply, FastifyRequest } from "fastify";

import type { Principal } from "../identity/index.ts";
import { RouteDefinitionError } from "./route.ts";
import type { ListFilter, SqlPredicate } from "./route.ts";

const predicateApplied = new WeakSet<FastifyRequest>();
const filtered = new WeakSet<FastifyRequest>();

function filterOf(request: FastifyRequest): ListFilter | undefined {
  return (request.routeOptions.config as { listFilter?: ListFilter }).listFilter;
}

function isSuccess(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function principalOf(request: FastifyRequest): Principal {
  const principal = request.principal;
  if (principal === undefined) {
    throw new Error("list filter requires an authenticated principal");
  }
  return principal;
}

export function listPredicate(request: FastifyRequest, first: number): SqlPredicate {
  const filter = filterOf(request);
  if (filter === undefined || filter.kind !== "sql") {
    throw new RouteDefinitionError(
      "ROUTE_DEF_INVALID",
      "The route has no sql list filter",
      { reason: "no_sql_filter" },
    );
  }
  const predicate = filter.predicate(principalOf(request), first);
  predicateApplied.add(request);
  return predicate;
}

export interface ListFilterHooks {
  preSerialization(
    request: FastifyRequest,
    reply: FastifyReply,
    payload: unknown,
  ): Promise<unknown>;
  onSend(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}

export function listFilterHooks(filter: ListFilter): ListFilterHooks {
  return {
    async preSerialization(request, reply, payload) {
      if (!isSuccess(reply.statusCode)) {
        return payload;
      }
      if (filter.kind === "item") {
        if (!isRecord(payload) || !Array.isArray(payload.items)) {
          throw new Error("a list filter needs an object payload with an items array");
        }
        const principal = principalOf(request);
        const items: unknown[] = [];
        for (const item of payload.items) {
          if (await filter.canRead(principal, item)) {
            items.push(item);
          }
        }
        filtered.add(request);
        return { ...payload, items };
      }
      if (!predicateApplied.has(request)) {
        request.log.warn({ code: "LIST_FILTER_NOT_APPLIED" }, "list filter not applied");
        throw new Error("the sql list predicate was not applied");
      }
      filtered.add(request);
      return payload;
    },
    async onSend(request, reply) {
      if (!isSuccess(reply.statusCode)) {
        return;
      }
      if (!filtered.has(request)) {
        request.log.warn({ code: "LIST_FILTER_NOT_APPLIED" }, "list filter not applied");
        throw new Error("the list filter did not run");
      }
    },
  };
}
