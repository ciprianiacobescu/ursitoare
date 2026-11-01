// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue, Flow } from "../format/index.ts";

export interface FlowCapabilities {
  reads_untrusted: boolean;
  reads_private: boolean;
  has_send_or_pay: boolean;
}

export interface CapabilitySite {
  at: string;
  tool: string;
}

export interface CapabilityEvidence {
  reads_untrusted: CapabilitySite[];
  reads_private: CapabilitySite[];
  has_send_or_pay: CapabilitySite[];
  unknown: CapabilitySite[];
}

export function capabilityEvidence(_flow: Flow, _catalogue: Catalogue): CapabilityEvidence {
  throw new Error("not implemented");
}

export function flowCapabilities(_flow: Flow, _catalogue: Catalogue): FlowCapabilities {
  throw new Error("not implemented");
}
