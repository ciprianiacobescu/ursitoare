import { useId, type ReactNode } from "react";

import { Field } from "../kit/data/Field.tsx";
import type { FormErrors } from "../kit/data/form-errors.ts";
import type { SchemaField } from "../kit/data/schema-fields.ts";
import type { RawValues } from "../kit/data/schema-values.ts";
import type { InputFormModel } from "./input-form.ts";

export interface InputFormProps {
  model: Extract<InputFormModel, { kind: "form" }>;
  raw: RawValues;
  errors: FormErrors;
  onChange: (name: string, value: string | boolean) => void;
}

function textValue(raw: RawValues, name: string): string {
  const value = raw[name];
  return typeof value === "string" ? value : "";
}

export function InputForm(props: InputFormProps): ReactNode {
  const idPrefix = useId();
  const supported = props.model.fields.fields.filter(
    (field): field is Exclude<SchemaField, { kind: "unsupported" }> => field.kind !== "unsupported",
  );
  return (
    <fieldset className="@container min-w-0 border-0 p-0 m-0">
      <legend className="ui-field-label">Inputs</legend>
      <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
        {supported.map((field) => {
          const error = props.errors[field.name] ?? null;
          const common = {
            key: `${idPrefix}-${field.name}`,
            name: field.name,
            label: field.label,
            error,
            idPrefix,
          };
          if (field.kind === "boolean") {
            return (
              <Field {...common} hint={field.hint} required={false} layout="inline">
                {(control) => (
                  <input
                    {...control}
                    className="ui-input ui-checkbox"
                    type="checkbox"
                    checked={props.raw[field.name] === true}
                    onChange={(event) => props.onChange(field.name, event.target.checked)}
                  />
                )}
              </Field>
            );
          }
          if (field.kind === "enum") {
            return (
              <Field {...common} hint={field.hint} required={field.required} layout="stacked">
                {(control) => (
                  <select
                    {...control}
                    className="ui-input"
                    value={textValue(props.raw, field.name)}
                    onChange={(event) => props.onChange(field.name, event.target.value)}
                  >
                    <option value="">Choose…</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            );
          }
          if (field.kind === "string-list") {
            return (
              <Field
                {...common}
                hint={field.hint === null ? "One item per line." : `${field.hint} One item per line.`}
                required={field.required}
                layout="stacked"
              >
                {(control) => (
                  <textarea
                    {...control}
                    className="ui-input"
                    rows={3}
                    value={textValue(props.raw, field.name)}
                    onChange={(event) => props.onChange(field.name, event.target.value)}
                  />
                )}
              </Field>
            );
          }
          const inputMode =
            field.kind === "integer" ? "numeric" : field.kind === "number" ? "decimal" : "text";
          return (
            <Field {...common} hint={field.hint} required={field.required} layout="stacked">
              {(control) => (
                <input
                  {...control}
                  className="ui-input"
                  type="text"
                  inputMode={inputMode}
                  value={textValue(props.raw, field.name)}
                  onChange={(event) => props.onChange(field.name, event.target.value)}
                />
              )}
            </Field>
          );
        })}
      </div>
    </fieldset>
  );
}
