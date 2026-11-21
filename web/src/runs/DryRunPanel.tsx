import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";

import { ApiRequestError } from "../api/client.ts";
import { browserSession } from "../auth/browser-session.ts";
import { useSession } from "../auth/use-session.ts";
import type { EditorPanelContext } from "../flows/editor-panels.ts";
import { Field } from "../kit/data/Field.tsx";
import { Form } from "../kit/data/Form.tsx";
import { FORM_ERROR_KEY } from "../kit/data/form-errors.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { LoadingState } from "../kit/LoadingState.tsx";
import { dryRunFormErrors, dryRunPanelView, parseFakes, startDryRun } from "./dry-run.ts";
import { inputFormModelFor, inputSyncStart, inputSyncStep, inputSyncView } from "./input-form.ts";
import type { InputSyncEvent } from "./input-form.ts";
import { InputForm } from "./InputForm.tsx";
import { MockRows } from "./MockRows.tsx";
import { mockableNodes, rowSyncStart, rowSyncStep, rowSyncView } from "./mock-rows.ts";
import type { RowSyncEvent } from "./mock-rows.ts";
import { runLinkName, runPath } from "./pages.ts";
import { parseTestInputs } from "./test-run.ts";
import { useRunDocument } from "./use-run-document.ts";

const FORM_FIELDS = ["input", "fakes"] as const;

function fakeNotes(error: unknown): Record<string, string> {
  const notes: Record<string, string> = {};
  if (!(error instanceof ApiRequestError)) return notes;
  const details: unknown = error.details;
  if (typeof details !== "object" || details === null) return notes;
  const fields: unknown = (details as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) return notes;
  for (const raw of fields as unknown[]) {
    if (typeof raw !== "object" || raw === null) continue;
    const { field, message } = raw as { field?: unknown; message?: unknown };
    if (typeof field !== "string" || typeof message !== "string") continue;
    if (!field.startsWith("body/fakes/")) continue;
    const nodeId = field.slice("body/fakes/".length).split("/")[0] ?? "";
    if (nodeId !== "" && !(nodeId in notes)) notes[nodeId] = message;
  }
  return notes;
}

export function DryRunPanel({ context }: { context: EditorPanelContext }): ReactNode {
  const session = useSession();
  const idPrefix = useId();
  const runDocument = useRunDocument(context);
  const phase = runDocument.phase;
  const canonical = runDocument.phase === "ready" ? runDocument.canonical : null;
  const model = useMemo(
    () => inputFormModelFor(phase === "ready" ? { phase, canonical } : { phase }),
    [phase, canonical],
  );
  const nodes = useMemo(() => mockableNodes(canonical), [canonical]);
  const [inputSync, setInputSync] = useState(() => inputSyncStart(model, "{}"));
  const [rowSync, setRowSync] = useState(() => rowSyncStart(nodes, "{}"));
  const [syncBasis, setSyncBasis] = useState({ model, nodes });
  const [submitErrors, setSubmitErrors] = useState<FormErrors>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [startedRunId, setStartedRunId] = useState<string | null>(null);
  const busyRef = useRef(false);

  if (syncBasis.model !== model || syncBasis.nodes !== nodes) {
    setSyncBasis({ model, nodes });
    setInputSync(inputSyncStart(model, inputSync.text));
    setRowSync(rowSyncStart(nodes, rowSync.text));
  }
  const inputView = inputSyncView(model, inputSync);
  const rowView = rowSyncView(nodes, rowSync);
  const formModel = model !== null && model.kind === "form" ? model : null;
  const errors: FormErrors = {
    ...submitErrors,
    ...inputView.fieldErrors,
    ...(formModel !== null && inputView.jsonError !== null ? { input: inputView.jsonError } : {}),
    ...(nodes.length > 0 && rowView.jsonError !== null ? { fakes: rowView.jsonError } : {}),
    ...(rowView.formError !== null ? { [FORM_ERROR_KEY]: rowView.formError } : {}),
  };
  const formFields = [
    ...(formModel === null ? [] : formModel.fields.fields.map((field) => field.name)),
    ...FORM_FIELDS,
  ];
  const fakesError = errors["fakes"] ?? "";
  const openIds = nodes
    .map((node) => node.nodeId)
    .filter((id) => id in notes || fakesError.includes(`${id}: `));

  const editInput = (event: InputSyncEvent): void => {
    setSubmitErrors({});
    setNotes({});
    setInputSync(inputSyncStep(model, inputSync, event));
  };
  const editRows = (event: RowSyncEvent): void => {
    setSubmitErrors({});
    setNotes({});
    setRowSync(rowSyncStep(nodes, rowSync, event));
  };

  if (session === null) {
    return <LoadingState label="Loading permissions" />;
  }
  if (session.status !== "ready") {
    return <p>Permissions are unavailable right now. Try again in a moment.</p>;
  }

  const view = dryRunPanelView(session.me.capabilities, context.version);
  if (view.state !== "ready" || context.version === null) {
    return <p>{view.message}</p>;
  }
  const hash = context.version.hash;

  const submit = (): void => {
    if (busyRef.current) return;
    const attemptedInput = inputSyncStep(model, inputSync, { type: "attempt" });
    const attemptedRows = rowSyncStep(nodes, rowSync, { type: "attempt" });
    setInputSync(attemptedInput);
    setRowSync(attemptedRows);
    if (inputSyncView(model, attemptedInput).blocked || rowSyncView(nodes, attemptedRows).blocked) {
      return;
    }
    const inputs = parseTestInputs(inputSync.text, "{}");
    if (!inputs.ok) {
      setSubmitErrors(inputs.errors);
      return;
    }
    const fakes = parseFakes(rowSync.text);
    if (!fakes.ok) {
      setSubmitErrors({ fakes: fakes.message });
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setSubmitErrors({});
    setNotes({});
    void (async () => {
      try {
        const run = await startDryRun(
          browserSession.api,
          context.flowId,
          hash,
          inputs.input,
          fakes.fakes,
          crypto.randomUUID(),
        );
        setStartedRunId(run.id);
      } catch (error) {
        setSubmitErrors(dryRunFormErrors(error));
        setNotes(fakeNotes(error));
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    })();
  };

  return (
    <div className="runs-panel">
      <p>
        Read steps call the real tools through the broker. Write, send and pay steps are checked by
        policy but answered by your fakes, one list per step.
      </p>
      <p>
        Each write, send or pay step needs at least one answer, returned instead of the real call; leave a read step's row empty.
      </p>
      <p>
        For example: <code>{'{"pay": [{"output": {"payment_id": "P-1", "status": "created"}}]}'}</code>
      </p>
      {startedRunId === null ? null : (
        <div className="runs-started">
          <p role="status">{`Started dry run ${startedRunId}.`}</p>
          <Link to={runPath(startedRunId)}>{runLinkName(startedRunId)}</Link>
        </div>
      )}
      <Form
        label="Dry run inputs"
        submitLabel="Start dry run"
        fields={formFields}
        errors={errors}
        busy={busy}
        onSubmit={submit}
      >
        {model !== null && model.kind === "json" ? (
          <p className="text-sm text-muted-foreground">{model.reason}</p>
        ) : null}
        {formModel === null ? null : (
          <InputForm
            model={formModel}
            raw={inputSync.raw}
            errors={inputView.fieldErrors}
            onChange={(name, value) => editInput({ type: "field", name, value })}
          />
        )}
        <Field
          idPrefix={idPrefix}
          name="input"
          label="Input (JSON)"
          error={errors["input"] ?? null}
        >
          {(control) => (
            <textarea
              {...control}
              className="ui-input"
              rows={formModel === null ? 8 : 4}
              value={inputSync.text}
              onChange={(event) => editInput({ type: "text", text: event.target.value })}
            />
          )}
        </Field>
        {formModel !== null && inputView.hint !== null ? (
          <p className="text-sm text-muted-foreground">{inputView.hint}</p>
        ) : null}
        {nodes.length === 0 ? null : (
          <MockRows
            nodes={nodes}
            rows={rowSync.rows}
            answerErrors={rowView.answerErrors}
            openIds={openIds}
            notes={notes}
            onAnswer={(nodeId, index, value) => editRows({ type: "answer", nodeId, index, value })}
            onAdd={(nodeId) => editRows({ type: "add", nodeId })}
            onRemove={(nodeId, index) => editRows({ type: "remove", nodeId, index })}
          />
        )}
        <Field
          idPrefix={idPrefix}
          name="fakes"
          label="Fakes (JSON)"
          error={errors["fakes"] ?? null}
        >
          {(control) => (
            <textarea
              {...control}
              className="ui-input"
              rows={nodes.length === 0 ? 8 : 4}
              value={rowSync.text}
              onChange={(event) => editRows({ type: "text", text: event.target.value })}
            />
          )}
        </Field>
        {nodes.length > 0 && rowView.hint !== null ? (
          <p className="text-sm text-muted-foreground">{rowView.hint}</p>
        ) : null}
      </Form>
    </div>
  );
}
