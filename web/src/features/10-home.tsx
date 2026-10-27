import type { FeatureSpec } from "../app/features.ts";

function Landing() {
  return <h1>Ursitoare</h1>;
}

export const feature: FeatureSpec = {
  id: "home",
  path: "/",
  navLabel: "Home",
  element: <Landing />,
};
