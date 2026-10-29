import { Link, NavLink, Outlet } from "react-router";

import { ToastRegion } from "../kit/ToastRegion.tsx";
import { useVisibleNav } from "../kit/use-visible-nav.ts";

export function Shell() {
  const navEntries = useVisibleNav();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-banner">
        <Link className="app-brand" to="/">
          Ursitoare
        </Link>
        <nav aria-label="Main">
          <ul className="app-nav">
            {navEntries.map((item) => (
              <li key={item.id}>
                <NavLink to={item.path}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="app-footer">Ursitoare workflow engine</footer>
      <ToastRegion />
    </div>
  );
}
