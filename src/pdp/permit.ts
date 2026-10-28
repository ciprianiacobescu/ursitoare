import type { Egress, Permit } from "./types.ts";
import { MAX_PERMIT_TTL_SECONDS } from "./values.ts";

const METHOD_PATTERN = /^[A-Z]{3,10}$/;
const HOST_PATTERN = /^[a-z0-9.-]{1,253}(:[0-9]{1,5})?$/;
const PATH_PATTERN = /^\/[\x21-\x7e]{0,2047}$/;
const BODY_DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const SERVICE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateEgress(value: unknown): value is Egress {
  if (!isRecord(value)) {
    return false;
  }
  const method = value["method"];
  const host = value["host"];
  const path = value["path"];
  const bodyDigest = value["bodyDigest"];
  const serviceId = value["serviceId"];
  const ttlSeconds = value["ttlSeconds"];

  return (
    typeof method === "string" &&
    METHOD_PATTERN.test(method) &&
    typeof host === "string" &&
    HOST_PATTERN.test(host) &&
    typeof path === "string" &&
    PATH_PATTERN.test(path) &&
    typeof bodyDigest === "string" &&
    BODY_DIGEST_PATTERN.test(bodyDigest) &&
    typeof serviceId === "string" &&
    SERVICE_ID_PATTERN.test(serviceId) &&
    typeof ttlSeconds === "number" &&
    Number.isInteger(ttlSeconds) &&
    ttlSeconds >= 1 &&
    ttlSeconds <= MAX_PERMIT_TTL_SECONDS
  );
}

export function buildPermit(egress: Egress): Permit {
  return Object.freeze({
    method: egress.method,
    host: egress.host,
    path: egress.path,
    bodyDigest: egress.bodyDigest,
    serviceId: egress.serviceId,
    ttlSeconds: egress.ttlSeconds,
  });
}
