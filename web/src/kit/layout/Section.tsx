// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ReactNode } from "react";

export interface SectionProps {
  title: string;
  headingLevel?: 2 | 3;
  actions?: ReactNode;
  className?: string;
  id?: string;
  children?: ReactNode;
}

export function Section(_props: SectionProps): ReactNode {
  return null;
}
