import type { FastifyInstance } from "fastify";

export function checkRouteCoverage(server: FastifyInstance): string[] {
  const state = server.ursitoareRoutes;
  if (state === undefined) {
    return [];
  }

  const defined = new Set(state.defined.map((route) => `${route.method} ${route.url}`));
  const observed = new Set(state.observed.map((route) => `${route.method} ${route.url}`));
  const uncovered = new Set<string>();

  for (const route of observed) {
    if (defined.has(route)) {
      continue;
    }
    if (route.startsWith("HEAD ") && observed.has(`GET ${route.slice("HEAD ".length)}`)) {
      continue;
    }
    uncovered.add(route);
  }

  return [...uncovered].sort();
}
