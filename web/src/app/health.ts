// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { ApiClient } from "../api/client.ts";

export type EngineHealth = "healthy" | "unavailable";

export function loadEngineHealth(_client: Pick<ApiClient, "get">, _signal?: AbortSignal): Promise<EngineHealth> {
  throw new Error("not implemented");
}

export function engineHealthText(_state: EngineHealth | "loading"): string {
  throw new Error("not implemented");
}

export function healthView(
  _state: EngineHealth | "loading",
  _rechecking: boolean,
): { text: string; button: "hidden" | "enabled" | "busy"; focusStatus: boolean } {
  throw new Error("not implemented");
}
