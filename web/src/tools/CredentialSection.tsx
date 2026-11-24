import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

import { browserSession } from "../auth/browser-session.ts";
import { ErrorPanel } from "../kit/ErrorPanel.tsx";
import { LoadingState } from "../kit/LoadingState.tsx";
import { Field } from "../kit/data/Field.tsx";
import { Form } from "../kit/data/Form.tsx";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { Section } from "../kit/layout/Section.tsx";
import { actionState } from "./pages.ts";
import type { ActionPhase, RegionLoad } from "./pages.ts";
import {
  CREDENTIAL_NAMES,
  credentialBody,
  credentialErrors,
  credentialText,
  loadServerCredential,
  rotateServerCredential,
  storeCredential,
} from "./credentials.ts";
import type { CredentialDraft, CredentialView } from "./credentials.ts";

type Scheme = CredentialDraft["authScheme"];

function label(key: string): string {
  return CREDENTIAL_NAMES[key] ?? key;
}

function clearSecret(input: HTMLInputElement | null): void {
  if (input !== null) input.value = "";
}

export function CredentialSection(props: {
  serverId: string;
  adapter: string;
}): ReactNode {
  const { serverId, adapter } = props;
  const idPrefix = useId();
  const secret = useRef<HTMLInputElement | null>(null);
  const [load, setLoad] = useState<RegionLoad<CredentialView | null>>({ phase: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [scheme, setScheme] = useState<Scheme>("BEARER_TOKEN");
  const [headerName, setHeaderName] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [action, setAction] = useState<ActionPhase>({ phase: "idle" });

  useEffect(() => {
    if (adapter === "code_block") return undefined;
    const controller = new AbortController();
    setLoad((current) => (current.phase === "ready" ? current : { phase: "loading" }));
    void loadServerCredential(browserSession.api, serverId, controller.signal).then(
      (view) => {
        if (!controller.signal.aborted) setLoad({ phase: "ready", value: view });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setLoad({ phase: "error", error });
      },
    );
    return () => {
      controller.abort();
    };
  }, [adapter, serverId, reloadKey]);

  const credential = load.phase === "ready" ? load.value : null;

  useEffect(() => {
    if (credential === null) return;
    setScheme(credential.authScheme);
    setHeaderName(credential.headerName ?? "");
  }, [credential]);

  const actionView = actionState(action);
  const busy = action.phase === "busy";
  const listReady = load.phase === "ready";
  const disabled = !listReady || busy;

  const submit = (): void => {
    if (disabled) return;
    const value = secret.current?.value ?? "";
    const draft: CredentialDraft = { authScheme: scheme, headerName, value };
    const checked = credentialBody(serverId, draft);
    if (!checked.ok) {
      setErrors({ [checked.field]: checked.message });
      return;
    }
    setErrors({});
    setAction({ phase: "busy" });
    void (async () => {
      try {
        if (credential === null) {
          await storeCredential(browserSession.api, checked.body, crypto.randomUUID());
          setAction({ phase: "done", text: label("credentialStored") });
        } else {
          await rotateServerCredential(browserSession.api, credential.id, draft);
          setAction({ phase: "done", text: label("credentialRotated") });
        }
        clearSecret(secret.current);
        setReloadKey((current) => current + 1);
      } catch (error) {
        clearSecret(secret.current);
        setErrors(credentialErrors(error));
        setAction({ phase: "idle" });
      }
    })();
  };

  if (adapter === "code_block") {
    return (
      <Section title={label("credential")}>
        <p>{credentialText(null, adapter)}</p>
      </Section>
    );
  }

  return (
    <Section title={label("credential")}>
      {load.phase === "loading" ? <LoadingState label="Loading credential" /> : null}
      {load.phase === "error" ? <ErrorPanel error={load.error} /> : null}
      {load.phase === "ready" ? <p>{credentialText(load.value, adapter)}</p> : null}
      <Form
        label={label("credential")}
        submitLabel={credential === null ? label("storeCredential") : label("rotateCredential")}
        fields={["headerName", "value"]}
        errors={errors}
        busy={disabled}
        onSubmit={submit}
      >
        <fieldset className="tools-fieldset">
          <legend>{label("scheme")}</legend>
          <label className="tools-checkbox">
            <input
              type="radio"
              name="scheme"
              checked={scheme === "API_KEY_HEADER"}
              onChange={() => setScheme("API_KEY_HEADER")}
            />
            {label("apiKeyHeader")}
          </label>
          <label className="tools-checkbox">
            <input
              type="radio"
              name="scheme"
              checked={scheme === "BEARER_TOKEN"}
              onChange={() => setScheme("BEARER_TOKEN")}
            />
            {label("bearerToken")}
          </label>
        </fieldset>
        {scheme === "API_KEY_HEADER" ? (
          <Field
            idPrefix={idPrefix}
            name="headerName"
            label={label("headerName")}
            error={errors["headerName"] ?? null}
          >
            {(control) => (
              <input
                {...control}
                className="ui-input"
                type="text"
                value={headerName}
                onChange={(event) => setHeaderName(event.target.value)}
              />
            )}
          </Field>
        ) : null}
        <Field
          idPrefix={idPrefix}
          name="value"
          label={label("secretValue")}
          error={errors["value"] ?? null}
        >
          {(control) => (
            <input
              {...control}
              ref={secret}
              className="ui-input"
              type="password"
              autoComplete="new-password"
            />
          )}
        </Field>
      </Form>
      {credential === null && load.phase === "ready" ? <p>{label("needsValue")}</p> : null}
      {actionView.status === null ? null : <p role="status">{actionView.status.text}</p>}
    </Section>
  );
}
