import { useEffect, useRef, useState } from "react";

import { createApiClient } from "../api/client.ts";
import type { FeatureSpec } from "../app/features.ts";
import { healthView, loadEngineHealth, type EngineHealth } from "../app/health.ts";

const healthClient = createApiClient({ baseUrl: "" });

function Landing() {
  const [state, setState] = useState<EngineHealth | "loading">("loading");
  const [rechecking, setRechecking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadEngineHealth(healthClient, controller.signal)
      .then((health) => {
        setState(health);
      })
      .catch((error: unknown) => {
        if (typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError") {
          return;
        }
        setState("unavailable");
      });
    return () => {
      controller.abort();
    };
  }, [attempt]);

  const view = healthView(state, rechecking);

  useEffect(() => {
    if (view.focusStatus) {
      statusRef.current?.focus();
    }
  }, [view.focusStatus]);

  function checkAgain() {
    if (view.button === "busy") {
      return;
    }
    setState("loading");
    setRechecking(true);
    setAttempt((value) => value + 1);
  }

  return (
    <>
      <h1>Ursitoare</h1>
      <p className="engine-health" role="status" tabIndex={-1} ref={statusRef}>
        {view.text}
      </p>
      {view.button === "hidden" ? null : (
        <button
          type="button"
          aria-disabled={view.button === "busy" ? true : undefined}
          onClick={checkAgain}
        >
          Check again
        </button>
      )}
    </>
  );
}

export const feature: FeatureSpec = {
  id: "home",
  path: "/",
  navLabel: "Home",
  element: <Landing />,
};
