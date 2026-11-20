import { HomePage } from "../app/HomePage.tsx";
import type { FeatureSpec } from "../app/features.ts";

export const feature: FeatureSpec = {
  id: "home",
  path: "/",
  navLabel: "Home",
  element: <HomePage />,
};
