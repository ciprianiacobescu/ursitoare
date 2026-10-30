import "./data.css";

import { useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Field } from "./Field.tsx";
import { Form } from "./Form.tsx";
import type { FormErrors } from "./form-errors.ts";
import { schemaToFields } from "./schema-fields.ts";
import type { SchemaField } from "./schema-fields.ts";
import { initialValues, submitValues } from "./schema-values.ts";
import type { RawValues } from "./schema-values.ts";

export interface SchemaFormProps {
  schema: unknown;
  label: string;
  submitLabel: string;
  onSubmit: (value: Record<string, unknown>) => Promise<void>;
}

function textValue(raw: RawValues, name: string): string {
  const value = raw[name];
  return typeof value === "string" ? value : "";
}

function listHint(hint: string | null): string {
  return hint === null ? "One item per line." : `${hint} One item per line.`;
}

export function SchemaForm(props: SchemaFormProps): ReactNode {
  const parsed = useMemo(() => schemaToFields(props.schema), [props.schema]);
  const [raw, setRaw] = useState<RawValues>(() => initialValues(parsed));
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);
  const idPrefix = useId();

  useEffect(() => {
    setRaw(initialValues(parsed));
    setErrors({});
    setBusy(false);
  }, [parsed]);

  const update = (name: string, next: string | boolean): void => {
    setRaw((previous) => ({ ...previous, [name]: next }));
  };

  const handleSubmit = (): void => {
    setBusy(true);
    void (async () => {
      const result = await submitValues(parsed, raw, props.onSubmit);
      if (result.kind === "submitted") {
        setErrors({});
      } else {
        setErrors(result.errors);
      }
      setBusy(false);
    })();
  };

  const supported = parsed.fields.filter(
    (field): field is Exclude<SchemaField, { kind: "unsupported" }> => field.kind !== "unsupported",
  );
  const names = supported.map((field) => field.name);

  return (
    <>
      {parsed.problems.length === 0 ? null : (
        <ul className="ui-form-problems">
          {parsed.problems.map((problem, index) => (
            <li key={`${idPrefix}-p${index}`}>{problem}</li>
          ))}
        </ul>
      )}
      <Form
        label={props.label}
        submitLabel={props.submitLabel}
        fields={names}
        errors={errors}
        busy={busy}
        onSubmit={handleSubmit}
      >
        {parsed.fields.map((field, index) => {
          if (field.kind === "unsupported") {
            return (
              <div className="ui-field" key={`${idPrefix}-u${index}`}>
                <p className="ui-field-label">{field.label}</p>
                <p className="ui-field-error">
                  <span className="ui-visually-hidden">Error: </span>
                  {field.error}
                </p>
              </div>
            );
          }

          const error = errors[field.name] ?? null;

          if (field.kind === "boolean") {
            return (
              <Field
                key={`${idPrefix}-${field.name}`}
                name={field.name}
                label={field.label}
                hint={field.hint}
                error={error}
                required={false}
                layout="inline"
                idPrefix={idPrefix}
              >
                {(control) => (
                  <input
                    {...control}
                    className="ui-input ui-checkbox"
                    type="checkbox"
                    checked={raw[field.name] === true}
                    onChange={(event) => update(field.name, event.target.checked)}
                  />
                )}
              </Field>
            );
          }

          if (field.kind === "enum") {
            return (
              <Field
                key={`${idPrefix}-${field.name}`}
                name={field.name}
                label={field.label}
                hint={field.hint}
                error={error}
                required={field.required}
                layout="stacked"
                idPrefix={idPrefix}
              >
                {(control) => (
                  <select
                    {...control}
                    className="ui-input"
                    value={textValue(raw, field.name)}
                    onChange={(event) => update(field.name, event.target.value)}
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
                key={`${idPrefix}-${field.name}`}
                name={field.name}
                label={field.label}
                hint={listHint(field.hint)}
                error={error}
                required={field.required}
                layout="stacked"
                idPrefix={idPrefix}
              >
                {(control) => (
                  <textarea
                    {...control}
                    className="ui-input"
                    rows={4}
                    value={textValue(raw, field.name)}
                    onChange={(event) => update(field.name, event.target.value)}
                  />
                )}
              </Field>
            );
          }

          const inputMode =
            field.kind === "integer" ? "numeric" : field.kind === "number" ? "decimal" : "text";
          return (
            <Field
              key={`${idPrefix}-${field.name}`}
              name={field.name}
              label={field.label}
              hint={field.hint}
              error={error}
              required={field.required}
              layout="stacked"
              idPrefix={idPrefix}
            >
              {(control) => (
                <input
                  {...control}
                  className="ui-input"
                  type="text"
                  inputMode={inputMode}
                  value={textValue(raw, field.name)}
                  onChange={(event) => update(field.name, event.target.value)}
                />
              )}
            </Field>
          );
        })}
      </Form>
    </>
  );
}
