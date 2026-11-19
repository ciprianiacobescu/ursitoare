import { useId } from "react";
import type { ReactNode } from "react";

import { cn } from "../../ui/cn.ts";

export interface SectionProps {
  title: string;
  headingLevel?: 2 | 3;
  actions?: ReactNode;
  className?: string;
  id?: string;
  children?: ReactNode;
}

export function Section(props: SectionProps): ReactNode {
  const headingId = useId();
  const heading =
    props.headingLevel === 3 ? (
      <h3 id={headingId} className="ui-section-title">
        {props.title}
      </h3>
    ) : (
      <h2 id={headingId} className="ui-section-title">
        {props.title}
      </h2>
    );
  return (
    <section aria-labelledby={headingId} className={cn("ui-section", props.className)} id={props.id}>
      {heading}
      {props.actions !== undefined ? <div className="ui-section-actions">{props.actions}</div> : null}
      {props.children}
    </section>
  );
}
