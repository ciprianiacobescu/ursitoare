import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { browserSession } from "../auth/browser-session.ts";
import { ConfirmDialog } from "../kit/ConfirmDialog.tsx";
import { ErrorPanel } from "../kit/ErrorPanel.tsx";
import { LoadingState } from "../kit/LoadingState.tsx";
import { DataTable } from "../kit/data/DataTable.tsx";
import { Field } from "../kit/data/Field.tsx";
import { Form } from "../kit/data/Form.tsx";
import { createCursorList } from "../kit/data/cursor-list.ts";
import { mapEnvelopeErrors } from "../kit/data/form-errors.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { cursorPageFetcher } from "../kit/data/page-fetcher.ts";
import { toast } from "../kit/toast.ts";
import "./admin.css";
import { adminErrorMessage } from "./messages.ts";
import { ADMIN_TABLES } from "./pages.ts";
import { clip } from "./shared.ts";
import {
  ISSUER_HINT,
  defaultIssuer,
  grantOptions,
  loadAllItems,
  mappedMessage,
  mappingCells,
  mappingRequest,
  parseGroupMapping,
  removeMapping,
  removeMappingConfirm,
  setMapping,
} from "./mappings.ts";
import type { GrantOption, MappingRow } from "./mappings.ts";

type MappingId = Pick<MappingRow, "issuer" | "group">;
import { parseNamed } from "./teams.ts";

const PAGE_TITLE = "Group mappings · Ursitoare";
const ROLES_PATH = "/roles";
const TEAMS_PATH = "/teams";
const MAPPINGS_PATH = "/idp-group-map";
const MAPPING_FIELDS = ["issuer", "group", "grant"] as const;

type GrantsState =
  | { status: "loading" }
  | { status: "ready"; options: readonly GrantOption[] }
  | { status: "error"; error: unknown };

export function MappingsPage(): ReactNode {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const issuerEdited = useRef(false);
  const idPrefix = useId();
  const [issuer, setIssuer] = useState("");
  const [group, setGroup] = useState("");
  const [grant, setGrant] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [grants, setGrants] = useState<GrantsState>({ status: "loading" });
  const [removing, setRemoving] = useState<MappingId | null>(null);
  const [pending, setPending] = useState<MappingRow | null>(null);

  const list = useMemo(
    () =>
      createCursorList(
        cursorPageFetcher(browserSession.api, MAPPINGS_PATH, { parseItem: parseGroupMapping }),
      ),
    [],
  );

  useEffect(() => {
    const previous = document.title;
    document.title = PAGE_TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [roles, teams] = await Promise.all([
          loadAllItems(
            cursorPageFetcher(browserSession.api, ROLES_PATH, {
              parseItem: (raw) => parseNamed(raw, "roleId"),
            }),
          ),
          loadAllItems(
            cursorPageFetcher(browserSession.api, TEAMS_PATH, {
              parseItem: (raw) => parseNamed(raw, "teamId"),
            }),
          ),
        ]);
        if (!cancelled) {
          setGrants({ status: "ready", options: grantOptions(roles, teams) });
        }
      } catch (error) {
        if (!cancelled) {
          setGrants({ status: "error", error });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sync = (): void => {
      if (issuerEdited.current) return;
      const state = list.getState();
      if (state.items.length === 0) return;
      const fallback = defaultIssuer(state.items);
      if (fallback === "") return;
      setIssuer((current) => (current === "" ? fallback : current));
    };
    return list.subscribe(sync);
  }, [list]);

  const options = grants.status === "ready" ? grants.options : [];

  const save = (): void => {
    if (saving) return;
    const result = mappingRequest({ issuer, group, grant }, options);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setSaving(true);
    void (async () => {
      try {
        await setMapping(browserSession.api, result.body);
        toast({ kind: "success", message: mappedMessage(result.body.group) });
        setGroup("");
        setGrant("");
        setErrors({});
        list.reset();
        headingRef.current?.focus();
      } catch (error) {
        const mapped = mapEnvelopeErrors(error, MAPPING_FIELDS);
        setErrors(mapped);
        const hasFieldError = MAPPING_FIELDS.some((field) => mapped[field] !== undefined);
        if (!hasFieldError) {
          toast({ kind: "error", message: adminErrorMessage(error) });
        }
      } finally {
        setSaving(false);
      }
    })();
  };

  const remove = (m: MappingRow): void => {
    if (removing !== null) return;
    setRemoving(m);
    void (async () => {
      try {
        await removeMapping(browserSession.api, m);
        toast({ kind: "success", message: `Removed the mapping for ${clip(m.group)}.` });
        list.reset();
        headingRef.current?.focus();
      } catch (error) {
        toast({ kind: "error", message: adminErrorMessage(error) });
      } finally {
        setRemoving(null);
        setPending(null);
      }
    })();
  };

  const columns = ADMIN_TABLES.mappings.columns.map((column) => ({
    ...column,
    cell: (mapping: Parameters<typeof mappingCells>[0]): ReactNode => {
      const cells = mappingCells(mapping);
      switch (column.key) {
        case "group":
          return cells.group;
        case "grants":
          return cells.grants;
        case "issuer":
          return cells.issuer;
        case "reviewedBy":
          return cells.reviewedBy;
        case "actions": {
          const label = `Remove ${clip(mapping.group)}`;
          return (
            <button
              type="button"
              className="ui-button"
              aria-disabled={removing !== null ? true : undefined}
              onClick={() => {
                if (removing !== null) return;
                setPending(mapping);
              }}
            >
              {label}
            </button>
          );
        }
        default:
          return null;
      }
    },
  }));

  const pendingConfirm = pending === null ? null : removeMappingConfirm(pending);

  return (
    <div className="admin-page">
      <h1 ref={headingRef} tabIndex={-1}>
        Group mappings
      </h1>
      <section className="admin-section" aria-labelledby={`${idPrefix}-map-title`}>
        <h2 id={`${idPrefix}-map-title`}>Map a group</h2>
        {grants.status === "loading" ? (
          <LoadingState label="Loading roles and teams" />
        ) : null}
        {grants.status === "error" ? <ErrorPanel error={grants.error} /> : null}
        {grants.status === "ready" ? (
          <Form
            label="Map a group"
            submitLabel="Map group"
            fields={MAPPING_FIELDS}
            errors={errors}
            busy={saving}
            onSubmit={save}
          >
            <Field
              idPrefix={idPrefix}
              name="issuer"
              label="Issuer"
              hint={ISSUER_HINT}
              error={errors["issuer"] ?? null}
              required
            >
              {(control) => (
                <input
                  {...control}
                  className="ui-input"
                  type="text"
                  value={issuer}
                  onChange={(event) => {
                    issuerEdited.current = true;
                    setIssuer(event.target.value);
                  }}
                />
              )}
            </Field>
            <Field
              idPrefix={idPrefix}
              name="group"
              label="Group"
              error={errors["group"] ?? null}
              required
            >
              {(control) => (
                <input
                  {...control}
                  className="ui-input"
                  type="text"
                  value={group}
                  onChange={(event) => setGroup(event.target.value)}
                />
              )}
            </Field>
            <Field
              idPrefix={idPrefix}
              name="grant"
              label="Grant"
              error={errors["grant"] ?? null}
              required
            >
              {(control) => (
                <select
                  {...control}
                  className="ui-input"
                  value={grant}
                  onChange={(event) => setGrant(event.target.value)}
                >
                  <option value="">Choose a role or a team</option>
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </Form>
        ) : null}
      </section>
      <section className="admin-section" aria-label="Group mappings">
        <DataTable
          caption={ADMIN_TABLES.mappings.caption}
          columns={columns}
          list={list}
          rowKey={(mapping) => `${mapping.issuer}\n${mapping.group}`}
          {...(ADMIN_TABLES.mappings.emptyTitle === undefined
            ? {}
            : { emptyTitle: ADMIN_TABLES.mappings.emptyTitle })}
          {...(ADMIN_TABLES.mappings.emptyDescription === undefined
            ? {}
            : { emptyDescription: ADMIN_TABLES.mappings.emptyDescription })}
        />
      </section>
      {pending !== null && pendingConfirm !== null ? (
        <ConfirmDialog
          open
          title={pendingConfirm.title}
          description={pendingConfirm.description}
          action={pendingConfirm.action}
          destructive
          onConfirm={() => remove(pending)}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </div>
  );
}
