import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";

import { browserSession } from "../auth/browser-session.ts";
import { useSession } from "../auth/use-session.ts";
import type { EditorPanelContext } from "../flows/editor-panels.ts";
import { Field } from "../kit/data/Field.tsx";
import { Form } from "../kit/data/Form.tsx";
import { FORM_ERROR_KEY } from "../kit/data/form-errors.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { LoadingState } from "../kit/LoadingState.tsx";
import { inputFormModelFor, inputSyncStart, inputSyncStep, inputSyncView } from "./input-form.ts";
import type { InputSyncEvent } from "./input-form.ts";
import { InputForm } from "./InputForm.tsx";
import { MockRows } from "./MockRows.tsx";
import { mockableNodes, rowSyncStart, rowSyncStep, rowSyncView } from "./mock-rows.ts";
import type { RowSyncEvent } from "./mock-rows.ts";
import { useRunDocument } from "./use-run-document.ts";
import { runLinkName, runPath } from "./pages.ts";
import { parseTestInputs, startTestRun, testPanelView, testRunFormErrors } from "./test-run.ts";

const FORM_FIELDS = ["input", "mocks"] as const;

export function TestRunPanel({ context }: { context: EditorPanelContext }): ReactNode {
  const session = useSession();
  const view = testPanelView(session, context.version);
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
    ...(nodes.length > 0 && rowView.jsonError !== null ? { mocks: rowView.jsonError } : {}),
    ...(rowView.formError !== null ? { [FORM_ERROR_KEY]: rowView.formError } : {}),
  };
  const formFields = [
    ...(formModel === null ? [] : formModel.fields.fields.map((field) => field.name)),
    ...FORM_FIELDS,
  ];

  const editInput = (event: InputSyncEvent): void => {
    setSubmitErrors({});
    setInputSync(inputSyncStep(model, inputSync, event));
  };
  const editRows = (event: RowSyncEvent): void => {
    setSubmitErrors({});
    setRowSync(rowSyncStep(nodes, rowSync, event));
  };

  if (view.kind === "loading") {
    return <LoadingState label="Loading permissions" />;
  }

  if (view.kind === "message") {
    return <p>{view.text}</p>;
  }

  const submit = (): void => {
    if (busyRef.current) return;
    const attemptedInput = inputSyncStep(model, inputSync, { type: "attempt" });
    const attemptedRows = rowSyncStep(nodes, rowSync, { type: "attempt" });
    setInputSync(attemptedInput);
    setRowSync(attemptedRows);
    if (inputSyncView(model, attemptedInput).blocked || rowSyncView(nodes, attemptedRows).blocked) {
      return;
    }
    const inputs = parseTestInputs(inputSync.text, rowSync.text);
    if (!inputs.ok) {
      setSubmitErrors(inputs.errors);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setSubmitErrors({});
    void (async () => {
      try {
        const run = await startTestRun(
          browserSession.api,
          {
            flowId: context.flowId,
            hash: view.hash,
            input: inputs.input,
            mocks: inputs.mocks,
          },
          crypto.randomUUID(),
        );
        setStartedRunId(run.id);
      } catch (error) {
        setSubmitErrors(testRunFormErrors(error));
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    })();
  };

  return (
    <div className="runs-panel">
      {startedRunId === null ? null : (
        <div className="runs-started">
          <p role="status">{`Started test run ${startedRunId}.`}</p>
          <Link to={runPath(startedRunId)}>{runLinkName(startedRunId)}</Link>
        </div>
      )}
      <Form
        label="Test run inputs"
        submitLabel="Start test run"
        fields={formFields}
        errors={errors}
        busy={busy}
        onSubmit={submit}
      >
        {model !== null && model.kind === "json" ? <p className="text-sm text-muted-foreground">{model.reason}</p> : null}
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
            onAnswer={(nodeId, index, value) => editRows({ type: "answer", nodeId, index, value })}
            onAdd={(nodeId) => editRows({ type: "add", nodeId })}
            onRemove={(nodeId, index) => editRows({ type: "remove", nodeId, index })}
          />
        )}
        <Field
          idPrefix={idPrefix}
          name="mocks"
          label="Mocks (JSON)"
          error={errors["mocks"] ?? null}
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
