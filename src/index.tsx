import React from "react";
import ReactDOM from "react-dom";

import "./index.css";
import App from "./App";
import { GqlProvider } from "./gql";

ReactDOM.render(
  <React.StrictMode>
    <GqlProvider>
      <App />
    </GqlProvider>
  </React.StrictMode>,
  document.getElementById("root"),
);
