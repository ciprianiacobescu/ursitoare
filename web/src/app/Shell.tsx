import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";

import { AccountMenu } from "../auth/AccountMenu.tsx";
import { useSession } from "../auth/use-session.ts";
import { ToastRegion } from "../kit/ToastRegion.tsx";
import { useVisibleNav } from "../kit/use-visible-nav.ts";
import { Button } from "../ui/button.tsx";
import { TooltipProvider } from "../ui/tooltip.tsx";
import { navGroups, navPlacement } from "./nav-groups.ts";

const SIDEBAR_LINK_CLASSES =
  "block border-l-[3px] border-transparent px-4 py-2 text-text hover:bg-bg aria-[current=page]:border-accent aria-[current=page]:bg-bg aria-[current=page]:font-semibold aria-[current=page]:text-accent";

const INLINE_LINK_CLASSES =
  "block rounded px-3 py-2 text-text hover:bg-surface aria-[current=page]:font-semibold aria-[current=page]:text-accent";

export function Shell() {
  const navEntries = useVisibleNav();
  const inline = navPlacement(useSession()) === "inline";
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const firstRender = useRef(true);

  useEffect(() => {
    setMenuOpen(false);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const target = document.querySelector<HTMLElement>("#main h1") ?? document.getElementById("main");
    target?.focus();
  }, [pathname]);

  const groups = navGroups(navEntries);

  const inlineNav = (
    <nav aria-label="Main" id="main-nav">
      <ul className="m-0 flex list-none gap-1 p-0">
        {navEntries.map((item) => (
          <li key={item.id}>
            <NavLink className={INLINE_LINK_CLASSES} to={item.path}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );

  const sidebarNav = (
    <nav
      aria-label="Main"
      id="main-nav"
      className={`${menuOpen ? "block" : "hidden"} border-r border-divider bg-sidebar lg:col-start-1 lg:row-start-2 lg:block`}
    >
      <div className="py-3 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto">
        {groups.map((group) => {
          const labelId = `nav-group-${group.id}`;
          return (
            <div key={group.id} className="mb-3">
              {group.label === null ? null : (
                <p id={labelId} className="m-0 px-4 py-1 text-sm font-semibold text-muted">
                  {group.label}
                </p>
              )}
              <ul
                className="m-0 list-none p-0"
                {...(group.label === null ? {} : { "aria-labelledby": labelId })}
              >
                {group.items.map((item) => (
                  <li key={item.id}>
                    <NavLink className={SIDEBAR_LINK_CLASSES} to={item.path}>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );

  const nav = inline ? inlineNav : sidebarNav;

  return (
    <TooltipProvider>
      <div
        className={
          inline
            ? "flex min-h-screen flex-col"
            : "flex min-h-screen flex-col lg:grid lg:grid-cols-[var(--ui-sidebar-width)_minmax(0,1fr)] lg:grid-rows-[auto_1fr_auto]"
        }
      >
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="flex min-h-(--ui-banner-height) flex-nowrap items-center gap-3 border-b border-divider bg-bg px-4 lg:col-span-2">
          <Link className="shrink-0 font-semibold text-text no-underline" to="/">
            Ursitoare
          </Link>
          {inline ? nav : null}
          {inline ? null : (
            <Button
              size="sm"
              className="shrink-0 lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="main-nav"
              onClick={() => {
                setMenuOpen((open) => !open);
              }}
            >
              Menu
            </Button>
          )}
          <AccountMenu />
        </header>
        {inline ? null : nav}
        <main id="main" tabIndex={-1} className="min-w-0 lg:col-start-2 lg:row-start-2">
          <Outlet />
        </main>
        <footer className="border-t border-divider px-4 py-2 text-sm text-muted lg:col-span-2">
          Ursitoare workflow engine
        </footer>
        <ToastRegion />
      </div>
    </TooltipProvider>
  );
}
