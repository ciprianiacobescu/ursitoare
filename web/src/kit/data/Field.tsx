// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ReactNode } from "react";

import type { FieldSpec } from "./field.ts";

export interface FieldProps extends FieldSpec {
  idPrefix: string;
  children: (control: {
    id: string;
    name: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
    "aria-required"?: true;
  }) => ReactNode;
}

export function Field(_props: FieldProps): ReactNode {
  throw new Error("not implemented");
}
