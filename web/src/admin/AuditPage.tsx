import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { browserSession } from "../auth/browser-session.ts";
import { DataTable } from "../kit/data/DataTable.tsx";
import { Field } from "../kit/data/Field.tsx";
import { Form } from "../kit/data/Form.tsx";
import { createCursorList } from "../kit/data/cursor-list.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import "./admin.css";
import { ADMIN_TABLES } from "./pages.ts";
import {
  auditCells,
  auditFetcher,
  loadVerification,
  parseEventTypeFilter,
  verificationView,
} from "./audit.ts";
import type { AuditEvent, VerificationState } from "./audit.ts";

const PAGE_TITLE = "Audit log · Ursitoare";
const AUDIT_FIELDS = ["eventType"] as const;

export function AuditPage(): ReactNode {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const idPrefix = useId();
  const [filterText, setFilterText] = useState("");
  const [eventType, setEventType] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const list = useMemo(
    () => createCursorList(auditFetcher(browserSession.api, eventType)),
    [eventType],
  );

  useEffect(() => {
    const previous = document.title;
    document.title = PAGE_TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

  const apply = (): void => {
    const checked = parseEventTypeFilter(filterText);
    if (!checked.ok) {
      setErrors({ eventType: checked.message });
      return;
    }
    setErrors({});
    setEventType((current) => (current === checked.value ? current : checked.value));
  };

  const runningVerification = useRef<AbortController | null>(null);
  const [verificationState, setVerificationState] = useState<VerificationState>({
    status: "checking",
  });

  const startVerification = useCallback((): void => {
    runningVerification.current?.abort();
    const controller = new AbortController();
    runningVerification.current = controller;
    setVerificationState({ status: "checking" });
    void loadVerification(browserSession.api, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) {
          setVerificationState({ status: "done", result });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setVerificationState({ status: "failed", error });
        }
      },
    );
  }, []);

  useEffect(() => {
    startVerification();
    return () => {
      runningVerification.current?.abort();
    };
  }, [startVerification]);

  const columns = ADMIN_TABLES.audit.columns.map((column) => ({
    ...column,
    cell: (event: AuditEvent): ReactNode => {
      const cells = auditCells(event);
      switch (column.key) {
        case "seq":
          return cells.seq;
        case "time":
          return cells.time;
        case "type":
          return cells.type;
        case "actor":
          return cells.actor;
        case "target":
          return cells.target;
        case "details":
          return cells.details;
        default:
          return null;
      }
    },
  }));

  const view = verificationView(verificationState);

  return (
    <div className="admin-page">
      <h1 ref={headingRef} tabIndex={-1}>
        Audit log
      </h1>
      <section className="admin-section" aria-labelledby={`${idPrefix}-verification-title`}>
        <h2 id={`${idPrefix}-verification-title`}>Chain verification</h2>
        <p role="status" className={`admin-status admin-status--${view.tone}`}>
          <strong>{view.headline}</strong> {view.detail}
        </p>
        <div className="admin-actions">
          <button
            type="button"
            className="ui-button"
            onClick={() => {
              if (verificationState.status !== "checking") {
                startVerification();
              }
            }}
            aria-disabled={verificationState.status === "checking"}
          >
            Verify again
          </button>
        </div>
      </section>
      <section className="admin-section" aria-labelledby={`${idPrefix}-filter-title`}>
        <h2 id={`${idPrefix}-filter-title`}>Filter the audit log</h2>
        <Form
          label="Filter the audit log"
          submitLabel="Apply filter"
          fields={AUDIT_FIELDS}
          errors={errors}
          onSubmit={apply}
        >
          <Field
            idPrefix={idPrefix}
            name="eventType"
            label="Event type"
            error={errors["eventType"] ?? null}
          >
            {(control) => (
              <input
                {...control}
                className="ui-input"
                type="text"
                value={filterText}
                onChange={(event) => setFilterText(event.target.value)}
              />
            )}
          </Field>
        </Form>
      </section>
      <section className="admin-section" aria-label="Audit events">
        <DataTable
          caption={ADMIN_TABLES.audit.caption}
          columns={columns}
          list={list}
          rowKey={(event) => event.seq}
          {...(ADMIN_TABLES.audit.emptyTitle === undefined
            ? {}
            : { emptyTitle: ADMIN_TABLES.audit.emptyTitle })}
          {...(ADMIN_TABLES.audit.emptyDescription === undefined
            ? {}
            : { emptyDescription: ADMIN_TABLES.audit.emptyDescription })}
        />
      </section>
    </div>
  );
}
