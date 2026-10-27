import type { Feature } from "./features.ts";

const NOT_FOUND_ID = "not-found";
const NOT_FOUND_TITLE = "Page not found · Ursitoare";
const PRODUCT_TITLE = "Ursitoare";

export function routeTable(features: readonly Feature[]): readonly { id: string; path: string }[] {
  return [
    ...features.map((feature) => ({ id: feature.id, path: feature.path })),
    { id: NOT_FOUND_ID, path: "*" },
  ];
}

export function pageTitle(routeId: string): string {
  return routeId === NOT_FOUND_ID ? NOT_FOUND_TITLE : PRODUCT_TITLE;
}
