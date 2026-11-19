import type { ReactNode, Ref } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
}

export function PageHeader(props: PageHeaderProps): ReactNode {
  return (
    <div className="ui-page-header">
      <h1 className="ui-page-header-title" tabIndex={-1} ref={props.headingRef}>
        {props.title}
      </h1>
      {props.description !== undefined ? (
        <p className="ui-page-header-description">{props.description}</p>
      ) : null}
      {props.meta !== undefined ? <div className="ui-page-header-meta">{props.meta}</div> : null}
      {props.actions !== undefined ? <div className="ui-page-header-actions">{props.actions}</div> : null}
    </div>
  );
}
