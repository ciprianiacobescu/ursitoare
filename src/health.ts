// The health payload shared by the API health endpoint.

export interface HealthPayload {
  status: "ok";
  version: string;
}

export function healthPayload(version: string): HealthPayload {
  return { status: "ok", version };
}
