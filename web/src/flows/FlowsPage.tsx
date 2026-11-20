import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";

import { ApiRequestError } from "../api/client.ts";
import { browserSession } from "../auth/browser-session.ts";
import { DataTable } from "../kit/data/DataTable.tsx";
import { Field } from "../kit/data/Field.tsx";
import { Form } from "../kit/data/Form.tsx";
import { createCursorList } from "../kit/data/cursor-list.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { PAGE_WIDTHS, captionDisplayFor } from "../kit/layout/layout.ts";
import { PageHeader } from "../kit/layout/PageHeader.tsx";
import { Section } from "../kit/layout/Section.tsx";
import { toast } from "../kit/toast.ts";
import { useMyTeams } from "../people/use-names.ts";
import { cn } from "../ui/cn.ts";
import {
  checkFlowName,
  checkOwnerTeam,
  flowCells,
  flowListFetcher,
  FLOW_NAME_MESSAGE,
  postFlow,
} from "./flows.ts";
import type { FlowRow } from "./flows.ts";
import { flowErrorMessage } from "./messages.ts";
import { FLOW_TABLES } from "./pages.ts";
import { ownerTeamSuggestions } from "./workspace.ts";

const PAGE_TITLE = "Flows · Ursitoare";
const FORM_FIELDS = ["name", "ownerTeam"] as const;

export function FlowsPage(): ReactNode {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const idPrefix = useId();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [ownerTeam, setOwnerTeam] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [creating, setCreating] = useState(false);

  const list = useMemo(() => createCursorList(flowListFetcher(browserSession.api)), []);

  const teams = useMyTeams();
  const suggestions = ownerTeamSuggestions(teams ?? []);
  const teamListId = `${idPrefix}-owner-teams`;
  const prefilled = useRef(false);
  const prefill = suggestions.prefill;
  useEffect(() => {
    if (teams === null || prefilled.current) return;
    prefilled.current = true;
    if (prefill !== "") {
      setOwnerTeam((current) => (current === "" ? prefill : current));
    }
  }, [teams, prefill]);

  useEffect(() => {
    const previous = document.title;
    document.title = PAGE_TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

  const create = (): void => {
    if (creating) return;
    const checkedName = checkFlowName(name);
    const checkedTeam = checkOwnerTeam(ownerTeam);
    if (!checkedName.ok || !checkedTeam.ok) {
      setErrors({
        ...(checkedName.ok ? {} : { name: checkedName.message }),
        ...(checkedTeam.ok ? {} : { ownerTeam: checkedTeam.message }),
      });
      return;
    }

    setCreating(true);
    void (async () => {
      try {
        await postFlow(
          browserSession.api,
          { name: checkedName.value, ownerTeam: checkedTeam.value },
          crypto.randomUUID(),
        );
        toast({ kind: "success", message: `Created flow ${checkedName.value}.` });
        setErrors({});
        void navigate(`/flows/${checkedName.value}`);
      } catch (error) {
        if (error instanceof ApiRequestError && error.code === "ALREADY_EXISTS") {
          setErrors({ name: flowErrorMessage(error) });
        } else {
          toast({ kind: "error", message: flowErrorMessage(error) });
        }
      } finally {
        setCreating(false);
      }
    })();
  };

  const columns = FLOW_TABLES.flows.columns.map((column) => ({
    ...column,
    cell: (row: FlowRow): ReactNode => {
      const cells = flowCells(row);
      switch (column.key) {
        case "flow":
          return <Link to={`/flows/${row.flowId}`}>{cells.flow}</Link>;
        case "ownerTeam":
          return cells.ownerTeam;
        case "versions":
          return cells.versions;
        case "latest":
          return cells.latest;
        default:
          return null;
      }
    },
  }));

  return (
    <div className={cn("flow-page flex flex-col gap-4", PAGE_WIDTHS.list)}>
      <PageHeader title="Flows" headingRef={headingRef} />
      <Section title="Create flow">
        <Form
          label="Create flow"
          submitLabel="Create flow"
          fields={FORM_FIELDS}
          errors={errors}
          busy={creating}
          onSubmit={create}
        >
          <Field
            idPrefix={idPrefix}
            name="name"
            label="Flow name"
            hint={FLOW_NAME_MESSAGE}
            error={errors["name"] ?? null}
          >
            {(control) => (
              <input
                {...control}
                className="ui-input"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            )}
          </Field>
          <Field
            idPrefix={idPrefix}
            name="ownerTeam"
            label="Owner team"
            hint="A team you belong to, for example finance."
            error={errors["ownerTeam"] ?? null}
          >
            {(control) => (
              <>
                <input
                  {...control}
                  className="ui-input"
                  type="text"
                  list={teamListId}
                  value={ownerTeam}
                  onChange={(event) => setOwnerTeam(event.target.value)}
                />
                <datalist id={teamListId}>
                  {suggestions.options.map((team) => (
                    <option key={team} value={team} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
        </Form>
      </Section>
      <DataTable
        caption={FLOW_TABLES.flows.caption}
        captionDisplay={captionDisplayFor(FLOW_TABLES.flows.caption, "Flows")}
        columns={columns}
        list={list}
        rowKey={(row) => row.flowId}
        {...(FLOW_TABLES.flows.emptyTitle === undefined
          ? {}
          : { emptyTitle: FLOW_TABLES.flows.emptyTitle })}
        {...(FLOW_TABLES.flows.emptyDescription === undefined
          ? {}
          : { emptyDescription: FLOW_TABLES.flows.emptyDescription })}
      />
    </div>
  );
}
