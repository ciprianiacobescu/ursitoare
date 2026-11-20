import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { browserSession } from "../auth/browser-session.ts";
import { DataTable } from "../kit/data/DataTable.tsx";
import { Field } from "../kit/data/Field.tsx";
import { Form } from "../kit/data/Form.tsx";
import { createCursorList } from "../kit/data/cursor-list.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { PageHeader } from "../kit/layout/PageHeader.tsx";
import { Section } from "../kit/layout/Section.tsx";
import { PAGE_WIDTHS } from "../kit/layout/layout.ts";
import { cn } from "../ui/cn.ts";
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
const PAGE_HEADING = "Audit log";

function breakable(text: string): ReactNode {
  const parts = text.split(/(?<=[._])/);
  return parts.map((part, index) => (
    <Fragment key={index}>
      {index > 0 ? <wbr /> : null}
      {part}
    </Fragment>
  ));
}

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
          return <span className="whitespace-nowrap">{cells.time}</span>;
        case "type":
          return <span className="[overflow-wrap:anywhere]">{breakable(cells.type)}</span>;
        case "actor":
          return cells.actor;
        case "target":
          return <span className="[overflow-wrap:anywhere]">{breakable(cells.target)}</span>;
        case "details":
          return <span className="block min-w-48 max-w-sm break-all">{cells.details}</span>;
        default:
          return null;
      }
    },
  }));

  const view = verificationView(verificationState);

  return (
    <div className={cn("admin-page", PAGE_WIDTHS.list)}>
      <PageHeader
        title={PAGE_HEADING}
        description="Every recorded action, with a check that the chain of events is unbroken."
        headingRef={headingRef}
      />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <Section title="Chain verification">
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
      </Section>
      <Section title="Filter the audit log">
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
      </Section>
      </div>
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
    </div>
  );
}
