import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./kit/tokens.css";
import "./kit/theme.css";
import "./app/shell.css";
import "./features/index.ts";
import { App } from "./app/App.tsx";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
