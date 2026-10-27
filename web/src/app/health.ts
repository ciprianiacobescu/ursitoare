import type { ApiClient } from "../api/client.ts";

export type EngineHealth = "healthy" | "unavailable";

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

export async function loadEngineHealth(
  client: Pick<ApiClient, "get">,
  signal?: AbortSignal,
): Promise<EngineHealth> {
  try {
    const payload =
      signal === undefined
        ? await client.get<{ status?: unknown }>("/health")
        : await client.get<{ status?: unknown }>("/health", { signal });
    return payload?.status === "ok" ? "healthy" : "unavailable";
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return "unavailable";
  }
}

export function engineHealthText(state: EngineHealth | "loading"): string {
  switch (state) {
    case "loading":
      return "Checking engine health";
    case "healthy":
      return "Engine healthy";
    case "unavailable":
      return "Engine unavailable";
  }
}

export function healthView(
  state: EngineHealth | "loading",
  rechecking: boolean,
): { text: string; button: "hidden" | "enabled" | "busy"; focusStatus: boolean } {
  const button = state === "unavailable" ? "enabled" : state === "loading" && rechecking ? "busy" : "hidden";
  return {
    text: engineHealthText(state),
    button,
    focusStatus: state === "healthy" && rechecking,
  };
}
