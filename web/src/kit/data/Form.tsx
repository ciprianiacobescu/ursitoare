import "./data.css";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { attemptFocus, formModel } from "./form.ts";
import type { FormSpec } from "./form.ts";

export interface FormProps extends FormSpec {
  onSubmit: () => void;
  children?: ReactNode;
}

export function Form(props: FormProps): ReactNode {
  const model = formModel(props);
  const [attempt, setAttempt] = useState(0);
  const focused = useRef(0);
  const formRef = useRef<HTMLFormElement | null>(null);
  const formErrorRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (model.submit === "busy") return;
    setAttempt(attempt + 1);
    props.onSubmit();
  };

  useEffect(() => {
    const result = attemptFocus(attempt, focused.current, model.submit, props.fields, props.errors);
    focused.current = result.focused;
    if (result.target.kind === "none") return;
    if (result.target.kind === "field") {
      const control = formRef.current?.querySelector(`[name="${result.target.name}"]`);
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    formErrorRef.current?.focus();
  }, [attempt, model.submit, props.errors, props.fields]);

  return (
    <form ref={formRef} className="ui-form" noValidate aria-label={model.label} onSubmit={handleSubmit}>
      {model.formError === null ? null : (
        <div ref={formErrorRef} className="ui-form-error" role="alert" tabIndex={-1}>
          {model.formError}
        </div>
      )}
      {props.children}
      <div className="ui-form-actions">
        <button type="submit" className="ui-button" aria-disabled={model.submit === "busy"}>
          {model.submitLabel}
        </button>
      </div>
    </form>
  );
}
