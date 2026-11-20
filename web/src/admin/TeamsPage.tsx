import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { browserSession } from "../auth/browser-session.ts";
import { ConfirmDialog } from "../kit/ConfirmDialog.tsx";
import { DataTable } from "../kit/data/DataTable.tsx";
import { Field } from "../kit/data/Field.tsx";
import { Form } from "../kit/data/Form.tsx";
import { createCursorList } from "../kit/data/cursor-list.ts";
import { mapEnvelopeErrors } from "../kit/data/form-errors.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { cursorPageFetcher } from "../kit/data/page-fetcher.ts";
import { PageHeader } from "../kit/layout/PageHeader.tsx";
import { Section } from "../kit/layout/Section.tsx";
import { PAGE_WIDTHS } from "../kit/layout/layout.ts";
import { toast } from "../kit/toast.ts";
import { cn } from "../ui/cn.ts";
import { adminErrorMessage } from "./messages.ts";
import { ADMIN_TABLES } from "./pages.ts";
import {
  checkTeamId,
  deleteTeamConfirm,
  parseNamed,
  postTeam,
  removeTeamById,
} from "./teams.ts";

const PAGE_TITLE = "Roles and teams · Ursitoare";
const ROLES_PATH = "/roles";
const TEAMS_PATH = "/teams";
const TEAM_FIELDS = ["teamId"] as const;

export function TeamsPage(): ReactNode {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const idPrefix = useId();
  const [teamId, setTeamId] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const roles = useMemo(
    () =>
      createCursorList(
        cursorPageFetcher(browserSession.api, ROLES_PATH, {
          parseItem: (raw) => parseNamed(raw, "roleId"),
        }),
      ),
    [],
  );

  const teams = useMemo(
    () =>
      createCursorList(
        cursorPageFetcher(browserSession.api, TEAMS_PATH, {
          parseItem: (raw) => parseNamed(raw, "teamId"),
        }),
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

  const create = (): void => {
    if (creating) return;
    const checked = checkTeamId(teamId);
    if (!checked.ok) {
      setErrors({ teamId: checked.message });
      return;
    }

    setCreating(true);
    void (async () => {
      try {
        await postTeam(browserSession.api, checked.value, crypto.randomUUID());
        toast({ kind: "success", message: `Created team ${checked.value}.` });
        setTeamId("");
        setErrors({});
        teams.reset();
        headingRef.current?.focus();
      } catch (error) {
        const mapped = mapEnvelopeErrors(error, TEAM_FIELDS);
        setErrors(mapped);
        if (mapped["teamId"] === undefined) {
          toast({ kind: "error", message: adminErrorMessage(error) });
        }
      } finally {
        setCreating(false);
      }
    })();
  };

  const remove = (id: string): void => {
    if (deleting !== null) return;
    setDeleting(id);
    void (async () => {
      try {
        await removeTeamById(browserSession.api, id);
        toast({ kind: "success", message: `Deleted team ${id}.` });
        teams.reset();
        headingRef.current?.focus();
      } catch (error) {
        toast({ kind: "error", message: adminErrorMessage(error) });
      } finally {
        setDeleting(null);
        setPending(null);
      }
    })();
  };

  const rolesColumns = ADMIN_TABLES.roles.columns.map((column) => ({
    ...column,
    cell: (role: string): ReactNode => role,
  }));

  const teamsColumns = ADMIN_TABLES.teams.columns.map((column) => ({
    ...column,
    cell: (id: string): ReactNode => {
      if (column.key !== "actions") return id;
      return (
        <button
          type="button"
          className="ui-button"
          aria-disabled={deleting === id ? true : undefined}
          onClick={() => {
            if (deleting !== null) return;
            setPending(id);
          }}
        >
          {`Delete team ${id}`}
        </button>
      );
    },
  }));

  const pendingConfirm = pending === null ? null : deleteTeamConfirm(pending);
  const teamError = errors["teamId"] ?? null;

  return (
    <div className={cn("admin-page", PAGE_WIDTHS.list)}>
      <PageHeader
        title="Roles and teams"
        description="Roles are fixed. Teams group people, and a group mapping can give a team to everyone in an identity-provider group."
        headingRef={headingRef}
      />
      <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)] xl:items-start">
        <Section title="Create team">
          <Form
          label="Create team"
          submitLabel="Create team"
          fields={TEAM_FIELDS}
          errors={errors}
          busy={creating}
          onSubmit={create}
        >
          <Field
            idPrefix={idPrefix}
            name="teamId"
            label="Team name"
            error={teamError}
          >
            {(control) => (
              <input
                {...control}
                className="ui-input"
                type="text"
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
              />
            )}
          </Field>
          </Form>
        </Section>
        <div className="flex flex-col gap-4">
          <DataTable
            caption={ADMIN_TABLES.roles.caption}
            columns={rolesColumns}
            list={roles}
            rowKey={(role) => role}
            {...(ADMIN_TABLES.roles.emptyTitle === undefined
              ? {}
              : { emptyTitle: ADMIN_TABLES.roles.emptyTitle })}
            {...(ADMIN_TABLES.roles.emptyDescription === undefined
              ? {}
              : { emptyDescription: ADMIN_TABLES.roles.emptyDescription })}
          />
          <DataTable
            caption={ADMIN_TABLES.teams.caption}
            columns={teamsColumns}
            list={teams}
            rowKey={(id) => id}
            {...(ADMIN_TABLES.teams.emptyTitle === undefined
              ? {}
              : { emptyTitle: ADMIN_TABLES.teams.emptyTitle })}
            {...(ADMIN_TABLES.teams.emptyDescription === undefined
              ? {}
              : { emptyDescription: ADMIN_TABLES.teams.emptyDescription })}
          />
        </div>
      </div>
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
