// Bootstrap placeholder: the web-shell change (openspec change add-web-shell) replaces this entry with the app shell.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <main>
        <h1>Ursitoare</h1>
      </main>
    </StrictMode>,
  );
}
