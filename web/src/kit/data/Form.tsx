// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ReactNode } from "react";

import type { FormSpec } from "./form.ts";

export interface FormProps extends FormSpec {
  onSubmit: () => void;
  children?: ReactNode;
}

export function Form(_props: FormProps): ReactNode {
  throw new Error("not implemented");
}
