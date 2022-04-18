import React from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App";
import { GqlProvider } from "./gql";

const el = document.getElementById("root");
if (el) {
  createRoot(el).render(
    <React.StrictMode>
      <GqlProvider>
        <App />
      </GqlProvider>
    </React.StrictMode>,
  );
}
