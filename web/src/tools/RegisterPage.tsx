import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";

import { browserSession } from "../auth/browser-session.ts";
import { PageHeader } from "../kit/layout/PageHeader.tsx";
import { PAGE_WIDTHS } from "../kit/layout/layout.ts";
import { Field } from "../kit/data/Field.tsx";
import { Form } from "../kit/data/Form.tsx";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { Button } from "../ui/button.tsx";
import { Card } from "../ui/card.tsx";
import { cn } from "../ui/cn.ts";
import { toolsErrorMessage } from "./messages.ts";
import {
  REGISTER_NAMES,
  REGISTER_PAGE,
  codeRegistration,
  mcpRegistration,
  openApiRegistration,
  previewOperations,
  previewRequest,
  registerServer,
  registrationFormErrors,
} from "./register.ts";
import type {
  CodeDraft,
  McpDraft,
  OpenApiDraft,
  OperationRowView,
  RegisterKind,
  RegistrationRequest,
} from "./register.ts";
import { serverLink } from "./servers.ts";
import { DataClassSelect, TrustNotes, TrustToggle } from "./TrustControls.tsx";
import { TRUST_NAMES, ackStatus, trustFor } from "./trust.ts";
import type { ToolTrust } from "./trust.ts";

type Effect = "" | "read" | "write" | "send" | "pay";

type Preview = { basePath: string; operations: OperationRowView[] };

function label(key: string): string {
  return REGISTER_NAMES[key] ?? key;
}

const EFFECTS: readonly Effect[] = ["", "read", "write", "send", "pay"];

const FIELDS: Readonly<Record<RegisterKind, readonly string[]>> = {
  mcp: ["id", "url"],
  openapi: ["id", "origin", "document"],
  code: ["id", "name", "description", "input", "output", "source"],
};

export function RegisterPage(): ReactNode {
  const idPrefix = useId();
  const warningId = useId();
  const navigate = useNavigate();

  const [kind, setKind] = useState<RegisterKind>("mcp");
  const [id, setId] = useState("");
  const [url, setUrl] = useState("");
  const [local, setLocal] = useState(false);
  const [origin, setOrigin] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [effects, setEffects] = useState<Record<string, Effect>>({});
  const [trust, setTrust] = useState<Record<string, ToolTrust>>({});
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [source, setSource] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [previewing, setPreviewing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = REGISTER_PAGE.title;
    return () => {
      document.title = previous;
    };
  }, []);

  const busy = previewing || registering;

  const changed = (): void => {
    setIdempotencyKey(null);
  };

  const openApiDraft = (): OpenApiDraft => ({
    id,
    origin,
    local,
    documentText,
    effects,
    trust,
  });

  const ack = ackStatus(trust, {}, ticks);

  const setToolTrust = (operationId: string, next: ToolTrust): void => {
    setTrust((current) => ({ ...current, [operationId]: next }));
    changed();
  };

  const toggleTrust = (operationId: string, trusted: boolean): void => {
    const current = trustFor(trust, operationId);
    setToolTrust(operationId, { trusted, dataClass: current.dataClass });
  };

  const setDataClass = (operationId: string, dataClass: ToolTrust["dataClass"]): void => {
    const current = trustFor(trust, operationId);
    setToolTrust(operationId, { trusted: current.trusted, dataClass });
  };

  const setTick = (operationId: string, ticked: boolean): void => {
    setTicks((current) => ({ ...current, [operationId]: ticked }));
    changed();
  };

  const codeDraft = (): CodeDraft => ({
    id,
    name,
    description,
    inputText,
    outputText,
    source,
  });

  const mcpDraft = (): McpDraft => ({ id, url, local });

  const registrationRequest = (): RegistrationRequest => {
    switch (kind) {
      case "mcp":
        return mcpRegistration(mcpDraft());
      case "openapi":
        return openApiRegistration(openApiDraft());
      case "code":
        return codeRegistration(codeDraft());
      default:
        throw new RangeError("Unknown registration kind");
    }
  };

  const runPreview = (): void => {
    if (busy) return;
    const checked = previewRequest(openApiDraft());
    if (!checked.ok) {
      setErrors({ [checked.field]: checked.message });
      return;
    }
    setErrors({});
    setPreviewing(true);
    void (async () => {
      try {
        const result = await previewOperations(browserSession.api, checked);
        setPreview(result);
      } catch (error) {
        setPreview(null);
        setErrors({ $form: toolsErrorMessage(error) });
      } finally {
        setPreviewing(false);
      }
    })();
  };

  const submit = (): void => {
    if (busy) return;
    const checked = registrationRequest();
    if (!checked.ok) {
      setErrors({ [checked.field]: checked.message });
      return;
    }
    const ackNow = ackStatus(trust, {}, ticks);
    if (ackNow.message !== null) {
      setErrors({ $form: ackNow.message });
      return;
    }
    const key = idempotencyKey ?? crypto.randomUUID();
    setIdempotencyKey(key);
    setErrors({});
    setRegistering(true);
    void (async () => {
      try {
        const server = await registerServer(browserSession.api, checked, key);
        navigate(serverLink(server.id));
      } catch (error) {
        setErrors(registrationFormErrors(kind, error));
        setRegistering(false);
      }
    })();
  };

  const chooseKind = (next: RegisterKind): void => {
    setKind(next);
    setErrors({});
    setPreview(null);
    changed();
  };

  const kindGroup = (
    <fieldset className="tools-fieldset">
      <legend>{label("kind")}</legend>
      <label className="tools-checkbox">
        <input
          type="radio"
          name="kind"
          checked={kind === "mcp"}
          onChange={() => chooseKind("mcp")}
        />
        {label("mcpServer")}
      </label>
      <label className="tools-checkbox">
        <input
          type="radio"
          name="kind"
          checked={kind === "openapi"}
          onChange={() => chooseKind("openapi")}
        />
        {label("openApiDocument")}
      </label>
      <label className="tools-checkbox">
        <input
          type="radio"
          name="kind"
          checked={kind === "code"}
          onChange={() => chooseKind("code")}
        />
        {label("codeBlock")}
      </label>
    </fieldset>
  );

  const localBox = (
    <label className="tools-checkbox">
      <input
        type="checkbox"
        checked={local}
        onChange={(event) => {
          setLocal(event.target.checked);
          changed();
        }}
      />
      {label("localNetworkServer")}
    </label>
  );

  const mcpFields = (
    <>
      <Field idPrefix={idPrefix} name="url" label={label("mcpUrl")} hint={label("mcpUrlHint")} error={errors["url"] ?? null}>
        {(control) => (
          <input
            {...control}
            className="ui-input"
            type="text"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              changed();
            }}
          />
        )}
      </Field>
      {localBox}
    </>
  );

  const operationsTable =
    preview === null ? null : (
      <div className="overflow-x-auto">
        <table className="ui-table" aria-label={label("operations")}>
          <thead>
            <tr>
              <th scope="col">Operation</th>
              <th scope="col">Method</th>
              <th scope="col">Path</th>
              <th scope="col">Effect</th>
              <th scope="col">{TRUST_NAMES["trustColumn"] ?? "Result trusted"}</th>
              <th scope="col">{TRUST_NAMES["dataClassColumn"] ?? "Data class"}</th>
            </tr>
          </thead>
          <tbody>
            {preview.operations.map((operation, index) => {
              const operationId = operation.operationId ?? "";
              const toolTrust = trustFor(trust, operationId);
              return (
                <tr key={operation.operationId ?? `row-${index}`}>
                  <td>{operation.operationId ?? "—"}</td>
                  <td>{operation.method}</td>
                  <td>{operation.path}</td>
                  <td>
                    {operation.excluded !== null ? (
                      `Excluded: ${operation.excluded}`
                    ) : (
                      <select
                        className="ui-input"
                        aria-label={`${label("effectOf")}${operation.operationId ?? ""}`}
                        value={effects[operation.operationId ?? ""] ?? ""}
                        onChange={(event) => {
                          const value = event.target.value as Effect;
                          setEffects((current) => ({
                            ...current,
                            [operation.operationId ?? ""]: value,
                          }));
                          changed();
                        }}
                      >
                        {EFFECTS.map((effect) => (
                          <option key={effect} value={effect}>
                            {effect === "" ? label("skip") : effect}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    {operation.excluded !== null ? null : (
                      <TrustToggle
                        name={operationId}
                        describedBy={warningId}
                        checked={toolTrust.trusted}
                        onChange={(checked) => toggleTrust(operationId, checked)}
                      />
                    )}
                  </td>
                  <td>
                    {operation.excluded !== null ? null : (
                      <DataClassSelect
                        name={operationId}
                        value={toolTrust.dataClass}
                        onChange={(dataClass) => setDataClass(operationId, dataClass)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

  const openApiFields = (
    <>
      <Field idPrefix={idPrefix} name="origin" label={label("origin")} error={errors["origin"] ?? null}>
        {(control) => (
          <input
            {...control}
            className="ui-input"
            type="text"
            value={origin}
            onChange={(event) => {
              setOrigin(event.target.value);
              changed();
            }}
          />
        )}
      </Field>
      <Field
        idPrefix={idPrefix}
        name="document"
        label={label("openApiDocumentJson")}
        error={errors["document"] ?? null}
      >
        {(control) => (
          <textarea
            {...control}
            className="ui-input"
            value={documentText}
            onChange={(event) => {
              setDocumentText(event.target.value);
              changed();
            }}
          />
        )}
      </Field>
      {localBox}
      <div className="tools-actions">
        <Button
          tone="secondary"
          aria-disabled={busy ? true : undefined}
          onClick={runPreview}
        >
          {label("previewOperations")}
        </Button>
      </div>
      {operationsTable}
      {preview === null ? null : (
        <TrustNotes warningId={warningId} shown={ack.shown} ticks={ticks} onTick={setTick} />
      )}
    </>
  );

  const codeFields = (
    <>
      <Field idPrefix={idPrefix} name="name" label={label("toolName")} error={errors["name"] ?? null}>
        {(control) => (
          <input
            {...control}
            className="ui-input"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              changed();
            }}
          />
        )}
      </Field>
      <Field
        idPrefix={idPrefix}
        name="description"
        label={label("description")}
        error={errors["description"] ?? null}
      >
        {(control) => (
          <input
            {...control}
            className="ui-input"
            type="text"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              changed();
            }}
          />
        )}
      </Field>
      <Field
        idPrefix={idPrefix}
        name="input"
        label={label("inputSchema")}
        error={errors["input"] ?? null}
      >
        {(control) => (
          <textarea
            {...control}
            className="ui-input"
            value={inputText}
            onChange={(event) => {
              setInputText(event.target.value);
              changed();
            }}
          />
        )}
      </Field>
      <Field
        idPrefix={idPrefix}
        name="output"
        label={label("outputSchema")}
        error={errors["output"] ?? null}
      >
        {(control) => (
          <textarea
            {...control}
            className="ui-input"
            value={outputText}
            onChange={(event) => {
              setOutputText(event.target.value);
              changed();
            }}
          />
        )}
      </Field>
      <Field idPrefix={idPrefix} name="source" label={label("source")} error={errors["source"] ?? null}>
        {(control) => (
          <textarea
            {...control}
            className="ui-input"
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              changed();
            }}
          />
        )}
      </Field>
    </>
  );

  return (
    <div className={cn("tools-page", PAGE_WIDTHS.form)}>
      <PageHeader title={label("registerToolServer")} />
      <Card>
        <Form
          label={label("newToolServer")}
          submitLabel={label("registerServer")}
          fields={FIELDS[kind]}
          errors={errors}
          busy={registering}
          onSubmit={submit}
        >
          {kindGroup}
          <Field idPrefix={idPrefix} name="id" label={label("serverId")} error={errors["id"] ?? null}>
            {(control) => (
              <input
                {...control}
                className="ui-input"
                type="text"
                value={id}
                onChange={(event) => {
                  setId(event.target.value);
                  changed();
                }}
              />
            )}
          </Field>
          {kind === "mcp" ? mcpFields : null}
          {kind === "openapi" ? openApiFields : null}
          {kind === "code" ? codeFields : null}
        </Form>
      </Card>
    </div>
  );
}
