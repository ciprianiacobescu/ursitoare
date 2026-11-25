import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";

import { browserSession } from "../auth/browser-session.ts";
import { LoadingState } from "../kit/LoadingState.tsx";
import { Field } from "../kit/data/Field.tsx";
import { Form } from "../kit/data/Form.tsx";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { Section } from "../kit/layout/Section.tsx";
import { Button } from "../ui/button.tsx";
import { actionState } from "./pages.ts";
import type { ActionPhase } from "./pages.ts";
import {
  REGISTER_NAMES,
  codeReplacement,
  loadCodeDraft,
  openApiReplacement,
  prefillEffects,
  previewOperations,
  previewRequest,
  registrationFormErrors,
  replaceServer,
} from "./register.ts";
import type { CodeDraft, OperationRowView } from "./register.ts";
import type { ToolServerView } from "./servers.ts";

type Effect = "" | "read" | "write" | "send" | "pay";
type Mode = "openapi" | "code";
type Preview = { basePath: string; operations: OperationRowView[] };

function label(key: string): string {
  return REGISTER_NAMES[key] ?? key;
}

const EFFECTS: readonly Effect[] = ["", "read", "write", "send", "pay"];

function OperationsTable(props: {
  preview: Preview;
  effects: Record<string, Effect>;
  onEffect: (operationId: string, effect: Effect) => void;
}): ReactNode {
  return (
    <table className="ui-table" aria-label={label("operations")}>
      <thead>
        <tr>
          <th scope="col">Operation</th>
          <th scope="col">Method</th>
          <th scope="col">Path</th>
          <th scope="col">Effect</th>
        </tr>
      </thead>
      <tbody>
        {props.preview.operations.map((operation, index) => (
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
                  value={props.effects[operation.operationId ?? ""] ?? ""}
                  onChange={(event) =>
                    props.onEffect(operation.operationId ?? "", event.target.value as Effect)
                  }
                >
                  {EFFECTS.map((effect) => (
                    <option key={effect} value={effect}>
                      {effect === "" ? label("skip") : effect}
                    </option>
                  ))}
                </select>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ReplaceSection(props: {
  serverId: string;
  server: ToolServerView | null;
  onSaved: () => void;
}): ReactNode {
  const { serverId, server, onSaved } = props;
  const idPrefix = useId();
  const [mode, setMode] = useState<Mode | null>(null);
  const [origin, setOrigin] = useState("");
  const [local, setLocal] = useState(false);
  const [documentText, setDocumentText] = useState("");
  const [effects, setEffects] = useState<Record<string, Effect>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [openErrors, setOpenErrors] = useState<FormErrors>({});
  const [codeDraft, setCodeDraft] = useState<CodeDraft | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [codeErrors, setCodeErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<ActionPhase>({ phase: "idle" });

  useEffect(() => {
    setMode(null);
    setOrigin("");
    setLocal(false);
    setDocumentText("");
    setEffects({});
    setPreview(null);
    setOpenErrors({});
    setCodeDraft(null);
    setLoadingCode(false);
    setCodeErrors({});
    setBusy(false);
    setAction({ phase: "idle" });
  }, [serverId]);

  const actionView = actionState(action);

  const openDocument = (): void => {
    if (server === null) return;
    setMode("openapi");
    setOrigin(server.origin);
    setLocal(false);
    setDocumentText("");
    setEffects({});
    setPreview(null);
    setOpenErrors({});
    setAction({ phase: "idle" });
  };

  const openCode = (): void => {
    setMode("code");
    setCodeDraft(null);
    setCodeErrors({});
    setLoadingCode(true);
    setAction({ phase: "idle" });
    void (async () => {
      try {
        const draft = await loadCodeDraft(browserSession.api, serverId);
        setCodeDraft(draft);
      } catch (error) {
        setCodeErrors(registrationFormErrors("code", error));
      } finally {
        setLoadingCode(false);
      }
    })();
  };

  const runPreview = (): void => {
    if (busy) return;
    const checked = previewRequest({ id: serverId, origin, local, documentText, effects });
    if (!checked.ok) {
      setOpenErrors({ [checked.field]: checked.message });
      return;
    }
    setOpenErrors({});
    setBusy(true);
    void (async () => {
      try {
        const result = await previewOperations(browserSession.api, checked);
        setPreview(result);
        if (server !== null) setEffects(prefillEffects(server.tools, result.operations));
      } catch (error) {
        setPreview(null);
        setOpenErrors(registrationFormErrors("openapi", error));
      } finally {
        setBusy(false);
      }
    })();
  };

  const saveDocument = (): void => {
    if (busy) return;
    const checked = openApiReplacement(serverId, {
      id: serverId,
      origin,
      local,
      documentText,
      effects,
    });
    if (!checked.ok) {
      setOpenErrors({ [checked.field]: checked.message });
      return;
    }
    setOpenErrors({});
    setBusy(true);
    void (async () => {
      try {
        await replaceServer(browserSession.api, checked);
        setAction({ phase: "done", text: label("documentReplaced") });
        setBusy(false);
        onSaved();
      } catch (error) {
        setOpenErrors(registrationFormErrors("openapi", error));
        setBusy(false);
      }
    })();
  };

  const saveCode = (): void => {
    if (busy || codeDraft === null) return;
    const checked = codeReplacement(serverId, codeDraft);
    if (!checked.ok) {
      setCodeErrors({ [checked.field]: checked.message });
      return;
    }
    setCodeErrors({});
    setBusy(true);
    void (async () => {
      try {
        await replaceServer(browserSession.api, checked);
        setAction({ phase: "done", text: label("codeSaved") });
        setBusy(false);
        onSaved();
      } catch (error) {
        setCodeErrors(registrationFormErrors("code", error));
        setBusy(false);
      }
    })();
  };

  const changeDraft = (key: keyof CodeDraft, value: string): void => {
    setCodeDraft((current) => (current === null ? current : { ...current, [key]: value }));
  };

  if (server === null) return null;
  if (server.adapter !== "http_openapi" && server.adapter !== "code_block") return null;

  const documentForm =
    mode !== "openapi" ? null : (
      <Form
        label={label("replaceDocument")}
        submitLabel={label("saveChanges")}
        fields={["origin", "document"]}
        errors={openErrors}
        busy={busy}
        onSubmit={saveDocument}
      >
        <Field idPrefix={idPrefix} name="origin" label={label("origin")} error={openErrors["origin"] ?? null}>
          {(control) => (
            <input
              {...control}
              className="ui-input"
              type="text"
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
            />
          )}
        </Field>
        <Field
          idPrefix={idPrefix}
          name="document"
          label={label("openApiDocumentJson")}
          error={openErrors["document"] ?? null}
        >
          {(control) => (
            <textarea
              {...control}
              className="ui-input"
              value={documentText}
              onChange={(event) => setDocumentText(event.target.value)}
            />
          )}
        </Field>
        <label className="tools-checkbox">
          <input
            type="checkbox"
            checked={local}
            onChange={(event) => setLocal(event.target.checked)}
          />
          {label("localNetworkServer")}
        </label>
        <div className="tools-actions">
          <Button tone="secondary" aria-disabled={busy ? true : undefined} onClick={runPreview}>
            {label("previewOperations")}
          </Button>
        </div>
        {preview === null ? null : (
          <OperationsTable
            preview={preview}
            effects={effects}
            onEffect={(operationId, effect) =>
              setEffects((current) => ({ ...current, [operationId]: effect }))
            }
          />
        )}
      </Form>
    );

  const codeForm =
    mode !== "code" ? null : loadingCode ? (
      <LoadingState label="Loading code" />
    ) : codeDraft === null ? (
      <p>{label("severalTools")}</p>
    ) : (
      <Form
        label={label("editCode")}
        submitLabel={label("saveChanges")}
        fields={["name", "description", "input", "output", "source"]}
        errors={codeErrors}
        busy={busy}
        onSubmit={saveCode}
      >
        <Field idPrefix={idPrefix} name="name" label={label("toolName")} error={codeErrors["name"] ?? null}>
          {(control) => (
            <input
              {...control}
              className="ui-input"
              type="text"
              value={codeDraft.name}
              onChange={(event) => changeDraft("name", event.target.value)}
            />
          )}
        </Field>
        <Field
          idPrefix={idPrefix}
          name="description"
          label={label("description")}
          error={codeErrors["description"] ?? null}
        >
          {(control) => (
            <input
              {...control}
              className="ui-input"
              type="text"
              value={codeDraft.description}
              onChange={(event) => changeDraft("description", event.target.value)}
            />
          )}
        </Field>
        <Field
          idPrefix={idPrefix}
          name="input"
          label={label("inputSchema")}
          error={codeErrors["input"] ?? null}
        >
          {(control) => (
            <textarea
              {...control}
              className="ui-input"
              value={codeDraft.inputText}
              onChange={(event) => changeDraft("inputText", event.target.value)}
            />
          )}
        </Field>
        <Field
          idPrefix={idPrefix}
          name="output"
          label={label("outputSchema")}
          error={codeErrors["output"] ?? null}
        >
          {(control) => (
            <textarea
              {...control}
              className="ui-input"
              value={codeDraft.outputText}
              onChange={(event) => changeDraft("outputText", event.target.value)}
            />
          )}
        </Field>
        <Field
          idPrefix={idPrefix}
          name="source"
          label={label("source")}
          error={codeErrors["source"] ?? null}
        >
          {(control) => (
            <textarea
              {...control}
              className="ui-input"
              value={codeDraft.source}
              onChange={(event) => changeDraft("source", event.target.value)}
            />
          )}
        </Field>
      </Form>
    );

  return (
    <Section title={label("changeRegistration")}>
      {mode === null ? (
        server.adapter === "http_openapi" ? (
          <Button tone="secondary" onClick={openDocument}>
            {label("replaceDocument")}
          </Button>
        ) : (
          <Button tone="secondary" onClick={openCode}>
            {label("editCode")}
          </Button>
        )
      ) : null}
      {documentForm}
      {codeForm}
      {actionView.status === null ? null : <p role="status">{actionView.status.text}</p>}
    </Section>
  );
}
