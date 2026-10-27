// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ReactNode } from "react";

export interface SchemaFormProps {
  schema: unknown;
  label: string;
  submitLabel: string;
  onSubmit: (value: Record<string, unknown>) => Promise<void>;
}

export function SchemaForm(_props: SchemaFormProps): ReactNode {
  throw new Error("not implemented");
}
