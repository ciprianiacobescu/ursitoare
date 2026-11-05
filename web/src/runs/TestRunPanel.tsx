import { useId, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";

import { browserSession } from "../auth/browser-session.ts";
import { useSession } from "../auth/use-session.ts";
import type { EditorPanelContext } from "../flows/editor-panels.ts";
import { Field } from "../kit/data/Field.tsx";
import { Form } from "../kit/data/Form.tsx";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { LoadingState } from "../kit/LoadingState.tsx";
import { runLinkName, runPath } from "./pages.ts";
import { parseTestInputs, startTestRun, testPanelView, testRunFormErrors } from "./test-run.ts";
import "./runs.css";

const FORM_FIELDS = ["input", "mocks"] as const;

export function TestRunPanel({ context }: { context: EditorPanelContext }): ReactNode {
  const session = useSession();
  const view = testPanelView(session, context.version);
  const idPrefix = useId();
  const [inputText, setInputText] = useState("{}");
  const [mocksText, setMocksText] = useState("{}");
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);
  const [startedRunId, setStartedRunId] = useState<string | null>(null);
  const busyRef = useRef(false);

  if (view.kind === "loading") {
    return <LoadingState label="Loading permissions" />;
  }

  if (view.kind === "message") {
    return <p>{view.text}</p>;
  }

  const submit = (): void => {
    if (busyRef.current) return;
    const inputs = parseTestInputs(inputText, mocksText);
    if (!inputs.ok) {
      setErrors(inputs.errors);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setErrors({});
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
        setErrors(testRunFormErrors(error));
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
        fields={FORM_FIELDS}
        errors={errors}
        busy={busy}
        onSubmit={submit}
      >
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
              rows={8}
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
            />
          )}
        </Field>
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
              rows={8}
              value={mocksText}
              onChange={(event) => setMocksText(event.target.value)}
            />
          )}
        </Field>
      </Form>
    </div>
  );
}
