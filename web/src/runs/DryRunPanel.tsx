import { useId, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";

import { browserSession } from "../auth/browser-session.ts";
import { useSession } from "../auth/use-session.ts";
import type { EditorPanelContext } from "../flows/editor-panels.ts";
import { Field } from "../kit/data/Field.tsx";
import { Form } from "../kit/data/Form.tsx";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { LoadingState } from "../kit/LoadingState.tsx";
import { dryRunFormErrors, dryRunPanelView, parseFakes, startDryRun } from "./dry-run.ts";
import { runLinkName, runPath } from "./pages.ts";
import { parseTestInputs } from "./test-run.ts";
import "./runs.css";

const FORM_FIELDS = ["input", "fakes"] as const;

export function DryRunPanel({ context }: { context: EditorPanelContext }): ReactNode {
  const session = useSession();
  const idPrefix = useId();
  const [inputText, setInputText] = useState("{}");
  const [fakesText, setFakesText] = useState("{}");
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);
  const [startedRunId, setStartedRunId] = useState<string | null>(null);
  const busyRef = useRef(false);

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
    const inputs = parseTestInputs(inputText, "{}");
    if (!inputs.ok) {
      setErrors(inputs.errors);
      return;
    }
    const fakes = parseFakes(fakesText);
    if (!fakes.ok) {
      setErrors({ fakes: fakes.message });
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setErrors({});
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
        setErrors(dryRunFormErrors(error));
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
          name="fakes"
          label="Fakes (JSON)"
          error={errors["fakes"] ?? null}
        >
          {(control) => (
            <textarea
              {...control}
              className="ui-input"
              rows={8}
              value={fakesText}
              onChange={(event) => setFakesText(event.target.value)}
            />
          )}
        </Field>
      </Form>
    </div>
  );
}
