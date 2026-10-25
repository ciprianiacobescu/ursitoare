// Bootstrap placeholder: the engine skeleton unit (openspec change add-engine-skeleton) replaces this module.

export interface HealthPayload {
  status: "ok";
  version: string;
}

export function healthPayload(version: string): HealthPayload {
  return { status: "ok", version };
}
