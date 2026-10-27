import { Link, NavLink, Outlet } from "react-router";

import { navItems } from "./features.ts";

export function Shell() {
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
            {navItems().map((item) => (
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
    </div>
  );
}
