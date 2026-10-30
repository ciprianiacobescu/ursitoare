import "./data.css";

import type { ReactNode } from "react";

import { fieldModel } from "./field.ts";
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

export function Field(props: FieldProps): ReactNode {
  const model = fieldModel(props, props.idPrefix);
  const control = {
    id: model.controlId,
    name: model.name,
    ...(model.describedBy === null ? {} : { "aria-describedby": model.describedBy }),
    ...(model.invalid ? { "aria-invalid": true as const } : {}),
    ...(model.required ? { "aria-required": true as const } : {}),
  };
  const described = (
    <>
      {model.hintId === null ? null : <p id={model.hintId} className="ui-field-hint">{model.hint}</p>}
      {model.errorId === null ? null : (
        <p id={model.errorId} className="ui-field-error">
          <span className="ui-visually-hidden">Error: </span>
          {model.error}
        </p>
      )}
    </>
  );
  const label = (
    <label className="ui-field-label" htmlFor={model.controlId}>
      {model.label}
      {model.required ? <span className="ui-field-required"> (required)</span> : null}
    </label>
  );
  if (model.layout === "inline") {
    return (
      <div className="ui-field-inline">
        {props.children(control)}
        {label}
        {described}
      </div>
    );
  }
  return (
    <div className="ui-field">
      {label}
      {described}
      {props.children(control)}
    </div>
  );
}
