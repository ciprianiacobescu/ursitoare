import type { EgressConfig } from "../config/index.ts";
import { GATEWAY_LIMITS, GatewayError } from "./types.ts";
import type { GatewayDeps } from "./types.ts";

const ZERO_UUID = "00000000-0000-4000-8000-000000000000";

const PROBES = [
  { name: "issue", path: "/v1/issue" },
  { name: "resolve", path: "/v1/api-keys/resolve" },
] as const;

type Probe = (typeof PROBES)[number];

function probeBody(probe: Probe, agentId: string): string {
  if (probe.name === "issue") {
    return JSON.stringify({
      agent_id: agentId,
      service_id: ZERO_UUID,
      tenant_id: ZERO_UUID,
      scope: "call",
      ttl_seconds: 1,
    });
  }
  return JSON.stringify({
    key_fingerprint: "probe",
    presented_key: "probe",
    service_id: ZERO_UUID,
    tenant_id: ZERO_UUID,
  });
}

async function probeBroker(
  config: EgressConfig,
  probe: Probe,
  deps: GatewayDeps,
): Promise<"answered" | "unreachable"> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, GATEWAY_LIMITS.selfCheckTimeoutMs);
  const fetchImpl = deps.fetch ?? fetch;

  try {
    let response: Response;
    try {
      response = await fetchImpl(`${config.brokerUrl}${probe.path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: probeBody(probe, config.agentId),
        redirect: "manual",
        signal: controller.signal,
      });
    } catch {
      return "unreachable";
    }

    if (response.status >= 200 && response.status < 300) {
      const message = `egress broker answered ${probe.name} without a service token; give it its service tokens before starting`;
      const error = new GatewayError("GATEWAY_INSECURE_BROKER", message, { probe: probe.name });
      deps.logger.error(
        { code: error.code, probe: probe.name, brokerUrl: config.brokerUrl },
        message,
      );
      throw error;
    }

    return "answered";
  } finally {
    clearTimeout(timer);
  }
}

export async function checkEgress(
  config: EgressConfig,
  deps: GatewayDeps,
): Promise<{ broker: "closed" | "unreachable" }> {
  let unreachable = false;
  for (const probe of PROBES) {
    const outcome = await probeBroker(config, probe, deps);
    if (outcome === "unreachable") unreachable = true;
  }
  return { broker: unreachable ? "unreachable" : "closed" };
}
