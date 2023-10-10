import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css"; // eslint-disable-line import/no-unresolved
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { queryClient } from "./gql";

import "./index.css";

const theme = createTheme({});

const el = document.getElementById("root");
if (el) {
  createRoot(el).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <App />
        </MantineProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
