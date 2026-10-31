import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { browserSession } from "../auth/browser-session.ts";
import { useSession } from "../auth/use-session.ts";
import { ConfirmDialog } from "../kit/ConfirmDialog.tsx";
import { DataTable } from "../kit/data/DataTable.tsx";
import { createCursorList } from "../kit/data/cursor-list.ts";
import { cursorPageFetcher } from "../kit/data/page-fetcher.ts";
import { toast } from "../kit/toast.ts";
import "./admin.css";
import { adminErrorMessage } from "./messages.ts";
import { ADMIN_TABLES } from "./pages.ts";
import { accountAction, accountCells, parseAccount, patchAccountState } from "./users.ts";
import type { AccountRow } from "./users.ts";

const PAGE_TITLE = "Users · Ursitoare";
const USERS_PATH = "/users";

export function UsersPage(): ReactNode {
  const session = useSession();
  const selfId = session !== null && session.status === "ready" ? session.me.user.id : null;
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [pending, setPending] = useState<AccountRow | null>(null);

  const list = useMemo(
    () =>
      createCursorList(
        cursorPageFetcher(browserSession.api, USERS_PATH, { parseItem: parseAccount }),
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

  const apply = (account: AccountRow): void => {
    if (acting !== null) return;
    const action = accountAction(account, selfId);
    if (action.kind === "none") return;

    setActing(account.userId);
    void (async () => {
      try {
        await patchAccountState(
          browserSession.api,
          account.userId,
          account.state === "active" ? "disabled" : "active",
        );
        toast({ kind: "success", message: action.done });
        list.reset();
        headingRef.current?.focus();
      } catch (error) {
        toast({ kind: "error", message: adminErrorMessage(error) });
      } finally {
        setActing(null);
        setPending(null);
      }
    })();
  };

  const run = (account: AccountRow): void => {
    if (acting !== null) return;
    const action = accountAction(account, selfId);
    if (action.kind === "none") return;
    if (action.confirm !== null) {
      setPending(account);
      return;
    }
    apply(account);
  };

  const actionCell = (account: AccountRow): ReactNode => {
    const action = accountAction(account, selfId);
    if (action.kind === "none") {
      return <p>{action.note}</p>;
    }
    return (
      <button
        type="button"
        className="ui-button"
        aria-disabled={acting === account.userId ? true : undefined}
        onClick={() => run(account)}
      >
        {action.buttonLabel}
      </button>
    );
  };

  const columns = ADMIN_TABLES.users.columns.map((column) => ({
    ...column,
    cell: (account: AccountRow): ReactNode => {
      const cells = accountCells(account);
      switch (column.key) {
        case "name":
          return cells.name;
        case "email":
          return cells.email;
        case "state":
          return cells.state;
        case "rolesTeams":
          return cells.rolesTeams;
        case "actions":
          return actionCell(account);
        default:
          return null;
      }
    },
  }));

  const pendingAction = pending === null ? null : accountAction(pending, selfId);

  return (
    <div className="admin-page">
      <h1 ref={headingRef} tabIndex={-1}>
        Users
      </h1>
      <DataTable
        caption={ADMIN_TABLES.users.caption}
        columns={columns}
        list={list}
        rowKey={(account) => account.userId}
        {...(ADMIN_TABLES.users.emptyTitle === undefined
          ? {}
          : { emptyTitle: ADMIN_TABLES.users.emptyTitle })}
        {...(ADMIN_TABLES.users.emptyDescription === undefined
          ? {}
          : { emptyDescription: ADMIN_TABLES.users.emptyDescription })}
      />
      {pending !== null &&
      pendingAction !== null &&
      pendingAction.kind !== "none" &&
      pendingAction.confirm !== null ? (
        <ConfirmDialog
          open
          title={pendingAction.confirm.title}
          description={pendingAction.confirm.description}
          action={pendingAction.confirm.action}
          onConfirm={() => apply(pending)}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </div>
  );
}
